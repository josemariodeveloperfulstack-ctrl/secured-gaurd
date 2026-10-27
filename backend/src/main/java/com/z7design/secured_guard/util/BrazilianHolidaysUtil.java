package com.z7design.secured_guard.util;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;

/**
 * Utilitário para cálculo e validação de feriados nacionais brasileiros
 * e conformidade com o Art. 134, § 3º da CLT.
 */
public class BrazilianHolidaysUtil {

    public record HolidayInfo(LocalDate date, String name, String type) {}

    public record ValidationResult(boolean valid, String reason) {}

    /**
     * Calcula a data do Domingo de Páscoa usando o algoritmo de Meeus/Jones/Butcher (Gregoriano Anônimo).
     */
    public static LocalDate calculateEaster(int year) {
        int a = year % 19;
        int b = year / 100;
        int c = year % 100;
        int d = b / 4;
        int e = b % 4;
        int f = (b + 8) / 25;
        int g = (b - f + 1) / 3;
        int h = (19 * a + b - d - g + 15) % 30;
        int i = c / 4;
        int k = c % 4;
        int l = (32 + 2 * e + 2 * i - h - k) % 7;
        int m = (a + 11 * h + 22 * l) / 451;
        int month = (h + l - 7 * m + 114) / 31;
        int day = ((h + l - 7 * m + 114) % 31) + 1;
        return LocalDate.of(year, month, day);
    }

    /**
     * Retorna todos os feriados nacionais oficiais brasileiros (fixos e móveis) para o ano especificado.
     */
    public static List<HolidayInfo> getNationalHolidays(int year) {
        List<HolidayInfo> list = new ArrayList<>();

        // Feriados Nacionais Fixos
        list.add(new HolidayInfo(LocalDate.of(year, 1, 1), "Confraternização Universal", "NATIONAL"));
        list.add(new HolidayInfo(LocalDate.of(year, 4, 21), "Tiradentes", "NATIONAL"));
        list.add(new HolidayInfo(LocalDate.of(year, 5, 1), "Dia do Trabalhador", "NATIONAL"));
        list.add(new HolidayInfo(LocalDate.of(year, 9, 7), "Independência do Brasil", "NATIONAL"));
        list.add(new HolidayInfo(LocalDate.of(year, 10, 12), "Nossa Senhora Aparecida", "NATIONAL"));
        list.add(new HolidayInfo(LocalDate.of(year, 11, 2), "Finados", "NATIONAL"));
        list.add(new HolidayInfo(LocalDate.of(year, 11, 15), "Proclamação da República", "NATIONAL"));
        // Dia Nacional de Zumbi e da Consciência Negra (Lei nº 14.759/2023)
        list.add(new HolidayInfo(LocalDate.of(year, 11, 20), "Dia da Consciência Negra", "NATIONAL"));
        list.add(new HolidayInfo(LocalDate.of(year, 12, 25), "Natal", "NATIONAL"));

        // Feriados Móveis baseados na Páscoa
        LocalDate easter = calculateEaster(year);
        // Terça-feira de Carnaval (47 dias antes da Páscoa)
        list.add(new HolidayInfo(easter.minusDays(47), "Carnaval", "NATIONAL"));
        // Sexta-feira Santa / Paixão de Cristo (2 dias antes da Páscoa)
        list.add(new HolidayInfo(easter.minusDays(2), "Sexta-feira Santa", "NATIONAL"));
        // Domingo de Páscoa
        list.add(new HolidayInfo(easter, "Páscoa", "NATIONAL"));
        // Corpus Christi (quinta-feira, 60 dias após a Páscoa)
        list.add(new HolidayInfo(easter.plusDays(60), "Corpus Christi", "NATIONAL"));

        return list;
    }

    /**
     * Valida se a data de início das férias respeita rigorosamente o Artigo 134, § 3º da CLT:
     * "É vedado o início das férias no período de dois dias que antecede feriado ou dia de repouso semanal remunerado."
     *
     * @param startDate Data de início proposta para as férias
     * @param customHolidays Feriados adicionais (estaduais, municipais da tabela holidays)
     * @return ValidationResult indicando se é válida ou motivo do bloqueio impeditivo.
     */
    public static ValidationResult validateStartDateCLT(LocalDate startDate, List<HolidayInfo> customHolidays) {
        return validateStartDateCLT(startDate, customHolidays, false);
    }

