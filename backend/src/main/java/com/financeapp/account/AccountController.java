package com.financeapp.account;

import com.financeapp.account.dto.AccountRequest;
import com.financeapp.account.dto.AccountResponse;
import com.financeapp.account.dto.AccountUpdateRequest;
import com.financeapp.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @PostMapping
    public ResponseEntity<AccountResponse> create(@AuthenticationPrincipal AuthenticatedUser principal,
                                                    @Valid @RequestBody AccountRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(accountService.create(principal.id(), request));
    }

    @GetMapping
    public List<AccountResponse> list(@AuthenticationPrincipal AuthenticatedUser principal) {
        return accountService.list(principal.id());
    }

    @GetMapping("/{id}")
    public AccountResponse get(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable Long id) {
        return accountService.get(principal.id(), id);
    }

    @PutMapping("/{id}")
    public AccountResponse update(@AuthenticationPrincipal AuthenticatedUser principal,
                                   @PathVariable Long id,
                                   @Valid @RequestBody AccountUpdateRequest request) {
        return accountService.update(principal.id(), id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable Long id) {
        accountService.delete(principal.id(), id);
        return ResponseEntity.noContent().build();
    }
}
