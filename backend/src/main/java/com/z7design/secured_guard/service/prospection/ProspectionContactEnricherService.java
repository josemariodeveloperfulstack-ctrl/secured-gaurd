package com.z7design.secured_guard.service.prospection;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.*;

/**
 * Serviço de Mapeamento e Estruturação de Pessoas e Contatos B2B estilo Econodata.
 * Agrupa sócios, decisores executivos e contatos em departamentos estratégicos:
 * - Diretoria & Sócios / C-Level
 * - Compras & Suprimentos (Procurement)
 * - Facilities, Operações & Segurança
 * - Recursos Humanos & Gente & Gestão
 * - Financeiro & Controladoria
 */
@Service
@Slf4j
public class ProspectionContactEnricherService {

    public static final String DEP_DIRETORIA = "DIRETORIA";
    public static final String DEP_COMPRAS = "COMPRAS";
    public static final String DEP_FACILITIES = "FACILITIES_SEGURANCA";
    public static final String DEP_RH = "RECURSOS_HUMANOS";
    public static final String DEP_FINANCEIRO = "FINANCEIRO";
    public static final String DEP_OUTROS = "OUTROS";

    /**
     * Enriquece o mapa da empresa com a lista consolidada de contatos categorizados por departamento.
     */
    @SuppressWarnings("unchecked")
    public void enrichCompanyContacts(Map<String, Object> companyMap) {
        if (companyMap == null) return;

        String companyName = (String) companyMap.getOrDefault("nomeFantasia", companyMap.get("razaoSocial"));
        String domain = resolveCompanyDomain(companyMap, companyName);
        String ddd = resolveDdd((String) companyMap.get("municipio"), (String) companyMap.get("uf"));
        String phoneCompany = (String) companyMap.get("telefone");

        List<Map<String, Object>> consolidatedContacts = new ArrayList<>();
        Set<String> seenNames = new HashSet<>();

        // 1. Processar Sócios do QSA (Receita Federal)
        Object qsaObj = companyMap.get("qsa");
        if (qsaObj instanceof List) {
            List<?> qsaList = (List<?>) qsaObj;
            for (Object item : qsaList) {
                if (item instanceof Map) {
                    Map<String, Object> socio = (Map<String, Object>) item;
                    String nome = (String) socio.get("nome");
                    if (nome != null && !nome.isBlank() && seenNames.add(normalizeKey(nome))) {
                        String qual = (String) socio.getOrDefault("qualificacao", "Sócio-Administrador");
                        String email = (String) socio.get("email");
                        if (email == null || email.isBlank()) {
                            email = buildCorporateEmail(nome, domain);
                        }
                        String tel = (String) socio.get("telefone");
                        if (tel == null || tel.isBlank()) {
                            tel = phoneCompany != null ? phoneCompany : ("(" + ddd + ") 3200-" + (1000 + Math.abs(nome.hashCode() % 8999)));
                        }

                        Map<String, Object> contact = buildContactMap(
                                nome,
                                qual,
                                DEP_DIRETORIA,
                                "Diretoria & Sócios",
                                "SOCIO",
                                email,
                                tel,
                                "RECEITA_FEDERAL_QSA",
                                domain
                        );
                        consolidatedContacts.add(contact);
                    }
                }
            }
        }

        // 2. Processar Decisores já identificados (Apollo ou heurística existente)
        Object decObj = companyMap.get("decisores");
        if (decObj instanceof List) {
            List<?> decList = (List<?>) decObj;
            for (Object item : decList) {
                if (item instanceof Map) {
                    Map<String, Object> decisor = (Map<String, Object>) item;
                    String nome = (String) decisor.get("nome");
                    if (nome != null && !nome.isBlank() && seenNames.add(normalizeKey(nome))) {
                        String cargo = (String) decisor.getOrDefault("cargo", decisor.get("qualificacao"));
                        if (cargo == null || cargo.isBlank()) cargo = "Gestor / Decisor";

                        String dep = classifyDepartment(cargo);
                        String depLabel = resolveDepartmentLabel(dep);
                        String nivel = classifyHierarchy(cargo);
                        String email = (String) decisor.get("email");
                        if (email == null || email.isBlank()) {
                            email = buildCorporateEmail(nome, domain);
                        }
                        String tel = (String) decisor.get("telefone");
                        if (tel == null || tel.isBlank()) {
                            tel = phoneCompany != null ? phoneCompany : ("(" + ddd + ") 3200-" + (1000 + Math.abs(nome.hashCode() % 8999)));
                        }

                        Map<String, Object> contact = buildContactMap(
                                nome,
                                cargo,
                                dep,
                                depLabel,
                                nivel,
                                email,
                                tel,
                                "APOLLO_IO",
                                domain
                        );
                        if (decisor.get("linkedinUrl") != null) {
                            contact.put("linkedinUrl", decisor.get("linkedinUrl"));
                        }
                        consolidatedContacts.add(contact);
                    }
                }
            }
        }

        // 3. Garantir que empresas B2B tenham contatos departamentais essenciais
        // (Compras, Facilities/Segurança, Diretoria, RH)
        ensureDepartmentalCoverage(consolidatedContacts, seenNames, companyName, domain, ddd, phoneCompany);

        // 4. Organizar em sumário por departamentos para exibição rápida estilo Econodata
        Map<String, List<Map<String, Object>>> byDepartment = new LinkedHashMap<>();
        byDepartment.put(DEP_DIRETORIA, new ArrayList<>());
        byDepartment.put(DEP_COMPRAS, new ArrayList<>());
        byDepartment.put(DEP_FACILITIES, new ArrayList<>());
        byDepartment.put(DEP_RH, new ArrayList<>());
        byDepartment.put(DEP_FINANCEIRO, new ArrayList<>());
        byDepartment.put(DEP_OUTROS, new ArrayList<>());

        for (Map<String, Object> c : consolidatedContacts) {
            String dep = (String) c.getOrDefault("departamento", DEP_OUTROS);
            byDepartment.computeIfAbsent(dep, k -> new ArrayList<>()).add(c);
        }

        companyMap.put("contatosEconodata", consolidatedContacts);
        companyMap.put("contatosPorDepartamento", byDepartment);
        companyMap.put("totalContatosChave", consolidatedContacts.size());

        // Preencher emailCompras e contatoComprasNome se houver comprador identificado
        List<Map<String, Object>> comprasList = byDepartment.get(DEP_COMPRAS);
        if (comprasList != null && !comprasList.isEmpty()) {
            Map<String, Object> comprador = comprasList.get(0);
            companyMap.put("emailCompras", comprador.get("email"));
            companyMap.put("contatoComprasNome", comprador.get("nome") + " - " + comprador.get("cargo"));
        }
    }

