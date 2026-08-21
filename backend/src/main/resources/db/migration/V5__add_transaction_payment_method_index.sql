-- Fase 8: relatórios. Todos os relatórios agregam sobre transactions
-- (nenhuma tabela nova — não criamos nova fonte de verdade, ARCHITECTURE.md
-- §9.3). Os índices existentes (user_id+date, user_id+type+date,
-- user_id+category_id, user_id+account_id) já cobrem os filtros de
-- summary/série temporal/categoria/conta/top transações. O único relatório
-- sem cobertura era "distribuição por método de pagamento" (agrupa por
-- payment_method_id dentro de um período) — não existia nenhum índice pelo
-- payment_method_id, então adicionamos o equivalente ao que já existe para
-- category_id/account_id.

CREATE INDEX idx_transactions_user_payment_method ON transactions (user_id, payment_method_id, date);
