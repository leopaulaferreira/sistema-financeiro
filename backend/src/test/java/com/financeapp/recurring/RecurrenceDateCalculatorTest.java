package com.financeapp.recurring;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class RecurrenceDateCalculatorTest {

    @Test
    void daily_addsOneDay() {
        LocalDate start = LocalDate.of(2026, 8, 10);
        assertThat(RecurrenceDateCalculator.next(start, start, RecurrenceFrequency.DAILY))
                .isEqualTo(LocalDate.of(2026, 8, 11));
    }

    @Test
    void weekly_addsSevenDays() {
        LocalDate start = LocalDate.of(2026, 8, 10);
        assertThat(RecurrenceDateCalculator.next(start, start, RecurrenceFrequency.WEEKLY))
                .isEqualTo(LocalDate.of(2026, 8, 17));
    }

    @Test
    void monthly_preservesDayWhenTargetMonthHasIt() {
        LocalDate start = LocalDate.of(2026, 1, 15);
        assertThat(RecurrenceDateCalculator.next(start, start, RecurrenceFrequency.MONTHLY))
                .isEqualTo(LocalDate.of(2026, 2, 15));
    }

    @Test
    void monthly_day31_clampsToLastDayOfShorterMonth() {
        LocalDate start = LocalDate.of(2026, 1, 31);
        LocalDate feb = RecurrenceDateCalculator.next(start, start, RecurrenceFrequency.MONTHLY);
        assertThat(feb).isEqualTo(LocalDate.of(2026, 2, 28)); // 2026 não é bissexto
    }

    @Test
    void monthly_day31_doesNotDegradeCumulatively_recoversToDay31InLongerMonth() {
        // 31/01 -> 28/02 -> 31/03: se o cálculo usasse o dia da ocorrência
        // anterior (28) em vez do dia âncora (31) de startDate, março sairia
        // 28/03 em vez de 31/03 — essa é a degradação que a âncora evita.
        LocalDate start = LocalDate.of(2026, 1, 31);
        LocalDate feb = RecurrenceDateCalculator.next(start, start, RecurrenceFrequency.MONTHLY);
        LocalDate mar = RecurrenceDateCalculator.next(start, feb, RecurrenceFrequency.MONTHLY);
        assertThat(feb).isEqualTo(LocalDate.of(2026, 2, 28));
        assertThat(mar).isEqualTo(LocalDate.of(2026, 3, 31));
    }

    @Test
    void monthly_day30_clampsInFebruaryThenRecoversInMarch() {
        LocalDate start = LocalDate.of(2026, 1, 30);
        LocalDate feb = RecurrenceDateCalculator.next(start, start, RecurrenceFrequency.MONTHLY);
        LocalDate mar = RecurrenceDateCalculator.next(start, feb, RecurrenceFrequency.MONTHLY);
        assertThat(feb).isEqualTo(LocalDate.of(2026, 2, 28));
        assertThat(mar).isEqualTo(LocalDate.of(2026, 3, 30));
    }

    @Test
    void yearly_preservesMonthAndDay() {
        LocalDate start = LocalDate.of(2026, 3, 10);
        assertThat(RecurrenceDateCalculator.next(start, start, RecurrenceFrequency.YEARLY))
                .isEqualTo(LocalDate.of(2027, 3, 10));
    }

    @Test
    void yearly_feb29Anchor_clampsToFeb28InNonLeapYear() {
        LocalDate start = LocalDate.of(2024, 2, 29); // 2024 é bissexto
        LocalDate next = RecurrenceDateCalculator.next(start, start, RecurrenceFrequency.YEARLY);
        assertThat(next).isEqualTo(LocalDate.of(2025, 2, 28));
    }

    @Test
    void yearly_feb29Anchor_recoversToFeb29OnNextLeapYear() {
        LocalDate start = LocalDate.of(2024, 2, 29);
        LocalDate y2025 = RecurrenceDateCalculator.next(start, start, RecurrenceFrequency.YEARLY);
        LocalDate y2026 = RecurrenceDateCalculator.next(start, y2025, RecurrenceFrequency.YEARLY);
        LocalDate y2027 = RecurrenceDateCalculator.next(start, y2026, RecurrenceFrequency.YEARLY);
        LocalDate y2028 = RecurrenceDateCalculator.next(start, y2027, RecurrenceFrequency.YEARLY);
        assertThat(y2025).isEqualTo(LocalDate.of(2025, 2, 28));
        assertThat(y2026).isEqualTo(LocalDate.of(2026, 2, 28));
        assertThat(y2027).isEqualTo(LocalDate.of(2027, 2, 28));
        assertThat(y2028).isEqualTo(LocalDate.of(2028, 2, 29)); // 2028 é bissexto
    }
}
