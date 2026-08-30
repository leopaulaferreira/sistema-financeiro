package com.financeapp.report;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Regressão de SEC-011 (CSV/Formula Injection): {@code csvField} deve
 * prefixar com apóstrofo qualquer valor que comece com um caractere
 * interpretado como fórmula por Excel/LibreOffice, sem quebrar o
 * escaping RFC 4180 já existente (vírgula/aspas/quebra de linha).
 */
class ReportServiceCsvFieldTest {

    @ParameterizedTest
    @ValueSource(strings = {"=1+1", "+SUM(A1:A2)", "-1+1", "@SUM(A1:A2)"})
    void valueStartingWithFormulaTrigger_isPrefixedWithApostrophe(String malicious) {
        String result = ReportService.csvField(malicious);

        assertThat(result).isEqualTo("'" + malicious);
    }

    @org.junit.jupiter.api.Test
    void valueStartingWithTab_isPrefixedWithApostrophe() {
        String malicious = "\tmalicious";

        assertThat(ReportService.csvField(malicious)).isEqualTo("'" + malicious);
    }

    @org.junit.jupiter.api.Test
    void valueStartingWithCarriageReturn_isPrefixedWithApostropheAndQuoted() {
        String malicious = "\rmalicious";

        // \r também dispara o escaping RFC 4180 (needsQuoting), então o
        // resultado vem entre aspas — o apóstrofo neutralizante continua
        // presente logo após a aspa de abertura.
        assertThat(ReportService.csvField(malicious)).isEqualTo("\"'" + malicious + "\"");
    }

    @org.junit.jupiter.api.Test
    void formulaLikeValue_neverResolvesToPlainArithmeticResult() {
        String result = ReportService.csvField("=1+1");

        assertThat(result).isNotEqualTo("1+1");
        assertThat(result).isNotEqualTo("2");
        assertThat(result).isEqualTo("'=1+1");
    }

    // ---------- regressão: comportamento normal (RFC 4180) não pode quebrar ----------

    @org.junit.jupiter.api.Test
    void plainText_isReturnedUnchanged() {
        assertThat(ReportService.csvField("Supermercado")).isEqualTo("Supermercado");
    }

    @org.junit.jupiter.api.Test
    void nullValue_returnsEmptyString() {
        assertThat(ReportService.csvField(null)).isEqualTo("");
    }

    @org.junit.jupiter.api.Test
    void valueWithComma_isQuoted() {
        assertThat(ReportService.csvField("Mercado, Padaria")).isEqualTo("\"Mercado, Padaria\"");
    }

    @org.junit.jupiter.api.Test
    void valueWithDoubleQuote_isQuotedAndEscaped() {
        assertThat(ReportService.csvField("Presente \"especial\"")).isEqualTo("\"Presente \"\"especial\"\"\"");
    }

    @org.junit.jupiter.api.Test
    void valueWithNewline_isQuoted() {
        assertThat(ReportService.csvField("Linha1\nLinha2")).isEqualTo("\"Linha1\nLinha2\"");
    }

    @org.junit.jupiter.api.Test
    void formulaTriggerNotAtStart_isNotNeutralized() {
        // o caractere de gatilho no meio do valor não é um risco de fórmula
        // (Excel só interpreta fórmula quando a célula COMEÇA com esses
        // caracteres) — não deve virar falso positivo.
        assertThat(ReportService.csvField("Total = 100")).isEqualTo("Total = 100");
    }
}
