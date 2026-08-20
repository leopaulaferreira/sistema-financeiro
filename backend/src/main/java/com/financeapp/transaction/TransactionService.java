package com.financeapp.transaction;

import com.financeapp.account.Account;
import com.financeapp.account.AccountRepository;
import com.financeapp.category.Category;
import com.financeapp.category.CategoryRepository;
import com.financeapp.common.TransactionType;
import com.financeapp.common.exception.InvalidTransactionException;
import com.financeapp.common.exception.ResourceNotFoundException;
import com.financeapp.common.pagination.PageResponse;
import com.financeapp.paymentmethod.PaymentMethod;
import com.financeapp.paymentmethod.PaymentMethodRepository;
import com.financeapp.recurring.RecurringTransaction;
import com.financeapp.transaction.dto.TransactionRequest;
import com.financeapp.transaction.dto.TransactionResponse;
import com.financeapp.user.User;
import com.financeapp.user.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final CategoryRepository categoryRepository;
    private final PaymentMethodRepository paymentMethodRepository;
    private final UserRepository userRepository;

    public TransactionService(TransactionRepository transactionRepository,
                               AccountRepository accountRepository,
                               CategoryRepository categoryRepository,
                               PaymentMethodRepository paymentMethodRepository,
                               UserRepository userRepository) {
        this.transactionRepository = transactionRepository;
        this.accountRepository = accountRepository;
        this.categoryRepository = categoryRepository;
        this.paymentMethodRepository = paymentMethodRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public TransactionResponse create(Long userId, TransactionRequest request) {
        Account account = findOwnedAccount(userId, request.accountId());
        Category category = findOwnedCategory(userId, request.categoryId());
        PaymentMethod paymentMethod = findOwnedPaymentMethod(userId, request.paymentMethodId());
        assertCategoryCompatible(category, request.type());

        User user = userRepository.getReferenceById(userId);
        Transaction transaction = new Transaction(user, account, category, paymentMethod,
                request.description().trim(), request.amount(), request.type(), request.date(),
                normalizeNotes(request.notes()));
        transactionRepository.save(transaction);
        return TransactionResponse.from(transaction);
    }

    /**
     * Cria a Transaction gerada por uma ocorrência de recorrência (Fase 6).
     * Reaproveita a mesma entidade/invariantes de {@link #create}, mas os
     * relacionamentos já vêm resolvidos e verificados pelo
     * {@code RecurringTransactionService} no momento em que a regra foi
     * criada/editada — o processador não repete essas checagens de posse a
     * cada execução, só confia no que a regra já validou. {@code @Transactional}
     * aqui entra na MESMA transação de banco do chamador (propagação
     * REQUIRED, padrão), o que é essencial para a atomicidade descrita em
     * {@code RecurringTransactionProcessor}: gerar a Transaction e avançar
     * {@code nextExecutionDate} da regra precisam comitar juntos ou não
     * comitar nenhum dos dois.
     */
    @Transactional
    public Transaction createFromRecurrence(RecurringTransaction source, LocalDate recurrenceDate) {
        Transaction transaction = new Transaction(source.getUser(), source.getAccount(), source.getCategory(),
                source.getPaymentMethod(), source.getDescription(), source.getAmount(), source.getType(),
                recurrenceDate, null);
        transaction.linkToRecurrence(source, recurrenceDate);
        transactionRepository.save(transaction);
        return transaction;
    }

    @Transactional
    public TransactionResponse update(Long userId, Long id, TransactionRequest request) {
        Transaction transaction = findOwned(userId, id);
        Account account = findOwnedAccount(userId, request.accountId());
        Category category = findOwnedCategory(userId, request.categoryId());
        PaymentMethod paymentMethod = findOwnedPaymentMethod(userId, request.paymentMethodId());
        assertCategoryCompatible(category, request.type());

        transaction.update(account, category, paymentMethod, request.description().trim(), request.amount(),
                request.type(), request.date(), normalizeNotes(request.notes()));
        return TransactionResponse.from(transaction);
    }

    @Transactional(readOnly = true)
    public TransactionResponse get(Long userId, Long id) {
        return TransactionResponse.from(findOwned(userId, id));
    }

    @Transactional
    public void delete(Long userId, Long id) {
        Transaction transaction = findOwned(userId, id);
        transactionRepository.delete(transaction);
    }

    @Transactional(readOnly = true)
    public PageResponse<TransactionResponse> search(Long userId, LocalDate from, LocalDate to, TransactionType type,
                                                      Long categoryId, Long accountId, int page, int size) {
        var spec = TransactionSpecifications.filter(userId, from, to, type, categoryId, accountId);
        Page<Transaction> result = transactionRepository.findAll(spec, PageRequest.of(page, size));
        return PageResponse.from(result.map(TransactionResponse::from));
    }

    private void assertCategoryCompatible(Category category, TransactionType transactionType) {
        if (category.getType() != transactionType) {
            throw new InvalidTransactionException(
                    "O tipo da categoria (%s) é incompatível com o tipo da transação (%s)"
                            .formatted(category.getType(), transactionType));
        }
    }

    private String normalizeNotes(String notes) {
        return (notes == null || notes.isBlank()) ? null : notes.trim();
    }

    private Transaction findOwned(Long userId, Long id) {
        return transactionRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Transação não encontrada"));
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
