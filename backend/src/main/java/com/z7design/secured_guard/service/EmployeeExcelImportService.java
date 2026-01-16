package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.EmployeeDTO;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.enums.EmploymentStatus;
import com.z7design.secured_guard.repository.CompanyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmployeeExcelImportService {
    
    private final EmployeeService employeeService;
    private final CompanyRepository companyRepository;
    
    // Mapeamento de colunas possíveis da planilha para campos da entidade
    private static final Map<String, String> COLUMN_MAPPING = new HashMap<>();
    
    static {
        // Informações básicas
        COLUMN_MAPPING.put("nome", "name");
        COLUMN_MAPPING.put("nome completo", "name");
        COLUMN_MAPPING.put("name", "name");
        COLUMN_MAPPING.put("cpf", "cpf");
        COLUMN_MAPPING.put("documento", "cpf");
        COLUMN_MAPPING.put("rg", "rg");
        COLUMN_MAPPING.put("carteira identidade", "rg");
        COLUMN_MAPPING.put("email", "email");
        COLUMN_MAPPING.put("e-mail", "email");
        COLUMN_MAPPING.put("telefone", "phone");
        COLUMN_MAPPING.put("whatsapp", "phone");
        COLUMN_MAPPING.put("celular", "phone");
        COLUMN_MAPPING.put("data nascimento", "birthDate");
        COLUMN_MAPPING.put("data de nascimento", "birthDate");
        COLUMN_MAPPING.put("nascimento", "birthDate");
        COLUMN_MAPPING.put("birthdate", "birthDate");
        COLUMN_MAPPING.put("sexo", "sexo");
        COLUMN_MAPPING.put("genero", "sexo");
        COLUMN_MAPPING.put("municipio nascimento", "municipioNascimento");
        COLUMN_MAPPING.put("município nascimento", "municipioNascimento");
        COLUMN_MAPPING.put("cidade nascimento", "municipioNascimento");
        COLUMN_MAPPING.put("estado nascimento", "estadoNascimento");
        COLUMN_MAPPING.put("uf nascimento", "estadoNascimento");
        COLUMN_MAPPING.put("grau instrucao", "grauInstrucao");
        COLUMN_MAPPING.put("escolaridade", "grauInstrucao");
        COLUMN_MAPPING.put("matricula esocial", "matriculaEsocial");
        COLUMN_MAPPING.put("matrícula esocial", "matriculaEsocial");
        COLUMN_MAPPING.put("matricula", "matriculaEsocial");
        
        // Endereço
        COLUMN_MAPPING.put("endereco", "enderecoRua");
        COLUMN_MAPPING.put("endereço", "enderecoRua");
        COLUMN_MAPPING.put("rua", "enderecoRua");
        COLUMN_MAPPING.put("logradouro", "enderecoRua");
        COLUMN_MAPPING.put("numero", "enderecoNumero");
        COLUMN_MAPPING.put("número", "enderecoNumero");
        COLUMN_MAPPING.put("complemento", "enderecoComplemento");
        COLUMN_MAPPING.put("bairro", "enderecoBairro");
        COLUMN_MAPPING.put("cidade", "enderecoCidade");
        COLUMN_MAPPING.put("municipio", "enderecoCidade");
        COLUMN_MAPPING.put("estado", "enderecoEstado");
        COLUMN_MAPPING.put("uf", "enderecoEstado");
        COLUMN_MAPPING.put("cep", "enderecoCep");
        
        // Dados profissionais
        COLUMN_MAPPING.put("data admissao", "hireDate");
        COLUMN_MAPPING.put("data de admissão", "hireDate");
        COLUMN_MAPPING.put("admissao", "hireDate");
        COLUMN_MAPPING.put("matricula", "registrationNumber");
        COLUMN_MAPPING.put("matrícula", "registrationNumber");
        COLUMN_MAPPING.put("status", "status");
        COLUMN_MAPPING.put("situacao", "status");
        
        // Dados familiares
        COLUMN_MAPPING.put("nome pai", "nomePai");
        COLUMN_MAPPING.put("pai", "nomePai");
        COLUMN_MAPPING.put("nome mae", "nomeMae");
        COLUMN_MAPPING.put("mae", "nomeMae");
        COLUMN_MAPPING.put("mãe", "nomeMae");
        
        // Estado civil
        COLUMN_MAPPING.put("estado civil", "maritalStatus");
        COLUMN_MAPPING.put("nacionalidade", "nationality");
    }
    
    @Transactional
    public ImportResult importEmployees(MultipartFile file) {
        log.info("📥 Iniciando importação de funcionários do Excel: {}", file.getOriginalFilename());
        
        ImportResult result = new ImportResult();
        
        try {
            // Validar arquivo
            if (file.isEmpty()) {
                result.addError("Arquivo vazio");
                return result;
            }
            
            if (!file.getOriginalFilename().endsWith(".xlsx") && 
                !file.getOriginalFilename().endsWith(".xls")) {
                result.addError("Apenas arquivos Excel (.xlsx ou .xls) são aceitos");
                return result;
            }
            
            // Ler planilha
            Workbook workbook = new XSSFWorkbook(file.getInputStream());
            Sheet sheet = workbook.getSheetAt(0); // Primeira aba
            
            if (sheet == null || sheet.getPhysicalNumberOfRows() < 2) {
                result.addError("Planilha vazia ou sem dados");
                workbook.close();
                return result;
            }
            
            // Ler primeira linha (cabeçalho) para identificar colunas
            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                result.addError("Cabeçalho não encontrado na planilha");
                workbook.close();
                return result;
            }
            
            Map<String, Integer> columnIndexMap = new HashMap<>();
            int companyCnpjColumnIndex = -1;
            int companyNameColumnIndex = -1;
            
            // Mapear colunas do cabeçalho
            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                Cell cell = headerRow.getCell(i);
                if (cell != null) {
                    String columnName = getCellValueAsString(cell).toLowerCase().trim();
                    
                    // Verificar se é coluna de empresa (CNPJ)
                    if (columnName.contains("cnpj") && columnName.contains("empresa")) {
                        companyCnpjColumnIndex = i;
                        log.info("📋 Coluna CNPJ da empresa encontrada na coluna: {}", i);
                    } else if ((columnName.contains("empresa") || columnName.contains("company")) 
                               && !columnName.contains("cnpj")) {
                        companyNameColumnIndex = i;
                    }
                    
                    // Mapear colunas de funcionário
                    for (Map.Entry<String, String> entry : COLUMN_MAPPING.entrySet()) {
                        if (columnName.contains(entry.getKey())) {
                            columnIndexMap.put(entry.getValue(), i);
                            log.debug("📋 Coluna '{}' mapeada para campo '{}' na posição {}", 
                                    columnName, entry.getValue(), i);
                        }
                    }
                }
            }
            
            // Validar se encontrou CNPJ da empresa
            if (companyCnpjColumnIndex == -1) {
                result.addError("Coluna 'CNPJ Empresa' não encontrada na planilha. É necessário uma coluna contendo o CNPJ da empresa.");
                workbook.close();
                return result;
            }
            
            // Buscar empresa do primeiro registro (todos devem ser da mesma empresa)
            Row firstDataRow = sheet.getRow(1);
            if (firstDataRow == null) {
                result.addError("Nenhum dado encontrado na planilha");
                workbook.close();
                return result;
            }
            
            Cell cnpjCell = firstDataRow.getCell(companyCnpjColumnIndex);
            String companyCnpj = getCellValueAsString(cnpjCell);
            
            if (companyCnpj == null || companyCnpj.trim().isEmpty()) {
                result.addError("CNPJ da empresa não encontrado na primeira linha de dados");
                workbook.close();
                return result;
            }
            
            // Normalizar CNPJ (remover caracteres não numéricos)
            String normalizedCnpj = companyCnpj.replaceAll("[^0-9]", "");
            log.info("🔍 Buscando empresa com CNPJ normalizado: {}", normalizedCnpj);
            
            // Buscar empresa no banco
            Optional<Company> companyOpt = companyRepository.findByNormalizedCnpj(normalizedCnpj);
            if (companyOpt.isEmpty()) {
                result.addError("Empresa não encontrada com CNPJ: " + companyCnpj + 
                               ". Por favor, cadastre a empresa primeiro.");
                workbook.close();
                return result;
            }
            
            Company company = companyOpt.get();
            log.info("✅ Empresa encontrada: {} (ID: {}, Sigla: {})", 
                    company.getName(), company.getId(), company.getSigla());
            
            // Processar linhas de dados
            int totalRows = sheet.getPhysicalNumberOfRows();
            log.info("📊 Processando {} linhas de dados", totalRows - 1);
            
            for (int rowIndex = 1; rowIndex < totalRows; rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null) continue;
                
                try {
                    // Verificar se a linha tem dados
                    if (isRowEmpty(row)) continue;
                    
                    // Validar se o CNPJ da empresa é o mesmo
                    Cell rowCnpjCell = row.getCell(companyCnpjColumnIndex);
                    String rowCnpj = getCellValueAsString(rowCnpjCell);
                    String rowNormalizedCnpj = rowCnpj != null ? rowCnpj.replaceAll("[^0-9]", "") : "";
                    
                    if (!rowNormalizedCnpj.equals(normalizedCnpj)) {
                        result.addWarning("Linha " + (rowIndex + 1) + 
                                ": CNPJ diferente do esperado. Ignorando linha.");
                        continue;
                    }
                    
                    // Criar DTO do funcionário a partir da linha
                    EmployeeDTO employeeDTO = createEmployeeDTOFromRow(row, columnIndexMap, company);
                    
                    // Validar campos obrigatórios
                    if (employeeDTO.getName() == null || employeeDTO.getName().trim().isEmpty()) {
                        result.addWarning("Linha " + (rowIndex + 1) + ": Nome não informado. Ignorando linha.");
                        continue;
                    }
                    
                    if (employeeDTO.getCpf() == null || employeeDTO.getCpf().trim().isEmpty()) {
                        result.addWarning("Linha " + (rowIndex + 1) + ": CPF não informado. Ignorando linha.");
                        continue;
                    }
                    
                    // Verificar se funcionário já existe (por CPF)
                    String normalizedCpf = employeeDTO.getCpf().replaceAll("[^0-9]", "");
                    Optional<Employee> existingEmployee = employeeService.findByCpfExact(normalizedCpf);
                    
                    if (existingEmployee.isPresent()) {
                        log.info("⚠️ Funcionário já existe (CPF: {}). Atualizando...", normalizedCpf);
                        // Atualizar funcionário existente
                        employeeDTO.setId(existingEmployee.get().getId());
                        employeeService.update(existingEmployee.get().getId(), employeeDTO);
                        result.incrementUpdated();
                    } else {
                        // Criar novo funcionário
                        employeeService.create(employeeDTO);
                        result.incrementCreated();
                    }
                    
                } catch (Exception e) {
                    log.error("❌ Erro ao processar linha {}: {}", rowIndex + 1, e.getMessage(), e);
                    result.addError("Linha " + (rowIndex + 1) + ": " + e.getMessage());
                }
            }
            
            workbook.close();
            
            log.info("✅ Importação concluída: {} criados, {} atualizados, {} erros", 
                    result.getCreated(), result.getUpdated(), result.getErrors().size());
            
        } catch (IOException e) {
            log.error("❌ Erro ao ler arquivo Excel: {}", e.getMessage(), e);
            result.addError("Erro ao ler arquivo: " + e.getMessage());
        } catch (Exception e) {
            log.error("❌ Erro inesperado na importação: {}", e.getMessage(), e);
            result.addError("Erro inesperado: " + e.getMessage());
        }
        
        return result;
    }
    
    private EmployeeDTO createEmployeeDTOFromRow(Row row, Map<String, Integer> columnIndexMap, Company company) {
        EmployeeDTO dto = new EmployeeDTO();
        
        // Vincular empresa
        if (company != null) {
            EmployeeDTO.IdOnlyDTO companyDTO = new EmployeeDTO.IdOnlyDTO();
            companyDTO.setId(company.getId());
            companyDTO.setName(company.getName());
            dto.setCompany(companyDTO);
        }
        
        // Mapear campos da planilha
        for (Map.Entry<String, Integer> entry : columnIndexMap.entrySet()) {
            String fieldName = entry.getKey();
            int columnIndex = entry.getValue();
            
            Cell cell = row.getCell(columnIndex);
            if (cell == null) continue;
            
            String cellValue = getCellValueAsString(cell);
            if (cellValue == null || cellValue.trim().isEmpty()) continue;
            
            try {
                switch (fieldName) {
                    case "name":
                        dto.setName(cellValue.trim());
                        break;
                    case "cpf":
                        dto.setCpf(cellValue.replaceAll("[^0-9]", ""));
                        break;
                    case "rg":
                        dto.setRg(cellValue.trim());
                        break;
                    case "email":
                        dto.setEmail(cellValue.trim());
                        break;
                    case "phone":
                        dto.setPhone(cellValue.replaceAll("[^0-9]", ""));
                        break;
                    case "birthDate":
                        dto.setBirthDate(parseDate(cellValue));
                        break;
                    case "sexo":
                        dto.setSexo(normalizeSexo(cellValue));
                        break;
                    case "municipioNascimento":
                        dto.setMunicipioNascimento(cellValue.trim());
                        break;
                    case "estadoNascimento":
                        dto.setEstadoNascimento(cellValue.trim().toUpperCase().substring(0, Math.min(2, cellValue.length())));
                        break;
                    case "grauInstrucao":
                        dto.setGrauInstrucao(cellValue.trim());
                        break;
                    case "matriculaEsocial":
                        dto.setMatriculaEsocial(cellValue.trim());
                        break;
                    case "enderecoRua":
                        dto.setEnderecoRua(cellValue.trim());
                        break;
                    case "enderecoNumero":
                        dto.setEnderecoNumero(cellValue.trim());
                        break;
                    case "enderecoComplemento":
                        dto.setEnderecoComplemento(cellValue.trim());
                        break;
                    case "enderecoBairro":
                        dto.setEnderecoBairro(cellValue.trim());
                        break;
                    case "enderecoCidade":
                        dto.setEnderecoCidade(cellValue.trim());
                        break;
                    case "enderecoEstado":
                        dto.setEnderecoEstado(cellValue.trim().toUpperCase().substring(0, Math.min(2, cellValue.length())));
                        break;
                    case "enderecoCep":
                        dto.setEnderecoCep(cellValue.replaceAll("[^0-9]", ""));
                        break;
                    case "hireDate":
                        dto.setHireDate(parseDate(cellValue));
                        break;
                    case "registrationNumber":
                        dto.setRegistrationNumber(cellValue.trim());
                        break;
                    case "status":
                        dto.setStatus(normalizeStatus(cellValue));
                        break;
                    case "nomePai":
                        dto.setNomePai(cellValue.trim());
                        break;
                    case "nomeMae":
                        dto.setNomeMae(cellValue.trim());
                        break;
                    case "maritalStatus":
                        dto.setMaritalStatus(normalizeMaritalStatus(cellValue));
                        break;
                    case "nationality":
                        dto.setNationality(cellValue.trim());
                        break;
                }
            } catch (Exception e) {
                log.warn("⚠️ Erro ao mapear campo '{}' com valor '{}': {}", fieldName, cellValue, e.getMessage());
            }
        }
        
        // Valores padrão
        if (dto.getStatus() == null || dto.getStatus().isEmpty()) {
            dto.setStatus("ACTIVE");
        }
        if (dto.getMaritalStatus() == null || dto.getMaritalStatus().isEmpty()) {
            dto.setMaritalStatus("SINGLE");
        }
        if (dto.getNationality() == null || dto.getNationality().isEmpty()) {
            dto.setNationality("Brasileiro");
        }
        
        // Criar objeto AddressDTO se houver dados de endereço
        if (dto.getEnderecoRua() != null || dto.getEnderecoNumero() != null || 
            dto.getEnderecoBairro() != null || dto.getEnderecoCidade() != null) {
            EmployeeDTO.AddressDTO address = new EmployeeDTO.AddressDTO();
            address.setStreet(dto.getEnderecoRua());
            address.setNumber(dto.getEnderecoNumero());
            address.setComplement(dto.getEnderecoComplemento());
            address.setNeighborhood(dto.getEnderecoBairro());
            address.setCity(dto.getEnderecoCidade());
            address.setState(dto.getEnderecoEstado());
            address.setZipCode(dto.getEnderecoCep());
            dto.setAddress(address);
        }
        
        return dto;
    }
    
    private String getCellValueAsString(Cell cell) {
        if (cell == null) return null;
        
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getDateCellValue().toString();
                } else {
                    // Evitar notação científica
                    double numericValue = cell.getNumericCellValue();
                    if (numericValue == Math.floor(numericValue)) {
                        return String.valueOf((long) numericValue);
                    } else {
                        return String.valueOf(numericValue);
                    }
                }
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                try {
                    return cell.getStringCellValue();
                } catch (Exception e) {
                    return String.valueOf(cell.getNumericCellValue());
                }
            default:
                return null;
        }
    }
    
    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) return null;
        
        // Tentar diferentes formatos de data
        String[] formats = {
            "yyyy-MM-dd",
            "dd/MM/yyyy",
            "dd-MM-yyyy",
            "dd.MM.yyyy",
            "yyyy/MM/dd",
            "MM/dd/yyyy"
        };
        
        for (String format : formats) {
            try {
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern(format);
                return LocalDate.parse(dateStr.trim(), formatter);
            } catch (DateTimeParseException e) {
                // Tentar próximo formato
            }
        }
        
        log.warn("⚠️ Não foi possível fazer parse da data: {}", dateStr);
        return null;
    }
    
    private String normalizeSexo(String sexo) {
        if (sexo == null) return null;
        String normalized = sexo.trim().toUpperCase();
        if (normalized.contains("MASCULINO") || normalized.contains("M") || normalized.contains("HOMEM")) {
            return "MASCULINO";
        } else if (normalized.contains("FEMININO") || normalized.contains("F") || normalized.contains("MULHER")) {
            return "FEMININO";
        } else {
            return "OUTRO";
        }
    }
    
    private String normalizeStatus(String status) {
        if (status == null) return "ACTIVE";
        String normalized = status.trim().toUpperCase();
        if (normalized.contains("ATIVO") || normalized.contains("ACTIVE")) {
            return "ACTIVE";
        } else if (normalized.contains("INATIVO") || normalized.contains("INACTIVE")) {
            return "INACTIVE";
        } else if (normalized.contains("DEMITIDO") || normalized.contains("TERMINATED")) {
            return "TERMINATED";
        }
        return "ACTIVE";
    }
    
    private String normalizeMaritalStatus(String status) {
        if (status == null) return "SINGLE";
        String normalized = status.trim().toUpperCase();
        if (normalized.contains("SOLTEIRO") || normalized.contains("SINGLE")) {
            return "SINGLE";
        } else if (normalized.contains("CASADO") || normalized.contains("MARRIED")) {
            return "MARRIED";
        } else if (normalized.contains("DIVORCIADO") || normalized.contains("DIVORCED")) {
            return "DIVORCED";
        } else if (normalized.contains("VIÚVO") || normalized.contains("WIDOWED")) {
            return "WIDOWED";
        }
        return "SINGLE";
    }
    
    private boolean isRowEmpty(Row row) {
        if (row == null) return true;
        for (int i = 0; i < row.getLastCellNum(); i++) {
            Cell cell = row.getCell(i);
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                String value = getCellValueAsString(cell);
                if (value != null && !value.trim().isEmpty()) {
                    return false;
                }
            }
        }
        return true;
    }
    
    public static class ImportResult {
        private int created = 0;
        private int updated = 0;
        private List<String> errors = new ArrayList<>();
        private List<String> warnings = new ArrayList<>();
        
        public void incrementCreated() { created++; }
        public void incrementUpdated() { updated++; }
        public void addError(String error) { errors.add(error); }
        public void addWarning(String warning) { warnings.add(warning); }
        
        public int getCreated() { return created; }
        public int getUpdated() { return updated; }
        public List<String> getErrors() { return errors; }
        public List<String> getWarnings() { return warnings; }
        
        public boolean isSuccess() {
            return errors.isEmpty() && (created > 0 || updated > 0);
        }
        
        public String getSummary() {
            return String.format("Criados: %d, Atualizados: %d, Erros: %d, Avisos: %d", 
                    created, updated, errors.size(), warnings.size());
        }
    }
}
