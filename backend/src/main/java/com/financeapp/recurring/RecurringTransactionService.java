package com.financeapp.recurring;

import com.financeapp.account.Account;
import com.financeapp.account.AccountRepository;
import com.financeapp.category.Category;
import com.financeapp.category.CategoryRepository;
import com.financeapp.common.TransactionType;
import com.financeapp.common.exception.InvalidTransactionException;
import com.financeapp.common.exception.ResourceNotFoundException;
import com.financeapp.paymentmethod.PaymentMethod;
import com.financeapp.paymentmethod.PaymentMethodRepository;
import com.financeapp.recurring.dto.RecurringTransactionCreateRequest;
import com.financeapp.recurring.dto.RecurringTransactionResponse;
import com.financeapp.recurring.dto.RecurringTransactionUpdateRequest;
import com.financeapp.transaction.TransactionService;
import com.financeapp.user.User;
import com.financeapp.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class RecurringTransactionService {

    private static final Logger log = LoggerFactory.getLogger(RecurringTransactionService.class);

    /**
     * Limite de segurança para o loop de reposicionamento de
     * {@code nextExecutionDate} ao reativar uma regra pausada há muito
     * tempo — é aritmética de data em memória (sem I/O), então um limite
     * alto é barato; existe só para nunca travar caso a data âncora esteja
     * de alguma forma corrompida.
     */
    private static final int MAX_REPOSITION_ITERATIONS = 100_000;

    /**
     * Limite de ocorrências catch-up geradas por regra a cada rodada do
     * processador (seção "proteção contra loop infinito" da Fase 6): alto
     * o bastante para cobrir catch-up realista (ex.: recorrência diária
     * parada por mais de um ano = ~365 ocorrências), baixo o bastante para
     * nunca travar o processador por causa de uma regra com dado
     * inconsistente (ex.: nextExecutionDate que por algum bug nunca avança
     * o suficiente). Se uma regra ainda tiver ocorrências vencidas após o
     * limite, a rodada seguinte do scheduler continua o catch-up de onde
     * parou — não há perda, só espalhamento em mais de uma rodada.
     */
    private static final int MAX_CATCHUP_ITERATIONS = 500;

    private final RecurringTransactionRepository recurringTransactionRepository;
    private final AccountRepository accountRepository;
    private final CategoryRepository categoryRepository;
    private final PaymentMethodRepository paymentMethodRepository;
    private final UserRepository userRepository;
    private final TransactionService transactionService;

    public RecurringTransactionService(RecurringTransactionRepository recurringTransactionRepository,
                                        AccountRepository accountRepository,
                                        CategoryRepository categoryRepository,
                                        PaymentMethodRepository paymentMethodRepository,
                                        UserRepository userRepository,
                                        TransactionService transactionService) {
        this.recurringTransactionRepository = recurringTransactionRepository;
        this.accountRepository = accountRepository;
        this.categoryRepository = categoryRepository;
        this.paymentMethodRepository = paymentMethodRepository;
        this.userRepository = userRepository;
        this.transactionService = transactionService;
    }

    @Transactional
    public RecurringTransactionResponse create(Long userId, RecurringTransactionCreateRequest request) {
        Account account = findOwnedAccount(userId, request.accountId());
        Category category = findOwnedCategory(userId, request.categoryId());
        PaymentMethod paymentMethod = findOwnedPaymentMethod(userId, request.paymentMethodId());
        assertCategoryCompatible(category, request.type());
        assertEndDateValid(request.startDate(), request.endDate());

        // Deliberadamente não gera a primeira Transaction aqui mesmo se
        // startDate já estiver vencida — a geração é sempre responsabilidade
        // do processador (ver RecurringTransactionProcessor), nunca do POST.
        User user = userRepository.getReferenceById(userId);
        RecurringTransaction recurringTransaction = new RecurringTransaction(user, account, category, paymentMethod,
                request.description().trim(), request.amount(), request.type(), request.frequency(),
                request.startDate(), request.endDate());
        recurringTransactionRepository.save(recurringTransaction);
        return RecurringTransactionResponse.from(recurringTransaction);
    }

    @Transactional
    public RecurringTransactionResponse update(Long userId, Long id, RecurringTransactionUpdateRequest request) {
        RecurringTransaction recurringTransaction = findOwned(userId, id);
        Account account = findOwnedAccount(userId, request.accountId());
        Category category = findOwnedCategory(userId, request.categoryId());
        PaymentMethod paymentMethod = findOwnedPaymentMethod(userId, request.paymentMethodId());
        assertCategoryCompatible(category, recurringTransaction.getType());
        assertEndDateValid(request.startDate(), request.endDate());

        boolean startDateChanged = !request.startDate().equals(recurringTransaction.getStartDate());
        if (startDateChanged && recurringTransaction.getLastExecutionDate() != null) {
            throw new InvalidTransactionException(
                    "Não é possível alterar a data de início depois que a recorrência já gerou transações");
        }

        boolean frequencyChanged = request.frequency() != recurringTransaction.getFrequency();
        recurringTransaction.update(account, category, paymentMethod, request.description().trim(), request.amount(),
                request.frequency(), request.startDate(), request.endDate());

        // Recálculo de nextExecutionDate só quando semanticamente necessário
        // (ARCHITECTURE.md, Fase 6 — edição não deve mexer no calendário só
        // porque a descrição mudou): sem execuções ainda, a próxima é sempre
        // a nova startDate; com execuções, só recalcula se a frequência mudou,
        // ancorando na última execução real (não na startDate original).
        if (recurringTransaction.getLastExecutionDate() == null) {
            recurringTransaction.rescheduleNextExecution(recurringTransaction.getStartDate());
        } else if (frequencyChanged) {
            LocalDate next = RecurrenceDateCalculator.next(recurringTransaction.getStartDate(),
                    recurringTransaction.getLastExecutionDate(), recurringTransaction.getFrequency());
            recurringTransaction.rescheduleNextExecution(next);
        }

        boolean reactivating = !recurringTransaction.isActive() && request.active();
        if (reactivating) {
            repositionAfterReactivation(recurringTransaction);
        }
        if (request.active()) {
            recurringTransaction.activate();
        } else {
            recurringTransaction.deactivate();
        }

        return RecurringTransactionResponse.from(recurringTransaction);
    }

    /**
     * Ao reativar uma regra pausada (seção 15): se next_execution_date ficou
     * no passado durante a pausa, NÃO gera todas as ocorrências perdidas de
     * uma vez — reposiciona para a próxima ocorrência válida a partir de
     * hoje. Evita que pausar uma assinatura por 6 meses gere 6 despesas
     * retroativas ao reativar. Se next_execution_date já está no futuro
     * (pausada antes de vencer), nada muda.
     */
    private void repositionAfterReactivation(RecurringTransaction recurringTransaction) {
        LocalDate today = LocalDate.now();
        if (!recurringTransaction.getNextExecutionDate().isBefore(today)) {
            return;
        }
        LocalDate candidate = recurringTransaction.getNextExecutionDate();
        int guard = 0;
        while (candidate.isBefore(today) && guard++ < MAX_REPOSITION_ITERATIONS) {
            candidate = RecurrenceDateCalculator.next(recurringTransaction.getStartDate(), candidate,
                    recurringTransaction.getFrequency());
        }
        recurringTransaction.rescheduleNextExecution(candidate);
    }

    @Transactional(readOnly = true)
    public RecurringTransactionResponse get(Long userId, Long id) {
        return RecurringTransactionResponse.from(findOwned(userId, id));
    }

    @Transactional(readOnly = true)
    public List<RecurringTransactionResponse> list(Long userId, TransactionType type, Boolean active,
                                                     RecurrenceFrequency frequency) {
        var spec = RecurringTransactionSpecifications.filter(userId, type, active, frequency);
        return recurringTransactionRepository.findAll(spec).stream()
                .map(RecurringTransactionResponse::from)
                .toList();
    }

    /**
     * Exclusão física da regra — nunca apaga as Transactions já geradas
     * (FK {@code transactions.recurring_transaction_id} é
     * {@code ON DELETE SET NULL}, ver migration V3). Diferente de
     * account/category/payment-method, não há bloqueio 409 aqui: a regra
     * não tem "uso corrente" que impeça a exclusão, apenas histórico que
     * sobrevive por conta própria.
     */
    @Transactional
    public void delete(Long userId, Long id) {
        RecurringTransaction recurringTransaction = findOwned(userId, id);
        recurringTransactionRepository.delete(recurringTransaction);
    }

    /**
     * Núcleo transacional do processador (chamado por
     * {@link RecurringTransactionProcessor}, nunca diretamente por HTTP).
     * Precisa estar num bean diferente do chamador — se estivesse no mesmo
     * bean que faz o loop sobre as regras vencidas, uma chamada
     * {@code this.processDueOccurrences(...)} contornaria o proxy AOP do
     * Spring e o {@code @Transactional} seria ignorado (self-invocation).
     * <p>
     * Lock pessimista via {@code findByIdForUpdate} + a constraint UNIQUE de
     * {@code transactions(recurring_transaction_id, recurrence_date)} (migration
     * V3) são as duas camadas de proteção contra duplicidade descritas no
     * PR: a primeira evita que duas execuções concorrentes processem a
     * mesma regra ao mesmo tempo; a segunda garante que, mesmo se isso
     * falhasse por algum motivo, o banco rejeitaria o INSERT duplicado.
     * Gerar a Transaction e avançar {@code nextExecutionDate} acontecem na
     * mesma transação de banco — se o processo morrer no meio, nada comita
     * (nem a Transaction, nem o avanço), e a próxima rodada reprocessa essa
     * ocorrência do zero, sem duplicidade nem perda.
     */
    @Transactional
    public int processDueOccurrences(Long recurringTransactionId, LocalDate today) {
        RecurringTransaction recurringTransaction = recurringTransactionRepository
                .findByIdForUpdate(recurringTransactionId)
                .orElse(null);
        // Pode ter sido excluída ou desativada entre a varredura (sem lock)
        // e esta releitura (com lock) — nada a fazer, não é uma falha.
        if (recurringTransaction == null || !recurringTransaction.isActive()) {
            return 0;
        }

        int generated = 0;
        int guard = 0;
        while (recurringTransaction.isActive()
                && !recurringTransaction.getNextExecutionDate().isAfter(today)
                && isWithinEndDate(recurringTransaction)
                && guard++ < MAX_CATCHUP_ITERATIONS) {
            LocalDate occurrence = recurringTransaction.getNextExecutionDate();
            transactionService.createFromRecurrence(recurringTransaction, occurrence);
            LocalDate next = RecurrenceDateCalculator.next(recurringTransaction.getStartDate(), occurrence,
                    recurringTransaction.getFrequency());
            recurringTransaction.recordExecution(occurrence, next);
            generated++;
        }
        if (guard >= MAX_CATCHUP_ITERATIONS) {
            log.warn("Recorrência {} atingiu o limite de {} ocorrências catch-up nesta rodada; continua na próxima",
                    recurringTransactionId, MAX_CATCHUP_ITERATIONS);
        }
        return generated;
    }

    private boolean isWithinEndDate(RecurringTransaction recurringTransaction) {
        return recurringTransaction.getEndDate() == null
                || !recurringTransaction.getNextExecutionDate().isAfter(recurringTransaction.getEndDate());
    }

    private void assertCategoryCompatible(Category category, TransactionType transactionType) {
        if (category.getType() != transactionType) {
            throw new InvalidTransactionException(
                    "O tipo da categoria (%s) é incompatível com o tipo da recorrência (%s)"
                            .formatted(category.getType(), transactionType));
        }
    }

    private void assertEndDateValid(LocalDate startDate, LocalDate endDate) {
        if (endDate != null && endDate.isBefore(startDate)) {
            throw new InvalidTransactionException("Data final não pode ser anterior à data de início");
        }
    }

    private RecurringTransaction findOwned(Long userId, Long id) {
        return recurringTransactionRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Recorrência não encontrada"));
    }

    private Account findOwnedAccount(Long userId, Long accountId) {
        return accountRepository.findByIdAndUserId(accountId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Conta não encontrada"));
    }

    private Category findOwnedCategory(Long userId, Long categoryId) {
        return categoryRepository.findByIdAndUserId(categoryId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Categoria não encontrada"));
    }

    private PaymentMethod findOwnedPaymentMethod(Long userId, Long paymentMethodId) {
        return paymentMethodRepository.findByIdAndUserId(paymentMethodId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Método de pagamento não encontrado"));
    }
}
