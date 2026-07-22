package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
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
public class EmployeeImportExcelCustomService {

    private static final String DEFAULT_FALLBACK_CNPJ = "36698521000101"; // Promover Terceirização (fallback se planilha não tiver coluna CNPJ)
    private static final DateTimeFormatter DATE_FORMATTER_BR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeImportRowService rowService;

    public record CustomImportResult(int total, int criados, int atualizados, int erros, List<String> mensagens) {
    }

    public CustomImportResult importarPlanilhaCustom(MultipartFile file) throws Exception {
        int criados = 0, atualizados = 0, erros = 0;
        List<String> mensagens = new ArrayList<>();

        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        if (!filename.endsWith(".xlsx") && !filename.endsWith(".xls")) {
            throw new IllegalArgumentException("Apenas planilhas de Excel (.xlsx, .xls) são permitidas para esta importação.");
        }

        try (InputStream is = new java.io.BufferedInputStream(file.getInputStream());
             Workbook workbook = WorkbookFactory.create(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            int totalLinhas = sheet.getLastRowNum();
            log.info("📊 Iniciando importação de planilha Excel: {} linhas detectadas", totalLinhas);

            // Mapear cabeçalhos de coluna para seus respectivos índices
            Map<String, Integer> headerMap = detectHeaders(sheet);
            
            // Verificar colunas obrigatórias básicas (nome)
            if (!headerMap.containsKey("nome")) {
                throw new IllegalArgumentException("A coluna 'Nome' não foi detectada na planilha. Verifique os cabeçalhos.");
            }

            int dataStartRow = detectDataStartRow(sheet);
            log.info("📋 Linha de início de dados: {}", dataStartRow + 1);

            for (int rowIdx = dataStartRow; rowIdx <= totalLinhas; rowIdx++) {
                Row row = sheet.getRow(rowIdx);
                if (row == null || isRowEmpty(row)) {
                    continue;
                }

                String cpf = null;
                try {
                    // 1. CPF do funcionário
                    cpf = normalizeCpf(getMappedValue(row, headerMap, "cpf"));
                    
                    if (cpf == null || cpf.isBlank()) {
                        String doc = getMappedValue(row, headerMap, "document");
                        cpf = normalizeCpf(doc);
                    }

                    String nome = getMappedValue(row, headerMap, "nome");
                    if (nome == null || nome.isBlank()) {
                        log.debug("   ⏭️ Linha {} ignorada: nome vazio", rowIdx + 1);
                        continue;
                    }

                    // Se CPF for nulo ou inválido (diferente de 11 dígitos), gera um erro de validação para essa linha
                    if (cpf == null || cpf.length() != 11) {
                        log.error("❌ Erro na linha {}: CPF inválido ou ausente ({})", rowIdx + 1, cpf);
                        erros++;
                        mensagens.add("Linha " + (rowIdx + 1) + " (Funcionário: " + nome + "): CPF inválido ou ausente.");
                        continue;
                    }

                    // 2. REGRA 1: Verificar se o CPF JÁ EXISTE no banco de dados (se tiver, NÃO IMPORTE)
                    boolean cpfExiste = employeeRepository.existsByNormalizedDocument(cpf);
                    if (cpfExiste) {
                        log.warn("⚠️ Linha {}: CPF {} já cadastrado na base de dados. Importação ignorada.", rowIdx + 1, cpf);
                        erros++;
                        mensagens.add("Linha " + (rowIdx + 1) + " (Funcionário: " + nome + "): CPF " + formatCpf(cpf) + " já cadastrado na base de dados - registro não importado.");
                        continue;
                    }

                    // 3. REGRA 2: Verificar se o CNPJ na planilha ESTÁ CADASTRADO no sistema
                    String rawCnpj = getMappedValue(row, headerMap, "cnpj");
                    String normalizedCnpj = rawCnpj != null ? rawCnpj.replaceAll("[^0-9]", "") : "";
                    
                    Company company = null;
                    if (!normalizedCnpj.isBlank()) {
                        company = companyRepository.findByNormalizedCnpj(normalizedCnpj).orElse(null);
                    } else {
                        // Tentar buscar empresa padrão caso a planilha não tenha coluna CNPJ
                        company = companyRepository.findByNormalizedCnpj(DEFAULT_FALLBACK_CNPJ).orElse(null);
                    }

                    if (company == null) {
                        log.error("❌ Linha {}: Empresa com CNPJ '{}' não cadastrada no sistema.", rowIdx + 1, rawCnpj);
                        erros++;
                        mensagens.add("Linha " + (rowIdx + 1) + " (Funcionário: " + nome + "): Empresa com CNPJ " + (rawCnpj != null && !rawCnpj.isBlank() ? rawCnpj : "ausente") + " não está cadastrada no sistema.");
                        continue;
                    }

                    // Extrair todos os 22 campos conforme mapeamento da planilha
                    String matricula = getMappedValue(row, headerMap, "matricula");
                    String nationality = getMappedValue(row, headerMap, "nacionalidade");
                    LocalDate birthDate = parseDate(getMappedValue(row, headerMap, "dataNascimento"));
                    String municipioNasc = getMappedValue(row, headerMap, "municipioNascimento");
                    String estadoNasc = normalizeUF(getMappedValue(row, headerMap, "ufNascimento"));
                    String nomeMae = getMappedValue(row, headerMap, "nomeMae");
                    String nomePai = getMappedValue(row, headerMap, "nomePai");
                    String maritalStatus = getMappedValue(row, headerMap, "estadoCivil");
                    String rg = getMappedValue(row, headerMap, "identidade");
                    String pis = normalizePis(getMappedValue(row, headerMap, "pis"));
                    String departamento = getMappedValue(row, headerMap, "setorTrabalho");
                    LocalDate hireDate = parseDate(getMappedValue(row, headerMap, "dataAdmissao"));
                    String funcao = getMappedValue(row, headerMap, "cargo");
                    String cbo = getMappedValue(row, headerMap, "cbo");
                    BigDecimal salario = parseSalario(getMappedValue(row, headerMap, "salario"));
                    
                    String rua = getMappedValue(row, headerMap, "rua");
                    String complemento = getMappedValue(row, headerMap, "complemento");
                    String bairro = getMappedValue(row, headerMap, "bairro");
                    String cep = normalizeCep(getMappedValue(row, headerMap, "cep"));
                    String cidade = getMappedValue(row, headerMap, "cidade");
                    String estado = normalizeUF(getMappedValue(row, headerMap, "uf"));
                    String numero = getMappedValue(row, headerMap, "numero"); 

                    String horario = getMappedValue(row, headerMap, "horario");
                    String escalaTrabalho = getMappedValue(row, headerMap, "escala");
                    String sexo = normalizeSexo(getMappedValue(row, headerMap, "sexo"));
                    String grauInstrucao = getMappedValue(row, headerMap, "grauInstrucao");
                    String tituloEleitor = getMappedValue(row, headerMap, "tituloEleitor");

                    boolean[] isNewRef = { false };

                    // Processar inserção do funcionário vinculado à empresa e ao setor de trabalho
                    rowService.processRow(
                            cpf, nome,
                            matricula, nationality,
                            birthDate, municipioNasc, estadoNasc,
                            nomeMae, nomePai, sexo,
                            maritalStatus, grauInstrucao,
                            departamento, funcao,
                            cbo, hireDate,
                            salario, horario, escalaTrabalho,
                            pis, null, rg,
                            tituloEleitor, rua, numero,
                            complemento, bairro, cidade,
                            estado, cep,
                            company,
                            isNewRef);

                    criados++;
                    log.info("✅ [{}] Funcionário criado: {} - CPF: {} (Empresa: {})", rowIdx + 1, nome.trim().toUpperCase(), cpf, company.getName());

                } catch (Exception e) {
                    erros++;
                    Throwable rootCause = e;
                    while (rootCause.getCause() != null && rootCause != rootCause.getCause()) {
                        rootCause = rootCause.getCause();
                    }
                    String errorMsg = rootCause.getMessage() != null ? rootCause.getMessage() : rootCause.getClass().getSimpleName();
                    String cpfDisplay = (cpf != null) ? " (CPF " + cpf + ")" : "";
                    mensagens.add(String.format("Linha %d%s: %s", rowIdx + 1, cpfDisplay, errorMsg));
                    log.error("❌ Erro na linha {}: {}", rowIdx + 1, errorMsg);
                }
            }
        }

        int total = criados + erros;
        log.info("📊 Importação customizada de Excel concluída: {} total | {} criados | {} erros", total, criados, erros);
        return new CustomImportResult(total, criados, 0, erros, mensagens);
    }

    private String formatCpf(String cpf) {
        if (cpf == null || cpf.length() != 11) return cpf;
        return cpf.substring(0, 3) + "." + cpf.substring(3, 6) + "." + cpf.substring(6, 9) + "-" + cpf.substring(9);
    }

    private Map<String, Integer> detectHeaders(Sheet sheet) {
        Map<String, Integer> headerMap = new HashMap<>();
        int maxRow = Math.min(10, sheet.getLastRowNum());
        
        for (int i = 0; i <= maxRow; i++) {
            Row row = sheet.getRow(i);
            if (row == null) continue;
            
            for (Cell cell : row) {
                String val = getCellStringRaw(cell);
                if (val == null || val.isBlank()) continue;
                
                String normalizedVal = normalizeHeader(val);
                int colIdx = cell.getColumnIndex();

                // Mapear campos baseados nas colunas fornecidas pelo usuário
                if (normalizedVal.contains("cnpj")) {
                    headerMap.put("cnpj", colIdx);
                } else if (normalizedVal.equals("nome") || normalizedVal.equals("nomedocolaborador") || normalizedVal.equals("nomecompleto") || normalizedVal.equals("funcionario") || normalizedVal.equals("nomefuncionario")) {
                    headerMap.put("nome", colIdx);
                } else if (normalizedVal.contains("cpf") || normalizedVal.contains("cpj")) {
                    headerMap.put("cpf", colIdx);
                } else if (normalizedVal.contains("matriculaesocial") || normalizedVal.contains("matriculasocial") || normalizedVal.contains("matriculae-social") || normalizedVal.equals("matricula")) {
                    headerMap.put("matricula", colIdx);
                } else if (normalizedVal.contains("datanascimento") || normalizedVal.contains("datadenascimento") || normalizedVal.equals("nascimento")) {
                    headerMap.put("dataNascimento", colIdx);
                } else if (normalizedVal.contains("municipionascimento") || normalizedVal.contains("muncipionascimento") || normalizedVal.contains("cidadenascimento") || normalizedVal.equals("naturalidade")) {
                    headerMap.put("municipioNascimento", colIdx);
                } else if (normalizedVal.contains("ufnascimento") || normalizedVal.contains("estadonascimento") || normalizedVal.contains("ufnasc")) {
                    headerMap.put("ufNascimento", colIdx);
                } else if (normalizedVal.contains("nomedamae") || normalizedVal.contains("nomemae") || normalizedVal.equals("mae") || normalizedVal.equals("mãe")) {
                    headerMap.put("nomeMae", colIdx);
                } else if (normalizedVal.contains("nodopai") || normalizedVal.contains("nomedopai") || normalizedVal.equals("pai")) {
                    headerMap.put("nomePai", colIdx);
                } else if (normalizedVal.contains("nacionalidade")) {
                    headerMap.put("nacionalidade", colIdx);
                } else if (normalizedVal.contains("estadocivil")) {
                    headerMap.put("estadoCivil", colIdx);
                } else if (normalizedVal.contains("identidade") || normalizedVal.equals("rg")) {
                    headerMap.put("identidade", colIdx);
                } else if (normalizedVal.contains("pis") || normalizedVal.contains("pasep")) {
                    headerMap.put("pis", colIdx);
                } else if (normalizedVal.contains("setordetrabalho") || normalizedVal.contains("setordetrablaho") || normalizedVal.contains("setor") || normalizedVal.contains("departamento") || normalizedVal.contains("depto") || normalizedVal.contains("postodetrabalho") || normalizedVal.contains("posto")) {
                    headerMap.put("setorTrabalho", colIdx);
                } else if (normalizedVal.contains("datadeadmissao") || normalizedVal.contains("datadeadmissão") || normalizedVal.contains("datadeadminissao") || normalizedVal.contains("dataadmissao") || normalizedVal.contains("admissao") || normalizedVal.contains("admissão")) {
                    headerMap.put("dataAdmissao", colIdx);
                } else if (normalizedVal.contains("cargo") || normalizedVal.contains("funcao") || normalizedVal.contains("função")) {
                    headerMap.put("cargo", colIdx);
                } else if (normalizedVal.contains("cbo")) {
                    headerMap.put("cbo", colIdx);
                } else if (normalizedVal.contains("salario") || normalizedVal.contains("salariosbase") || normalizedVal.contains("salariobase") || normalizedVal.contains("saláriobase")) {
                    headerMap.put("salario", colIdx);
                } else if (normalizedVal.equals("rua") || normalizedVal.equals("logradouro") || normalizedVal.equals("endereco") || normalizedVal.equals("endereço")) {
                    headerMap.put("rua", colIdx);
                } else if (normalizedVal.contains("complemento")) {
                    headerMap.put("complemento", colIdx);
                } else if (normalizedVal.contains("bairro")) {
                    headerMap.put("bairro", colIdx);
                } else if (normalizedVal.contains("cep")) {
                    headerMap.put("cep", colIdx);
                } else if (normalizedVal.contains("cidade") || normalizedVal.contains("cidadde") || normalizedVal.contains("municipio") || normalizedVal.contains("município")) {
                    headerMap.put("cidade", colIdx);
                } else if (normalizedVal.equals("uf") || normalizedVal.equals("estado")) {
                    headerMap.put("uf", colIdx);
                } else if (normalizedVal.equals("numero") || normalizedVal.equals("número") || normalizedVal.equals("nº") || normalizedVal.equals("n°")) {
                    headerMap.put("numero", colIdx);
                } else if (normalizedVal.contains("horario") || normalizedVal.contains("horariotrabalho")) {
                    headerMap.put("horario", colIdx);
                } else if (normalizedVal.contains("escala") || normalizedVal.contains("escalatrabalho")) {
                    headerMap.put("escala", colIdx);
                } else if (normalizedVal.contains("sexo") || normalizedVal.contains("genero")) {
                    headerMap.put("sexo", colIdx);
                } else if (normalizedVal.contains("grauinstrucao") || normalizedVal.contains("escolaridade")) {
                    headerMap.put("grauInstrucao", colIdx);
                } else if (normalizedVal.contains("tituloeleitor") || normalizedVal.contains("titulo")) {
                    headerMap.put("tituloEleitor", colIdx);
                }
            }
            
            // Se encontrou as colunas principais de cabeçalho, para de buscar
            if (headerMap.containsKey("nome") && (headerMap.containsKey("cpf") || headerMap.containsKey("identidade"))) {
                break;
            }
        }
        
        return headerMap;
    }

    private String normalizeHeader(String header) {
        if (header == null) return "";
        // Remove acentos, caracteres especiais, espaços e converte para minúsculo
        String temp = header.toLowerCase().trim();
        temp = temp.replaceAll("[áàâãä]", "a")
                .replaceAll("[éèêë]", "e")
                .replaceAll("[íìîï]", "i")
                .replaceAll("[óòôõö]", "o")
                .replaceAll("[úùûü]", "u")
                .replaceAll("ç", "c")
                .replaceAll("[^a-z0-9]", ""); // Mantém apenas letras e números
        return temp;
    }

    private int detectDataStartRow(Sheet sheet) {
        for (int i = 0; i <= Math.min(10, sheet.getLastRowNum()); i++) {
            Row row = sheet.getRow(i);
            if (row == null) continue;
            for (Cell cell : row) {
                String val = getCellStringRaw(cell);
                if (val != null) {
                    String normalized = normalizeHeader(val);
                    if (normalized.equals("cpf") || normalized.equals("nome") || normalized.contains("nomefuncionario")) {
                        return i + 1; // Dados começam na linha seguinte do cabeçalho detectado
                    }
                }
            }
        }
        return 1; // Fallback
    }

    private boolean isRowEmpty(Row row) {
        for (int i = 0; i < row.getLastCellNum(); i++) {
            Cell cell = row.getCell(i);
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                String val = getCellStringRaw(cell);
                if (val != null && !val.isBlank()) {
                    return false;
                }
            }
        }
        return true;
    }

