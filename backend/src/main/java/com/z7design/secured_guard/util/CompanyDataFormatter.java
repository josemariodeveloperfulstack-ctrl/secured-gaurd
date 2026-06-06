package com.z7design.secured_guard.util;

import com.z7design.secured_guard.model.Company;
import lombok.extern.slf4j.Slf4j;

/**
 * Utilitário para formatação de dados da empresa para relatórios
 */
@Slf4j
public class CompanyDataFormatter {

    /**
     * Formata CNPJ com máscara: XX.XXX.XXX/XXXX-XX
     */
    public static String formatCnpj(String cnpj) {
        if (cnpj == null || cnpj.isEmpty()) {
            return "";
        }

        // Remover caracteres não numéricos
        String digits = cnpj.replaceAll("[^0-9]", "");

        // Formatar: XX.XXX.XXX/XXXX-XX
        if (digits.length() == 14) {
            return String.format("%s.%s.%s/%s-%s",
                    digits.substring(0, 2),
                    digits.substring(2, 5),
                    digits.substring(5, 8),
                    digits.substring(8, 12),
                    digits.substring(12, 14));
        }

        return cnpj; // Retornar original se não tiver 14 dígitos
    }

    /**
     * Formata CPF com máscara: XXX.XXX.XXX-XX
     */
    public static String formatCpf(String cpf) {
        if (cpf == null || cpf.isEmpty()) {
            return "";
        }

        String digits = cpf.replaceAll("[^0-9]", "");

        if (digits.length() == 11) {
            return String.format("%s.%s.%s-%s",
                    digits.substring(0, 3),
                    digits.substring(3, 6),
                    digits.substring(6, 9),
                    digits.substring(9, 11));
        }

        return cpf;
    }

    /**
     * Formata CTPS.
     * Se tiver 11 dígitos, assume-se CTPS Digital (CPF) e aplica a máscara de CPF.
     */
    public static String formatCtps(String ctps) {
        if (ctps == null || ctps.isEmpty()) {
            return "";
        }

        String digits = ctps.replaceAll("[^0-9]", "");

        if (digits.length() == 11) {
            return formatCpf(digits);
        }

        return ctps;
    }

    /**
     * Formata telefone: (XX) XXXX-XXXX ou (XX) XXXXX-XXXX
     */
    public static String formatPhone(String phone) {
        if (phone == null || phone.isEmpty()) {
            return "";
        }

        // Remover caracteres não numéricos
        String digits = phone.replaceAll("[^0-9]", "");

        if (digits.length() == 10) {
            // Telefone fixo: (XX) XXXX-XXXX
            return String.format("(%s) %s-%s",
                    digits.substring(0, 2),
                    digits.substring(2, 6),
                    digits.substring(6, 10));
        } else if (digits.length() == 11) {
            // Celular: (XX) XXXXX-XXXX
            return String.format("(%s) %s-%s",
                    digits.substring(0, 2),
                    digits.substring(2, 7),
                    digits.substring(7, 11));
        }

        return phone; // Retornar original se não tiver formato conhecido
    }

    /**
     * Cidade usada em contratos (local de assinatura): sempre o município da empresa, nunca logradouro.
     * 1) {@link Company#getCity()} se preenchido;
     * 2) tentativa de extrair do endereço legado no padrão "... - Cidade - UF" (ex.: "... - Contagem - MG").
     */
    public static String resolveContractSigningCity(Company company) {
        if (company == null) {
            return "";
        }
        
        // 1. Prioridade para o campo city se estiver preenchido e não for um endereço
        if (company.getCity() != null && !company.getCity().isBlank() && !company.getCity().contains(",")) {
            return company.getCity().trim();
        }
        
        // 2. Tentar extrair do endereço completo (Rua - Bairro - Cidade/UF - CEP)
        String legacy = company.getAddress();
        if (legacy == null || legacy.isBlank()) {
            return "";
        }
        
        String[] parts = legacy.split("\\s*-\\s*");
        
        // No padrão "Rua - Bairro - Cidade/UF - CEP", a cidade é o penúltimo ou antepenúltimo
        for (int i = parts.length - 1; i >= 0; i--) {
            String p = parts[i].trim();
            
            // Ignorar CEP (XXXXX-XXX)
            if (p.matches("\\d{5}-\\d{3}")) continue;
            
            // Ignorar UF pura (2 letras)
            if (p.length() == 2 && p.chars().allMatch(Character::isLetter)) continue;
            
            // Se encontrar padrão Cidade/UF (ex: Contagem/MG)
            if (p.contains("/")) {
                String cityPart = p.split("/")[0].trim();
                if (!cityPart.isEmpty()) return cityPart;
            }
            
            // Se for apenas a cidade antes da UF (que já ignoramos se fosse pura)
            // No caso de "Contagem - MG", se estamos no loop e MG foi ignorado, o próximo é Contagem
            if (!p.isEmpty() && !p.contains(",") && p.length() > 2) {
                return p;
            }
        }
        
        return "";
    }

