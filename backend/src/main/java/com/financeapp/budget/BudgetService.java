package com.financeapp.budget;

import com.financeapp.budget.dto.BudgetCreateRequest;
import com.financeapp.budget.dto.BudgetResponse;
import com.financeapp.budget.dto.BudgetUpdateRequest;
import com.financeapp.category.Category;
import com.financeapp.category.CategoryRepository;
import com.financeapp.common.TransactionType;
import com.financeapp.common.exception.DuplicateResourceException;
import com.financeapp.common.exception.InvalidTransactionException;
import com.financeapp.common.exception.ResourceNotFoundException;
import com.financeapp.transaction.TransactionRepository;
import com.financeapp.user.User;
import com.financeapp.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

/**
 * {@code spent}/{@code remaining}/{@code percentageUsed}/{@code status}
 * nunca são persistidos — sempre recalculados a partir de
 * {@code transactions} a cada leitura, no mesmo espírito de
 * {@code DashboardService} (ARCHITECTURE.md §8, §9.2).
 */
@Service
public class BudgetService {

    private static final int PERCENTAGE_SCALE = 2;
    private static final BigDecimal WARNING_THRESHOLD = BigDecimal.valueOf(80);
    private static final BigDecimal EXCEEDED_THRESHOLD = BigDecimal.valueOf(100);

    private final BudgetRepository budgetRepository;
    private final CategoryRepository categoryRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;

    public BudgetService(BudgetRepository budgetRepository, CategoryRepository categoryRepository,
                          TransactionRepository transactionRepository, UserRepository userRepository) {
        this.budgetRepository = budgetRepository;
        this.categoryRepository = categoryRepository;
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public BudgetResponse create(Long userId, BudgetCreateRequest request) {
        Category category = findOwnedExpenseCategory(userId, request.categoryId());
        assertNotDuplicate(userId, request.categoryId(), request.year(), request.month(), null);

        User user = userRepository.getReferenceById(userId);
        Budget budget = new Budget(user, category, request.year(), request.month(), request.amount());
        budgetRepository.save(budget);
        return toResponse(userId, budget);
    }

    @Transactional
    public BudgetResponse update(Long userId, Long id, BudgetUpdateRequest request) {
        Budget budget = findOwned(userId, id);
        Category category = findOwnedExpenseCategory(userId, request.categoryId());
        assertNotDuplicate(userId, request.categoryId(), request.year(), request.month(), id);

        budget.update(category, request.year(), request.month(), request.amount());
        return toResponse(userId, budget);
    }

    @Transactional(readOnly = true)
    public BudgetResponse get(Long userId, Long id) {
        return toResponse(userId, findOwned(userId, id));
    }

    /**
     * Sem {@code year}/{@code month} informados, lista o período atual
     * (mês corrente) — mais útil para o frontend do que retornar todos os
     * orçamentos já cadastrados de qualquer época (decisão da Fase 7,
     * seção 7 do prompt: "listar do período atual").
     */
    @Transactional(readOnly = true)
    public List<BudgetResponse> list(Long userId, Integer year, Integer month, Long categoryId) {
        LocalDate today = LocalDate.now();
        int resolvedYear = year != null ? year : today.getYear();
        int resolvedMonth = month != null ? month : today.getMonthValue();

        var spec = BudgetSpecifications.filter(userId, resolvedYear, resolvedMonth, categoryId);
        return budgetRepository.findAll(spec).stream()
                .map(budget -> toResponse(userId, budget))
                .toList();
    }

    @Transactional
    public void delete(Long userId, Long id) {
        Budget budget = findOwned(userId, id);
        budgetRepository.delete(budget);
    }

    private BudgetResponse toResponse(Long userId, Budget budget) {
        LocalDate from = LocalDate.of(budget.getYear(), budget.getMonth(), 1);
        LocalDate to = from.plusMonths(1);
        BigDecimal spent = nz(transactionRepository.sumExpenseForCategoryAndPeriod(
                userId, budget.getCategory().getId(), from, to));
        BigDecimal remaining = budget.getAmount().subtract(spent);
        BigDecimal percentageUsed = percentageOf(spent, budget.getAmount());
        BudgetStatus status = statusFor(percentageUsed);
        return BudgetResponse.of(budget, spent, remaining, percentageUsed, status);
    }

    private BudgetStatus statusFor(BigDecimal percentageUsed) {
        if (percentageUsed.compareTo(EXCEEDED_THRESHOLD) > 0) {
            return BudgetStatus.EXCEEDED;
        }
        if (percentageUsed.compareTo(WARNING_THRESHOLD) >= 0) {
            return BudgetStatus.WARNING;
        }
        return BudgetStatus.SAFE;
    }

    private BigDecimal percentageOf(BigDecimal spent, BigDecimal amount) {
        // amount > 0 é garantido pela validação de bean (@DecimalMin) — o guard
        // contra signum() == 0 é só defensivo, igual ao padrão do DashboardService.
        if (amount.signum() == 0) {
            return BigDecimal.ZERO.setScale(PERCENTAGE_SCALE, RoundingMode.HALF_UP);
        }
        return spent.multiply(BigDecimal.valueOf(100)).divide(amount, PERCENTAGE_SCALE, RoundingMode.HALF_UP);
    }

    private void assertNotDuplicate(Long userId, Long categoryId, Integer year, Integer month, Long excludingId) {
        boolean duplicate = excludingId == null
                ? budgetRepository.existsByUserIdAndCategoryIdAndYearAndMonth(userId, categoryId, year, month)
                : budgetRepository.existsByUserIdAndCategoryIdAndYearAndMonthAndIdNot(userId, categoryId, year, month, excludingId);
        if (duplicate) {
            throw new DuplicateResourceException("Já existe um orçamento para esta categoria neste período.");
        }
    }

    private Category findOwnedExpenseCategory(Long userId, Long categoryId) {
        Category category = categoryRepository.findByIdAndUserId(categoryId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Categoria não encontrada"));
        if (category.getType() != TransactionType.EXPENSE) {
            throw new InvalidTransactionException("Orçamento só pode ser criado para categorias de despesa");
        }
        return category;
    }

    private Budget findOwned(Long userId, Long id) {
        return budgetRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Orçamento não encontrado"));
    }

    private static BigDecimal nz(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