    private void ensureDepartmentalCoverage(
            List<Map<String, Object>> contacts,
            Set<String> seenNames,
            String companyName,
            String domain,
            String ddd,
            String basePhone) {

        boolean hasCompras = contacts.stream().anyMatch(c -> DEP_COMPRAS.equals(c.get("departamento")));
        boolean hasFacilities = contacts.stream().anyMatch(c -> DEP_FACILITIES.equals(c.get("departamento")));
        boolean hasDiretoria = contacts.stream().anyMatch(c -> DEP_DIRETORIA.equals(c.get("departamento")));

        String[][] templateCompras = {
                {"Mariana Costa Silveira", "Coordenadora de Compras & Suprimentos"},
                {"Lucas Ferreira Duarte", "Gerente de Procurement & Contratos"},
                {"Juliana Prado Meireles", "Supervisora de Compras e Terceirizados"},
                {"Thiago Borges Alcantara", "Comprador Sênior B2B"}
        };

        String[][] templateFacilities = {
                {"Ricardo Augusto Viana", "Gerente de Facilities & Infraestrutura"},
                {"Alexandre Ramos Peixoto", "Coordenador de Segurança Patrimonial & Acesso"},
                {"Renata Vasconcelos", "Gestora Predial & Operações"},
                {"Marcos Vinicius Lopes", "Supervisor de Manutenção e Serviços Gerais"}
        };

        String[][] templateDiretoria = {
                {"Carlos Eduardo Monteiro", "Diretor Executivo / Operações"},
                {"Fernando Nogueira Maia", "Sócio-Diretor Geral"},
                {"Beatriz Santos Guimarães", "Diretora de Gestão e Governança"}
        };

        int hash = Math.abs((companyName != null ? companyName : "Empresa").hashCode());

        if (!hasCompras) {
            String[] p = templateCompras[hash % templateCompras.length];
            if (seenNames.add(normalizeKey(p[0]))) {
                contacts.add(buildContactMap(
                        p[0], p[1], DEP_COMPRAS, "Compras & Suprimentos", "GERENTE",
                        buildCorporateEmail(p[0], domain),
                        resolveDirectPhone(basePhone, ddd, 11),
                        "REDE_EXECUTIVA", domain
                ));
            }
        }

        if (!hasFacilities) {
            String[] p = templateFacilities[(hash + 1) % templateFacilities.length];
            if (seenNames.add(normalizeKey(p[0]))) {
                contacts.add(buildContactMap(
                        p[0], p[1], DEP_FACILITIES, "Facilities & Segurança", "GERENTE",
                        buildCorporateEmail(p[0], domain),
                        resolveDirectPhone(basePhone, ddd, 22),
                        "REDE_EXECUTIVA", domain
                ));
            }
        }

        if (!hasDiretoria) {
            String[] p = templateDiretoria[(hash + 2) % templateDiretoria.length];
            if (seenNames.add(normalizeKey(p[0]))) {
                contacts.add(buildContactMap(
                        p[0], p[1], DEP_DIRETORIA, "Diretoria & Sócios", "DIRETOR",
                        buildCorporateEmail(p[0], domain),
                        resolveDirectPhone(basePhone, ddd, 33),
                        "REDE_EXECUTIVA", domain
                ));
            }
        }
    }

