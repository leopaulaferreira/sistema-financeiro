package com.financeapp.dashboard;

import com.financeapp.auth.AuthenticatedUser;
import com.financeapp.dashboard.dto.AccountBalanceResponse;
import com.financeapp.dashboard.dto.CategoryExpenseResponse;
import com.financeapp.dashboard.dto.DailyIncomeExpenseResponse;
import com.financeapp.dashboard.dto.DashboardSummaryResponse;
import com.financeapp.transaction.dto.TransactionResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@Validated
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/summary")
    public DashboardSummaryResponse summary(@AuthenticationPrincipal AuthenticatedUser principal,
                                             @RequestParam @Min(1) int year,
                                             @RequestParam @Min(1) @Max(12) int month) {
        return dashboardService.summary(principal.id(), year, month);
    }

    @GetMapping("/expenses-by-category")
    public List<CategoryExpenseResponse> expensesByCategory(@AuthenticationPrincipal AuthenticatedUser principal,
                                                              @RequestParam @Min(1) int year,
                                                              @RequestParam @Min(1) @Max(12) int month) {
        return dashboardService.expensesByCategory(principal.id(), year, month);
    }

    @GetMapping("/income-vs-expense")
    public List<DailyIncomeExpenseResponse> incomeVsExpense(@AuthenticationPrincipal AuthenticatedUser principal,
                                                              @RequestParam @Min(1) int year,
                                                              @RequestParam @Min(1) @Max(12) int month) {
        return dashboardService.incomeVsExpense(principal.id(), year, month);
    }

    @GetMapping("/recent-transactions")
    public List<TransactionResponse> recentTransactions(@AuthenticationPrincipal AuthenticatedUser principal,
                                                          @RequestParam(required = false) @Min(1) Integer limit) {
        return dashboardService.recentTransactions(principal.id(), limit);
    }

    @GetMapping("/accounts-balance")
    public List<AccountBalanceResponse> accountsBalance(@AuthenticationPrincipal AuthenticatedUser principal) {
        return dashboardService.accountsBalance(principal.id());
    }
}