    private String getMappedValue(Row row, Map<String, Integer> headerMap, String key) {
        Integer colIdx = headerMap.get(key);
        if (colIdx == null) return null;
        Cell cell = row.getCell(colIdx);
        return getCellStringRaw(cell);
    }

    private String getCellStringRaw(Cell cell) {
        if (cell == null) return null;
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
        if (raw == null) return null;
        return raw.replaceAll("[^0-9]", "");
    }

    private String normalizePis(String raw) {
        if (raw == null) return null;
        return raw.replaceAll("[^0-9]", "");
    }

    private String normalizeCep(String raw) {
        if (raw == null) return null;
        String digits = raw.replaceAll("[^0-9]", "");
        return digits.length() == 8 ? digits.substring(0, 5) + "-" + digits.substring(5) : raw;
    }

    private String normalizeUF(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String clean = raw.trim().toUpperCase();
        if (clean.contains("-")) {
            clean = clean.split("-")[0].trim();
        }
        return clean.length() > 2 ? clean.substring(0, 2) : clean;
    }

    private String normalizeSexo(String raw) {
        if (raw == null) return null;
        return switch (raw.trim().toUpperCase()) {
            case "M", "MASCULINO", "MASC" -> "MASCULINO";
            case "F", "FEMININO", "FEM" -> "FEMININO";
            default -> raw.trim().toUpperCase();
        };
    }

    private LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return LocalDate.parse(raw.trim(), DATE_FORMATTER_BR);
        } catch (DateTimeParseException e) {
            try {
                return LocalDate.parse(raw.trim(), DateTimeFormatter.ofPattern("d/M/yyyy"));
            } catch (DateTimeParseException e2) {
                try {
                    return LocalDate.parse(raw.trim(), DateTimeFormatter.ofPattern("yyyy-MM-dd"));
                } catch (DateTimeParseException e3) {
                    log.warn("⚠️ Data inválida: '{}'", raw);
                    return null;
                }
            }
        }
    }

    private BigDecimal parseSalario(String raw) {
        if (raw == null || raw.isBlank()) return null;
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
