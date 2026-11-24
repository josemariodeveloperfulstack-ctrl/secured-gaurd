package com.z7design.secured_guard.service.prospection;

import lombok.Builder;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Map;

/**
 * Serviço de Estimativa de Faturamento Presumido, Porte e Faixa de Funcionários.
 * Baseado no modelo matemático e regras determinísticas do System Design Document (SDD)
 * da plataforma de inteligência de mercado B2B.
 */
@Service
@Slf4j
public class CompanyRevenueEstimatorService {

    private static final Locale PT_BR = new Locale("pt", "BR");

    @Data
    @Builder
    public static class RevenueEstimateResult {
        private String bracket;                  // MICRO, PEQUENO, MEDIO, GRANDE, CORPORATE
        private String bracketLabel;             // Ex: "Médio Porte"
        private BigDecimal estimatedRevenueMin;  // Ex: 4800000.00
        private BigDecimal estimatedRevenueMax;  // Ex: 15000000.00
        private String formattedRange;           // Ex: "R$ 4,8M a R$ 15M / ano"
        private String employeesBracket;         // Ex: "50 a 199 colaboradores"
        private int qualificationScore;          // 0 a 100 (Lead Score de Propensão B2B)
        private String qualificationTier;        // ALTA_QUALIFICACAO, MEDIA, PADRAO
        private String targetMatchReason;        // Ex: "Indústria com alto capital e demanda de facilities"
    }

