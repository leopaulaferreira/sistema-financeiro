package com.financeapp.category;

import com.financeapp.auth.AuthenticatedUser;
import com.financeapp.category.dto.CategoryRequest;
import com.financeapp.category.dto.CategoryResponse;
import com.financeapp.common.TransactionType;
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
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @PostMapping
    public ResponseEntity<CategoryResponse> create(@AuthenticationPrincipal AuthenticatedUser principal,
                                                     @Valid @RequestBody CategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(categoryService.create(principal.id(), request));
    }

    @GetMapping
    public List<CategoryResponse> list(@AuthenticationPrincipal AuthenticatedUser principal,
                                        @RequestParam(required = false) TransactionType type) {
        return categoryService.list(principal.id(), type);
    }

    @GetMapping("/{id}")
    public CategoryResponse get(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable Long id) {
        return categoryService.get(principal.id(), id);
    }

    @PutMapping("/{id}")
    public CategoryResponse update(@AuthenticationPrincipal AuthenticatedUser principal,
                                    @PathVariable Long id,
                                    @Valid @RequestBody CategoryRequest request) {
        return categoryService.update(principal.id(), id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable Long id) {
        categoryService.delete(principal.id(), id);
        return ResponseEntity.noContent().build();
    }
}
