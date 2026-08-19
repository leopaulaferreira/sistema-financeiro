package com.financeapp.paymentmethod;

import com.financeapp.common.exception.ResourceInUseException;
import com.financeapp.common.exception.ResourceNotFoundException;
import com.financeapp.paymentmethod.dto.PaymentMethodRequest;
import com.financeapp.paymentmethod.dto.PaymentMethodResponse;
import com.financeapp.transaction.TransactionRepository;
import com.financeapp.user.User;
import com.financeapp.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PaymentMethodService {

    private final PaymentMethodRepository paymentMethodRepository;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;

    public PaymentMethodService(PaymentMethodRepository paymentMethodRepository,
                                 UserRepository userRepository,
                                 TransactionRepository transactionRepository) {
        this.paymentMethodRepository = paymentMethodRepository;
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
    }

    @Transactional
    public PaymentMethodResponse create(Long userId, PaymentMethodRequest request) {
        User user = userRepository.getReferenceById(userId);
        PaymentMethod paymentMethod = new PaymentMethod(user, request.name().trim(), request.type());
        paymentMethodRepository.save(paymentMethod);
        return PaymentMethodResponse.from(paymentMethod);
    }

    public List<PaymentMethodResponse> list(Long userId) {
        return paymentMethodRepository.findAllByUserIdOrderByNameAsc(userId).stream()
                .map(PaymentMethodResponse::from)
                .toList();
    }

    public PaymentMethodResponse get(Long userId, Long id) {
        return PaymentMethodResponse.from(findOwned(userId, id));
    }

    @Transactional
    public PaymentMethodResponse update(Long userId, Long id, PaymentMethodRequest request) {
        PaymentMethod paymentMethod = findOwned(userId, id);
        paymentMethod.update(request.name().trim(), request.type());
        return PaymentMethodResponse.from(paymentMethod);
    }

    @Transactional
    public void delete(Long userId, Long id) {
        PaymentMethod paymentMethod = findOwned(userId, id);
        if (transactionRepository.existsByPaymentMethodId(paymentMethod.getId())) {
            throw new ResourceInUseException("Não é possível excluir um método de pagamento com transações vinculadas");
        }
        paymentMethodRepository.delete(paymentMethod);
    }

    private PaymentMethod findOwned(Long userId, Long id) {
        return paymentMethodRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Método de pagamento não encontrado"));
    }
}