    /**
     * Calcula o faturamento presumido, faixa de funcionários e score B2B para uma empresa.
     */
    public RevenueEstimateResult estimate(
            BigDecimal capitalSocial,
            String porteReceita,
            String cnaePrincipal,
            String naturezaJuridica,
            String dataAberturaStr,
            Integer filiaisCount,
            String simplesNacionalStr,
            String meiStr,
            String segmentoOrNome) {

        BigDecimal cap = capitalSocial != null && capitalSocial.compareTo(BigDecimal.ZERO) > 0 
                ? capitalSocial 
                : BigDecimal.valueOf(50000.0);

        int branches = filiaisCount != null ? Math.max(0, filiaisCount) : 0;
        int yearsInBusiness = parseYearsInBusiness(dataAberturaStr);

        boolean isMei = isTrue(meiStr) || (naturezaJuridica != null && naturezaJuridica.contains("213-5") && cap.compareTo(BigDecimal.valueOf(81000)) <= 0);
        boolean isSimples = isTrue(simplesNacionalStr);
        String porteNorm = (porteReceita != null ? porteReceita.toUpperCase() : "DEMAIS").trim();

        // 1. Regra Determinística: MEI
        if (isMei) {
            return RevenueEstimateResult.builder()
                    .bracket("MICRO")
                    .bracketLabel("Microempreendedor Individual (MEI)")
                    .estimatedRevenueMin(BigDecimal.valueOf(20000))
                    .estimatedRevenueMax(BigDecimal.valueOf(81000))
                    .formattedRange("Até R$ 81.000 / ano")
                    .employeesBracket("1 colaborador")
                    .qualificationScore(25)
                    .qualificationTier("BAIXA")
                    .targetMatchReason("MEI individual - baixa demanda para serviços terceirizados")
                    .build();
        }

        // 2. Regra Determinística: Microempresa (ME) oficial
        if ("ME".equals(porteNorm) || porteNorm.contains("MICRO")) {
            BigDecimal min = BigDecimal.valueOf(100000);
            BigDecimal max = BigDecimal.valueOf(360000);
            return RevenueEstimateResult.builder()
                    .bracket("MICRO")
                    .bracketLabel("Microempresa (ME)")
                    .estimatedRevenueMin(min)
                    .estimatedRevenueMax(max)
                    .formattedRange("R$ 100k a R$ 360k / ano")
                    .employeesBracket("1 a 9 colaboradores")
                    .qualificationScore(calculateScore(cap, branches, yearsInBusiness, cnaePrincipal, 35))
                    .qualificationTier("PADRAO")
                    .targetMatchReason("Microempresa cadastrada")
                    .build();
        }

        // 3. Regra Determinística: EPP (Pequeno Porte) oficial
        if ("EPP".equals(porteNorm) || porteNorm.contains("PEQUENO")) {
            BigDecimal min = BigDecimal.valueOf(360000);
            BigDecimal max = BigDecimal.valueOf(4800000);
            
            // Calibrar dentro da faixa EPP pelo capital social
            if (cap.compareTo(BigDecimal.valueOf(500000)) > 0 || branches > 1) {
                min = BigDecimal.valueOf(1500000);
            }

            int score = calculateScore(cap, branches, yearsInBusiness, cnaePrincipal, 60);
            return RevenueEstimateResult.builder()
                    .bracket("PEQUENO")
                    .bracketLabel("Empresa de Pequeno Porte (EPP)")
                    .estimatedRevenueMin(min)
                    .estimatedRevenueMax(max)
                    .formattedRange(formatCurrencyRange(min, max))
                    .employeesBracket("10 a 49 colaboradores")
                    .qualificationScore(score)
                    .qualificationTier(score >= 70 ? "ALTA" : "MEDIA")
                    .targetMatchReason("Pequeno porte com potencial para portaria e limpeza")
                    .build();
        }

        // 4. Se for Simples Nacional mas marcado como DEMAIS
        if (isSimples) {
            BigDecimal min = BigDecimal.valueOf(1200000);
            BigDecimal max = BigDecimal.valueOf(4800000);
            int score = calculateScore(cap, branches, yearsInBusiness, cnaePrincipal, 65);
            return RevenueEstimateResult.builder()
                    .bracket("PEQUENO")
                    .bracketLabel("Pequeno Porte (Simples Nacional)")
                    .estimatedRevenueMin(min)
                    .estimatedRevenueMax(max)
                    .formattedRange(formatCurrencyRange(min, max))
                    .employeesBracket("15 a 49 colaboradores")
                    .qualificationScore(score)
                    .qualificationTier("MEDIA")
                    .targetMatchReason("Optante pelo Simples Nacional no teto da faixa")
                    .build();
        }

        // 5. Lucro Presumido ou Lucro Real (Regressão ponderada SDD)
        // Score = w1 * ln(Capital + 1) + w2 * filiais + w3 * cnaeFactor + w4 * maturidade
        double capVal = cap.doubleValue();
        double lnCap = Math.log(capVal + 1.0);
        double cnaeFactor = resolveCnaeFactor(cnaePrincipal, segmentoOrNome);
        double rawModelScore = (0.45 * lnCap) + (0.25 * Math.min(branches, 20)) + (0.20 * cnaeFactor) + (0.10 * Math.min(yearsInBusiness, 25));

        BigDecimal min;
        BigDecimal max;
        String bracket;
        String bracketLabel;
        String employees;

        if (cap.compareTo(BigDecimal.valueOf(100000000)) >= 0 || rawModelScore > 12.0) {
            // Corporate / Gigante
            bracket = "CORPORATE";
            bracketLabel = "Grande Porte / Corporativo (S/A / Multinacional)";
            min = BigDecimal.valueOf(100000000);
            max = BigDecimal.valueOf(500000000);
            employees = "500+ colaboradores";
        } else if (cap.compareTo(BigDecimal.valueOf(15000000)) >= 0 || rawModelScore > 9.5) {
            // Grande Porte
            bracket = "GRANDE";
            bracketLabel = "Grande Porte";
            min = BigDecimal.valueOf(50000000);
            max = BigDecimal.valueOf(150000000);
            employees = "200 a 499 colaboradores";
        } else if (cap.compareTo(BigDecimal.valueOf(2000000)) >= 0 || rawModelScore > 7.0 || branches >= 3) {
            // Médio Porte Alto
            bracket = "MEDIO";
            bracketLabel = "Médio Porte";
            min = BigDecimal.valueOf(15000000);
            max = BigDecimal.valueOf(50000000);
            employees = "100 a 199 colaboradores";
        } else if (cap.compareTo(BigDecimal.valueOf(400000)) >= 0 || rawModelScore > 5.5) {
            // Médio Porte Entrada
            bracket = "MEDIO";
            bracketLabel = "Médio Porte";
            min = BigDecimal.valueOf(4800000);
            max = BigDecimal.valueOf(15000000);
            employees = "50 a 99 colaboradores";
        } else {
            // Pequeno Porte
            bracket = "PEQUENO";
            bracketLabel = "Pequeno Porte";
            min = BigDecimal.valueOf(1200000);
            max = BigDecimal.valueOf(4800000);
            employees = "10 a 49 colaboradores";
        }

        int score = calculateScore(cap, branches, yearsInBusiness, cnaePrincipal, (int) (rawModelScore * 8));

        return RevenueEstimateResult.builder()
                .bracket(bracket)
                .bracketLabel(bracketLabel)
                .estimatedRevenueMin(min)
                .estimatedRevenueMax(max)
                .formattedRange(formatCurrencyRange(min, max))
                .employeesBracket(employees)
                .qualificationScore(score)
                .qualificationTier(score >= 80 ? "ALTA_QUALIFICACAO" : (score >= 60 ? "MEDIA" : "PADRAO"))
                .targetMatchReason(buildMatchReason(bracket, segmentoOrNome, cnaePrincipal))
                .build();
    }

