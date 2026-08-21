package com.financeapp.goal;

import com.financeapp.auth.AuthenticatedUser;
import com.financeapp.goal.dto.FinancialGoalCreateRequest;
import com.financeapp.goal.dto.FinancialGoalResponse;
import com.financeapp.goal.dto.FinancialGoalUpdateRequest;
import com.financeapp.goal.dto.GoalContributionCreateRequest;
import com.financeapp.goal.dto.GoalContributionResponse;
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
@RequestMapping("/api/goals")
public class GoalController {

    private final GoalService goalService;

    public GoalController(GoalService goalService) {
        this.goalService = goalService;
    }

    @PostMapping
    public ResponseEntity<FinancialGoalResponse> create(@AuthenticationPrincipal AuthenticatedUser principal,
                                                          @Valid @RequestBody FinancialGoalCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(goalService.create(principal.id(), request));
    }

    @GetMapping
    public List<FinancialGoalResponse> list(@AuthenticationPrincipal AuthenticatedUser principal,
                                             @RequestParam(required = false) GoalStatus status) {
        return goalService.list(principal.id(), status);
    }

    @GetMapping("/{id}")
    public FinancialGoalResponse get(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable Long id) {
        return goalService.get(principal.id(), id);
    }

    @PutMapping("/{id}")
    public FinancialGoalResponse update(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable Long id,
                                         @Valid @RequestBody FinancialGoalUpdateRequest request) {
        return goalService.update(principal.id(), id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable Long id) {
        goalService.delete(principal.id(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{goalId}/contributions")
    public List<GoalContributionResponse> listContributions(@AuthenticationPrincipal AuthenticatedUser principal,
                                                              @PathVariable Long goalId) {
        return goalService.listContributions(principal.id(), goalId);
    }

    @PostMapping("/{goalId}/contributions")
    public ResponseEntity<GoalContributionResponse> addContribution(@AuthenticationPrincipal AuthenticatedUser principal,
                                                                      @PathVariable Long goalId,
                                                                      @Valid @RequestBody GoalContributionCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(goalService.addContribution(principal.id(), goalId, request));
    }

    @DeleteMapping("/{goalId}/contributions/{contributionId}")
    public ResponseEntity<Void> removeContribution(@AuthenticationPrincipal AuthenticatedUser principal,
                                                     @PathVariable Long goalId, @PathVariable Long contributionId) {
        goalService.removeContribution(principal.id(), goalId, contributionId);
        return ResponseEntity.noContent().build();
    }
}
