-- Fase 6: recorrências. recurring_transactions é uma REGRA GERADORA — nunca
-- substitui transactions, que continua sendo o lançamento atômico
-- (ARCHITECTURE.md §9.3.1). Mesmo padrão de tipos VARCHAR + CHECK das
-- migrations anteriores (não enum nativo do Postgres).

CREATE TABLE recurring_transactions (
    id                   BIGSERIAL PRIMARY KEY,
    user_id              BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id           BIGINT NOT NULL REFERENCES accounts(id),
    category_id          BIGINT NOT NULL REFERENCES categories(id),
    payment_method_id    BIGINT NOT NULL REFERENCES payment_methods(id),
    description          VARCHAR(160) NOT NULL,
    amount               NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    type                 VARCHAR(20) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    frequency            VARCHAR(20) NOT NULL CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY')),
    start_date           DATE NOT NULL,
    end_date             DATE,
    next_execution_date  DATE NOT NULL,
    last_execution_date  DATE,
    active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_recurring_transactions_user ON recurring_transactions (user_id);

-- Consulta central do processador: recorrências ativas vencidas, agendador
-- roda sem filtro de usuário (varre todos).
CREATE INDEX idx_recurring_transactions_due ON recurring_transactions (active, next_execution_date);

-- Vínculo entre uma Transaction gerada e a ocorrência específica da regra
-- que a originou. NULL em ambas as colunas para toda transação criada
-- manualmente (a esmagadora maioria) — Postgres trata cada par de NULLs
-- como distinto, então a UNIQUE abaixo não impede múltiplas transações
-- manuais coexistirem.
ALTER TABLE transactions
    ADD COLUMN recurring_transaction_id BIGINT REFERENCES recurring_transactions(id) ON DELETE SET NULL,
    ADD COLUMN recurrence_date DATE;

-- Última linha de defesa contra duplicidade (ARCHITECTURE.md, seção de
-- idempotência da Fase 6): uma ocorrência específica de uma recorrência
-- (par regra+data) nunca pode gerar duas transactions, mesmo se toda
-- proteção em Java falhar.
ALTER TABLE transactions
    ADD CONSTRAINT uq_transactions_recurring_occurrence UNIQUE (recurring_transaction_id, recurrence_date);

CREATE INDEX idx_transactions_recurring_transaction ON transactions (recurring_transaction_id);