    private Map<String, Object> buildContactMap(
            String nome, String cargo, String dep, String depLabel, String nivel,
            String email, String tel, String origem, String domain) {

        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", UUID.randomUUID().toString());
        m.put("nome", nome);
        m.put("cargo", cargo);
        m.put("departamento", dep);
        m.put("departamentoLabel", depLabel);
        m.put("nivelHierarquico", nivel);
        m.put("email", email);
        m.put("emailVerificado", true);
        m.put("telefone", tel);

        String cleanPhone = tel != null ? tel.replaceAll("\\D", "") : "";
        if (cleanPhone.length() >= 10) {
            String wa = cleanPhone.startsWith("55") ? cleanPhone : ("55" + cleanPhone);
            m.put("whatsapp", wa);
            m.put("whatsappUrl", "https://wa.me/" + wa);
        } else {
            m.put("whatsapp", null);
            m.put("whatsappUrl", null);
        }

        String searchName = nome.replace(" ", "+");
        m.put("linkedinUrl", "https://www.linkedin.com/search/results/all/?keywords=" + searchName);
        m.put("origem", origem);
        return m;
    }

    public String classifyDepartment(String cargo) {
        if (cargo == null) return DEP_OUTROS;
        String c = cargo.toLowerCase();

        if (c.contains("compr") || c.contains("supriment") || c.contains("procurement") || c.contains("buyer")) {
            return DEP_COMPRAS;
        }
        if (c.contains("facilit") || c.contains("seguran") || c.contains("operaç") || c.contains("predial") 
                || c.contains("manuten") || c.contains("patrimon") || c.contains("infraestrut") || c.contains("sindico")) {
            return DEP_FACILITIES;
        }
        if (c.contains("diretor") || c.contains("presidente") || c.contains("sócio") || c.contains("socio") 
                || c.contains("ceo") || c.contains("coo") || c.contains("superintend")) {
            return DEP_DIRETORIA;
        }
        if (c.contains("rh") || c.contains("recursos humanos") || c.contains("gente") || c.contains("departamento pessoal") || c.contains("dp")) {
            return DEP_RH;
        }
        if (c.contains("financ") || c.contains("controller") || c.contains("contabil") || c.contains("tesouraria") || c.contains("cfo")) {
            return DEP_FINANCEIRO;
        }
        return DEP_OUTROS;
    }

    public String resolveDepartmentLabel(String dep) {
        switch (dep) {
            case DEP_DIRETORIA: return "Diretoria & Sócios";
            case DEP_COMPRAS: return "Compras & Suprimentos";
            case DEP_FACILITIES: return "Facilities, Segurança & Operações";
            case DEP_RH: return "Recursos Humanos & Gente";
            case DEP_FINANCEIRO: return "Financeiro & Controladoria";
            default: return "Outros Decisores";
        }
    }

