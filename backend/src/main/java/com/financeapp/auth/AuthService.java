package com.financeapp.auth;

import com.financeapp.auth.dto.LoginRequest;
import com.financeapp.auth.dto.RegisterRequest;
import com.financeapp.auth.dto.UserResponse;
import com.financeapp.common.exception.DuplicateResourceException;
import com.financeapp.common.exception.InvalidCredentialsException;
import com.financeapp.common.exception.InvalidTokenException;
import com.financeapp.common.exception.ResourceNotFoundException;
import com.financeapp.user.User;
import com.financeapp.user.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;

    public AuthService(UserRepository userRepository,
                        PasswordEncoder passwordEncoder,
                        JwtService jwtService,
                        RefreshTokenService refreshTokenService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
    }

    public record TokenPair(String accessToken, String rawRefreshToken) {
    }

    public record LoginResult(UserResponse user, TokenPair tokens) {
    }

    @Transactional
    public UserResponse register(RegisterRequest request) {
        String normalizedEmail = request.email().trim().toLowerCase();
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new DuplicateResourceException("Já existe uma conta com este e-mail");
        }
        User user = new User(request.name().trim(), normalizedEmail, passwordEncoder.encode(request.password()));
        userRepository.save(user);
        return UserResponse.from(user);
    }

    @Transactional
    public LoginResult login(LoginRequest request, String userAgent) {
        String normalizedEmail = request.email().trim().toLowerCase();
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new InvalidCredentialsException("E-mail ou senha inválidos"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException("E-mail ou senha inválidos");
        }

        TokenPair tokens = issueTokens(user, userAgent);
        return new LoginResult(UserResponse.from(user), tokens);
    }

    // noRollbackFor: quando RefreshTokenService#rotate detecta reuso, ela
    // revoga todas as sessões do usuário e então lança InvalidTokenException.
    // Como este método é o dono da transação física (é o primeiro método
    // @Transactional na cadeia de chamada a partir do controller), sem esta
    // anotação aqui — não bastando apenas em rotate() — o Spring marcaria a
    // transação inteira para rollback ao ver a exceção subir, desfazendo a
    // própria revogação de segurança que acabou de ser persistida.
    @Transactional(noRollbackFor = InvalidTokenException.class)
    public TokenPair refresh(String rawRefreshToken, String userAgent) {
        RefreshTokenService.RotatedToken rotated = refreshTokenService.rotate(rawRefreshToken, userAgent);
        User user = rotated.user();
        String accessToken = jwtService.generateAccessToken(new AuthenticatedUser(user.getId(), user.getEmail()));
        return new TokenPair(accessToken, rotated.issued().rawValue());
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            refreshTokenService.revoke(rawRefreshToken);
        }
    }

    public UserResponse me(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
        return UserResponse.from(user);
    }

    private TokenPair issueTokens(User user, String userAgent) {
        RefreshTokenService.IssuedToken refresh = refreshTokenService.issue(user, userAgent);
        String accessToken = jwtService.generateAccessToken(new AuthenticatedUser(user.getId(), user.getEmail()));
        return new TokenPair(accessToken, refresh.rawValue());
    }
}
