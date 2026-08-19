package com.financeapp.account;

import com.financeapp.account.dto.AccountRequest;
import com.financeapp.account.dto.AccountResponse;
import com.financeapp.account.dto.AccountUpdateRequest;
import com.financeapp.common.exception.ResourceInUseException;
import com.financeapp.common.exception.ResourceNotFoundException;
import com.financeapp.transaction.TransactionRepository;
import com.financeapp.user.User;
import com.financeapp.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AccountService {

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;

    public AccountService(AccountRepository accountRepository,
                           UserRepository userRepository,
                           TransactionRepository transactionRepository) {
        this.accountRepository = accountRepository;
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
    }

    @Transactional
    public AccountResponse create(Long userId, AccountRequest request) {
        User user = userRepository.getReferenceById(userId);
        Account account = new Account(user, request.name().trim(), request.type(), request.initialBalance());
        accountRepository.save(account);
        return AccountResponse.from(account);
    }

    public List<AccountResponse> list(Long userId) {
        return accountRepository.findAllByUserIdOrderByNameAsc(userId).stream()
                .map(AccountResponse::from)
                .toList();
    }

    public AccountResponse get(Long userId, Long id) {
        return AccountResponse.from(findOwned(userId, id));
    }

    @Transactional
    public AccountResponse update(Long userId, Long id, AccountUpdateRequest request) {
        Account account = findOwned(userId, id);
        account.update(request.name().trim(), request.type(), request.initialBalance(), request.active());
        return AccountResponse.from(account);
    }

    @Transactional
    public void delete(Long userId, Long id) {
        Account account = findOwned(userId, id);
        if (transactionRepository.existsByAccountId(account.getId())) {
            throw new ResourceInUseException("Não é possível excluir uma conta com transações vinculadas");
        }
        accountRepository.delete(account);
    }

    private Account findOwned(Long userId, Long id) {
        return accountRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Conta não encontrada"));
    }
}
