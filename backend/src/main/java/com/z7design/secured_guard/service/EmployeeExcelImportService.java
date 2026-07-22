package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.EmployeeDTO;
import com.z7design.secured_guard.model.*;
import com.z7design.secured_guard.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.charset.StandardCharsets;
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
    private final UnitRepository unitRepository;
    private final DepartmentRepository departmentRepository;
    private final PositionRepository positionRepository;
    private final WorkPostRepository workPostRepository;

    // Mapeamento de colunas possíveis da planilha para campos da entidade
    // LinkedHashMap para preservar ordem: mapeamentos mais específicos devem vir depois
    private static final Map<String, String> COLUMN_MAPPING = new LinkedHashMap<>();

    static {
        // Informações básicas
        COLUMN_MAPPING.put("nome", "name");
        COLUMN_MAPPING.put("nome do colaborador", "name");
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
        COLUMN_MAPPING.put("grau instrução", "grauInstrucao");
        COLUMN_MAPPING.put("grau de instrução", "grauInstrucao");
        COLUMN_MAPPING.put("escolaridade", "grauInstrucao");
        COLUMN_MAPPING.put("matricula esocial", "matriculaEsocial");
        COLUMN_MAPPING.put("matrícula esocial", "matriculaEsocial");
        COLUMN_MAPPING.put("matricula e social", "matriculaEsocial");
        COLUMN_MAPPING.put("matrícula e social", "matriculaEsocial");
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
        COLUMN_MAPPING.put("data admissão", "hireDate");
        COLUMN_MAPPING.put("data de admissão", "hireDate");
        COLUMN_MAPPING.put("admissao", "hireDate");
        COLUMN_MAPPING.put("centro de custo", "centroCusto"); // opcional - armazenado em notes
        COLUMN_MAPPING.put("centro custo", "centroCusto");
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

        // Mapeamentos específicos da planilha do usuário
        COLUMN_MAPPING.put("funcionário", "name");
        COLUMN_MAPPING.put("funcionario", "name");
        COLUMN_MAPPING.put("setor", "unitName");
        COLUMN_MAPPING.put("setor de trabalho", "unitName");
        COLUMN_MAPPING.put("posto de trabalho", "unitName");
        COLUMN_MAPPING.put("cargo", "positionName");
        COLUMN_MAPPING.put("função", "positionName");
        COLUMN_MAPPING.put("cargo/função", "positionName");
        COLUMN_MAPPING.put("nome do funcionário", "name");
        COLUMN_MAPPING.put("salário base", "salario");
        COLUMN_MAPPING.put("tipo sal. contratual", "tipoSalarioContratual");
        COLUMN_MAPPING.put("tipo sal contratual", "tipoSalarioContratual");
        COLUMN_MAPPING.put("tipo salário contratual", "tipoSalarioContratual");
        COLUMN_MAPPING.put("raça/cor", "racaCor");
        COLUMN_MAPPING.put("raca/cor", "racaCor");
        COLUMN_MAPPING.put("raca cor", "racaCor");
        COLUMN_MAPPING.put("raça cor", "racaCor");
        COLUMN_MAPPING.put("escala", "escalaTrabalho");
        COLUMN_MAPPING.put("nasc.", "birthDate");
        COLUMN_MAPPING.put("ag. itaú", "bank");
        COLUMN_MAPPING.put("conta", "account");
        COLUMN_MAPPING.put("digito", "accountDigit");
        COLUMN_MAPPING.put("chave pix", "pixKey");
        COLUMN_MAPPING.put("salário / 26", "salario");
        COLUMN_MAPPING.put("salário", "salario");
        COLUMN_MAPPING.put("situação", "status");
        COLUMN_MAPPING.put("aso feito em", "exameMedicoData");

        // Mapeamentos da planilha padrão (ordem: NÚMERO CÓDIGO, Nome, Função, Depto, Raça/Cor, etc.)
        COLUMN_MAPPING.put("depto", "unitName");
        COLUMN_MAPPING.put("departamento", "unitName");
        COLUMN_MAPPING.put("numero codigo", "registrationNumber");
        COLUMN_MAPPING.put("número código", "registrationNumber");
        COLUMN_MAPPING.put("data demissão", "terminationDate");
        COLUMN_MAPPING.put("data demissao", "terminationDate");
        COLUMN_MAPPING.put("pis", "pis");
        COLUMN_MAPPING.put("cbo", "cbo");
        COLUMN_MAPPING.put("banco", "bank");
        COLUMN_MAPPING.put("agência", "agency");
        COLUMN_MAPPING.put("agencia", "agency");
        COLUMN_MAPPING.put("orgão exp", "carteiraIdentidadeOrgaoEmissor");
        COLUMN_MAPPING.put("orgao exp", "carteiraIdentidadeOrgaoEmissor");
        COLUMN_MAPPING.put("u.f rg", "rgUf");
        COLUMN_MAPPING.put("uf rg", "rgUf");
        COLUMN_MAPPING.put("data emissão", "carteiraIdentidadeDataEmissao");
        COLUMN_MAPPING.put("data emissao", "carteiraIdentidadeDataEmissao");
        COLUMN_MAPPING.put("numero de serie", "ctpsSeries");
        COLUMN_MAPPING.put("nº de série", "ctpsSeries");
        COLUMN_MAPPING.put("n° de série", "ctpsSeries");
        COLUMN_MAPPING.put("formação", "grauInstrucao");
        COLUMN_MAPPING.put("formacao", "grauInstrucao");
        COLUMN_MAPPING.put("título eleitor", "tituloEleitor");
        COLUMN_MAPPING.put("titulo eleitor", "tituloEleitor");
        COLUMN_MAPPING.put("zona", "tituloEleitorZona");
        COLUMN_MAPPING.put("seção", "tituloEleitorSecao");
        COLUMN_MAPPING.put("secao", "tituloEleitorSecao");
        COLUMN_MAPPING.put("categoria cnh", "cnhCategory");
        COLUMN_MAPPING.put("vencimento cnh", "cnhExpirationDate");
        COLUMN_MAPPING.put("nome do pai", "nomePai");
        COLUMN_MAPPING.put("nome da mãe", "nomeMae");

        // Planilha de alunos (Matrícula do Aluno, Nome do Aluno, etc.)
        COLUMN_MAPPING.put("matrícula do aluno", "registrationNumber");
        COLUMN_MAPPING.put("matricula do aluno", "registrationNumber");
        COLUMN_MAPPING.put("nome do aluno", "name");
        COLUMN_MAPPING.put("identidade civil", "rg");
        COLUMN_MAPPING.put("naturalidade", "municipioNascimento");
        COLUMN_MAPPING.put("cód. turma", "unitName");
        COLUMN_MAPPING.put("cod. turma", "unitName");
        COLUMN_MAPPING.put("cód turma", "unitName");
        COLUMN_MAPPING.put("cod turma", "unitName");
        COLUMN_MAPPING.put("data matrícula", "hireDate");
        COLUMN_MAPPING.put("data matricula", "hireDate");
        COLUMN_MAPPING.put("tipo de deficiência", "tipoDeficiencia");
        COLUMN_MAPPING.put("tipo de deficiencia", "tipoDeficiencia");
        COLUMN_MAPPING.put("ddd", "ddd");
        COLUMN_MAPPING.put("cód.", "codigo");
        COLUMN_MAPPING.put("cod.", "codigo");
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

            String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
            boolean isCsv = filename.endsWith(".csv");
            boolean isExcel = filename.endsWith(".xlsx") || filename.endsWith(".xls");

            if (!isCsv && !isExcel) {
                result.addError("Apenas arquivos Excel (.xlsx, .xls) ou CSV (.csv) são aceitos");
                return result;
            }

            if (isCsv) {
                return importFromCsv(file.getInputStream(), result);
            }

            // Ler planilha Excel (.xlsx ou .xls)
            InputStream is = new java.io.BufferedInputStream(file.getInputStream());
            Workbook workbook = WorkbookFactory.create(is);
            Sheet sheet = workbook.getSheetAt(0); // Primeira aba

            if (sheet == null || sheet.getPhysicalNumberOfRows() < 2) {
                result.addError("Planilha vazia ou sem dados");
                workbook.close();
                return result;
            }

            // Encontrar linha do cabeçalho (nem sempre é a primeira linha)
            int headerRowIndex = findHeaderRow(sheet);
            if (headerRowIndex < 0) {
                result.addError(
                        "Cabeçalho não encontrado na planilha. Verifique se a linha contém os nomes das colunas.");
                workbook.close();
                return result;
            }

            Row headerRow = sheet.getRow(headerRowIndex);
            if (headerRow == null) {
                result.addError("Cabeçalho não encontrado na planilha");
                workbook.close();
                return result;
            }

            Map<String, Integer> columnIndexMap = new HashMap<>();
            int companyCnpjColumnIndex = -1;
            String fixedCompanyCnpj = null;

            // Mapear colunas do cabeçalho
            // Usar a chave MAIS ESPECÍFICA (mais longa) que corresponder para evitar conflitos:
            // ex: "Nome do Pai" deve mapear para nomePai, não para name (que usa "nome")
            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                Cell cell = headerRow.getCell(i);
                if (cell != null) {
                    String columnName = getCellValueAsString(cell).toLowerCase().trim();
                    if (columnName.isEmpty())
                        continue;

                    // Verificar se é coluna de empresa (CNPJ)
                    if (columnName.contains("cnpj") && columnName.contains("empresa")) {
                        companyCnpjColumnIndex = i;
                        log.info("📋 Coluna CNPJ da empresa encontrada na coluna: {}", i);
                    }

                    // Encontrar a chave mais específica (mais longa) que corresponde
                    String bestTarget = null;
                    int bestKeyLength = 0;
                    for (Map.Entry<String, String> entry : COLUMN_MAPPING.entrySet()) {
                        String key = entry.getKey();
                        if (columnName.contains(key) && key.length() > bestKeyLength) {
                            bestTarget = entry.getValue();
                            bestKeyLength = key.length();
                        }
                    }
                    if (bestTarget != null) {
                        columnIndexMap.put(bestTarget, i);
                        log.debug("📋 Coluna '{}' mapeada para campo '{}' na posição {}",
                                columnName, bestTarget, i);
                    }
                }
            }

            // Validar se encontrou CNPJ da empresa
            if (companyCnpjColumnIndex == -1) {
                fixedCompanyCnpj = findCompanyCnpjInSheet(sheet, headerRowIndex);
                if (fixedCompanyCnpj == null || fixedCompanyCnpj.isEmpty()) {
                    result.addError(
                            "Coluna 'CNPJ Empresa' não encontrada na planilha. É necessário uma coluna contendo o CNPJ da empresa.");
                    workbook.close();
                    return result;
                }
                log.info("📋 CNPJ da empresa encontrado no cabeçalho: {}", fixedCompanyCnpj);
            }

            // Buscar empresa do primeiro registro (todos devem ser da mesma empresa)
            Row firstDataRow = sheet.getRow(headerRowIndex + 1);
            if (firstDataRow == null) {
                result.addError("Nenhum dado encontrado na planilha");
                workbook.close();
                return result;
            }

            String companyCnpj;
            if (fixedCompanyCnpj != null) {
                companyCnpj = fixedCompanyCnpj;
            } else {
                Cell cnpjCell = firstDataRow.getCell(companyCnpjColumnIndex);
                companyCnpj = getCellValueAsString(cnpjCell);
            }

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
            log.info("📊 Processando {} linhas de dados", totalRows - (headerRowIndex + 1));

            for (int rowIndex = headerRowIndex + 1; rowIndex < totalRows; rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null)
                    continue;

                try {
                    // Verificar se a linha tem dados
                    if (isRowEmpty(row))
                        continue;

                    // Resolver empresa da linha: se existir coluna CNPJ Empresa, usar o CNPJ da
                    // linha; senão usar a empresa já encontrada
                    Company rowCompany = company;
                    if (companyCnpjColumnIndex != -1) {
                        Cell rowCnpjCell = row.getCell(companyCnpjColumnIndex);
                        String rowCnpj = getCellValueAsString(rowCnpjCell);
                        String rowNormalizedCnpj = rowCnpj != null ? rowCnpj.replaceAll("[^0-9]", "") : "";

                        if (rowNormalizedCnpj == null || rowNormalizedCnpj.isEmpty()) {
                            result.addWarning(
                                    "Linha " + (rowIndex + 1) + ": CNPJ da empresa vazio. Usando empresa padrão.");
                        } else if (!rowNormalizedCnpj.equals(normalizedCnpj)) {
                            Optional<Company> rowCompanyOpt = companyRepository.findByNormalizedCnpj(rowNormalizedCnpj);
                            if (rowCompanyOpt.isPresent()) {
                                rowCompany = rowCompanyOpt.get();
                            } else {
                                result.addWarning("Linha " + (rowIndex + 1) + ": Empresa com CNPJ " + rowCnpj
                                        + " não cadastrada. Usando empresa padrão.");
                            }
                        }
                    }

                    // Criar DTO do funcionário a partir da linha (com empresa e setor de trabalho)
                    EmployeeDTO employeeDTO = createEmployeeDTOFromRow(row, columnIndexMap, rowCompany);

                    // Validar campos obrigatórios
                    if (employeeDTO.getName() == null || employeeDTO.getName().trim().isEmpty()) {
                        result.addWarning("Linha " + (rowIndex + 1) + ": Nome não informado. Ignorando linha.");
                        continue;
                    }

                    if (employeeDTO.getCpf() == null || employeeDTO.getCpf().trim().isEmpty()) {
                        result.addWarning("Linha " + (rowIndex + 1) + ": CPF não informado. Ignorando linha.");
                        continue;
                    }

                    // Análise: se já existir no banco (por CPF ou matrícula eSocial), NÃO IMPORTE
                    String normalizedCpf = employeeDTO.getCpf().replaceAll("[^0-9]", "");
                    Optional<Employee> existingEmployee = employeeService.findByCpfExact(normalizedCpf);

                    if (existingEmployee.isEmpty() && employeeDTO.getMatriculaEsocial() != null
                            && !employeeDTO.getMatriculaEsocial().trim().isEmpty()) {
                        existingEmployee = employeeService
                                .findByMatriculaEsocial(employeeDTO.getMatriculaEsocial().trim());
                    }

                    if (existingEmployee.isPresent()) {
                        log.warn(
                                "⚠️ Funcionário com CPF/Matrícula já existe na base (CPF: {}). Registro não importado.",
                                normalizedCpf);
                        result.addWarning("Linha " + (rowIndex + 1) + " (Funcionário: " + employeeDTO.getName() + "): CPF/Matrícula já cadastrado na base de dados - registro não importado.");
                        result.addError("Linha " + (rowIndex + 1) + ": CPF " + normalizedCpf + " já cadastrado.");
                    } else {
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

    private ImportResult importFromCsv(InputStream inputStream, ImportResult result) {
        try (Reader reader = new InputStreamReader(inputStream, StandardCharsets.UTF_8);
             CSVParser parser = new CSVParser(reader, CSVFormat.DEFAULT.builder()
                     .setHeader()
                     .setSkipHeaderRecord(true)
                     .setIgnoreEmptyLines(true)
                     .setTrim(true)
                     .build())) {

            List<String> headerNames = parser.getHeaderNames();
            if (headerNames == null || headerNames.isEmpty()) {
                result.addError("CSV sem cabeçalho ou vazio");
                return result;
            }

            Map<String, Integer> columnIndexMap = new HashMap<>();
            int companyCnpjColumnIndex = -1;
            String fixedCompanyCnpj = null;

            for (int i = 0; i < headerNames.size(); i++) {
                String columnName = headerNames.get(i).toLowerCase().trim();
                if (columnName.isEmpty()) continue;

                if (columnName.contains("cnpj") && columnName.contains("empresa")) {
                    companyCnpjColumnIndex = i;
                }

                String bestTarget = null;
                int bestKeyLength = 0;
                for (Map.Entry<String, String> entry : COLUMN_MAPPING.entrySet()) {
                    if (columnName.contains(entry.getKey()) && entry.getKey().length() > bestKeyLength) {
                        bestTarget = entry.getValue();
                        bestKeyLength = entry.getKey().length();
                    }
                }
                if (bestTarget != null) {
                    columnIndexMap.put(bestTarget, i);
                }
            }

            List<CSVRecord> records = parser.getRecords();
            Company company;
            if (companyCnpjColumnIndex >= 0 && !records.isEmpty()) {
                CSVRecord firstRecord = records.get(0);
                String companyCnpj = firstRecord.size() > companyCnpjColumnIndex
                        ? firstRecord.get(companyCnpjColumnIndex) : "";
                if (companyCnpj == null || companyCnpj.trim().isEmpty()) {
                    company = companyRepository.findAll().stream().findFirst().orElse(null);
                    if (company == null) {
                        result.addError("CNPJ da empresa não encontrado e nenhuma empresa cadastrada");
                        return result;
                    }
                    result.addWarning("CNPJ da empresa vazio. Usando primeira empresa cadastrada.");
                } else {
                    String normalizedCnpj = companyCnpj.replaceAll("[^0-9]", "");
                    Optional<Company> companyOpt = companyRepository.findByNormalizedCnpj(normalizedCnpj);
                    if (companyOpt.isEmpty()) {
                        result.addError("Empresa não encontrada com CNPJ: " + companyCnpj);
                        return result;
                    }
                    company = companyOpt.get();
                }
            } else {
                company = companyRepository.findAll().stream().findFirst().orElse(null);
                if (company == null) {
                    result.addError("Coluna 'CNPJ Empresa' não encontrada e nenhuma empresa cadastrada");
                    return result;
                }
                if (companyCnpjColumnIndex < 0) {
                    result.addWarning("Coluna 'CNPJ Empresa' não encontrada. Usando primeira empresa cadastrada.");
                }
            }

            int rowNum = 1;
            for (CSVRecord record : records) {
                rowNum++;
                if (record.size() == 0) continue;

                Map<String, String> values = new HashMap<>();
                for (Map.Entry<String, Integer> entry : columnIndexMap.entrySet()) {
                    int idx = entry.getValue();
                    if (record.size() > idx) {
                        String v = record.get(idx);
                        if (v != null && !v.trim().isEmpty()) {
                            values.put(entry.getKey(), v);
                        }
                    }
                }

                Company rowCompany = company;
                if (companyCnpjColumnIndex >= 0 && record.size() > companyCnpjColumnIndex) {
                    String rowCnpj = record.get(companyCnpjColumnIndex);
                    String rowNormalizedCnpj = rowCnpj != null ? rowCnpj.replaceAll("[^0-9]", "") : "";
                    if (rowNormalizedCnpj != null && !rowNormalizedCnpj.isEmpty()) {
                        rowCompany = companyRepository.findByNormalizedCnpj(rowNormalizedCnpj).orElse(company);
                    }
                }

                try {
                    EmployeeDTO employeeDTO = createEmployeeDTOFromValues(values, rowCompany);

                    if (employeeDTO.getName() == null || employeeDTO.getName().trim().isEmpty()) {
                        result.addWarning("Linha " + rowNum + ": Nome não informado. Ignorando linha.");
                        continue;
                    }
                    if (employeeDTO.getCpf() == null || employeeDTO.getCpf().trim().isEmpty()) {
                        result.addWarning("Linha " + rowNum + ": CPF não informado. Ignorando linha.");
                        continue;
                    }

                    String normalizedCpf = employeeDTO.getCpf().replaceAll("[^0-9]", "");
                    Optional<Employee> existingEmployee = employeeService.findByCpfExact(normalizedCpf);
                    if (existingEmployee.isEmpty() && employeeDTO.getMatriculaEsocial() != null
                            && !employeeDTO.getMatriculaEsocial().trim().isEmpty()) {
                        existingEmployee = employeeService.findByMatriculaEsocial(employeeDTO.getMatriculaEsocial().trim());
                    }

                    if (existingEmployee.isPresent()) {
                        employeeDTO.setId(existingEmployee.get().getId());
                        employeeService.update(existingEmployee.get().getId(), employeeDTO);
                        result.incrementUpdated();
                    } else {
                        employeeService.create(employeeDTO);
                        result.incrementCreated();
                    }
                } catch (Exception e) {
                    log.error("❌ Erro ao processar linha {}: {}", rowNum, e.getMessage(), e);
                    result.addError("Linha " + rowNum + ": " + e.getMessage());
                }
            }

            log.info("✅ Importação CSV concluída: {} criados, {} atualizados",
                    result.getCreated(), result.getUpdated());

        } catch (IOException e) {
            log.error("❌ Erro ao ler CSV: {}", e.getMessage(), e);
            result.addError("Erro ao ler arquivo CSV: " + e.getMessage());
        }
        return result;
    }

    private EmployeeDTO createEmployeeDTOFromRow(Row row, Map<String, Integer> columnIndexMap, Company company) {
        Map<String, String> values = new HashMap<>();
        for (Map.Entry<String, Integer> entry : columnIndexMap.entrySet()) {
            Cell cell = row.getCell(entry.getValue());
            String v = getCellValueAsString(cell);
            if (v != null && !v.trim().isEmpty()) {
                values.put(entry.getKey(), v);
            }
        }
        return createEmployeeDTOFromValues(values, company);
    }

    private EmployeeDTO createEmployeeDTOFromValues(Map<String, String> values, Company company) {
        EmployeeDTO dto = new EmployeeDTO();
        Map<String, String> tempValues = new HashMap<>();

        if (company != null) {
            EmployeeDTO.IdOnlyDTO companyDTO = new EmployeeDTO.IdOnlyDTO();
            companyDTO.setId(company.getId());
            companyDTO.setName(company.getName());
            dto.setCompany(companyDTO);
        }

        for (Map.Entry<String, String> entry : values.entrySet()) {
            String fieldName = entry.getKey();
            String cellValue = entry.getValue();
            if (cellValue == null || cellValue.trim().isEmpty())
                continue;

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
                        String phoneDigits = cellValue.replaceAll("[^0-9]", "");
                        String ddd = tempValues.get("ddd");
                        dto.setPhone(ddd != null && !ddd.isEmpty() ? ddd + phoneDigits : phoneDigits);
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
                        dto.setEstadoNascimento(
                                cellValue.trim().toUpperCase().substring(0, Math.min(2, cellValue.length())));
                        break;
                    case "grauInstrucao":
                        dto.setGrauInstrucao(cellValue.trim());
                        break;
                    case "racaCor":
                        dto.setRacaCor(cellValue.trim());
                        break;
                    case "tipoSalarioContratual":
                        dto.setTipoSalarioContratual(cellValue.trim());
                        break;
                    case "matriculaEsocial":
                        dto.setMatriculaEsocial(cellValue.trim());
                        break;
                    case "pis":
                        dto.setPis(cellValue.replaceAll("[^0-9]", "").trim());
                        break;
                    case "cbo":
                        dto.setCbo(cellValue.trim());
                        break;
                    case "carteiraIdentidadeOrgaoEmissor":
                        dto.setCarteiraIdentidadeOrgaoEmissor(cellValue.trim());
                        break;
                    case "carteiraIdentidadeDataEmissao":
                        dto.setCarteiraIdentidadeDataEmissao(parseDate(cellValue));
                        break;
                    case "rgUf":
                        String uf = cellValue.trim().toUpperCase();
                        dto.setRgUf(uf.length() >= 2 ? uf.substring(0, 2) : uf);
                        break;
                    case "ctpsSeries":
                        dto.setCtpsSeries(cellValue.trim());
                        break;
                    case "tituloEleitor":
                        dto.setTituloEleitor(cellValue.replaceAll("[^0-9]", "").trim());
                        break;
                    case "tituloEleitorZona":
                        dto.setTituloEleitorZona(cellValue.trim());
                        break;
                    case "tituloEleitorSecao":
                        dto.setTituloEleitorSecao(cellValue.trim());
                        break;
                    case "cnhCategory":
                        dto.setCnhCategory(cellValue.trim());
                        break;
                    case "cnhExpirationDate":
                        dto.setCnhExpirationDate(parseDate(cellValue));
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
                        dto.setEnderecoEstado(
                                cellValue.trim().toUpperCase().substring(0, Math.min(2, cellValue.length())));
                        break;
                    case "enderecoCep":
                        dto.setEnderecoCep(cellValue.replaceAll("[^0-9]", ""));
                        break;
                    case "hireDate":
                        dto.setHireDate(parseDate(cellValue));
                        break;
                    case "terminationDate":
                        dto.setTerminationDate(parseDate(cellValue));
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
                    case "bank":
                        if (dto.getBankInfo() == null)
                            dto.setBankInfo(new EmployeeDTO.BankInfoDTO());
                        dto.getBankInfo().setBank(cellValue.trim());
                        break;
                    case "agency":
                        if (dto.getBankInfo() == null)
                            dto.setBankInfo(new EmployeeDTO.BankInfoDTO());
                        dto.getBankInfo().setAgency(cellValue.trim());
                        break;
                    case "account":
                        if (dto.getBankInfo() == null)
                            dto.setBankInfo(new EmployeeDTO.BankInfoDTO());
                        dto.getBankInfo().setAccount(cellValue.trim());
                        break;
                    case "accountDigit":
                        if (dto.getBankInfo() == null)
                            dto.setBankInfo(new EmployeeDTO.BankInfoDTO());
                        dto.getBankInfo().setAccountDigit(cellValue.trim());
                        break;
                    case "pixKey":
                        if (dto.getBankInfo() == null)
                            dto.setBankInfo(new EmployeeDTO.BankInfoDTO());
                        dto.getBankInfo().setPixKey(cellValue.trim());
                        break;
                    case "salario":
                        try {
                            String normalizedSalario = cellValue.replaceAll("[^0-9,.]", "").replace(",", ".");
                            dto.setSalario(new java.math.BigDecimal(normalizedSalario));
                        } catch (Exception e) {
                            log.warn("⚠️ Erro ao converter salário: {}", cellValue);
                        }
                        break;
                    case "exameMedicoData":
                        dto.setExameMedicoData(parseDate(cellValue));
                        break;
                    case "escalaTrabalho":
                        dto.setEscalaTrabalho(cellValue.trim());
                        break;
                    case "tipoDeficiencia":
                        dto.setNotes((dto.getNotes() != null ? dto.getNotes() + " " : "") + "Tipo Deficiência: "
                                + cellValue.trim());
                        break;
                    case "ddd":
                        String dddVal = cellValue.trim().replaceAll("[^0-9]", "");
                        if (!dddVal.isEmpty()) {
                            tempValues.put("ddd", dddVal);
                            if (dto.getPhone() != null && !dto.getPhone().isEmpty()) {
                                dto.setPhone(dddVal + dto.getPhone());
                            }
                        }
                        break;
                    case "codigo":
                        dto.setNotes((dto.getNotes() != null ? dto.getNotes() + " " : "") + "Cód: " + cellValue.trim());
                        break;
                    case "centroCusto":
                        // Centro de custo é opcional - armazenado em notes para referência
                        dto.setNotes((dto.getNotes() != null ? dto.getNotes() + " " : "") + "Centro Custo: " + cellValue.trim());
                        break;
                    case "unitName":
                        // Prioridade 1: Tentar vincular a um Posto de Trabalho (WorkPost) pelo nome
                        String setorNome = cellValue.trim();
                        Optional<WorkPost> workPostOpt = workPostRepository.findByName(setorNome)
                                .or(() -> workPostRepository.findByNameContainingIgnoreCase(setorNome).stream()
                                        .findFirst());

                        if (workPostOpt.isPresent()) {
                            dto.setWorkPostId(workPostOpt.get().getId().toString());
                            log.debug("📌 Posto de Trabalho '{}' vinculado ao funcionário", setorNome);
                        } else {
                            // Prioridade 2: Tentar vincular a Unidade ou Departamento pelo nome (legado)
                            Optional<Unit> unitOpt = unitRepository.findByName(setorNome)
                                    .or(() -> unitRepository.findByNameContainingIgnoreCase(setorNome).stream()
                                            .findFirst());
                            if (unitOpt.isPresent()) {
                                EmployeeDTO.UnitDTO unitDTO = new EmployeeDTO.UnitDTO();
                                unitDTO.setId(unitOpt.get().getId());
                                unitDTO.setName(unitOpt.get().getName());
                                dto.setUnit(unitDTO);
                                log.debug("📌 Unidade '{}' vinculada ao funcionário", setorNome);
                            } else {
                                List<Department> deps = departmentRepository.findByNameContainingIgnoreCase(setorNome);
                                if (!deps.isEmpty()) {
                                    dto.setDepartmentId(deps.get(0).getId().toString());
                                    log.debug("📌 Departamento '{}' vinculado ao funcionário", setorNome);
                                } else {
                                    dto.setNotes(
                                            (dto.getNotes() != null ? dto.getNotes() + " " : "") + "Setor/Posto: "
                                                    + setorNome);
                                }
                            }
                        }
                        break;
                    case "positionName":
                        // Tentar vincular a um Cargo (Position) pelo nome
                        String cargoNome = cellValue.trim();
                        Optional<Position> positionOpt = positionRepository.findByName(cargoNome)
                                .or(() -> positionRepository.searchPositions(cargoNome).stream().findFirst());

                        if (positionOpt.isPresent()) {
                            EmployeeDTO.PositionDTO positionDTO = new EmployeeDTO.PositionDTO();
                            positionDTO.setId(positionOpt.get().getId());
                            positionDTO.setName(positionOpt.get().getName());
                            dto.setPosition(positionDTO);
                            log.debug("📌 Cargo '{}' vinculado ao funcionário", cargoNome);
                        } else {
                            dto.setNotes(
                                    (dto.getNotes() != null ? dto.getNotes() + " " : "") + "Cargo: " + cargoNome);
                        }
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
        if (cell == null)
            return null;

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
        if (dateStr == null || dateStr.trim().isEmpty())
            return null;

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
        if (sexo == null)
            return null;
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
        if (status == null)
            return "ACTIVE";
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
        if (status == null)
            return "SINGLE";
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
        if (row == null)
            return true;
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

    private int findHeaderRow(Sheet sheet) {
        int maxRow = Math.min(20, sheet.getLastRowNum());
        int bestRow = -1;
        int bestScore = 0;
        for (int rowIndex = 0; rowIndex <= maxRow; rowIndex++) {
            Row row = sheet.getRow(rowIndex);
            if (row == null || isRowEmpty(row))
                continue;
            int score = countHeaderMatches(row);
            if (score > bestScore) {
                bestScore = score;
                bestRow = rowIndex;
            }
        }
        return bestScore >= 2 ? bestRow : -1;
    }

    private int countHeaderMatches(Row row) {
        int score = 0;
        for (int i = 0; i < row.getLastCellNum(); i++) {
            Cell cell = row.getCell(i);
            if (cell == null)
                continue;
            String columnName = getCellValueAsString(cell);
            if (columnName == null)
                continue;
            String normalized = columnName.toLowerCase().trim();
            if (normalized.contains("cnpj") && normalized.contains("empresa")) {
                score += 2;
                continue;
            }
            for (String key : COLUMN_MAPPING.keySet()) {
                if (normalized.contains(key)) {
                    score += 1;
                    break;
                }
            }
        }
        return score;
    }

    private String findCompanyCnpjInSheet(Sheet sheet, int headerRowIndex) {
        int maxRow = Math.min(headerRowIndex, sheet.getLastRowNum());
        for (int rowIndex = 0; rowIndex <= maxRow; rowIndex++) {
            Row row = sheet.getRow(rowIndex);
            if (row == null)
                continue;
            for (int cellIndex = 0; cellIndex < row.getLastCellNum(); cellIndex++) {
                Cell cell = row.getCell(cellIndex);
                if (cell == null)
                    continue;
                String value = getCellValueAsString(cell);
                if (value == null)
                    continue;
                String normalized = value.toLowerCase();
                if (normalized.contains("cnpj")) {
                    String extracted = extractDigits(value);
                    if (extracted.length() >= 14) {
                        return extracted;
                    }
                    Cell nextCell = row.getCell(cellIndex + 1);
                    String nextValue = getCellValueAsString(nextCell);
                    String nextDigits = extractDigits(nextValue);
                    if (nextDigits.length() >= 14) {
                        return nextDigits;
                    }
                }
            }
        }
        return null;
    }

    private String extractDigits(String value) {
        if (value == null)
            return "";
        return value.replaceAll("[^0-9]", "");
    }

    public static class ImportResult {
        private int created = 0;
        private int updated = 0;
        private List<String> errors = new ArrayList<>();
        private List<String> warnings = new ArrayList<>();

        public void incrementCreated() {
            created++;
        }

        public void incrementUpdated() {
            updated++;
        }

        public void addError(String error) {
            errors.add(error);
        }

        public void addWarning(String warning) {
            warnings.add(warning);
        }

        public int getCreated() {
            return created;
        }

        public int getUpdated() {
            return updated;
        }

        public List<String> getErrors() {
            return errors;
        }

        public List<String> getWarnings() {
            return warnings;
        }

        public boolean isSuccess() {
            return errors.isEmpty() && (created > 0 || updated > 0);
        }

        public String getSummary() {
            return String.format("Criados: %d, Atualizados: %d, Erros: %d, Avisos: %d",
                    created, updated, errors.size(), warnings.size());
        }
    }
}
