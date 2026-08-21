package com.financeapp.goal;

import com.financeapp.common.exception.InvalidTransactionException;
import com.financeapp.common.exception.ResourceNotFoundException;
import com.financeapp.goal.dto.FinancialGoalCreateRequest;
import com.financeapp.goal.dto.FinancialGoalResponse;
import com.financeapp.goal.dto.FinancialGoalUpdateRequest;
import com.financeapp.goal.dto.GoalContributionCreateRequest;
import com.financeapp.goal.dto.GoalContributionResponse;
import com.financeapp.user.User;
import com.financeapp.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * O progresso de uma meta nunca é persistido — é sempre
 * {@code SUM(goal_contributions.amount)} (ARCHITECTURE.md §9.2, Fase 7).
 * Nenhuma Transaction é criada por uma meta ou contribuição.
 */
@Service
public class GoalService {

    private static final int PERCENTAGE_SCALE = 2;

    private final FinancialGoalRepository goalRepository;
    private final GoalContributionRepository contributionRepository;
    private final UserRepository userRepository;

    public GoalService(FinancialGoalRepository goalRepository, GoalContributionRepository contributionRepository,
                        UserRepository userRepository) {
        this.goalRepository = goalRepository;
        this.contributionRepository = contributionRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public FinancialGoalResponse create(Long userId, FinancialGoalCreateRequest request) {
        assertTargetDateValid(request.targetDate(), LocalDate.now());

        User user = userRepository.getReferenceById(userId);
        FinancialGoal goal = new FinancialGoal(user, request.name().trim(), normalize(request.description()),
                request.targetAmount(), request.targetDate());
        goalRepository.save(goal);
        return toResponse(goal);
    }

    @Transactional
    public FinancialGoalResponse update(Long userId, Long id, FinancialGoalUpdateRequest request) {
        FinancialGoal goal = findOwned(userId, id);
        // Comparado com a data de CRIAÇÃO da meta (seção 16 do prompt da Fase 7), não com
        // "hoje" — senão uma meta antiga sem targetDate nunca mais poderia ganhar uma data
        // alvo levemente no passado relativo a hoje, mas ainda posterior à criação.
        assertTargetDateValid(request.targetDate(), goal.getCreatedAt().atZone(ZoneOffset.UTC).toLocalDate());
        if (request.status() == GoalStatus.COMPLETED) {
            throw new InvalidTransactionException(
                    "Status 'COMPLETED' é definido automaticamente ao atingir o valor da meta");
        }

        goal.update(request.name().trim(), normalize(request.description()), request.targetAmount(), request.targetDate());
        goal.setStatus(request.status());
        recalculateStatus(goal);
        return toResponse(goal);
    }

    @Transactional(readOnly = true)
    public FinancialGoalResponse get(Long userId, Long id) {
        return toResponse(findOwned(userId, id));
    }

    @Transactional(readOnly = true)
    public List<FinancialGoalResponse> list(Long userId, GoalStatus status) {
        List<FinancialGoal> goals = goalRepository.findAllOrdered(userId, status);
        if (goals.isEmpty()) {
            return List.of();
        }

        // Uma única query agrupada para o progresso de todas as metas da lista,
        // em vez de uma por meta (Fase 9: corrige N+1 detectado na auditoria).
        List<Long> goalIds = goals.stream().map(FinancialGoal::getId).toList();
        Map<Long, BigDecimal> currentByGoal = contributionRepository.sumAmountByGoalIds(goalIds).stream()
                .collect(Collectors.toMap(GoalAmount::goalId, GoalAmount::amount));

        return goals.stream()
                .map(goal -> toResponse(goal, currentByGoal.getOrDefault(goal.getId(), BigDecimal.ZERO)))
                .toList();
    }

    /** Exclusão física da meta — suas contribuições são removidas em cascata (migration V4, ON DELETE CASCADE). */
    @Transactional
    public void delete(Long userId, Long id) {
        FinancialGoal goal = findOwned(userId, id);
        goalRepository.delete(goal);
    }

    @Transactional(readOnly = true)
    public List<GoalContributionResponse> listContributions(Long userId, Long goalId) {
        FinancialGoal goal = findOwned(userId, goalId);
        return contributionRepository.findAllByGoalIdAndUserIdOrderByDateDescIdDesc(goal.getId(), userId).stream()
                .map(GoalContributionResponse::from)
                .toList();
    }

    @Transactional
    public GoalContributionResponse addContribution(Long userId, Long goalId, GoalContributionCreateRequest request) {
        FinancialGoal goal = findOwned(userId, goalId);
        User user = userRepository.getReferenceById(userId);
        GoalContribution contribution = new GoalContribution(goal, user, request.amount(), request.date(),
                normalize(request.note()));
        contributionRepository.save(contribution);

        recalculateStatus(goal);
        return GoalContributionResponse.from(contribution);
    }

    @Transactional
    public void removeContribution(Long userId, Long goalId, Long contributionId) {
        FinancialGoal goal = findOwned(userId, goalId);
        GoalContribution contribution = contributionRepository.findByIdAndGoalIdAndUserId(contributionId, goal.getId(), userId)
                .orElseThrow(() -> new ResourceNotFoundException("Contribuição não encontrada"));
        contributionRepository.delete(contribution);

        recalculateStatus(goal);
    }

    /**
     * Regra de status (seção 15 do prompt da Fase 7): se a meta foi
     * CANCELLED manualmente, nunca é sobrescrita automaticamente — nem para
     * ACTIVE nem para COMPLETED. Caso contrário, o status é sempre
     * derivado do total de contribuições: {@code >= targetAmount} vira
     * COMPLETED, senão volta para ACTIVE (isso também cobre "remover
     * contribuição derruba o total abaixo do alvo" sem precisar de um
     * caminho de código separado — completar/reverter são a mesma
     * checagem, chamada depois de toda mudança em contribuições).
     */
    private void recalculateStatus(FinancialGoal goal) {
        if (goal.getStatus() == GoalStatus.CANCELLED) {
            return;
        }
        BigDecimal current = currentAmount(goal.getId());
        goal.setStatus(current.compareTo(goal.getTargetAmount()) >= 0 ? GoalStatus.COMPLETED : GoalStatus.ACTIVE);
    }

    private FinancialGoalResponse toResponse(FinancialGoal goal) {
        return toResponse(goal, currentAmount(goal.getId()));
    }

    private FinancialGoalResponse toResponse(FinancialGoal goal, BigDecimal current) {
        BigDecimal remaining = goal.getTargetAmount().subtract(current);
        BigDecimal progressPercentage = percentageOf(current, goal.getTargetAmount());
        Long daysRemaining = goal.getTargetDate() == null
                ? null
                : ChronoUnit.DAYS.between(LocalDate.now(), goal.getTargetDate());
        return FinancialGoalResponse.of(goal, current, remaining, progressPercentage, daysRemaining);
    }

    private BigDecimal currentAmount(Long goalId) {
        BigDecimal sum = contributionRepository.sumAmountByGoalId(goalId);
        return sum == null ? BigDecimal.ZERO : sum;
    }

    private BigDecimal percentageOf(BigDecimal current, BigDecimal target) {
        if (target.signum() == 0) {
            return BigDecimal.ZERO.setScale(PERCENTAGE_SCALE, RoundingMode.HALF_UP);
        }
        return current.multiply(BigDecimal.valueOf(100)).divide(target, PERCENTAGE_SCALE, RoundingMode.HALF_UP);
    }

    private void assertTargetDateValid(LocalDate targetDate, LocalDate reference) {
        if (targetDate != null && targetDate.isBefore(reference)) {
            throw new InvalidTransactionException("Data alvo não pode ser anterior à data de criação da meta");
        }
    }

    private String normalize(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }

    private FinancialGoal findOwned(Long userId, Long id) {
        return goalRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Meta não encontrada"));
    }
}
