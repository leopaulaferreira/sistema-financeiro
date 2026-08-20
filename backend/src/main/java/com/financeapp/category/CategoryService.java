package com.financeapp.category;

import com.financeapp.category.dto.CategoryRequest;
import com.financeapp.category.dto.CategoryResponse;
import com.financeapp.common.TransactionType;
import com.financeapp.common.exception.ResourceInUseException;
import com.financeapp.common.exception.ResourceNotFoundException;
import com.financeapp.recurring.RecurringTransactionRepository;
import com.financeapp.transaction.TransactionRepository;
import com.financeapp.user.User;
import com.financeapp.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final RecurringTransactionRepository recurringTransactionRepository;

    public CategoryService(CategoryRepository categoryRepository,
                            UserRepository userRepository,
                            TransactionRepository transactionRepository,
                            RecurringTransactionRepository recurringTransactionRepository) {
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
        this.recurringTransactionRepository = recurringTransactionRepository;
    }

    @Transactional
    public CategoryResponse create(Long userId, CategoryRequest request) {
        User user = userRepository.getReferenceById(userId);
        Category category = new Category(user, request.name().trim(), request.type(), request.color(), request.icon());
        categoryRepository.save(category);
        return CategoryResponse.from(category);
    }

    public List<CategoryResponse> list(Long userId, TransactionType type) {
        List<Category> categories = type == null
                ? categoryRepository.findAllByUserIdOrderByNameAsc(userId)
                : categoryRepository.findAllByUserIdAndTypeOrderByNameAsc(userId, type);
        return categories.stream().map(CategoryResponse::from).toList();
    }

    public CategoryResponse get(Long userId, Long id) {
        return CategoryResponse.from(findOwned(userId, id));
    }

    @Transactional
    public CategoryResponse update(Long userId, Long id, CategoryRequest request) {
        Category category = findOwned(userId, id);
        category.update(request.name().trim(), request.type(), request.color(), request.icon());
        return CategoryResponse.from(category);
    }

    @Transactional
    public void delete(Long userId, Long id) {
        Category category = findOwned(userId, id);
        if (transactionRepository.existsByCategoryId(category.getId())) {
            throw new ResourceInUseException("Não é possível excluir uma categoria com transações vinculadas");
        }
        if (recurringTransactionRepository.existsByCategoryId(category.getId())) {
            throw new ResourceInUseException("Não é possível excluir uma categoria com recorrências vinculadas");
        }
        categoryRepository.delete(category);
    }

    private Category findOwned(Long userId, Long id) {
        return categoryRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Categoria não encontrada"));
    }
}
