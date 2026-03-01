package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.*;
import com.z7design.secured_guard.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmployeeImportService {

    private static final String COMPANY_CNPJ = "43576260000112"; // Promover Vigilância Patrimonial
    private static final DateTimeFormatter DATE_FORMATTER_BR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final CompanyRepository companyRepository;
    private final EmployeeImportRowService rowService;

    /**
     * Resultado da importação
     */
    public record ImportResult(int total, int criados, int atualizados, int erros, List<String> mensagens) {
    }

    /**
     * Importa funcionários a partir de um arquivo XLSX.
     * Planilha Promover Vigilância Patrimonial — CNPJ 43576260000112
     *
     * Colunas esperadas (na ordem da planilha):
     * 0 - Matrícula eSocial
     * 1 - Nome do Funcionário
     * 2 - Nacionalidade
     * 3 - Nascimento (dd/MM/yyyy)
     * 4 - Município Nascimento
     * 5 - UF Nasc
     * 6 - Mãe
     * 7 - Pai
     * 8 - Sexo
     * 9 - Estado Civil
     * 10 - Grau de Instrução
     * 11 - Departamento (= Setor)
     * 12 - Função (Cargo)
     * 13 - CBO
     * 14 - Admissão (dd/MM/yyyy)
     * 15 - Demissão → sempre nulo (funcionários ativos)
     * 16 - Salário Base
     * 17 - Horário
     * 18 - CPF (chave de upsert)
     * 19 - PIS/PASEP
     * 20 - Carteira de Trabalho (CTPS)
     * 21 - Identidade (RG)
     * 22 - Título Eleitoral
     * 23 - Endereço
     * 24 - Nº
     * 25 - Complemento
     * 26 - Bairro
     * 27 - Cidade
     * 28 - UF
     * 29 - CEP
     */
    // SEM @Transactional aqui — cada linha tem sua própria transação via rowService
    public ImportResult importar(MultipartFile file, String targetCnpj) throws Exception {
        int criados = 0, atualizados = 0, erros = 0;
        List<String> mensagens = new ArrayList<>();

        String activeCnpj = (targetCnpj != null && !targetCnpj.trim().isEmpty()) ? targetCnpj.replaceAll("[^0-9]", "")
                : COMPANY_CNPJ;

        Company company = companyRepository.findByNormalizedCnpj(activeCnpj).orElse(null);

        if (company == null) {
            log.warn("⚠️ Empresa com CNPJ {} não encontrada — funcionários serão importados sem vínculo de empresa",
                    activeCnpj);
            mensagens.add("Aviso: empresa CNPJ " + activeCnpj
                    + " não encontrada no sistema. Funcionários importados sem vínculo.");
        }

        try (InputStream is = file.getInputStream();
                Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            int totalLinhas = sheet.getLastRowNum();
            log.info("📊 Iniciando importação: {} linhas detectadas", totalLinhas);

            int dataStartRow = detectDataStartRow(sheet);
            log.info("📋 Dados iniciam na linha {}", dataStartRow + 1);

            for (int rowIdx = dataStartRow; rowIdx <= totalLinhas; rowIdx++) {
                Row row = sheet.getRow(rowIdx);
                if (row == null || isRowEmpty(row))
                    continue;

                String cpf = null;
                try {
                    cpf = normalizeCpf(getCellString(row, 18));
                    if (cpf == null || cpf.length() != 11) {
                        log.debug("   ⏭️ Linha {} ignorada: CPF inválido '{}'", rowIdx + 1, getCellString(row, 18));
                        continue;
                    }

                    String nome = getCellString(row, 1);
                    if (nome == null || nome.isBlank()) {
                        log.debug("   ⏭️ Linha {} ignorada: nome vazio", rowIdx + 1);
                        continue;
                    }

                    // Extrair todos os dados da linha ANTES de abrir a transação
                    String matricula = getCellString(row, 0);
                    String nationality = getCellString(row, 2);
                    LocalDate birthDate = parseDate(getCellString(row, 3));
                    String municipioNasc = getCellString(row, 4);
                    String estadoNasc = getCellString(row, 5);
                    String nomeMae = getCellString(row, 6);
                    String nomePai = getCellString(row, 7);
                    String sexo = normalizeSexo(getCellString(row, 8));
                    String maritalStatus = getCellString(row, 9);
                    String grauInstrucao = getCellString(row, 10);
                    String departamento = getCellString(row, 11);
                    String funcao = getCellString(row, 12);
                    String cbo = getCellString(row, 13);
                    LocalDate hireDate = parseDate(getCellString(row, 14));
                    // col 15 = Demissão → ignorada
                    BigDecimal salario = parseSalario(getCellString(row, 16));
                    String horario = getCellString(row, 17);
                    String pis = normalizePis(getCellString(row, 19));
                    String ctps = getCellString(row, 20);
                    String rg = getCellString(row, 21);
                    String titulo = getCellString(row, 22);
                    String rua = getCellString(row, 23);
                    String numero = getCellString(row, 24);
                    String complemento = getCellString(row, 25);
                    String bairro = getCellString(row, 26);
                    String cidade = getCellString(row, 27);
                    String estado = getCellString(row, 28);
                    String cep = normalizeCep(getCellString(row, 29));

                    boolean[] isNewRef = { false };

                    // Delega para transação isolada
                    rowService.processRow(
                            cpf, nome,
                            matricula, nationality,
                            birthDate, municipioNasc, estadoNasc,
                            nomeMae, nomePai, sexo,
                            maritalStatus, grauInstrucao,
                            departamento, funcao,
                            cbo, hireDate,
                            salario, horario,
                            pis, ctps, rg,
                            titulo, rua, numero,
                            complemento, bairro, cidade,
                            estado, cep,
                            company,
                            isNewRef);

                    if (isNewRef[0]) {
                        criados++;
                        log.info("✅ [{}] Criado: {} - CPF: {}", rowIdx + 1, nome.trim().toUpperCase(), cpf);
                    } else {
                        atualizados++;
                        log.info("🔄 [{}] Atualizado: {} - CPF: {}", rowIdx + 1, nome.trim().toUpperCase(), cpf);
                    }

                } catch (Exception e) {
                    erros++;

                    // Extrair causa raiz
                    Throwable rootCause = e;
                    while (rootCause.getCause() != null && rootCause != rootCause.getCause()) {
                        rootCause = rootCause.getCause();
                    }
                    String errorMsg = rootCause.getMessage();
                    if (errorMsg == null) {
                        errorMsg = rootCause.getClass().getSimpleName();
                    }

                    String cpfDisplay = (cpf != null) ? " (CPF " + cpf + ")" : "";
                    String msg = String.format("Linha %d%s: %s", rowIdx + 1, cpfDisplay, errorMsg);
                    mensagens.add(msg);
                    log.error("❌ Erro na linha {}: {}", rowIdx + 1, errorMsg);
                }
            }
        }

        int total = criados + atualizados + erros;
        log.info("📊 Importação concluída: {} total | {} criados | {} atualizados | {} erros", total, criados,
                atualizados, erros);
        return new ImportResult(total, criados, atualizados, erros, mensagens);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private int detectDataStartRow(Sheet sheet) {
        for (int i = 0; i <= Math.min(10, sheet.getLastRowNum()); i++) {
            Row row = sheet.getRow(i);
            if (row == null)
                continue;
            for (Cell cell : row) {
                String val = getCellStringRaw(cell);
                if (val != null && (val.equalsIgnoreCase("CPF") || val.equalsIgnoreCase("Nome do Funcionário"))) {
                    return i + 1;
                }
            }
        }
        return 3;
    }

    private boolean isRowEmpty(Row row) {
        for (Cell cell : row) {
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                String val = getCellStringRaw(cell);
                if (val != null && !val.isBlank())
                    return false;
            }
        }
        return true;
    }

    private String getCellString(Row row, int colIdx) {
        Cell cell = row.getCell(colIdx, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        return getCellStringRaw(cell);
    }

    private String getCellStringRaw(Cell cell) {
        if (cell == null)
            return null;
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) {
                    LocalDate d = cell.getLocalDateTimeCellValue().toLocalDate();
                    yield d.format(DATE_FORMATTER_BR);
                }
                double val = cell.getNumericCellValue();
                yield val == Math.floor(val) ? String.valueOf((long) val) : String.valueOf(val);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> {
                try {
                    yield cell.getStringCellValue().trim();
                } catch (Exception e) {
                    yield String.valueOf(cell.getNumericCellValue());
                }
            }
            default -> null;
        };
    }

    private String normalizeCpf(String raw) {
        if (raw == null)
            return null;
        return raw.replaceAll("[^0-9]", "");
    }

    private String normalizePis(String raw) {
        if (raw == null)
            return null;
        return raw.replaceAll("[^0-9]", "");
    }

    private String normalizeCep(String raw) {
        if (raw == null)
            return null;
        String digits = raw.replaceAll("[^0-9]", "");
        return digits.length() == 8 ? digits.substring(0, 5) + "-" + digits.substring(5) : raw;
    }

    private String normalizeSexo(String raw) {
        if (raw == null)
            return null;
        return switch (raw.trim().toUpperCase()) {
            case "M", "MASCULINO", "MASC" -> "MASCULINO";
            case "F", "FEMININO", "FEM" -> "FEMININO";
            default -> raw.trim().toUpperCase();
        };
    }

    private LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank())
            return null;
        try {
            return LocalDate.parse(raw.trim(), DATE_FORMATTER_BR);
        } catch (DateTimeParseException e) {
            try {
                return LocalDate.parse(raw.trim(), DateTimeFormatter.ofPattern("d/M/yyyy"));
            } catch (DateTimeParseException e2) {
                log.warn("⚠️ Data inválida: '{}'", raw);
                return null;
            }
        }
    }

    private BigDecimal parseSalario(String raw) {
        if (raw == null || raw.isBlank())
            return null;
        try {
            String clean = raw.replaceAll("R\\$", "").trim()
                    .replaceAll("\\.", "").replace(",", ".").trim();
            return new BigDecimal(clean);
        } catch (Exception e) {
            log.warn("⚠️ Salário inválido: '{}'", raw);
            return null;
        }
    }
}
