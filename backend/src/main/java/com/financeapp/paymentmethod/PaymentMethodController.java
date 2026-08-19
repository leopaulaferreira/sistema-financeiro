package com.financeapp.paymentmethod;

import com.financeapp.auth.AuthenticatedUser;
import com.financeapp.paymentmethod.dto.PaymentMethodRequest;
import com.financeapp.paymentmethod.dto.PaymentMethodResponse;
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
@RequestMapping("/api/payment-methods")
public class PaymentMethodController {

    private final PaymentMethodService paymentMethodService;

    public PaymentMethodController(PaymentMethodService paymentMethodService) {
        this.paymentMethodService = paymentMethodService;
    }

    @PostMapping
    public ResponseEntity<PaymentMethodResponse> create(@AuthenticationPrincipal AuthenticatedUser principal,
                                                          @Valid @RequestBody PaymentMethodRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(paymentMethodService.create(principal.id(), request));
    }

    @GetMapping
    public List<PaymentMethodResponse> list(@AuthenticationPrincipal AuthenticatedUser principal) {
        return paymentMethodService.list(principal.id());
    }

    @GetMapping("/{id}")
    public PaymentMethodResponse get(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable Long id) {
        return paymentMethodService.get(principal.id(), id);
    }

    @PutMapping("/{id}")
    public PaymentMethodResponse update(@AuthenticationPrincipal AuthenticatedUser principal,
                                         @PathVariable Long id,
                                         @Valid @RequestBody PaymentMethodRequest request) {
        return paymentMethodService.update(principal.id(), id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable Long id) {
        paymentMethodService.delete(principal.id(), id);
        return ResponseEntity.noContent().build();
    }
}