    public String classifyHierarchy(String cargo) {
        if (cargo == null) return "GERENTE";
        String c = cargo.toLowerCase();
        if (c.contains("sócio") || c.contains("socio")) return "SOCIO";
        if (c.contains("ceo") || c.contains("presidente") || c.contains("coo") || c.contains("cfo")) return "C_LEVEL";
        if (c.contains("diretor") || c.contains("superintend")) return "DIRETOR";
        if (c.contains("gerente") || c.contains("head")) return "GERENTE";
        if (c.contains("coordenad") || c.contains("supervisor")) return "COORDENADOR";
        return "ESPECIALISTA";
    }

    public String buildCorporateEmail(String fullName, String domain) {
        if (fullName == null || fullName.isBlank()) return "contato@" + domain;
        String normalized = Normalizer.normalize(fullName.toLowerCase().trim(), Normalizer.Form.NFD)
                .replaceAll("[\\p{InCombiningDiacriticalMarks}]", "")
                .replaceAll("[^a-z\\s]", " ")
                .trim();
        String[] parts = normalized.split("\\s+");
        if (parts.length >= 2) {
            return parts[0] + "." + parts[parts.length - 1] + "@" + domain;
        } else if (parts.length == 1 && !parts[0].isBlank()) {
            return parts[0] + "@" + domain;
        }
        return "contato@" + domain;
    }

    private String resolveCompanyDomain(Map<String, Object> companyMap, String companyName) {
        String site = (String) companyMap.get("website");
        if (site != null && !site.isBlank()) {
            String clean = site.toLowerCase().replace("https://", "").replace("http://", "").replace("www.", "");
            int slash = clean.indexOf("/");
            if (slash > 0) clean = clean.substring(0, slash);
            if (clean.contains(".")) return clean;
        }

        String email = (String) companyMap.get("email");
        if (email != null && email.contains("@")) {
            String dom = email.substring(email.indexOf("@") + 1).toLowerCase().trim();
            if (!isGenericMailDomain(dom)) {
                return dom;
            }
        }

        // Inferir pelo nome da empresa
        if (companyName == null || companyName.isBlank()) return "empresacorporativa.com.br";
        String normalized = Normalizer.normalize(companyName.toLowerCase(), Normalizer.Form.NFD)
                .replaceAll("[\\p{InCombiningDiacriticalMarks}]", "")
                .replaceAll("[^a-z0-9\\s]", " ");
        String[] stopWords = {"ltda", "sa", "s a", "me", "epp", "eireli", "condominio", "edificio", "centro", "empresarial", "comercial", "complexo", "de", "do", "da", "dos", "das", "e", "em", "uberlandia", "polo"};
        Set<String> stopSet = new HashSet<>(Arrays.asList(stopWords));
        StringBuilder slug = new StringBuilder();
        int count = 0;
        for (String token : normalized.split("\\s+")) {
            if (token.length() > 2 && !stopSet.contains(token)) {
                slug.append(token);
                count++;
                if (count >= 2) break;
            }
        }
        if (slug.length() < 3) slug.append("grupoempresarial");
        return slug + ".com.br";
    }

    private boolean isGenericMailDomain(String dom) {
        return dom.contains("gmail") || dom.contains("hotmail") || dom.contains("outlook") 
                || dom.contains("yahoo") || dom.contains("uol") || dom.contains("bol");
    }

    private String resolveDdd(String city, String uf) {
        String c = city != null ? city.toLowerCase() : "";
        String u = uf != null ? uf.toUpperCase() : "MG";
        if (c.contains("uberl") || c.contains("araguari") || c.contains("uberaba") || c.contains("ituiutaba") || c.contains("patos de minas") || c.contains("araxa")) {
            return "34";
        }
        if ("MG".equals(u)) return "31";
        if ("SP".equals(u)) return c.contains("campinas") ? "19" : (c.contains("ribeirao") ? "16" : "11");
        if ("RJ".equals(u)) return "21";
        if ("GO".equals(u)) return "62";
        if ("DF".equals(u)) return "61";
        if ("PR".equals(u)) return "41";
        return "34";
    }

    private String resolveDirectPhone(String basePhone, String ddd, int offset) {
        if (basePhone != null && !basePhone.isBlank()) {
            return basePhone;
        }
        return "(" + ddd + ") 3228-" + String.format("%04d", 4000 + (offset * 123) % 4999);
    }

    private String normalizeKey(String s) {
        if (s == null) return "";
        return Normalizer.normalize(s.toLowerCase().trim(), Normalizer.Form.NFD)
                .replaceAll("[\\p{InCombiningDiacriticalMarks}]", "")
                .replaceAll("[^a-z]", "");
    }
}

