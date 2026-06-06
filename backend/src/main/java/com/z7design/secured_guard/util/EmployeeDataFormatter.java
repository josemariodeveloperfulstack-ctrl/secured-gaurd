package com.z7design.secured_guard.util;

import com.z7design.secured_guard.model.Employee;

/**
 * Formatação de dados do funcionário para documentos (contratos, termos, relatórios).
 */
public final class EmployeeDataFormatter {

    private EmployeeDataFormatter() {
    }

    /**
     * Endereço completo no mesmo padrão da empresa:
     * Rua, Número - Complemento - Bairro - Cidade/Estado - CEP
     */
    public static String formatFullAddress(Employee employee) {
        if (employee == null) {
            return "";
        }

        StringBuilder address = new StringBuilder();

        if (hasText(employee.getEnderecoRua())) {
            address.append(employee.getEnderecoRua().trim());
            if (hasText(employee.getEnderecoNumero())) {
                address.append(", ").append(employee.getEnderecoNumero().trim());
            }
        }

        if (hasText(employee.getEnderecoComplemento())) {
            appendSegment(address, employee.getEnderecoComplemento().trim());
        }

        if (hasText(employee.getEnderecoBairro())) {
            appendSegment(address, employee.getEnderecoBairro().trim());
        }

        if (hasText(employee.getEnderecoCidade())) {
            String cityState = employee.getEnderecoCidade().trim();
            if (hasText(employee.getEnderecoEstado())) {
                cityState += "/" + employee.getEnderecoEstado().trim();
            }
            appendSegment(address, cityState);
        } else if (hasText(employee.getEnderecoEstado())) {
            appendSegment(address, employee.getEnderecoEstado().trim());
        }

        if (hasText(employee.getEnderecoCep())) {
            appendSegment(address, CompanyDataFormatter.formatZipCode(employee.getEnderecoCep().trim()));
        }

        if (address.length() == 0 && hasText(employee.getAddress())) {
            return employee.getAddress().trim();
        }

        return address.toString();
    }

    private static void appendSegment(StringBuilder address, String segment) {
        if (segment == null || segment.isBlank()) {
            return;
        }
        if (address.length() > 0) {
            address.append(" - ");
        }
        address.append(segment);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    /**
     * Endereço no padrão do termo LGPD da Vigilância:
     * Rua, Número Complemento, BAIRRO: X, Cidade/UF, CEP: XXXXXXXX
     */
    public static String formatAddressForLgpdVig(Employee employee) {
        if (employee == null) {
            return "";
        }

        java.util.List<String> parts = new java.util.ArrayList<>();

        String streetLine = "";
        if (hasText(employee.getEnderecoRua())) {
            streetLine = employee.getEnderecoRua().trim();
            if (hasText(employee.getEnderecoNumero())) {
                streetLine += ", " + employee.getEnderecoNumero().trim();
            }
            if (hasText(employee.getEnderecoComplemento())) {
                streetLine += " " + employee.getEnderecoComplemento().trim();
            }
        }
        if (!streetLine.isBlank()) {
            parts.add(streetLine);
        }

        if (hasText(employee.getEnderecoBairro())) {
            parts.add("BAIRRO: " + employee.getEnderecoBairro().trim());
        }

        if (hasText(employee.getEnderecoCidade())) {
            String cityState = employee.getEnderecoCidade().trim();
            if (hasText(employee.getEnderecoEstado())) {
                cityState += "/" + employee.getEnderecoEstado().trim();
            }
            parts.add(cityState);
        } else if (hasText(employee.getEnderecoEstado())) {
            parts.add(employee.getEnderecoEstado().trim());
        }

        if (hasText(employee.getEnderecoCep())) {
            String cepDigits = employee.getEnderecoCep().replaceAll("[^0-9]", "");
            parts.add("CEP: " + cepDigits);
        }

        if (!parts.isEmpty()) {
            return String.join(", ", parts);
        }

        if (hasText(employee.getAddress())) {
            return employee.getAddress().trim();
        }

        return "";
    }

    /**
     * Monta endereço LGPD Vigilância a partir dos campos do request (fallback).
     */
    public static String formatAddressForLgpdVigFromRequest(
            String street,
            String number,
            String complement,
            String neighborhood,
            String city,
            String state,
            String zipCode) {
        java.util.List<String> parts = new java.util.ArrayList<>();

        String streetLine = "";
        if (hasText(street)) {
            streetLine = street.trim();
            if (hasText(number)) {
                streetLine += ", " + number.trim();
            }
            if (hasText(complement)) {
                streetLine += " " + complement.trim();
            }
        }
        if (!streetLine.isBlank()) {
            parts.add(streetLine);
        }

        if (hasText(neighborhood)) {
            parts.add("BAIRRO: " + neighborhood.trim());
        }

        if (hasText(city)) {
            String cityState = city.trim();
            if (hasText(state)) {
                cityState += "/" + state.trim();
            }
            parts.add(cityState);
        } else if (hasText(state)) {
            parts.add(state.trim());
        }

        if (hasText(zipCode)) {
            String cepDigits = zipCode.replaceAll("[^0-9]", "");
            parts.add("CEP: " + cepDigits);
        }

        return String.join(", ", parts);
    }
}