    /**
     * Aplica o resultado de estimativa em um mapa de dados da empresa.
     */
    public void applyToCompanyMap(Map<String, Object> companyMap) {
        if (companyMap == null) return;

        BigDecimal capital = parseBigDecimal(companyMap.get("capitalSocial"));
        String porte = (String) companyMap.get("porte");
        String cnae = (String) companyMap.get("cnaePrincipal");
        String nat = (String) companyMap.get("naturezaJuridica");
        String dataAbertura = (String) companyMap.get("dataInicioAtividade");
        String simples = String.valueOf(companyMap.getOrDefault("opcaoPeloSimples", ""));
        String mei = String.valueOf(companyMap.getOrDefault("opcaoPeloMei", ""));
        String nome = (String) companyMap.getOrDefault("nomeFantasia", companyMap.get("razaoSocial"));

        RevenueEstimateResult res = estimate(capital, porte, cnae, nat, dataAbertura, 0, simples, mei, nome);

        companyMap.put("faturamentoEstimadoMin", res.getEstimatedRevenueMin());
        companyMap.put("faturamentoEstimadoMax", res.getEstimatedRevenueMax());
        companyMap.put("faturamentoEstimadoFaixa", res.getFormattedRange());
        companyMap.put("faixaFaturamento", res.getBracket());
        companyMap.put("porteEstimado", res.getBracketLabel());
        companyMap.put("faixaFuncionarios", res.getEmployeesBracket());
        companyMap.put("leadScore", res.getQualificationScore());
        companyMap.put("leadTier", res.getQualificationTier());
        companyMap.put("motivoQualificacao", res.getTargetMatchReason());
    }

    private int calculateScore(BigDecimal cap, int branches, int years, String cnae, int baseScore) {
        int score = baseScore;
        if (cap.compareTo(BigDecimal.valueOf(1000000)) >= 0) score += 15;
        else if (cap.compareTo(BigDecimal.valueOf(300000)) >= 0) score += 8;

        if (branches > 0) score += Math.min(10, branches * 2);
        if (years >= 5) score += 5;
        if (years >= 15) score += 5;

        // Bônus estratégico para verticais de Segurança, Facilities, Saúde, Indústria e Logística
        if (cnae != null) {
            String c = cnae.replaceAll("\\D", "");
            if (c.startsWith("811") || c.startsWith("812") || c.startsWith("801") || c.startsWith("802")) {
                score += 10; // Condomínios e facilities
            } else if (c.startsWith("52") || c.startsWith("49")) {
                score += 8; // Logística e transportes
            } else if (c.startsWith("861") || c.startsWith("862")) {
                score += 10; // Hospitais e clínicas
            } else if (c.startsWith("10") || c.startsWith("20") || c.startsWith("25") || c.startsWith("28")) {
                score += 10; // Indústrias de manufatura
            }
        }

        return Math.max(15, Math.min(99, score));
    }