    /**
     * Formata endereço completo da empresa
     * Formato: Rua, Número - Complemento - Bairro - Cidade/Estado - CEP
     */
    public static String formatFullAddress(Company company) {
        if (company == null) {
            return "";
        }

        StringBuilder address = new StringBuilder();

        // Rua e número
        if (company.getEnderecoRua() != null && !company.getEnderecoRua().isEmpty()) {
            address.append(company.getEnderecoRua());

            if (company.getEnderecoNumero() != null && !company.getEnderecoNumero().isEmpty()) {
                address.append(", ").append(company.getEnderecoNumero());
            }
        } else if (company.getAddress() != null && !company.getAddress().isEmpty()) {
            // Fallback para campo address legado
            address.append(company.getAddress());
        }

        // Complemento
        if (company.getEnderecoComplemento() != null && !company.getEnderecoComplemento().isEmpty()) {
            if (address.length() > 0) {
                address.append(" - ");
            }
            address.append(company.getEnderecoComplemento());
        }

        // Bairro
        if (company.getEnderecoBairro() != null && !company.getEnderecoBairro().isEmpty()) {
            if (address.length() > 0) {
                address.append(" - ");
            }
            address.append(company.getEnderecoBairro());
        }

        // Cidade/Estado
        if (company.getCity() != null && !company.getCity().isEmpty()) {
            if (address.length() > 0) {
                address.append(" - ");
            }
            address.append(company.getCity());

            if (company.getState() != null && !company.getState().isEmpty()) {
                address.append("/").append(company.getState());
            }
        }

        // CEP
        if (company.getZipCode() != null && !company.getZipCode().isEmpty()) {
            if (address.length() > 0) {
                address.append(" - ");
            }
            String cep = formatZipCode(company.getZipCode());
            address.append(cep);
        }

        return address.toString();
    }

    /**
     * Endereço no padrão do termo LGPD da Vigilância:
     * Rua, Número, Bairro, Cidade/UF, CEP: XX.XXX-XXX
     */
    public static String formatAddressForLgpdVig(Company company) {
        if (company == null) {
            return "";
        }

        java.util.List<String> parts = new java.util.ArrayList<>();

        if (company.getEnderecoRua() != null && !company.getEnderecoRua().isBlank()) {
            String street = company.getEnderecoRua().trim();
            if (company.getEnderecoNumero() != null && !company.getEnderecoNumero().isBlank()) {
                street += ", " + company.getEnderecoNumero().trim();
            }
            parts.add(street);
        } else if (company.getAddress() != null && !company.getAddress().isBlank()) {
            parts.add(company.getAddress().trim());
        }

        if (company.getEnderecoBairro() != null && !company.getEnderecoBairro().isBlank()) {
            parts.add(company.getEnderecoBairro().trim());
        }

        if (company.getCity() != null && !company.getCity().isBlank()) {
            String cityState = company.getCity().trim();
            if (company.getState() != null && !company.getState().isBlank()) {
                cityState += "/" + company.getState().trim();
            }
            parts.add(cityState);
        }

        if (company.getZipCode() != null && !company.getZipCode().isBlank()) {
            parts.add("CEP: " + formatZipCode(company.getZipCode()));
        }

        return String.join(", ", parts);
    }

    /**
     * Formata CEP: XXXXX-XXX
     */
    public static String formatZipCode(String zipCode) {
        if (zipCode == null || zipCode.isEmpty()) {
            return "";
        }

        String digits = zipCode.replaceAll("[^0-9]", "");

        if (digits.length() == 8) {
            return String.format("%s-%s", digits.substring(0, 5), digits.substring(5, 8));
        }

        return zipCode;
    }

    /**
     * Formata texto completo do rodapé da empresa
     * Formato: Nome | Endereço | Tel: XXX | Email: XXX
     */
    public static String formatCompanyFooter(Company company, boolean includeEmail) {
        if (company == null) {
            return "";
        }

        StringBuilder footer = new StringBuilder();

        // Nome da empresa
        if (company.getName() != null && !company.getName().isEmpty()) {
            footer.append(company.getName());
        }

        // Endereço
        String address = formatFullAddress(company);
        if (!address.isEmpty()) {
            if (footer.length() > 0) {
                footer.append(" | ");
            }
            footer.append(address);
        }

        // Telefone
        if (company.getPhone() != null && !company.getPhone().isEmpty()) {
            if (footer.length() > 0) {
                footer.append(" | ");
            }
            footer.append("Tel: ").append(formatPhone(company.getPhone()));
        }

        // Email
        if (includeEmail && company.getEmail() != null && !company.getEmail().isEmpty()) {
            if (footer.length() > 0) {
                footer.append(" | ");
            }
            footer.append("Email: ").append(company.getEmail());
        }

        return footer.toString();
    }

    /**
     * Formata CNPJ para exibição no cabeçalho
     * Retorna string vazia se CNPJ não estiver disponível
     */
    public static String formatCnpjForHeader(Company company) {
        if (company == null || company.getCnpj() == null || company.getCnpj().isEmpty()) {
            return "";
        }

        String formatted = formatCnpj(company.getCnpj());
        return formatted.isEmpty() ? "" : "CNPJ: " + formatted;
    }
}