    /**
     * Valida se a data de início das férias respeita o Artigo 134, § 3º da CLT.
     * Na escala 12x36 (Art. 59-A da CLT), a compensação de descanso é de 36 horas ininterruptas
     * e o regime não segue o descanso semanal tradicional exclusivo em domingos/sábados.
     * Portanto, colaboradores em escala 12x36 podem iniciar férias na sexta-feira ou qualquer outro dia útil escalado,
     * respeitando-se a vedação nos 2 dias que antecedem feriados nacionais/locais.
     *
     * @param startDate Data de início proposta para as férias
     * @param customHolidays Feriados adicionais
     * @param isEscala12x36 Indica se o colaborador trabalha em regime de 12x36
     * @return ValidationResult indicando se é válida ou motivo do bloqueio impeditivo.
     */
    public static ValidationResult validateStartDateCLT(LocalDate startDate, List<HolidayInfo> customHolidays, boolean isEscala12x36) {
        if (startDate == null) {
            return new ValidationResult(false, "Data de início das férias não informada.");
        }

        // Colaboradores em escala 12x36 possuem regime de compensação contínua especial
        // e podem iniciar suas férias em feriado, sábado, domingo ou qualquer dia da semana.
        if (isEscala12x36) {
            return new ValidationResult(true, null);
        }

        DayOfWeek dow = startDate.getDayOfWeek();

        // 1. Validação de DSR (Sábado e Domingo) para escalas normais (ex: 5x2, 6x1):
        if (dow == DayOfWeek.FRIDAY) {
            return new ValidationResult(false, 
                "Violação do Art. 134, § 3º da CLT: É expressamente proibido iniciar férias na Sexta-feira, pois antecede em 2 dias o Repouso Semanal Remunerado (DSR no domingo). Escolha de Segunda a Quinta-feira.");
        }
        if (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) {
            return new ValidationResult(false, 
                "Violação do Art. 134, § 3º da CLT: As férias não podem iniciar em dia de Repouso Semanal Remunerado (DSR / Fim de Semana).");
        }

        // 2. Validação de Feriados:
        // Verifica se startDate + 1 dia ou startDate + 2 dias é Feriado (ou se startDate é feriado)
        Map<LocalDate, String> allHolidays = new HashMap<>();

        // Buscar feriados do ano atual e próximo ano
        int year = startDate.getYear();
        for (HolidayInfo h : getNationalHolidays(year)) {
            allHolidays.put(h.date(), h.name());
        }
        for (HolidayInfo h : getNationalHolidays(year + 1)) {
            allHolidays.put(h.date(), h.name());
        }

        if (customHolidays != null) {
            for (HolidayInfo h : customHolidays) {
                allHolidays.put(h.date(), h.name());
            }
        }

        // Se o próprio dia de início for feriado
        if (allHolidays.containsKey(startDate)) {
            String name = allHolidays.get(startDate);
            return new ValidationResult(false, 
                String.format("Violação da CLT: A data de início selecionada (%s) é o feriado de '%s'.", 
                    startDate, name));
        }

        // Antecede 1 dia o feriado (Ex: segunda-feira antes de feriado na terça)
        LocalDate dayPlus1 = startDate.plusDays(1);
        if (allHolidays.containsKey(dayPlus1)) {
            String name = allHolidays.get(dayPlus1);
            return new ValidationResult(false, 
                String.format("Violação do Art. 134, § 3º da CLT: É vedado iniciar férias nos 2 dias que antecedem feriado. A data selecionada antecede em 1 dia o feriado de '%s' (%s).", 
                    name, dayPlus1));
        }

        // Antecede 2 dias o feriado (Ex: domingo antes de feriado na terça, ou terça antes de feriado na quinta)
        LocalDate dayPlus2 = startDate.plusDays(2);
        if (allHolidays.containsKey(dayPlus2)) {
            String name = allHolidays.get(dayPlus2);
            return new ValidationResult(false, 
                String.format("Violação do Art. 134, § 3º da CLT: É vedado iniciar férias nos 2 dias que antecedem feriado. A data selecionada antecede em 2 dias o feriado de '%s' (%s).", 
                    name, dayPlus2));
        }

        return new ValidationResult(true, null);
    }
}