    private double resolveCnaeFactor(String cnae, String name) {
        String c = cnae != null ? cnae.replaceAll("\\D", "") : "";
        String n = name != null ? name.toLowerCase() : "";

        if (n.contains("condomin") || n.contains("edificio") || n.contains("shopping") || n.contains("reserva")) {
            return 8.0;
        }
        if (c.startsWith("861") || n.contains("hospital")) return 9.0;
        if (c.startsWith("52") || n.contains("logistica") || n.contains("distribuid")) return 8.5;
        if (c.startsWith("10") || c.startsWith("20") || c.startsWith("25") || n.contains("industr")) return 8.0;
        if (c.startsWith("47") || c.startsWith("46")) return 6.5; // Comércio
        if (c.startsWith("62") || c.startsWith("63")) return 7.0; // Tecnologia
        return 5.0;
    }

    private String buildMatchReason(String bracket, String name, String cnae) {
        String n = name != null ? name.toLowerCase() : "";
        if (n.contains("condomin") || n.contains("reserva")) {
            return "Condomínio / Empreendimento Imobiliário com alto potencial de portaria remota e vigilância.";
        }
        if (n.contains("shopping")) {
            return "Complexo comercial / Shopping Center com alta demanda contínua de segurança armada e limpeza.";
        }
        if (n.contains("hospital") || (cnae != null && cnae.startsWith("861"))) {
            return "Unidade hospitalar / Saúde com requisitos estritos de controle de acesso e higienização.";
        }
        if ("GRANDE".equals(bracket) || "CORPORATE".equals(bracket)) {
            return "Grande empresa com alto faturamento presumido e equipe operacional extensa.";
        }
        if ("MEDIO".equals(bracket)) {
            return "Empresa de médio porte ideal para terceirização completa de portaria, facilities e vigilância.";
        }
        return "Lead comercial com faturamento aderente aos serviços terceirizados.";
    }

    private String formatCurrencyRange(BigDecimal min, BigDecimal max) {
        return formatShortBrl(min) + " a " + formatShortBrl(max) + " / ano";
    }

    private String formatShortBrl(BigDecimal value) {
        if (value == null) return "R$ 0";
        double val = value.doubleValue();
        if (val >= 1000000000.0) {
            return String.format(PT_BR, "R$ %.1fB", val / 1000000000.0);
        } else if (val >= 1000000.0) {
            return String.format(PT_BR, "R$ %.1fM", val / 1000000.0);
        } else if (val >= 1000.0) {
            return String.format(PT_BR, "R$ %.0fk", val / 1000.0);
        }
        return NumberFormat.getCurrencyInstance(PT_BR).format(value);
    }

    private int parseYearsInBusiness(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return 5;
        try {
            LocalDate d;
            if (dateStr.contains("-")) {
                d = LocalDate.parse(dateStr.substring(0, 10));
            } else if (dateStr.contains("/")) {
                d = LocalDate.parse(dateStr, DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            } else {
                return 5;
            }
            return Math.max(0, Period.between(d, LocalDate.now()).getYears());
        } catch (Exception e) {
            return 5;
        }
    }

    private boolean isTrue(String val) {
        if (val == null) return false;
        String v = val.trim().toLowerCase();
        return "true".equals(v) || "sim".equals(v) || "s".equals(v) || "1".equals(v);
    }

    private BigDecimal parseBigDecimal(Object val) {
        if (val == null) return BigDecimal.ZERO;
        if (val instanceof BigDecimal) return (BigDecimal) val;
        if (val instanceof Number) return BigDecimal.valueOf(((Number) val).doubleValue());
        try {
            String s = val.toString().replaceAll("[^0-9,.-]", "").replace(".", "").replace(",", ".");
            return new BigDecimal(s);
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }
}

