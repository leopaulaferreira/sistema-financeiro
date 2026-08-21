package com.financeapp.report;

import com.financeapp.auth.AuthenticatedUser;
import com.financeapp.common.TransactionType;
import com.financeapp.report.dto.AccountFlowResponse;
import com.financeapp.report.dto.BalancePointResponse;
import com.financeapp.report.dto.CategoryReportResponse;
import com.financeapp.report.dto.FinancialSummaryResponse;
import com.financeapp.report.dto.IncomeExpenseSeriesPointResponse;
import com.financeapp.report.dto.MonthlyComparisonResponse;
import com.financeapp.report.dto.PaymentMethodReportResponse;
import com.financeapp.transaction.dto.TransactionResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/reports")
@Validated
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/summary")
    public FinancialSummaryResponse summary(@AuthenticationPrincipal AuthenticatedUser principal,
                                             @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                             @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return reportService.summary(principal.id(), from, to);
    }

    @GetMapping("/income-vs-expense")
    public List<IncomeExpenseSeriesPointResponse> incomeVsExpense(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "DAY") Granularity granularity) {
        return reportService.incomeVsExpense(principal.id(), from, to, granularity);
    }

    @GetMapping("/expenses-by-category")
    public List<CategoryReportResponse> expensesByCategory(@AuthenticationPrincipal AuthenticatedUser principal,
                                                             @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                             @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return reportService.expensesByCategory(principal.id(), from, to);
    }

    @GetMapping("/income-by-category")
    public List<CategoryReportResponse> incomeByCategory(@AuthenticationPrincipal AuthenticatedUser principal,
                                                           @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                           @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return reportService.incomeByCategory(principal.id(), from, to);
    }

    @GetMapping("/accounts-flow")
    public List<AccountFlowResponse> accountsFlow(@AuthenticationPrincipal AuthenticatedUser principal,
                                                    @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                    @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return reportService.accountsFlow(principal.id(), from, to);
    }

    @GetMapping("/balance-evolution")
    public List<BalancePointResponse> balanceEvolution(@AuthenticationPrincipal AuthenticatedUser principal,
                                                         @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                         @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return reportService.balanceEvolution(principal.id(), from, to);
    }

    @GetMapping("/monthly-comparison")
    public List<MonthlyComparisonResponse> monthlyComparison(@AuthenticationPrincipal AuthenticatedUser principal,
                                                               @RequestParam(defaultValue = "6") @Min(1) @Max(24) int months) {
        return reportService.monthlyComparison(principal.id(), months);
    }

    @GetMapping("/top-expenses")
    public List<TransactionResponse> topExpenses(@AuthenticationPrincipal AuthenticatedUser principal,
                                                   @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                   @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                                   @RequestParam(defaultValue = "10") @Min(1) @Max(50) int limit) {
        return reportService.topExpenses(principal.id(), from, to, limit);
    }

    @GetMapping("/top-income")
    public List<TransactionResponse> topIncome(@AuthenticationPrincipal AuthenticatedUser principal,
                                                 @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                 @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                                 @RequestParam(defaultValue = "10") @Min(1) @Max(50) int limit) {
        return reportService.topIncome(principal.id(), from, to, limit);
    }

    @GetMapping("/payment-methods")
    public List<PaymentMethodReportResponse> paymentMethods(@AuthenticationPrincipal AuthenticatedUser principal,
                                                              @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                              @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return reportService.paymentMethods(principal.id(), from, to);
    }

    @GetMapping("/export.csv")
    public ResponseEntity<byte[]> exportCsv(@AuthenticationPrincipal AuthenticatedUser principal,
                                             @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                             @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                             @RequestParam(required = false) TransactionType type,
                                             @RequestParam(required = false) Long categoryId,
                                             @RequestParam(required = false) Long accountId) {
        byte[] csv = reportService.exportCsv(principal.id(), from, to, type, categoryId, accountId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv;charset=UTF-8"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"relatorio-transacoes.csv\"")
                .body(csv);
    }
}
