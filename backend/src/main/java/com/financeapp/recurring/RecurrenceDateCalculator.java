package com.financeapp.recurring;

import java.time.LocalDate;
import java.time.YearMonth;

/**
 * Cálculo de datas de recorrência (ARCHITECTURE.md, Fase 6). Regra central:
 * a próxima ocorrência de MONTHLY/YEARLY é sempre derivada do "dia âncora"
 * (dia/mês de {@code startDate}), nunca do dia da ocorrência anterior — isso
 * evita a degradação cumulativa 31/01 → 28/02 → 28/03 (se calculássemos a
 * partir do dia já clampado de fevereiro, março herdaria o clamp errado).
 * Com o ancoramento em {@code startDate}, 31/01 → 28/02 → 31/03, preservando
 * a intenção original do dia mesmo quando um mês intermediário não o tem.
 * Por isso não existe uma coluna separada de "anchor day": o próprio
 * {@code startDate} da recorrência já é a âncora, e editar {@code startDate}
 * depois que a regra já gerou ocorrências é bloqueado no Service.
 */
final class RecurrenceDateCalculator {

    private RecurrenceDateCalculator() {
    }

    static LocalDate next(LocalDate startDate, LocalDate current, RecurrenceFrequency frequency) {
        return switch (frequency) {
            case DAILY -> current.plusDays(1);
            case WEEKLY -> current.plusWeeks(1);
            case MONTHLY -> withAnchorDay(YearMonth.from(current).plusMonths(1), startDate.getDayOfMonth());
            case YEARLY -> yearly(startDate, current);
        };
    }

    private static LocalDate yearly(LocalDate startDate, LocalDate current) {
        YearMonth targetMonth = YearMonth.of(current.getYear() + 1, startDate.getMonthValue());
        return withAnchorDay(targetMonth, startDate.getDayOfMonth());
    }

    /**
     * Usa o último dia válido do mês de destino quando o dia âncora não
     * existe nele (ex.: âncora 31 em abril → 30; âncora 29/02 em ano não
     * bissexto → 28/02) — preferência explícita do usuário para YEARLY em
     * 29/02, aplicada também a MONTHLY pelo mesmo motivo de consistência.
     */
    private static LocalDate withAnchorDay(YearMonth month, int anchorDay) {
        int day = Math.min(anchorDay, month.lengthOfMonth());
        return month.atDay(day);
    }
}
