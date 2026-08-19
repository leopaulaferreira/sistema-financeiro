-- Tipos como VARCHAR + CHECK em vez de enum nativo do Postgres: mesma
-- integridade de dados, sem a fricção de mapeamento JPA/Hibernate que
-- enums nativos exigem (ver ARCHITECTURE.md §9.3.4 para o trade-off).

CREATE TABLE accounts (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name             VARCHAR(80) NOT NULL,
    type             VARCHAR(20) NOT NULL CHECK (type IN ('CHECKING', 'SAVINGS', 'WALLET', 'CREDIT_CARD', 'INVESTMENT')),
    initial_balance  NUMERIC(12,2) NOT NULL DEFAULT 0,
    active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_accounts_user ON accounts (user_id);

CREATE TABLE categories (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       VARCHAR(60) NOT NULL,
    type       VARCHAR(20) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    color      VARCHAR(7),
    icon       VARCHAR(40),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, name, type)
);

CREATE INDEX idx_categories_user_type ON categories (user_id, type);

CREATE TABLE payment_methods (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       VARCHAR(60) NOT NULL,
    type       VARCHAR(20) NOT NULL CHECK (type IN ('CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'PIX', 'BANK_TRANSFER', 'OTHER')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, name)
);

CREATE INDEX idx_payment_methods_user ON payment_methods (user_id);

CREATE TABLE transactions (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id        BIGINT NOT NULL REFERENCES accounts(id),
    category_id       BIGINT NOT NULL REFERENCES categories(id),
    payment_method_id BIGINT NOT NULL REFERENCES payment_methods(id),
    description       VARCHAR(160) NOT NULL,
    amount            NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    type              VARCHAR(20) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    date              DATE NOT NULL,
    notes             VARCHAR(500),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user_date       ON transactions (user_id, date DESC);
CREATE INDEX idx_transactions_user_type_date  ON transactions (user_id, type, date);
CREATE INDEX idx_transactions_user_category   ON transactions (user_id, category_id);
CREATE INDEX idx_transactions_user_account    ON transactions (user_id, account_id);
