-- Fase 7: orçamentos mensais por categoria e metas financeiras. Ambas as
-- entidades são autocontidas — não alteram accounts/categories/transactions
-- (só referenciam categories via FK) e não criam Transactions. Mesmo padrão
-- VARCHAR + CHECK para enums das migrations anteriores (não enum nativo do
-- Postgres).

-- budgets: category obrigatória (o orçamento é sempre por categoria) e
-- sempre de uma categoria EXPENSE (validado no Service, a FK sozinha não
-- garante o tipo). "spent" nunca é persistido aqui — é sempre calculado por
-- agregação sobre transactions em runtime (ARCHITECTURE.md §9.2).
CREATE TABLE budgets (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id  BIGINT NOT NULL REFERENCES categories(id),
    year         INTEGER NOT NULL,
    month        INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, category_id, year, month)
);

CREATE INDEX idx_budgets_user_period ON budgets (user_id, year, month);
CREATE INDEX idx_budgets_user_category_period ON budgets (user_id, category_id, year, month);

-- financial_goals: progresso nunca é persistido aqui — é sempre
-- SUM(goal_contributions.amount) (seção abaixo). status é a única coisa
-- persistida: ACTIVE/COMPLETED são recalculados automaticamente a partir
-- das contribuições, CANCELLED é sempre manual e nunca sobrescrito
-- automaticamente (ver RecurringTransactionService... equivalente em
-- GoalService.recalculateStatus).
CREATE TABLE financial_goals (
    id             BIGSERIAL PRIMARY KEY,
    user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name           VARCHAR(120) NOT NULL,
    description    VARCHAR(500),
    target_amount  NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
    target_date    DATE,
    status         VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_financial_goals_user_status ON financial_goals (user_id, status);

-- goal_contributions: histórico interno da meta, não é um lançamento
-- financeiro do sistema (diferente de transactions) — por isso
-- ON DELETE CASCADE quando a meta é excluída (ARCHITECTURE.md, seção de
-- exclusão da Fase 7), ao contrário de recurring_transactions, que usa
-- ON DELETE SET NULL para preservar transactions já geradas.
CREATE TABLE goal_contributions (
    id         BIGSERIAL PRIMARY KEY,
    goal_id    BIGINT NOT NULL REFERENCES financial_goals(id) ON DELETE CASCADE,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount     NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    date       DATE NOT NULL,
    note       VARCHAR(300),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_goal_contributions_goal_date ON goal_contributions (goal_id, date);
