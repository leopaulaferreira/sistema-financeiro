package com.financeapp.budget;

import com.financeapp.auth.AuthenticatedUser;
import com.financeapp.budget.dto.BudgetCreateRequest;
import com.financeapp.budget.dto.BudgetResponse;
import com.financeapp.budget.dto.BudgetUpdateRequest;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/budgets")
public class BudgetController {

    private final BudgetService budgetService;

    public BudgetController(BudgetService budgetService) {
        this.budgetService = budgetService;
    }

    @PostMapping
    public ResponseEntity<BudgetResponse> create(@AuthenticationPrincipal AuthenticatedUser principal,
                                                  @Valid @RequestBody BudgetCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(budgetService.create(principal.id(), request));
    }

    @GetMapping
    public List<BudgetResponse> list(@AuthenticationPrincipal AuthenticatedUser principal,
                                      @RequestParam(required = false) Integer year,
                                      @RequestParam(required = false) Integer month,
                                      @RequestParam(required = false) Long categoryId) {
        return budgetService.list(principal.id(), year, month, categoryId);
    }

    @GetMapping("/{id}")
    public BudgetResponse get(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable Long id) {
        return budgetService.get(principal.id(), id);
    }

    @PutMapping("/{id}")
    public BudgetResponse update(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable Long id,
                                  @Valid @RequestBody BudgetUpdateRequest request) {
        return budgetService.update(principal.id(), id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable Long id) {
        budgetService.delete(principal.id(), id);
        return ResponseEntity.noContent().build();
    }
}
