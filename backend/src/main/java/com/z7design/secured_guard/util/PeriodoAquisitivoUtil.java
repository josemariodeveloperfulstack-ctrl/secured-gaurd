package com.z7design.secured_guard.util;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;

/**
 * Regras de período aquisitivo de férias (CLT):
 * o direito surge após 12 meses de trabalho (admissão + 1 ano) e os períodos
 * avançam em janelas sucessivas de 12 meses a partir da data de admissão.
 */
public final class PeriodoAquisitivoUtil {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private PeriodoAquisitivoUtil() {
    }

    /** Data em que o funcionário completa o primeiro período aquisitivo (admissão + 12 meses). */
    public static LocalDate primeiroPeriodoDisponivelEm(LocalDate hireDate) {
        return hireDate == null ? null : hireDate.plusYears(1);
    }

    /** Indica se o funcionário já completou 12 meses até a data de referência. */
    public static boolean possuiPeriodoAquisitivo(LocalDate hireDate, LocalDate referencia) {
        if (hireDate == null || referencia == null) {
            return true; // sem admissão cadastrada não bloqueia
        }
        return !referencia.isBefore(hireDate.plusYears(1));
    }

    /**
     * Calcula a janela aquisitiva (12 meses) que contém a data de referência,
     * contando a partir da data de admissão.
     */
    public static LocalDate[] janelaAquisitiva(LocalDate hireDate, LocalDate referencia) {
        if (hireDate == null || referencia == null) {
            return null;
        }
        long meses = ChronoUnit.MONTHS.between(hireDate, referencia);
        long janelas = Math.max(0, meses / 12);
        LocalDate inicio = hireDate.plusMonths(janelas * 12);
        return new LocalDate[] { inicio, inicio.plusYears(1) };
    }

    /** Calcula o rótulo do período aquisitivo (ex: 2025/2026) para uma data de referência. */
    public static String calcular(LocalDate hireDate, LocalDate referencia) {
        LocalDate ref = referencia != null ? referencia : LocalDate.now();
        if (hireDate == null) {
            return ref.getYear() + "/" + (ref.getYear() + 1);
        }
        LocalDate[] janela = janelaAquisitiva(hireDate, ref);
        LocalDate inicio = janela[0];
        LocalDate fim = janela[1];
        if (inicio.getYear() == fim.getYear()) {
            return inicio.getYear() + "/" + fim.getYear();
        }
        return inicio.getYear() + "/" + fim.getYear();
    }

    public static String formatar(LocalDate data) {
        return data == null ? "" : data.format(FORMATTER);
    }
}
