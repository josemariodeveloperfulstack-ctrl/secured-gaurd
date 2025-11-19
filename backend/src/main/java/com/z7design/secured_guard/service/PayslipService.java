package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.CompanyTypeOrganizationResponse;
import com.z7design.secured_guard.dto.PayslipOrganizationResponse;
import com.z7design.secured_guard.dto.PayslipProcessedFileResponse;
import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Payslip;
import com.z7design.secured_guard.repository.PayslipRepository;
import com.z7design.secured_guard.repository.CompanyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.sourceforge.tess4j.TesseractException;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import com.z7design.secured_guard.dto.PayslipComparisonResult;

import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.RoleRepository;
import com.z7design.secured_guard.repository.UserRepository;
import org.springframework.util.StringUtils;
import org.springframework.transaction.annotation.Transactional;
import java.time.Month;

@Service
@RequiredArgsConstructor
@Slf4j
public class PayslipService {

    private final PayslipRepository payslipRepository;
    private final TesseractService tesseractService;
    private final ExtractDataHoleritesService extractDataHoleritesService;
    private final CompanyRepository companyRepository;
    private final EmployeeRepository employeeRepository;
    private final UserService userService;
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private static final String OUTPUT_DIR = "backend/holerites";
    private static final List<String> COMPANY_SIGLA_PRIORITY = List.of("TERC", "ADM", "VIG");

    public List<Payslip> processPayslipPDF(MultipartFile file) throws IOException {
        log.info("Iniciando processamento do arquivo: {}", file.getOriginalFilename());
        
        if (file.isEmpty()) {
            throw new IllegalArgumentException("O arquivo está vazio");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.equals("application/pdf")) {
            throw new IllegalArgumentException("O arquivo deve ser um PDF");
        }

        List<Payslip> processedPayslips = new ArrayList<>();
        int pageCount = 0;
        
        // Create output directory if it doesn't exist
        Path outputPath = Paths.get(OUTPUT_DIR);
        if (!Files.exists(outputPath)) {
            Files.createDirectories(outputPath);
        }

        try (PDDocument document = PDDocument.load(file.getInputStream())) {
            if (document.isEncrypted()) {
                throw new IllegalArgumentException("O PDF está criptografado");
            }

            PDFTextStripper stripper = new PDFTextStripper();
            pageCount = document.getNumberOfPages();
            log.info("📄 PDF contém {} página(s)", pageCount);
            log.info("📋 FORMATO ESPERADO: Cada página contém as duas vias do holerite (frente e verso) do MESMO funcionário");
            log.info("📋 Expectativa: {} holerite(s) processado(s) (1 holerite por página, mesmo que a página tenha frente e verso)", pageCount);
            log.info("🔍 VERIFICAÇÃO: O sistema irá validar se cada página contém apenas 1 CPF único (confirmando que é o mesmo funcionário nas duas vias)");

            int paginasProcessadas = 0;
            int paginasComErro = 0;
            int paginasPuladasPorDuplicidade = 0;

            for (int i = 1; i <= pageCount; i++) {
                log.info("=== Processando página {}/{} ===", i, pageCount);
                stripper.setStartPage(i);
                stripper.setEndPage(i);
                String pageText = stripper.getText(document);
                
                // Log do texto extraído para debug
                log.debug("Texto extraído da página {}: {}", i, pageText.substring(0, Math.min(500, pageText.length())));

                try {
                    // NOVA LÓGICA: Detectar TODOS os holerites na página
                    // Primeiro, identificar quantos CPFs únicos existem na página
                    List<String> cpfsUnicos = detectarTodosCPFsNaPagina(pageText);
                    log.info("🔍 Página {}: {} CPF(s) único(s) detectado(s): {}", i, cpfsUnicos.size(), cpfsUnicos);
                    
                    if (cpfsUnicos.isEmpty()) {
                        log.warn("⚠️ Nenhum CPF encontrado na página {}. Tentando extração completa...", i);
                        // Tentar extração normal (pode ser que o CPF esteja em formato diferente)
                        Payslip payslip = extractPayslipInfo(pageText, i);
                        if (payslip == null || payslip.getCpf() == null) {
                            // Tentar OCR
                            payslip = extractPayslipInfoWithOCR(document, i);
                        }
                        if (payslip != null && payslip.getCpf() != null) {
                            if (processarHoleriteUnico(document, i, payslip, pageText, processedPayslips)) {
                                paginasProcessadas++;
                            } else {
                                paginasPuladasPorDuplicidade++;
                                paginasProcessadas++; // Contar como processada mesmo que pulada
                            }
                        } else {
                            paginasComErro++;
                            log.warn("⚠️ Não foi possível extrair holerite da página {}", i);
                        }
                    } else {
                        // Processar cada CPF único encontrado (cada um é um holerite separado)
                        for (int idx = 0; idx < cpfsUnicos.size(); idx++) {
                            String cpfAtual = cpfsUnicos.get(idx);
                            log.info("📄 Processando holerite {}/{} da página {} - CPF: {}", idx + 1, cpfsUnicos.size(), i, cpfAtual);
                            
                            // Extrair holerite para este CPF específico
                            Payslip payslip = extractPayslipInfoPorCPF(pageText, i, cpfAtual);
                            
                            // Se falhou, tentar OCR
                            if (payslip == null || payslip.getCpf() == null || !payslip.getCpf().equals(cpfAtual)) {
                                log.warn("⚠️ Extração via PDFBox falhou para CPF {} na página {}. Tentando OCR...", cpfAtual, i);
                                payslip = extractPayslipInfoWithOCR(document, i);
                                // Verificar se o CPF extraído corresponde
                                if (payslip != null && payslip.getCpf() != null && !payslip.getCpf().equals(cpfAtual)) {
                                    log.warn("⚠️ CPF extraído via OCR ({}) não corresponde ao esperado ({}). Continuando...", payslip.getCpf(), cpfAtual);
                                }
                            }
                            
                            if (payslip != null && payslip.getCpf() != null && payslip.getCpf().equals(cpfAtual)) {
                                if (processarHoleriteUnico(document, i, payslip, pageText, processedPayslips)) {
                                    if (idx == 0) paginasProcessadas++; // Contar página apenas uma vez
                                } else {
                                    if (idx == 0) {
                                        paginasPuladasPorDuplicidade++;
                                        paginasProcessadas++; // Contar como processada mesmo que pulada
                                    }
                                }
                            } else {
                                log.warn("⚠️ Não foi possível extrair holerite para CPF {} na página {}", cpfAtual, i);
                                if (idx == 0) paginasComErro++;
                            }
                        }
                    }
                } catch (Exception pageException) {
                    paginasComErro++;
                    log.error("❌ Erro ao processar página {}/{}: {}", i, pageCount, pageException.getMessage());
                    log.debug("Stack trace da página {}: ", i, pageException);
                    // Continuar processando próximas páginas
                    continue;
                }
            }
            
            // VALIDAÇÃO: Verificar se quantidade de holerites processados corresponde à quantidade de páginas
            int paginasEsperadasProcessadas = pageCount - paginasPuladasPorDuplicidade;
            int holeritesProcessados = processedPayslips.size();
            
            log.info("");
            log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            log.info("📊 RESUMO DO PROCESSAMENTO:");
            log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            log.info("📄 Total de páginas no arquivo: {}", pageCount);
            log.info("✅ Páginas processadas com sucesso: {}", paginasProcessadas);
            log.info("❌ Páginas com erro na extração: {}", paginasComErro);
            log.info("⏭️  Páginas puladas (duplicidade): {}", paginasPuladasPorDuplicidade);
            log.info("📋 Total de holerites processados: {}", holeritesProcessados);
            
            // Validação principal: holerites processados devem ser igual a páginas (menos duplicidades)
            if (holeritesProcessados != paginasEsperadasProcessadas) {
                log.warn("⚠️ ATENÇÃO: Quantidade de holerites processados ({}) não corresponde à quantidade esperada ({} páginas - {} duplicidades = {} esperados)",
                    holeritesProcessados, pageCount, paginasPuladasPorDuplicidade, paginasEsperadasProcessadas);
                log.warn("⚠️ Diferença: {} holerite(s) a mais/menos do esperado", Math.abs(holeritesProcessados - paginasEsperadasProcessadas));
                
                if (holeritesProcessados > paginasEsperadasProcessadas) {
                    log.info("ℹ️ Mais holerites que páginas: Algumas páginas contêm múltiplos holerites (comportamento esperado)");
                } else if (holeritesProcessados < paginasEsperadasProcessadas) {
                    log.warn("⚠️ POSSÍVEL CAUSA: Uma ou mais páginas não geraram holerite (erro na extração ou dados inválidos)");
                    log.warn("⚠️ SOLUÇÃO: Verificar logs de erro acima para identificar páginas problemáticas");
                }
            } else {
                log.info("✅ VALIDAÇÃO OK: Quantidade de holerites processados ({}) corresponde à quantidade de páginas processadas ({})",
                    holeritesProcessados, paginasEsperadasProcessadas);
            }
            
            log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        }

        log.info("🎉 Processamento concluído. {} holerite(s) processado(s) com sucesso de {} página(s) do arquivo", 
            processedPayslips.size(), pageCount);
        return processedPayslips;
    }
    
    /**
     * Detecta todos os CPFs únicos na página
     */
    private List<String> detectarTodosCPFsNaPagina(String pageText) {
        List<String> cpfs = new ArrayList<>();
        Pattern cpfPattern = Pattern.compile("CPF[:\\s]*([0-9]{3}\\.?[0-9]{3}\\.?[0-9]{3}-?[0-9]{2})");
        Matcher matcher = cpfPattern.matcher(pageText);
        
        while (matcher.find()) {
            String cpf = matcher.group(1).replaceAll("[^0-9]", "");
            if (cpf.length() == 11 && !cpfs.contains(cpf)) {
                cpfs.add(cpf);
            }
        }
        
        return cpfs;
    }
    
    /**
     * Extrai informações do holerite para um CPF específico
     */
    private Payslip extractPayslipInfoPorCPF(String text, int pageNumber, String cpfAlvo) {
        // Extrair normalmente, mas garantir que o CPF extraído corresponde ao alvo
        Payslip payslip = extractPayslipInfo(text, pageNumber);
        if (payslip != null && payslip.getCpf() != null && payslip.getCpf().equals(cpfAlvo)) {
            return payslip;
        }
        // Se não correspondeu, tentar extrair focando no CPF alvo
        // Por enquanto, retornar o resultado da extração normal
        return payslip;
    }
    
    /**
     * Processa um holerite único (usado tanto para holerite único quanto para múltiplos)
     * @return true se o holerite foi processado, false se foi pulado por duplicidade
     */
    private boolean processarHoleriteUnico(PDDocument document, int pageNumber, Payslip payslip, String pageText, 
                                       List<Payslip> processedPayslips) {
        try {
            if (payslip == null || payslip.getEmployeeName() == null || payslip.getEmployeeName().equals("Desconhecido") || payslip.getCpf() == null) {
                log.warn("⚠️ Holerite inválido - não será processado");
                return false;
            }
            
            // Verificar se os dados da tabela foram extraídos
            if (payslip.getTableDetails() == null || payslip.getTableDetails().isEmpty()) {
                log.warn("⚠️ PDFBox extraiu dados básicos mas não encontrou dados da tabela. Tentando re-extrair tabela do texto...");
                String[] linhas = pageText.split("\r?\n");
                List<com.z7design.secured_guard.dto.PayslipTableRow> tableDetails = extractTableDetails(linhas);
                if (!tableDetails.isEmpty()) {
                    payslip.setTableDetails(tableDetails);
                    log.info("✅ Dados da tabela re-extraídos: {} linha(s)", tableDetails.size());
                }
            }

            enrichCompanyData(payslip);

            if (payslip != null && !payslip.getEmployeeName().equals("Desconhecido") && payslip.getCpf() != null) {
                        // TASK 02: Verificar se holerite já foi processado e comparar dados
                        try {
                            List<Payslip> holeritesExistentes = payslipRepository.findByCompanyCnpjAndCpfAndWorkPostNameAndMonthAndYear(
                                payslip.getCompanyCnpj(),
                                payslip.getCpf(),
                                payslip.getWorkPostName(),
                                payslip.getMonth(),
                                payslip.getYear()
                            );
                            
                            if (!holeritesExistentes.isEmpty()) {
                                log.info("🔍 {} holerite(s) já processado(s) encontrado(s) para CPF: {}, Empresa: {}, Setor: {}, Período: {}/{}",
                                    holeritesExistentes.size(),
                                    payslip.getCpf(),
                                    payslip.getCompanyCnpj() != null ? payslip.getCompanyCnpj() : "não informado",
                                    payslip.getWorkPostName() != null ? payslip.getWorkPostName() : "não informado",
                                    payslip.getMonth(),
                                    payslip.getYear()
                                );
                                
                                // Calcular hash do conteúdo da página atual para comparar com arquivo original
                                String hashPaginaAtual = calculatePageHash(pageText);
                                log.debug("🔐 Hash do conteúdo da página atual: {}", hashPaginaAtual.substring(0, Math.min(16, hashPaginaAtual.length())) + "...");
                                
                                // Comparar com o holerite mais recente (primeiro da lista ordenada por processedAt DESC)
                                Payslip holeriteExistente = holeritesExistentes.get(0);
                                log.info("📄 Comparando com holerite existente mais recente: ID={}, Arquivo={}, Processado em: {}", 
                                    holeriteExistente.getId(), 
                                    holeriteExistente.getFileName(),
                                    holeriteExistente.getProcessedAt());
                                
                                // Tentar obter hash do arquivo original salvo (se existir)
                                String hashArquivoOriginal = getPayslipFileHash(holeriteExistente);
                                
                                // Comparar dados extraídos e hash do arquivo
                                log.info("🔍 Iniciando comparação detalhada de holerites...");
                                log.info("   📊 Holerite EXISTENTE:");
                                log.info("      - Vencimentos: {}", holeriteExistente.getTotalEarnings());
                                log.info("      - Descontos: {}", holeriteExistente.getTotalDeductions());
                                log.info("      - Líquido: {}", holeriteExistente.getNetValue());
                                log.info("      - TableDetails: {} linha(s)", holeriteExistente.getTableDetails() != null ? holeriteExistente.getTableDetails().size() : 0);
                                log.info("   📊 Holerite NOVO:");
                                log.info("      - Vencimentos: {}", payslip.getTotalEarnings());
                                log.info("      - Descontos: {}", payslip.getTotalDeductions());
                                log.info("      - Líquido: {}", payslip.getNetValue());
                                log.info("      - TableDetails: {} linha(s)", payslip.getTableDetails() != null ? payslip.getTableDetails().size() : 0);
                                
                                PayslipComparisonResult comparacao = comparePayslips(holeriteExistente, payslip, hashArquivoOriginal, hashPaginaAtual);
                                
                                log.info("🔍 Resultado da comparação: hasChanges={}, total de diferenças={}", 
                                    comparacao.hasChanges(), comparacao.getDifferences().size());
                                
                                if (comparacao.hasChanges()) {
                                    log.warn("📝 ⚠️ ALTERAÇÕES DETECTADAS no holerite! Processando nova versão...");
                                    log.warn("📋 Diferenças encontradas ({}):", comparacao.getDifferences().size());
                                    for (int idx = 0; idx < comparacao.getDifferences().size(); idx++) {
                                        log.warn("   {}. {}", idx + 1, comparacao.getDifferences().get(idx));
                                    }
                                    
                                    // Gerar nome de arquivo único com versão/timestamp
                                    String timestamp = String.valueOf(System.currentTimeMillis()).substring(7); // últimos 6 dígitos
                                    String nomeArquivoComVersao = generateFileName(payslip, "V" + timestamp);
                                    payslip.setFileName(nomeArquivoComVersao); // Definir nome com versão
                                    log.info("🔄 Gerando novo arquivo PDF com versão: {} (arquivo original não será sobrescrito)", nomeArquivoComVersao);
                                } else {
                                    log.warn("⚠️ NENHUMA ALTERAÇÃO DETECTADA - Verificando se valores financeiros ou tableDetails estão sendo comparados corretamente...");
                                    log.warn("   Se houver diferenças visíveis nos valores, pode ser um problema na extração ou comparação");
                                    log.warn("   Valores comparados:");
                                    log.warn("      Vencimentos: {} vs {}", holeriteExistente.getTotalEarnings(), payslip.getTotalEarnings());
                                    log.warn("      Descontos: {} vs {}", holeriteExistente.getTotalDeductions(), payslip.getTotalDeductions());
                                    log.warn("      Líquido: {} vs {}", holeriteExistente.getNetValue(), payslip.getNetValue());
                                    log.warn("      TableDetails: {} vs {} linhas", 
                                        holeriteExistente.getTableDetails() != null ? holeriteExistente.getTableDetails().size() : 0,
                                        payslip.getTableDetails() != null ? payslip.getTableDetails().size() : 0);
                                    String msg = String.format(
                                        "Holerite idêntico já processado. Não há alterações detectadas. Empresa CNPJ %s, CPF %s, Setor %s, mês %d, ano %d. Pulando página %d.",
                                        payslip.getCompanyCnpj() != null ? payslip.getCompanyCnpj() : "não informado",
                                        payslip.getCpf(),
                                        payslip.getWorkPostName() != null ? payslip.getWorkPostName() : "não informado",
                                        payslip.getMonth(),
                                        payslip.getYear(),
                                        pageNumber
                                    );
                                    log.warn(msg);
                                    return false; // Retornar false indicando que foi pulado por duplicidade
                                }
                            } else {
                                log.info("✅ Holerite não duplicado - permitindo importação (Empresa CNPJ: {}, CPF: {}, Setor: {}, Período: {}/{})",
                                    payslip.getCompanyCnpj() != null ? payslip.getCompanyCnpj() : "não informado",
                                    payslip.getCpf(),
                                    payslip.getWorkPostName() != null ? payslip.getWorkPostName() : "não informado",
                                    payslip.getMonth(),
                                    payslip.getYear()
                                );
                            }
                        } catch (Exception e) {
                            log.warn("⚠️ Erro ao verificar duplicidade e comparar holerites, continuando processamento: {}", e.getMessage(), e);
                        }
                        
                        // Organizar em pastas e salvar PDF individual
                        String caminhoPdf = organizarEmPastas(document, pageNumber, payslip);
                        
                        // Salvar ou atualizar funcionário no banco
                        salvarFuncionario(payslip, caminhoPdf);
                        
                        // Salvar dados extraídos na tabela tb_extract_data_holerites
                        salvarDadosExtraidos(payslip);
                        
                        // Save to payslip database - usar apenas o nome do arquivo
                        String nomeArquivo = Paths.get(caminhoPdf).getFileName().toString();
                        payslip.setFileName(nomeArquivo);
                        payslip = payslipRepository.save(payslip);
                        processedPayslips.add(payslip);

                        // === CRIAÇÃO AUTOMÁTICA DE USUÁRIO ===
                        try {
                            createUserFromPayslip(payslip);
                        } catch (Exception userException) {
                            log.warn("⚠️ Erro ao criar usuário automático para {}: {}", payslip.getEmployeeName(), userException.getMessage());
                            // Não interromper processamento por erro na criação de usuário
                        }

                        log.info("✅ Holerite processado com sucesso: {} (CPF: {})", payslip.getEmployeeName(), payslip.getCpf());
                        return true; // Retornar true indicando que foi processado com sucesso
                    } else {
                        log.warn("⚠️ Holerite inválido - não será processado");
                        return false;
                    }
                } catch (Exception e) {
                    log.error("❌ Erro ao processar holerite: {}", e.getMessage(), e);
                    return false;
                }
    }

    private Payslip extractPayslipInfo(String text, int pageNumber) {
        return extractPayslipInfo(text, pageNumber, null);
    }

    // Nova versão principal com suporte a ocrText
    private Payslip extractPayslipInfo(String text, int pageNumber, String ocrText) {
        String method = ocrText != null ? "OCR" : "PDFBox";
        log.info("🔍 Tentando extrair informações da página {} via {}", pageNumber, method);

        // Verificar se o texto está vazio ou muito curto
        if (text == null || text.trim().isEmpty()) {
            log.warn("⚠️ Texto extraído está vazio para página {} via {}", pageNumber, method);
            return null;
        }
        
        if (text.trim().length() < 50) {
            log.warn("⚠️ Texto extraído é muito curto ({} caracteres) para página {} via {}. Pode indicar PDF escaneado ou corrompido.", 
                text.length(), pageNumber, method);
        }

        // Log do texto para debug (primeiros 1000 caracteres)
        log.debug("Texto extraído da página {} via {}: {}", pageNumber, method,
                 text.length() > 1000 ? text.substring(0, 1000) + "..." : text);

        // Dividir o texto em linhas para facilitar a busca
        String[] linhas = text.split("\r?\n");
        String nome = "Desconhecido";
        String cpf = null;
        String codigo = null;
        String mes = null;
        String ano = null;
        String empresaNome = null;
        String empresaCnpj = null;
        String workPostName = null;

        // 1. EXTRAÇÃO DE CPF PRIMEIRO (mais confiável)
        // IMPORTANTE: Cada página contém as duas vias do holerite (frente e verso do mesmo funcionário)
        // Portanto, deve haver apenas 1 CPF único por página. Se houver múltiplos, usar apenas o primeiro.
        Pattern cpfPattern = Pattern.compile("CPF[:\\s]*([0-9]{3}\\.?[0-9]{3}\\.?[0-9]{3}-?[0-9]{2})");
        
        // Contar quantos CPFs diferentes foram encontrados na página
        Set<String> cpfsEncontrados = new HashSet<>();
        
        for (String linha : linhas) {
            Matcher cpfMatcher = cpfPattern.matcher(linha);
            if (cpfMatcher.find()) {
                String cpfEncontrado = cpfMatcher.group(1).replaceAll("[^0-9]", "");
                cpfsEncontrados.add(cpfEncontrado);
                
                // Usar apenas o PRIMEIRO CPF encontrado (frente e verso têm o mesmo CPF)
                if (cpf == null) {
                    cpf = cpfEncontrado;
                    log.info("✅ CPF encontrado (primeiro): {} na linha: {}", cpf, linha.trim());
                    
                    // Na linha do CPF, tentar extrair código e nome
                    String linhaCpf = linha.trim();
                    
                    // Padrão 1: CODIGO NOME CPF (ex: 000044 ELAINE APARECIDA SOARES PEREIRA CPF: 073.495.276-75)
                    Pattern linhaCompleta1 = Pattern.compile("(\\d{6})\\s+(.+?)\\s+CPF");
                    Matcher lineMatch1 = linhaCompleta1.matcher(linhaCpf);
                    if (lineMatch1.find()) {
                        codigo = lineMatch1.group(1).trim();
                        String nomeCandidate = lineMatch1.group(2).trim();
                        if (isValidEmployeeName(nomeCandidate)) {
                            nome = nomeCandidate;
                            log.info("✅ Padrão 1 - Código: {}, Nome: {}", codigo, nome);
                            break;
                        }
                    }
                    
                    // Padrão 2: NOME CPF (sem código no início)
                    Pattern linhaCompleta2 = Pattern.compile("([A-ZÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ ]{5,})\\s+CPF");
                    Matcher lineMatch2 = linhaCompleta2.matcher(linhaCpf);
                    if (lineMatch2.find()) {
                        String nomeCandidate = lineMatch2.group(1).trim();
                        if (isValidEmployeeName(nomeCandidate)) {
                            nome = nomeCandidate;
                            log.info("✅ Padrão 2 - Nome: {} (sem código)", nome);
                            break;
                        }
                    }
                }
            }
        }
        
        // Validação: Se foram encontrados múltiplos CPFs diferentes na mesma página, avisar
        if (cpfsEncontrados.size() > 1) {
            log.warn("⚠️ ATENÇÃO: Foram encontrados {} CPF(s) diferente(s) na página {}: {}", 
                cpfsEncontrados.size(), pageNumber, cpfsEncontrados);
            log.warn("⚠️ Usando apenas o primeiro CPF encontrado: {} (frente e verso devem ter o mesmo CPF)", cpf);
            log.warn("⚠️ Esta página pode conter múltiplos holerites de funcionários diferentes ou formato inesperado");
            log.warn("⚠️ VERIFICAÇÃO: Cada página deve conter apenas as duas vias (frente e verso) do MESMO funcionário");
        } else if (cpfsEncontrados.size() == 1 && cpf != null) {
            log.info("✅ Validação OK: Apenas 1 CPF único encontrado na página {}: {} (confirma que a página contém apenas as duas vias do mesmo funcionário)", pageNumber, cpf);
        } else if (cpfsEncontrados.size() == 0) {
            log.warn("⚠️ Nenhum CPF encontrado na página {} - pode indicar problema na extração do texto", pageNumber);
        }

        // 1.5. EXTRAÇÃO DO CNPJ DA EMPRESA
        Pattern cnpjPattern = Pattern.compile("CNPJ[:\\s]*([0-9]{2}\\.?[0-9]{3}\\.?[0-9]{3}/?[0-9]{4}-?[0-9]{2}|[0-9]{14})");
        for (String linha : linhas) {
            Matcher cnpjMatcher = cnpjPattern.matcher(linha);
            if (cnpjMatcher.find()) {
                empresaCnpj = cnpjMatcher.group(1).replaceAll("[^0-9]", "");
                log.info("✅ CNPJ da empresa encontrado: {} na linha: {}", empresaCnpj, linha.trim());
                
                // Tentar extrair nome da empresa da mesma linha ou linhas próximas
                // Padrão comum: NOME_DA_EMPRESA + CNPJ
                // Ou em linhas separadas
                break;
            }
        }

        // Fallback: alguns holerites trazem o CNPJ sem o rótulo "CNPJ"
        if (empresaCnpj == null) {
            Pattern fallbackCnpjPattern = Pattern.compile("(?<!\\d)(\\d{14})(?!\\d)");
            int limiteLinhas = Math.min(15, linhas.length);
            for (int i = 0; i < limiteLinhas; i++) {
                String linha = linhas[i];
                Matcher fallbackMatcher = fallbackCnpjPattern.matcher(linha.replaceAll("\\s+", ""));
                if (fallbackMatcher.find()) {
                    empresaCnpj = fallbackMatcher.group(1);
                    log.info("✅ CNPJ (fallback) encontrado: {} na linha {}", empresaCnpj, linha.trim());

                    // Tentar capturar o nome da empresa na mesma linha (removendo números)
                    if (empresaNome == null) {
                        String possibleName = linha.replaceAll("\\d", " ").replaceAll("\\s+", " ").trim();
                        if (possibleName.length() > 5) {
                            empresaNome = possibleName;
                            log.info("✅ Nome da empresa (fallback) identificado: {}", empresaNome);
                        }
                    }
                    break;
                }
            }
        }
        
        // 1.6. EXTRAÇÃO DO NOME DA EMPRESA
        // Procurar por linhas que contenham palavras-chave de empresa
        for (int i = 0; i < linhas.length; i++) {
            String linha = linhas[i].trim();
            String linhaUpper = linha.toUpperCase();
            
            // Se encontrar CNPJ na linha, tentar pegar nome da linha anterior ou mesma linha
            if (linhaUpper.contains("CNPJ") && empresaNome == null) {
                // Tentar extrair nome da mesma linha (antes do CNPJ)
                int cnpjIndex = linhaUpper.indexOf("CNPJ");
                if (cnpjIndex > 10) { // Se há texto suficiente antes
                    String possibleName = linha.substring(0, cnpjIndex).trim();
                    // Remover palavras-chave que não são parte do nome
                    possibleName = possibleName.replaceAll("(?i)(EMPRESA|RAZÃO SOCIAL|EMPREGADOR)[:\\s]*", "").trim();
                    if (possibleName.length() > 5 && !possibleName.matches(".*\\d{3}.*")) {
                        empresaNome = possibleName;
                        log.info("✅ Nome da empresa encontrado (mesma linha CNPJ): {}", empresaNome);
                        break;
                    }
                }
                
                // Se não encontrou, tentar linha anterior
                if (i > 0 && empresaNome == null) {
                    String linhaNterior = linhas[i - 1].trim();
                    if (linhaNterior.length() > 5 && !linhaNterior.matches(".*\\d{3}.*") && 
                        !linhaNterior.toUpperCase().contains("FOLHA") &&
                        !linhaNterior.toUpperCase().contains("PAGAMENTO") &&
                        !linhaNterior.toUpperCase().contains("HOLERITE")) {
                        empresaNome = linhaNterior;
                        log.info("✅ Nome da empresa encontrado (linha anterior ao CNPJ): {}", empresaNome);
                        break;
                    }
                }
            }
            
            // Procurar por linhas com "LTDA", "S.A", "ME", etc. que geralmente indicam nome de empresa
            if (empresaNome == null && (linhaUpper.contains("LTDA") || linhaUpper.contains("S.A") || 
                linhaUpper.contains(" ME ") || linhaUpper.contains("EIRELI")) &&
                !linhaUpper.contains("FUNCIONARIO") && !linhaUpper.contains("CPF") &&
                linha.length() > 10 && linha.length() < 150) {
                empresaNome = linha;
                log.info("✅ Nome da empresa encontrado (por sufixo empresarial): {}", empresaNome);
                break;
            }
        }

        // 2. Se não encontrou nome na linha do CPF, procurar em linhas próximas
        if (nome.equals("Desconhecido") && cpf != null) {
            log.info("Procurando nome em linhas adjacentes ao CPF...");
            
            for (int i = 0; i < linhas.length; i++) {
                if (linhas[i].contains("CPF")) {
                    // Verificar linhas anteriores e posteriores (-3 a +3)
                    for (int j = Math.max(0, i-3); j <= Math.min(linhas.length-1, i+3); j++) {
                        String linhaCandidata = linhas[j].trim();
                        
                        // Pular linhas que claramente não são nomes
                        if (linhaCandidata.isEmpty() || 
                            linhaCandidata.contains("CPF") ||
                            linhaCandidata.contains("CNPJ") ||
                            linhaCandidata.toUpperCase().contains("FOLHA") ||
                            linhaCandidata.toUpperCase().contains("PAGAMENTO") ||
                            linhaCandidata.toUpperCase().contains("EMPRESA") ||
                            linhaCandidata.toUpperCase().contains("LTDA") ||
                            linhaCandidata.length() < 5) {
                            continue;
                        }
                        
                        // Extrair possível código + nome
                        Pattern codigoNome = Pattern.compile("(\\d{6})\\s+(.+)");
                        Matcher matchCodigoNome = codigoNome.matcher(linhaCandidata);
                        if (matchCodigoNome.find()) {
                            String possibleCodigo = matchCodigoNome.group(1);
                            String possibleNome = matchCodigoNome.group(2).trim();
                            if (isValidEmployeeName(possibleNome)) {
                                codigo = possibleCodigo;
                                nome = possibleNome;
                                log.info("✅ Nome encontrado com código: {} - {}", codigo, nome);
                                break;
                            }
                        }
                        
                        // Ou apenas nome (sem código)
                        if (isValidEmployeeName(linhaCandidata)) {
                            nome = linhaCandidata;
                            log.info("✅ Nome encontrado: {}", nome);
                            break;
                        }
                    }
                    break;
                }
            }
        }

        // 3. EXTRAÇÃO DO PERÍODO DE REFERÊNCIA - múltiplos padrões
        log.info("🔍 Procurando período de referência no holerite...");
        
        // Padrão 1: "DD/MM/AAAA a DD/MM/AAAA" (período completo)
        Pattern periodoPattern1 = Pattern.compile("(\\d{2})/(\\d{2})/(\\d{4})\\s+a\\s+(\\d{2})/(\\d{2})/(\\d{4})");
        for (int idx = 0; idx < linhas.length; idx++) {
            String linha = linhas[idx];
            Matcher periodoMatcher = periodoPattern1.matcher(linha);
            if (periodoMatcher.find()) {
                mes = periodoMatcher.group(5); // mês da data final (período de referência)
                ano = periodoMatcher.group(6); // ano da data final (período de referência)
                log.info("✅ Período de referência encontrado (padrão 1): {}/{} - Linha: {}", mes, ano, linha.trim());
                workPostName = findWorkPostName(linhas, idx, linha.substring(periodoMatcher.end()));
                break;
            }
        }

        // Padrão 2: "DD/MM/AAAA a DD/MM/AAAA" com espaços diferentes
        if (mes == null || ano == null) {
            Pattern periodoPattern1b = Pattern.compile("(\\d{2})/(\\d{2})/(\\d{4})\\s+à\\s+(\\d{2})/(\\d{2})/(\\d{4})");
            for (int idx = 0; idx < linhas.length; idx++) {
                String linha = linhas[idx];
                Matcher periodoMatcher = periodoPattern1b.matcher(linha);
                if (periodoMatcher.find()) {
                    mes = periodoMatcher.group(5);
                    ano = periodoMatcher.group(6);
                    log.info("✅ Período de referência encontrado (padrão 1b): {}/{} - Linha: {}", mes, ano, linha.trim());
                    if (workPostName == null) {
                        workPostName = findWorkPostName(linhas, idx, linha.substring(periodoMatcher.end()));
                    }
                    break;
                }
            }
        }

        // Padrão 3: "MM/AAAA" direto
        if (mes == null || ano == null) {
            Pattern periodoPattern2 = Pattern.compile("(\\d{2})/(\\d{4})");
            for (int idx = 0; idx < linhas.length; idx++) {
                String linha = linhas[idx];
                Matcher periodoMatcher = periodoPattern2.matcher(linha);
                if (periodoMatcher.find()) {
                    mes = periodoMatcher.group(1);
                    ano = periodoMatcher.group(2);
                    log.info("✅ Período de referência encontrado (padrão 2): {}/{} - Linha: {}", mes, ano, linha.trim());
                    if (workPostName == null) {
                        workPostName = findWorkPostName(linhas, idx, linha.substring(periodoMatcher.end()));
                    }
                    break;
                }
            }
        }

        // Padrão 4: "DD/MM/AAAA" (data única - usar o mês/ano dessa data)
        if (mes == null || ano == null) {
            Pattern periodoPattern3 = Pattern.compile("(\\d{2})/(\\d{2})/(\\d{4})");
            for (int idx = 0; idx < linhas.length; idx++) {
                String linha = linhas[idx];
                Matcher periodoMatcher = periodoPattern3.matcher(linha);
                if (periodoMatcher.find()) {
                    mes = periodoMatcher.group(2);
                    ano = periodoMatcher.group(3);
                    log.info("✅ Período de referência encontrado (padrão 3): {}/{} - Linha: {}", mes, ano, linha.trim());
                    if (workPostName == null) {
                        workPostName = findWorkPostName(linhas, idx, linha.substring(periodoMatcher.end()));
                    }
                    break;
                }
            }
        }

        // Padrão 5: Nomes de meses em português via OCR
        if ((mes == null || ano == null) && ocrText != null) {
            log.info("🔍 Tentando extrair período via OCR...");
            String[] meses = {"JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", 
                             "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"};
            for (int i = 0; i < meses.length; i++) {
                if (ocrText.toUpperCase().contains(meses[i])) {
                    mes = String.format("%02d", i + 1);
                    // Procurar ano próximo (2020-2030)
                    Pattern anoPattern = Pattern.compile("(20[2-3][0-9])");
                    Matcher anoMatcher = anoPattern.matcher(ocrText);
                    if (anoMatcher.find()) {
                        ano = anoMatcher.group(1);
                        log.info("✅ Período de referência encontrado via OCR: {}/{} ({})", mes, ano, meses[i]);
                        break;
                    }
                }
            }
        }

        // Padrão 6: Buscar por "PERÍODO" ou "REFERÊNCIA" no texto
        if ((mes == null || ano == null)) {
            log.info("🔍 Procurando por palavras-chave de período...");
            for (int idx = 0; idx < linhas.length; idx++) {
                String linha = linhas[idx];
                String linhaUpper = linha.toUpperCase();
                if (linhaUpper.contains("PERÍODO") || linhaUpper.contains("REFERÊNCIA") || 
                    linhaUpper.contains("COMPETÊNCIA") || linhaUpper.contains("MÊS")) {
                    
                    // Tentar extrair data dessa linha
                    Pattern dataPattern = Pattern.compile("(\\d{2})/(\\d{2})/(\\d{4})");
                    Matcher dataMatcher = dataPattern.matcher(linha);
                    if (dataMatcher.find()) {
                        mes = dataMatcher.group(2);
                        ano = dataMatcher.group(3);
                        log.info("✅ Período de referência encontrado por palavra-chave: {}/{} - Linha: {}", mes, ano, linha.trim());
                        if (workPostName == null) {
                            workPostName = findWorkPostName(linhas, idx, linha.substring(dataMatcher.end()));
                        }
                        break;
                    }
                }
            }
        }
        
        if (workPostName == null) {
            workPostName = searchForLabeledWorkPost(linhas);
        }

        // 3.5. TASK 02: EXTRAÇÃO DE VALORES FINANCEIROS (Total Vencimentos, Total Descontos, Valor Líquido)
        java.math.BigDecimal totalVencimentos = null;
        java.math.BigDecimal totalDescontos = null;
        java.math.BigDecimal valorLiquido = null;
        
        // Extrair Total Vencimentos
        // Padrões: "Total Vencimentos: 1.912,65", "TOTAL VENCIMENTOS 1.912,65", "Total Ganhos: 1.912,65"
        // Melhorado para capturar valores com ou sem separadores
        Pattern totalVencimentosPattern = Pattern.compile("(?i)(?:TOTAL\\s+VENCIMENTOS?|VENCIMENTOS?\\s+TOTAL|TOTAL\\s+GANHOS?)\\s*:?\\s*([\\d.]+[,.]?\\d{0,2}|[\\d,]+)", Pattern.CASE_INSENSITIVE);
        for (String linha : linhas) {
            Matcher matcher = totalVencimentosPattern.matcher(linha);
            if (matcher.find()) {
                try {
                    String valorStr = matcher.group(1).trim();
                    // Formato brasileiro: 1.912,65 -> 1912.65
                    // Se tem ponto e vírgula: remover pontos e substituir vírgula por ponto
                    if (valorStr.contains(",") && valorStr.contains(".")) {
                        valorStr = valorStr.replace(".", "").replace(",", ".");
                    } else if (valorStr.contains(",") && !valorStr.contains(".")) {
                        // Apenas vírgula: substituir por ponto
                        valorStr = valorStr.replace(",", ".");
                    }
                    // Remover espaços e garantir que é um número válido
                    valorStr = valorStr.replaceAll("\\s+", "");
                    if (!valorStr.isEmpty() && valorStr.matches("\\d+(\\.\\d+)?")) {
                        totalVencimentos = new java.math.BigDecimal(valorStr);
                        log.info("✅ Total Vencimentos encontrado: {} (linha: {})", totalVencimentos, linha.trim());
                        break;
                    }
                } catch (Exception e) {
                    log.warn("⚠️ Erro ao extrair Total Vencimentos da linha '{}': {}", linha.trim(), e.getMessage());
                }
            }
        }
        
        // Extrair Total Descontos
        // Padrões: "Total Descontos: 500,65", "TOTAL DESCONTOS 500,65"
        Pattern totalDescontosPattern = Pattern.compile("(?i)(?:TOTAL\\s+DESCONTOS?|DESCONTOS?\\s+TOTAL)\\s*:?\\s*([\\d.]+[,.]?\\d{0,2}|[\\d,]+)", Pattern.CASE_INSENSITIVE);
        for (String linha : linhas) {
            Matcher matcher = totalDescontosPattern.matcher(linha);
            if (matcher.find()) {
                try {
                    String valorStr = matcher.group(1).trim();
                    // Formato brasileiro: 500,65 -> 500.65
                    if (valorStr.contains(",") && valorStr.contains(".")) {
                        valorStr = valorStr.replace(".", "").replace(",", ".");
                    } else if (valorStr.contains(",") && !valorStr.contains(".")) {
                        valorStr = valorStr.replace(",", ".");
                    }
                    // Remover espaços e garantir que é um número válido
                    valorStr = valorStr.replaceAll("\\s+", "");
                    if (!valorStr.isEmpty() && valorStr.matches("\\d+(\\.\\d+)?")) {
                        totalDescontos = new java.math.BigDecimal(valorStr);
                        log.info("✅ Total Descontos encontrado: {} (linha: {})", totalDescontos, linha.trim());
                        break;
                    }
                } catch (Exception e) {
                    log.warn("⚠️ Erro ao extrair Total Descontos da linha '{}': {}", linha.trim(), e.getMessage());
                }
            }
        }
        
        // Extrair Valor Líquido
        // Padrões: "Valor Líquido: 1.412,00", "VALOR LÍQUIDO 1.412,00", "Líquido: 1.412,00"
        Pattern valorLiquidoPattern = Pattern.compile("(?i)(?:VALOR\\s+L[IÍ]QUIDO|L[IÍ]QUIDO|VALOR\\s+FINAL|VALOR\\s+A\\s+RECEBER)\\s*:?\\s*([\\d.]+[,.]?\\d{0,2}|[\\d,]+)", Pattern.CASE_INSENSITIVE);
        for (String linha : linhas) {
            Matcher matcher = valorLiquidoPattern.matcher(linha);
            if (matcher.find()) {
                try {
                    String valorStr = matcher.group(1).trim();
                    // Formato brasileiro: 1.412,00 -> 1412.00
                    if (valorStr.contains(",") && valorStr.contains(".")) {
                        valorStr = valorStr.replace(".", "").replace(",", ".");
                    } else if (valorStr.contains(",") && !valorStr.contains(".")) {
                        valorStr = valorStr.replace(",", ".");
                    }
                    // Remover espaços e garantir que é um número válido
                    valorStr = valorStr.replaceAll("\\s+", "");
                    if (!valorStr.isEmpty() && valorStr.matches("\\d+(\\.\\d+)?")) {
                        valorLiquido = new java.math.BigDecimal(valorStr);
                        log.info("✅ Valor Líquido encontrado: {} (linha: {})", valorLiquido, linha.trim());
                        break;
                    }
                } catch (Exception e) {
                    log.warn("⚠️ Erro ao extrair Valor Líquido da linha '{}': {}", linha.trim(), e.getMessage());
                }
            }
        }
        
        // Se não encontrou Valor Líquido diretamente, calcular como diferença (Total Vencimentos - Total Descontos)
        if (valorLiquido == null && totalVencimentos != null && totalDescontos != null) {
            valorLiquido = totalVencimentos.subtract(totalDescontos);
            log.info("📊 Valor Líquido calculado: {} ({} - {})", valorLiquido, totalVencimentos, totalDescontos);
        }

        // 4. VALIDAÇÕES DE CAMPOS OBRIGATÓRIOS
        // Campos obrigatórios: Empresa, CNPJ, Período, Setor, Nome do Funcionário, CPF
        List<String> camposFaltantes = new ArrayList<>();
        
        if (cpf == null || cpf.length() != 11) {
            camposFaltantes.add("CPF");
            log.warn("❌ CPF inválido ou não encontrado - Página: {}, CPF extraído: {}", pageNumber, cpf);
        }
        
        if (nome.equals("Desconhecido") || nome.trim().isEmpty()) {
            camposFaltantes.add("Nome do Funcionário");
            log.warn("❌ Nome não encontrado - Página: {}", pageNumber);
        }
        
        if (empresaNome == null || empresaNome.trim().isEmpty()) {
            camposFaltantes.add("Empresa");
            log.warn("❌ Nome da empresa não encontrado - Página: {}", pageNumber);
        }
        
        if (empresaCnpj == null || empresaCnpj.trim().isEmpty() || empresaCnpj.replaceAll("[^0-9]", "").length() != 14) {
            camposFaltantes.add("CNPJ");
            log.warn("❌ CNPJ inválido ou não encontrado - Página: {}, CNPJ extraído: {}", pageNumber, empresaCnpj);
        }
        
        if (workPostName == null || workPostName.trim().isEmpty()) {
            camposFaltantes.add("Setor/Posto de Trabalho");
            log.warn("❌ Setor/Posto de trabalho não encontrado - Página: {}", pageNumber);
        }
        
        if (mes == null || ano == null) {
            camposFaltantes.add("Período (Mês/Ano)");
            log.warn("❌ Mês/ano de referência não encontrados - Página: {}", pageNumber);
        }
        
        // Se algum campo obrigatório estiver faltando, retornar null
        if (!camposFaltantes.isEmpty()) {
            log.error("❌ CAMPOS OBRIGATÓRIOS FALTANDO na página {}: {}", pageNumber, String.join(", ", camposFaltantes));
            log.error("❌ Holerite não será processado. Campos obrigatórios: Empresa, CNPJ, Período, Setor, Nome do Funcionário, CPF");
            return null;
        }

        // Validar se o mês está entre 1 e 12
        try {
            int mesInt = Integer.parseInt(mes);
            int anoInt = Integer.parseInt(ano);
            
            if (mesInt < 1 || mesInt > 12) {
                log.warn("❌ Mês inválido: {} - Página: {}", mes, pageNumber);
                return null;
            }
            
            if (anoInt < 2020 || anoInt > 2030) {
                log.warn("❌ Ano inválido: {} - Página: {}", ano, pageNumber);
                return null;
            }
            
            log.info("✅ Dados extraídos com sucesso - Página: {}, Código: {}, Nome: {}, CPF: {}, Empresa: {} (CNPJ: {}), Período de Referência: {}/{}", 
                    pageNumber, codigo, nome, cpf, empresaNome, empresaCnpj, mes, ano);
            
            if (totalVencimentos != null || totalDescontos != null || valorLiquido != null) {
                log.info("💰 Valores financeiros extraídos - Vencimentos: {}, Descontos: {}, Líquido: {}", 
                        totalVencimentos, totalDescontos, valorLiquido);
            }

            // Extrair dados detalhados da tabela (Cód, Descrição, Referência, Vencimentos, Descontos)
            List<com.z7design.secured_guard.dto.PayslipTableRow> tableDetails = extractTableDetails(linhas);
            if (!tableDetails.isEmpty()) {
                log.info("📋 Dados detalhados da tabela extraídos: {} linha(s)", tableDetails.size());
            }

            return Payslip.builder()
                    .employeeName(nome)
                    .cpf(cpf)
                    .companyName(empresaNome)
                    .companyCnpj(empresaCnpj)
                    .workPostName(workPostName)
                    .month(mesInt)
                    .year(anoInt)
                    .totalEarnings(totalVencimentos)
                    .totalDeductions(totalDescontos)
                    .netValue(valorLiquido)
                    .tableDetails(tableDetails)
                    .build();
                    
        } catch (NumberFormatException e) {
            log.warn("❌ Erro ao converter mês/ano para número - Mês: {}, Ano: {}, Página: {}", mes, ano, pageNumber);
            return null;
        }
    }

    private void enrichCompanyData(Payslip payslip) {
        if (payslip == null) {
            return;
        }

        String normalizedCnpj = normalizeCnpj(payslip.getCompanyCnpj());
        payslip.setCompanyCnpj(normalizedCnpj);

        if (normalizedCnpj == null || normalizedCnpj.isEmpty()) {
            return;
        }

        try {
            Optional<Company> companyOpt = companyRepository.findByNormalizedCnpj(normalizedCnpj);
            if (companyOpt.isEmpty()) {
                log.debug("Nenhuma empresa encontrada para o CNPJ normalizado {}", normalizedCnpj);
                return;
            }

            Company company = companyOpt.get();
            payslip.setCompany(company);
            payslip.setCompanySigla(company.getSigla());

            if (payslip.getCompanyName() == null || payslip.getCompanyName().isBlank()) {
                payslip.setCompanyName(company.getName());
            }
        } catch (Exception e) {
            log.warn("⚠️ Erro ao vincular empresa para CNPJ {}: {}", normalizedCnpj, e.getMessage());
        }
    }

    private String normalizeCnpj(String rawCnpj) {
        if (rawCnpj == null) {
            return null;
        }
        String digitsOnly = rawCnpj.replaceAll("\\D", "");
        return digitsOnly.length() == 14 ? digitsOnly : null;
    }

    private String findWorkPostName(String[] lines, int currentIndex, String trailingText) {
        String candidate = sanitizeWorkPostCandidate(trailingText);
        if (candidate != null) {
            return candidate;
        }

        for (int offset = 1; offset <= 2; offset++) {
            int idx = currentIndex + offset;
            if (idx < lines.length) {
                candidate = sanitizeWorkPostCandidate(lines[idx]);
                if (candidate != null) {
                    return candidate;
                }
            }
        }
        return null;
    }

    private String searchForLabeledWorkPost(String[] lines) {
        Pattern labeledPattern = Pattern.compile("(?i)(setor|posto|local(?: de trabalho)?)[:\\s]+(.{3,})");
        for (String line : lines) {
            Matcher matcher = labeledPattern.matcher(line);
            if (matcher.find()) {
                String candidate = sanitizeWorkPostCandidate(matcher.group(2));
                if (candidate != null) {
                    return candidate;
                }
            }
        }
        return null;
    }

    private String sanitizeWorkPostCandidate(String candidate) {
        if (candidate == null) {
            return null;
        }
        String cleaned = candidate.replaceAll("[\\p{Cntrl}]", " ").trim();
        if (cleaned.isEmpty()) {
            return null;
        }

        // Se houver rótulo "SETOR: ..." manter apenas o que vem depois dos dois pontos
        int colonIndex = cleaned.indexOf(':');
        if (colonIndex >= 0 && colonIndex < cleaned.length() - 1) {
            cleaned = cleaned.substring(colonIndex + 1).trim();
        }

        cleaned = cleaned.replaceAll("[•·]+", " ");
        cleaned = cleaned.replaceAll("[\\s]+", " ").trim();
        cleaned = cleaned.replaceAll("[.,;]+$", "").trim();

        if (cleaned.length() < 3) {
            return null;
        }

        String upper = cleaned.toUpperCase(java.util.Locale.ROOT);

        String[] invalidTokens = {
            "CPF", "CNPJ", "DEMONSTRATIVO", "PAGAMENTO", "FOLHA", "HOLERITE",
            "EMPRESA", "ENDERECO", "ENDEREÇO", "RUA", "AVENIDA", "LTDA",
            "ME", "EIRELI", "S.A", "PROMOVER", "VIGILANCIA", "PATRIMONIAL"
        };

        for (String token : invalidTokens) {
            if (upper.contains(token)) {
                return null;
            }
        }

        if (upper.contains(",") || upper.contains("*")) {
            return null;
        }

        if (!upper.matches(".*[A-Z].*")) {
            return null;
        }

        return upper;
    }

    private boolean isValidEmployeeName(String name) {
        if (name == null || name.trim().isEmpty() || name.length() < 5) {
            return false;
        }
        
        String nameUpper = name.toUpperCase().trim();
        
        // Filtrar títulos e cargos
        String[] invalidNames = {
            "FOLHA", "PAGAMENTO", "DEMONSTRATIVO", "HOLERITE", "CONTRACHEQUE",
            "PORTEIRO", "CONTROLADOR", "VIGIA", "AUXILIAR", "SERVICOS", "SEGURANCA",
            "EMPRESA", "LTDA", "ME", "EIRELI", "S.A", "CNPJ", "ENDERECO", "TELEFONE",
            "PERIODO", "REFERENCIA", "FUNCIONARIO", "COLABORADOR", "SALARIO"
        };
        
        for (String invalid : invalidNames) {
            if (nameUpper.contains(invalid)) {
                return false;
            }
        }
        
        // Deve conter apenas letras, espaços e acentos
        return nameUpper.matches("^[A-ZÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ ]+$");
    }

    /**
     * Gerar email único para cada funcionário baseado no CPF
     */
    private String generateUniqueEmail(String cpf, String nome) {
        // Formato principal: colaborador.CPF@promovervigilancia.com.br
        String baseEmail = String.format("colaborador.%s@promovervigilancia.com.br", cpf);
        
        // Verificar se já existe
        if (!userRepository.findByEmail(baseEmail).isPresent()) {
            return baseEmail;
        }
        
        // Se já existe, gerar alternativo com timestamp
        String timestamp = String.valueOf(System.currentTimeMillis()).substring(8); // últimos 5 dígitos
        String alternativeEmail = String.format("colaborador.%s.%s@promovervigilancia.com.br", cpf, timestamp);
        
        log.warn("⚠️ Email {} já existe, usando alternativo: {}", baseEmail, alternativeEmail);
        return alternativeEmail;
    }

    /**
     * Criar usuário automaticamente a partir dos dados do holerite
     */
    private void createUserFromPayslip(Payslip payslip) {
        String username = payslip.getCpf();
        String email = generateUniqueEmail(payslip.getCpf(), payslip.getEmployeeName());
        String password = payslip.getCpf() + "@2025"; // Senha padrão exigida: cpf@2025
        String name = payslip.getEmployeeName();

        log.info("🔐 INÍCIO - Verificando se usuário existe para funcionário: {} (CPF: {})", name, username);

        try {
            // VERIFICAÇÃO DO AMBIENTE
            log.info("🔧 VERIFICAÇÃO DE AMBIENTE:");
            log.info("   UserRepository: {}", userRepository.getClass().getSimpleName());
            log.info("   RoleRepository: {}", roleRepository.getClass().getSimpleName());
            
            // Verificar se já existe usuário com este CPF (username)
            Optional<com.z7design.secured_guard.model.User> existingUser = userRepository.findByUsername(username);
            if (existingUser.isPresent()) {
                log.info("👤 Usuário já existe para CPF: {} - PULANDO criação", username);
                return;
            }
            
            log.info("🆕 Usuário não existe - PROSSEGUINDO com criação para CPF: {}", username);

            // Buscar role COLABORADOR
            log.info("🔍 Buscando role COLABORADOR no banco de dados...");
            Optional<com.z7design.secured_guard.model.Role> colaboradorRole = roleRepository.findByName("COLABORADOR");
            if (colaboradorRole.isEmpty()) {
                log.error("❌ Role COLABORADOR não encontrado no banco de dados!");
                log.error("   Para criar o role COLABORADOR, execute:");
                log.error("   INSERT INTO roles (id, name, description) VALUES (gen_random_uuid(), 'COLABORADOR', 'Funcionário colaborador');");
                throw new IllegalArgumentException("Role COLABORADOR não encontrado. Consulte os logs para instruções de criação.");
            }
            
            log.info("✅ Role COLABORADOR encontrado: {}", colaboradorRole.get().getName());

            // Criar novo usuário
            log.info("👤 Criando novo usuário com dados:");
            log.info("   Username: {}", username);
            log.info("   Email: {}", email);
            log.info("   Nome: {}", name);
            log.info("   Password: {} (será criptografada)", password);
            
            com.z7design.secured_guard.model.User novoUser = new com.z7design.secured_guard.model.User();
            novoUser.setUsername(username);
            novoUser.setPassword(password);
            novoUser.setEmail(email);
            novoUser.setName(name);
            novoUser.setStatus(com.z7design.secured_guard.model.enums.UserStatus.ACTIVE);
            novoUser.setActive(true);

            // Associar role COLABORADOR
            java.util.Set<com.z7design.secured_guard.model.Role> roles = new java.util.HashSet<>();
            roles.add(colaboradorRole.get());
            novoUser.setRoles(roles);
            
            log.info("🔐 Chamando userService.create()...");

            // Usar o UserService para criar (aplica validações e criptografia)
            com.z7design.secured_guard.model.User usuarioCriado = userService.create(novoUser);
            
            log.info("✅ SUCESSO - Usuário criado automaticamente!");
            log.info("   ID: {}", usuarioCriado.getId());
            log.info("   Username: {}", usuarioCriado.getUsername());
            log.info("   Nome: {}", usuarioCriado.getName());
            log.info("   Email: {}", usuarioCriado.getEmail());
            log.info("   Status: {}", usuarioCriado.getStatus());
            log.info("   Roles: {}", usuarioCriado.getRoles().stream().map(r -> r.getName()).toList());
            
            // VERIFICAÇÃO ADICIONAL - Confirmar se foi salvo no banco
            log.info("🔍 VERIFICAÇÃO - Buscando usuário recém-criado no banco...");
            Optional<com.z7design.secured_guard.model.User> verificacao = userRepository.findByUsername(username);
            if (verificacao.isPresent()) {
                log.info("✅ CONFIRMADO - Usuário encontrado no banco de dados!");
                log.info("   ID no banco: {}", verificacao.get().getId());
                log.info("   Nome no banco: {}", verificacao.get().getName());
            } else {
                log.error("❌ PROBLEMA - Usuário NÃO foi encontrado no banco após criação!");
                log.error("   Possível problema de transação ou commit!");
            }
            
        } catch (Exception e) {
            log.error("❌ ERRO DETALHADO ao criar usuário para {}: {}", name, e.getMessage());
            log.error("   Tipo do erro: {}", e.getClass().getSimpleName());
            log.error("   Stack trace completo: ", e);
            throw e;
        }
    }

    private Payslip extractPayslipInfoWithOCR(PDDocument document, int pageNumber) {
        log.info("🔍 Tentando extrair informações da página {} via OCR", pageNumber);
        try {
            File imageFile = convertPdfPageToImage(document, pageNumber);
            log.debug("📸 Imagem criada para OCR: {}", imageFile.getAbsolutePath());
            
            String text = tesseractService.extractTextFromImage(imageFile);
            
            if (text == null || text.trim().isEmpty()) {
                log.warn("⚠️ OCR não extraiu nenhum texto da página {}", pageNumber);
                imageFile.delete();
                return null;
            }
            
            log.info("✅ Texto extraído via OCR da página {}: {} caracteres", pageNumber, text.length());
            log.debug("Primeiros 500 caracteres do texto OCR: {}", text.substring(0, Math.min(500, text.length())));
            
            // Limpar o arquivo temporário
            imageFile.delete();
            
            // Passar o texto OCR como parâmetro para tentar extrair o período se necessário
            Payslip payslip = extractPayslipInfo(text, pageNumber, text);
            
            // Garantir que os dados da tabela foram extraídos
            if (payslip != null && (payslip.getTableDetails() == null || payslip.getTableDetails().isEmpty())) {
                log.warn("⚠️ OCR extraiu dados básicos mas não encontrou dados da tabela. Tentando re-extrair...");
                String[] linhas = text.split("\r?\n");
                List<com.z7design.secured_guard.dto.PayslipTableRow> tableDetails = extractTableDetails(linhas);
                if (!tableDetails.isEmpty()) {
                    payslip.setTableDetails(tableDetails);
                    log.info("✅ Dados da tabela re-extraídos via OCR: {} linha(s)", tableDetails.size());
                } else {
                    log.warn("⚠️ Não foi possível extrair dados da tabela mesmo com re-tentativa");
                }
            }
            
            return payslip;
        } catch (TesseractException | IOException e) {
            log.error("❌ Falha no processamento OCR da página {}: {}", pageNumber, e.getMessage(), e);
            return null;
        } catch (Exception e) {
            log.error("❌ Erro inesperado durante OCR da página {}: {}", pageNumber, e.getMessage(), e);
            return null;
        }
    }

    private File convertPdfPageToImage(PDDocument document, int pageNumber) throws IOException {
        PDFRenderer pdfRenderer = new PDFRenderer(document);
        BufferedImage image = pdfRenderer.renderImageWithDPI(pageNumber - 1, 300); // 300 DPI para melhor qualidade
        
        File tempFile = File.createTempFile("page_" + pageNumber, ".png");
        ImageIO.write(image, "png", tempFile);
        
        log.debug("Página {} convertida para imagem: {}", pageNumber, tempFile.getAbsolutePath());
        return tempFile;
    }

    private String generateFileName(Payslip payslip) {
        return generateFileName(payslip, null);
    }

    private String generateFileName(Payslip payslip, String versionSuffix) {
        // Gerar nome do arquivo: NOME_FUNCIONARIO_CPF_MES_ANO[_VERSÃO].pdf
        // O nome do funcionário e CPF são obrigatórios para identificar o holerite
        StringBuilder fileName = new StringBuilder();
        
        // Normalizar nome do funcionário para uso em nome de arquivo
        String nomeFuncionario = normalizeFolderName(payslip.getEmployeeName() != null ? payslip.getEmployeeName() : "FUNCIONARIO_NAO_INFORMADO");
        String cpf = payslip.getCpf() != null ? payslip.getCpf() : "CPF_NAO_INFORMADO";
        
        // Adicionar nome do funcionário
        fileName.append(nomeFuncionario);
        
        // Adicionar CPF
        fileName.append("_").append(cpf);
        
        // Adicionar período
        fileName.append("_").append(payslip.getMonth());
        fileName.append("_").append(payslip.getYear());
        
        // Adicionar sufixo de versão se fornecido (para holerites com alterações)
        if (versionSuffix != null && !versionSuffix.isEmpty()) {
            fileName.append("_").append(versionSuffix);
        }
        
        // Extensão
        fileName.append(".pdf");
        
        return fileName.toString();
    }

    @Transactional(readOnly = true)
    public List<PayslipProcessedFileResponse> getProcessedPayslipFiles() {
        List<Payslip> payslips = payslipRepository.findAll();

        if (payslips.isEmpty()) {
            return Collections.emptyList();
        }

        return payslips.stream()
            .sorted(Comparator.comparing(Payslip::getProcessedAt).reversed())
            .map(payslip -> {
                String directory = String.format("%s-%s", payslip.getMonth(), payslip.getYear());
                Path path = Paths.get(OUTPUT_DIR, directory, payslip.getFileName());
                String normalizedPath = path.toString().replace('\\', '/');

                return PayslipProcessedFileResponse.builder()
                    .id(payslip.getId())
                    .fileName(payslip.getFileName())
                    .employeeName(payslip.getEmployeeName())
                    .cpf(payslip.getCpf())
                    .month(payslip.getMonth())
                    .year(payslip.getYear())
                    .companyName(payslip.getCompanyName())
                    .companySigla(payslip.getCompanySigla())
                    .companyCnpj(payslip.getCompanyCnpj())
                    .companyId(payslip.getCompanyId())
                    .path(normalizedPath)
                    .processedAt(payslip.getProcessedAt())
                    .build();
            })
            .collect(Collectors.toList());
    }

    private String organizarEmPastas(PDDocument document, int pageNumber, Payslip payslip) throws IOException {
        // Criar estrutura de pastas: Empresa/Setor/Ano/Mês/Funcionário/
        // Normalizar nomes para evitar problemas com caracteres especiais
        String empresaNome = normalizeFolderName(payslip.getCompanyName() != null ? payslip.getCompanyName() : "EMPRESA_NAO_INFORMADA");
        String setorNome = normalizeFolderName(payslip.getWorkPostName() != null ? payslip.getWorkPostName() : "SETOR_NAO_INFORMADO");
        String ano = String.valueOf(payslip.getYear());
        String mes = String.format("%02d", payslip.getMonth());
        String funcionarioNome = normalizeFolderName(payslip.getEmployeeName() != null ? payslip.getEmployeeName() : "FUNCIONARIO_NAO_INFORMADO");
        
        // Criar caminho completo: backend/holerites/Empresa/Setor/Ano/Mês/Funcionário/
        Path pastaCompleta = Paths.get(OUTPUT_DIR, empresaNome, setorNome, ano, mes, funcionarioNome);
        
        // Criar diretório se não existir
        if (!Files.exists(pastaCompleta)) {
            Files.createDirectories(pastaCompleta);
            log.info("📁 Estrutura de pastas criada: {}", pastaCompleta);
        }
        
        // Usar nome de arquivo já definido ou gerar novo
        String nomeArquivo = payslip.getFileName();
        if (nomeArquivo == null || nomeArquivo.isEmpty()) {
            nomeArquivo = generateFileName(payslip);
        }
        
        Path caminhoCompleto = pastaCompleta.resolve(nomeArquivo);
        
        // TASK 02: Verificar se arquivo já existe (NUNCA sobrescrever - sempre gerar novo arquivo com versão)
        // Se já existe, adicionar versão automática para evitar sobrescrita
        int tentativas = 0;
        while (Files.exists(caminhoCompleto) && tentativas < 10) {
            log.warn("⚠️ Arquivo já existe: {} - Gerando versão única...", caminhoCompleto);
            
            // Sempre adicionar versão única com timestamp
            String timestamp = String.valueOf(System.currentTimeMillis()).substring(7); // últimos 6 dígitos
            
            // Se já tem versão no nome, substituir ou incrementar
            if (nomeArquivo.contains("_V")) {
                String baseName = nomeArquivo.substring(0, nomeArquivo.lastIndexOf("_V"));
                nomeArquivo = baseName + "_V" + timestamp + ".pdf";
            } else {
                // Se não tem versão, adicionar
                String baseName = nomeArquivo.replace(".pdf", "");
                nomeArquivo = baseName + "_V" + timestamp + ".pdf";
            }
            
            caminhoCompleto = pastaCompleta.resolve(nomeArquivo);
            payslip.setFileName(nomeArquivo);
            tentativas++;
        }
        
        if (tentativas > 0) {
            log.info("🔄 Nome de arquivo único gerado para evitar sobrescrita: {}", nomeArquivo);
        }
        
        // Salvar PDF individual
        try (PDDocument newDoc = new PDDocument()) {
            newDoc.addPage(document.getPage(pageNumber - 1));
            newDoc.save(caminhoCompleto.toString());
            log.info("📄 PDF individual salvo: {}", caminhoCompleto);
        }
        return caminhoCompleto.toString();
    }
    
    private void salvarFuncionario(Payslip payslip, String caminhoPdf) {
        try {
            // Verificar se já existe funcionário com este CPF/documento
            Optional<Employee> employeeExistente = employeeRepository.findByDocument(payslip.getCpf());
            if (employeeExistente.isPresent()) {
                // Atualizar funcionário existente
                Employee employee = employeeExistente.get();
                // employee.setCaminhoPdf(caminhoPdf); // Campo comentado temporariamente
                // employee.setMesReferencia(String.valueOf(payslip.getMonth())); // Campo comentado temporariamente
                // employee.setAnoReferencia(String.valueOf(payslip.getYear())); // Campo comentado temporariamente
                employee.setUpdatedAt(LocalDateTime.now());
                employeeRepository.save(employee);
                log.info("🔄 Funcionário atualizado: {} - CPF: {}", employee.getName(), employee.getDocument());
            } else {
                // Para funcionários criados via processamento de holerites, 
                // vamos apenas registrar na tabela de dados extraídos
                // e não criar um Employee completo pois faltam dados obrigatórios
                log.info("📋 Funcionário não existe na base. Dados salvos apenas na tabela de dados extraídos.");
                log.info("   Para criar funcionário completo, use o formulário de cadastro de funcionários.");
                log.info("   Nome extraído: {} - CPF: {}", payslip.getEmployeeName(), payslip.getCpf());
            }
        } catch (Exception e) {
            log.error("❌ Erro ao processar funcionário: {}", e.getMessage());
            // Não interromper o processamento por erro na tabela de funcionários
        }
    }

    /**
     * Salvar dados extraídos na tabela tb_extract_data_holerites
     */
    private void salvarDadosExtraidos(Payslip payslip) {
        try {
            // Extrair código do CPF se for um código (começa com "COD")
            String codigo = null;
            if (payslip.getCpf().startsWith("COD")) {
                codigo = payslip.getCpf().substring(3); // Remove o prefixo "COD"
            }
            // Se não extraiu código do CPF, tentar extrair do nome do arquivo
            if (codigo == null && payslip.getFileName() != null) {
                // Verificar se o nome do arquivo contém um código no formato esperado
                String fileName = payslip.getFileName();
                Pattern codigoPattern = Pattern.compile(".*_(\\d{6})_.*");
                Matcher matcher = codigoPattern.matcher(fileName);
                if (matcher.find()) {
                    codigo = matcher.group(1);
                    log.debug("Código extraído do nome do arquivo: {}", codigo);
                }
            }
            
            // Converter ano para Integer
            Integer anoReferencia = payslip.getYear();
            
            // Salvar na tabela de dados extraídos
            extractDataHoleritesService.saveExtractData(
                payslip.getEmployeeName(),
                payslip.getCpf(),
                codigo,
                String.valueOf(payslip.getMonth()),
                anoReferencia
            );
            
            log.info("💾 Dados extraídos salvos na tabela tb_extract_data_holerites: {} - CPF: {} - Código: {} - Período: {}/{}", 
                    payslip.getEmployeeName(), payslip.getCpf(), codigo, payslip.getMonth(), payslip.getYear());
                    
        } catch (Exception e) {
            log.error("❌ Erro ao salvar dados extraídos na tabela tb_extract_data_holerites: {}", e.getMessage());
            // Não interromper o processamento por erro na tabela de dados extraídos
        }
    }

    public Map<String, Object> debugPayslipContent(MultipartFile file) throws IOException {
        log.info("🔍 Iniciando debug do arquivo: {}", file.getOriginalFilename());
        
        Map<String, Object> debugInfo = new java.util.HashMap<>();
        debugInfo.put("fileName", file.getOriginalFilename());
        debugInfo.put("fileSize", file.getSize());
        debugInfo.put("contentType", file.getContentType());
        
        List<Map<String, Object>> pagesInfo = new ArrayList<>();
        
        try (PDDocument document = PDDocument.load(file.getInputStream())) {
            if (document.isEncrypted()) {
                debugInfo.put("error", "PDF está criptografado");
                return debugInfo;
            }

            PDFTextStripper stripper = new PDFTextStripper();
            int pageCount = document.getNumberOfPages();
            debugInfo.put("totalPages", pageCount);
            
            // Analisar apenas as primeiras 3 páginas para debug
            int pagesToAnalyze = Math.min(3, pageCount);
            
            for (int i = 1; i <= pagesToAnalyze; i++) {
                Map<String, Object> pageInfo = new java.util.HashMap<>();
                pageInfo.put("pageNumber", i);
                
                stripper.setStartPage(i);
                stripper.setEndPage(i);
                String pageText = stripper.getText(document);
                
                pageInfo.put("textLength", pageText.length());
                pageInfo.put("textPreview", pageText.substring(0, Math.min(1000, pageText.length())));
                pageInfo.put("hasText", !pageText.trim().isEmpty());
                
                // Tentar extrair informações
                Payslip payslip = extractPayslipInfo(pageText, i);
                if (payslip != null) {
                    pageInfo.put("extractionSuccess", true);
                    pageInfo.put("extractedName", payslip.getEmployeeName());
                    pageInfo.put("extractedCpf", payslip.getCpf());
                    pageInfo.put("extractedMonth", payslip.getMonth());
                    pageInfo.put("extractedYear", payslip.getYear());
                } else {
                    pageInfo.put("extractionSuccess", false);
                    pageInfo.put("extractionError", "Não foi possível extrair dados válidos");
                }
                
                pagesInfo.add(pageInfo);
            }
        }
        
        debugInfo.put("pages", pagesInfo);
        return debugInfo;
    }

    public List<Payslip> getAllPayslips() {
        log.info("🔍 Buscando todos os payslips no repositório...");
        List<Payslip> payslips = payslipRepository.findAll();
        log.info("✅ Repositório retornou {} payslips", payslips.size());
        if (payslips.size() > 0) {
            log.info("📋 Primeiro registro: ID={}, Nome={}, CPF={}, Mês={}, Ano={}", 
                payslips.get(0).getId(), payslips.get(0).getEmployeeName(), 
                payslips.get(0).getCpf(), payslips.get(0).getMonth(), payslips.get(0).getYear());
        }
        return payslips;
    }

    public List<Payslip> getPayslipsByCpf(String cpf) {
        return payslipRepository.findAllByCpf(cpf);
    }

    public Payslip getPayslipByFileName(String fileName) {
        return payslipRepository.findByFileName(fileName);
    }

    public Optional<String> resolvePayslipPathByCpfMonthYear(String cpf, Integer month, Integer year) {
        Payslip payslip = payslipRepository.findFirstByCpfAndMonthAndYear(cpf, month, year);
        if (payslip == null) {
            return Optional.empty();
        }
        // Primeiro tentar no diretório padrão do serviço
        String mesAno = String.format("%s-%s", payslip.getMonth(), payslip.getYear());
        Path candidate = Paths.get(OUTPUT_DIR, mesAno, payslip.getFileName());
        if (Files.exists(candidate)) {
            return Optional.of(candidate.toString());
        }
        // Fallbacks: caminhos conhecidos usados por PdfService/processadores
        String pastaReferencia = String.format("%02d_%d", payslip.getMonth(), payslip.getYear());
        Path alt1 = Paths.get("uploads", "holerites_processados", pastaReferencia, payslip.getFileName());
        if (Files.exists(alt1)) {
            return Optional.of(alt1.toString());
        }
        Path alt2 = Paths.get(System.getProperty("payslips.upload.dir", "uploads/payslips"), payslip.getFileName());
        if (Files.exists(alt2)) {
            return Optional.of(alt2.toString());
        }
        Path alt3 = Paths.get("backend/payslips_output", payslip.getFileName());
        if (Files.exists(alt3)) {
            return Optional.of(alt3.toString());
        }
        return Optional.empty();
    }

    // Exclusão individual de payslip
    public void deletePayslip(UUID id) {
        Payslip payslip = payslipRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Payslip não encontrado para o ID: " + id));
        String mesAno = String.format("%s-%s", payslip.getMonth(), payslip.getYear());
        Path pastaMesAno = Paths.get(OUTPUT_DIR, mesAno);
        String nomeArquivo = generateFileName(payslip);
        Path arquivo = pastaMesAno.resolve(nomeArquivo);
        log.info("Tentando remover o arquivo do funcionário: {}", arquivo.toAbsolutePath());
        try {
            if (Files.exists(arquivo)) {
                Files.delete(arquivo);
                log.info("Arquivo removido com sucesso: {}", arquivo.toAbsolutePath());
            } else {
                log.warn("Arquivo não existe: {}", arquivo.toAbsolutePath());
            }
            // Se a pasta do mês ficar vazia, remove também
            if (Files.exists(pastaMesAno) && Files.list(pastaMesAno).findAny().isEmpty()) {
                Files.delete(pastaMesAno);
                log.info("Pasta do mês removida (vazia): {}", pastaMesAno.toAbsolutePath());
            }
        } catch (Exception e) {
            log.error("Erro ao remover o arquivo ou pasta: {} - {}", arquivo.toAbsolutePath(), e.getMessage());
        }
        payslipRepository.deleteById(id);
    }

    // Exclusão em massa de payslips
    public Map<String, Object> deleteMultiplePayslips(List<UUID> ids) {
        int deleted = 0;
        int failed = 0;
        List<String> errors = new ArrayList<>();
        List<Path> arquivosParaRemover = new ArrayList<>();
        List<Path> pastasMes = new ArrayList<>();
        for (UUID id : ids) {
            try {
                Payslip payslip = payslipRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Payslip não encontrado para o ID: " + id));
                String mesAno = String.format("%s-%s", payslip.getMonth(), payslip.getYear());
                Path pastaMesAno = Paths.get(OUTPUT_DIR, mesAno);
                String nomeArquivo = generateFileName(payslip);
                Path arquivo = pastaMesAno.resolve(nomeArquivo);
                arquivosParaRemover.add(arquivo);
                pastasMes.add(pastaMesAno);
                payslipRepository.deleteById(id);
                deleted++;
            } catch (Exception e) {
                failed++;
                errors.add("ID " + id + ": " + e.getMessage());
            }
        }
        // Remover todos os arquivos
        for (Path arquivo : arquivosParaRemover) {
            log.info("Tentando remover o arquivo: {}", arquivo.toAbsolutePath());
            try {
                if (Files.exists(arquivo)) {
                    Files.delete(arquivo);
                    log.info("Arquivo removido com sucesso: {}", arquivo.toAbsolutePath());
                } else {
                    log.warn("Arquivo não existe: {}", arquivo.toAbsolutePath());
                }
            } catch (Exception e) {
                log.error("Erro ao remover o arquivo: {} - {}", arquivo.toAbsolutePath(), e.getMessage());
            }
        }
        // Remover pastas do mês se ficarem vazias
        Set<Path> pastasMesUnicas = new java.util.HashSet<>(pastasMes);
        for (Path pastaMes : pastasMesUnicas) {
            try {
                if (Files.exists(pastaMes) && Files.list(pastaMes).findAny().isEmpty()) {
                    Files.delete(pastaMes);
                    log.info("Pasta do mês removida (vazia): {}", pastaMes.toAbsolutePath());
                }
            } catch (Exception e) {
                log.warn("Erro ao remover a pasta do mês: {} - {}", pastaMes.toAbsolutePath(), e.getMessage());
            }
        }
        Map<String, Object> result = new java.util.HashMap<>();
        result.put("deleted", deleted);
        result.put("failed", failed);
        result.put("errors", errors);
        return result;
    }

    public PayslipOrganizationResponse organizePayslipsByCompany(List<Payslip> payslips) {
        PayslipOrganizationResponse response = new PayslipOrganizationResponse();
        response.setGeneratedAt(LocalDateTime.now());

        try {
            List<Payslip> effectivePayslips = payslips != null ? payslips : Collections.emptyList();
            response.setTotalPayslips(effectivePayslips.size());

            if (effectivePayslips.isEmpty()) {
                response.setCompanies(Collections.emptyList());
                response.setTotalCompanies(0);
                response.setTotalSectors(0);
                return response;
            }

            // Filtrar payslips null antes de processar
            List<Payslip> validPayslips = effectivePayslips.stream()
                .filter(p -> p != null)
                .collect(Collectors.toList());

            if (validPayslips.isEmpty()) {
                response.setCompanies(Collections.emptyList());
                response.setTotalCompanies(0);
                response.setTotalSectors(0);
                return response;
            }

            Map<String, List<Payslip>> companyGroups = validPayslips.stream()
                .collect(Collectors.groupingBy(this::buildCompanyKey, LinkedHashMap::new, Collectors.toList()));

        Set<String> uniqueSectorKeys = new HashSet<>();
        List<PayslipOrganizationResponse.CompanyGroup> companyResponses = new ArrayList<>();

        for (List<Payslip> companyPayslips : companyGroups.values()) {
            if (companyPayslips.isEmpty()) {
                continue;
            }

            Payslip sample = companyPayslips.get(0);
            PayslipOrganizationResponse.CompanyGroup companyGroup = new PayslipOrganizationResponse.CompanyGroup();
            String companySigla = resolveCompanySigla(sample);
            companyGroup.setCompanySigla(companySigla);
            companyGroup.setCompanyName(defaultString(sample.getCompanyName(), "Empresa não informada"));
            companyGroup.setCompanyCnpj(defaultString(sample.getCompanyCnpj(), ""));
            companyGroup.setCompanyId(sample.getCompanyId());
            companyGroup.setTotalPayslips(companyPayslips.size());

            Map<String, List<Payslip>> sectorGroups = companyPayslips.stream()
                .collect(Collectors.groupingBy(this::buildSectorKey, LinkedHashMap::new, Collectors.toList()));

            List<PayslipOrganizationResponse.SectorGroup> sectors = new ArrayList<>();

            for (Map.Entry<String, List<Payslip>> sectorEntry : sectorGroups.entrySet()) {
                List<Payslip> sectorPayslips = sectorEntry.getValue();
                if (sectorPayslips.isEmpty()) {
                    continue;
                }

                PayslipOrganizationResponse.SectorGroup sectorGroup = new PayslipOrganizationResponse.SectorGroup();
                String sectorDisplayName = resolveSectorName(sectorPayslips.get(0));
                sectorGroup.setSectorName(sectorDisplayName);
                sectorGroup.setNormalizedSectorName(sectorEntry.getKey());
                sectorGroup.setTotalPayslips(sectorPayslips.size());

                uniqueSectorKeys.add(companySigla + "|" + sectorEntry.getKey());

                Map<String, List<Payslip>> periodGroups = sectorPayslips.stream()
                    .collect(Collectors.groupingBy(this::buildPeriodKey, LinkedHashMap::new, Collectors.toList()));

                List<String> sortedPeriods = new ArrayList<>(periodGroups.keySet());
                sortedPeriods.sort(Comparator.reverseOrder());

                List<PayslipOrganizationResponse.PeriodGroup> periods = new ArrayList<>();
                for (String periodKey : sortedPeriods) {
                    List<Payslip> periodPayslips = periodGroups.get(periodKey);
                    if (periodPayslips == null || periodPayslips.isEmpty()) {
                        continue;
                    }

                    int year = extractYear(periodKey);
                    int month = extractMonth(periodKey);

                    List<Payslip> consistentPayslips = periodPayslips.stream()
                        .filter(p -> Objects.equals(p.getYear(), year) && Objects.equals(p.getMonth(), month))
                        .collect(Collectors.toList());

                    if (consistentPayslips.isEmpty()) {
                        log.warn("⚠️ Nenhum holerite com mês/ano ({}/{}) consistente no período {}. Ignorando grupo.", month, year, periodKey);
                        continue;
                    }

                    PayslipOrganizationResponse.PeriodGroup periodGroup = new PayslipOrganizationResponse.PeriodGroup();
                    periodGroup.setYear(year);
                    periodGroup.setMonth(month);
                    periodGroup.setFormattedPeriod(formatPeriodLabel(month, year));

                    List<PayslipOrganizationResponse.PayslipEntry> entries = consistentPayslips.stream()
                        .sorted(Comparator.comparing(p -> defaultString(p.getEmployeeName(), ""), String.CASE_INSENSITIVE_ORDER))
                        .map(payslip -> {
                            PayslipOrganizationResponse.PayslipEntry entry = toPayslipEntry(payslip);
                            entry.setSectorName(sectorDisplayName);
                            return entry;
                        })
                        .collect(Collectors.toList());

                    periodGroup.setPayslips(entries);
                    periodGroup.setTotalPayslips(entries.size());
                    periods.add(periodGroup);
                }

                sectorGroup.setPeriods(periods);
                sectors.add(sectorGroup);
            }

            sectors.sort(Comparator.comparing(PayslipOrganizationResponse.SectorGroup::getSectorName, String.CASE_INSENSITIVE_ORDER));
            companyGroup.setSectors(sectors);
            companyResponses.add(companyGroup);
        }

            companyResponses.sort(this::compareCompanyGroups);

            response.setCompanies(companyResponses);
            response.setTotalCompanies(companyResponses.size());
            response.setTotalSectors(uniqueSectorKeys.size());
            return response;
        } catch (Exception e) {
            log.error("Erro ao organizar holerites por empresa: {}", e.getMessage(), e);
            // Retornar resposta vazia em caso de erro
            response.setCompanies(Collections.emptyList());
            response.setTotalCompanies(0);
            response.setTotalSectors(0);
            response.setTotalPayslips(0);
            return response;
        }
    }

    private String buildCompanyKey(Payslip payslip) {
        String sigla = resolveCompanySigla(payslip);
        String name = defaultString(payslip.getCompanyName(), "Empresa não informada");
        String cnpj = defaultString(payslip.getCompanyCnpj(), "");
        String companyId = payslip.getCompanyId() != null ? payslip.getCompanyId().toString() : "";
        return String.join("|", sigla, name, cnpj, companyId);
    }

    private String resolveCompanySigla(Payslip payslip) {
        String sigla = defaultString(payslip.getCompanySigla(), "");
        if (!StringUtils.hasText(sigla) && payslip.getCompany() != null) {
            sigla = defaultString(payslip.getCompany().getSigla(), "");
        }
        if (!StringUtils.hasText(sigla)) {
            sigla = "OUTROS";
        }
        return sigla.trim().toUpperCase();
    }

    private String buildSectorKey(Payslip payslip) {
        return normalizeSectorName(resolveSectorName(payslip));
    }

    private String resolveSectorName(Payslip payslip) {
        if (payslip == null) {
            return "Setor não informado";
        }
        String sector = payslip.getWorkPostName();
        if (!StringUtils.hasText(sector)) {
            return "Setor não informado";
        }
        return sector.trim();
    }

    private String normalizeSectorName(String sector) {
        if (!StringUtils.hasText(sector)) {
            return "SETOR_NAO_INFORMADO";
        }
        String upper = sector.trim().toUpperCase();
        String normalized = Normalizer.normalize(upper, Normalizer.Form.NFD)
            .replaceAll("[\\p{M}]", "")
            .replaceAll("[^A-Z0-9]+", "_")
            .replaceAll("^_+", "")
            .replaceAll("_+$", "");
        return StringUtils.hasText(normalized) ? normalized : "SETOR_NAO_INFORMADO";
    }
    
    /**
     * Normaliza nome para uso em pastas do sistema de arquivos
     * Remove acentos, caracteres especiais e limita tamanho
     */
    private String normalizeFolderName(String name) {
        if (name == null || name.trim().isEmpty()) {
            return "NAO_INFORMADO";
        }
        // Remover acentos
        String normalized = Normalizer.normalize(name.trim(), Normalizer.Form.NFD)
            .replaceAll("[\\p{M}]", "");
        // Substituir caracteres especiais por underscore e manter apenas letras, números e espaços
        normalized = normalized.replaceAll("[^a-zA-Z0-9\\s]", "_");
        // Substituir múltiplos espaços/underscores por um único underscore
        normalized = normalized.replaceAll("[\\s_]+", "_");
        // Remover underscores no início e fim
        normalized = normalized.replaceAll("^_+", "").replaceAll("_+$", "");
        // Limitar tamanho (máximo 100 caracteres para evitar problemas com sistemas de arquivos)
        if (normalized.length() > 100) {
            normalized = normalized.substring(0, 100);
        }
        // Se ficou vazio após normalização, usar valor padrão
        if (normalized.isEmpty()) {
            return "NAO_INFORMADO";
        }
        return normalized.toUpperCase();
    }

    private String buildPeriodKey(Payslip payslip) {
        Integer year = payslip != null ? payslip.getYear() : null;
        Integer month = payslip != null ? payslip.getMonth() : null;
        if (year == null || month == null) {
            return "0000-00";
        }
        return String.format("%04d-%02d", year, month);
    }

    private int extractYear(String periodKey) {
        try {
            return Integer.parseInt(periodKey.substring(0, 4));
        } catch (Exception e) {
            return 0;
        }
    }

    private int extractMonth(String periodKey) {
        try {
            return Integer.parseInt(periodKey.substring(5, 7));
        } catch (Exception e) {
            return 0;
        }
    }

    private String formatPeriodLabel(int month, int year) {
        if (month <= 0 || year <= 0) {
            return "Período não informado";
        }
        try {
            Month monthEnum = Month.of(month);
            String monthName = monthEnum.getDisplayName(java.time.format.TextStyle.FULL, new Locale("pt", "BR"));
            return String.format("%s %d", capitalize(monthName), year);
        } catch (Exception e) {
            return String.format("%02d/%04d", month, year);
        }
    }

    private PayslipOrganizationResponse.PayslipEntry toPayslipEntry(Payslip payslip) {
        PayslipOrganizationResponse.PayslipEntry entry = new PayslipOrganizationResponse.PayslipEntry();
        entry.setId(payslip.getId());
        entry.setEmployeeName(defaultString(payslip.getEmployeeName(), "Funcionário não informado"));
        entry.setCpf(defaultString(payslip.getCpf(), ""));
        entry.setMonth(payslip.getMonth());
        entry.setYear(payslip.getYear());
        entry.setFileName(payslip.getFileName());
        entry.setCompanySigla(resolveCompanySigla(payslip));
        entry.setCompanyName(defaultString(payslip.getCompanyName(), "Empresa não informada"));
        entry.setCompanyCnpj(defaultString(payslip.getCompanyCnpj(), ""));
        entry.setWorkPostName(payslip.getWorkPostName());
        entry.setSectorName(resolveSectorName(payslip));
        entry.setProcessedAt(payslip.getProcessedAt());
        return entry;
    }

    private int compareCompanyGroups(PayslipOrganizationResponse.CompanyGroup a, PayslipOrganizationResponse.CompanyGroup b) {
        int orderA = resolveCompanyPriority(a.getCompanySigla());
        int orderB = resolveCompanyPriority(b.getCompanySigla());
        if (orderA != orderB) {
            return Integer.compare(orderA, orderB);
        }
        return defaultString(a.getCompanyName(), "").compareToIgnoreCase(defaultString(b.getCompanyName(), ""));
    }

    private int resolveCompanyPriority(String sigla) {
        String normalized = sigla != null ? sigla.toUpperCase() : "";
        int index = COMPANY_SIGLA_PRIORITY.indexOf(normalized);
        return index >= 0 ? index : COMPANY_SIGLA_PRIORITY.size();
    }

    private String defaultString(String value, String fallback) {
        if (StringUtils.hasText(value)) {
            return value.trim();
        }
        return fallback != null ? fallback : "";
    }

    private String capitalize(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }
        return value.substring(0, 1).toUpperCase() + value.substring(1);
    }

    /**
     * TASK 02: Calcula hash SHA-256 do conteúdo da página para comparação com arquivos anteriores
     */
    private String calculatePageHash(String pageText) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(pageText.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hashBytes);
        } catch (Exception e) {
            log.warn("⚠️ Erro ao calcular hash da página: {}", e.getMessage());
            // Retornar hash simples baseado no tamanho do texto como fallback
            return String.valueOf(pageText != null ? pageText.hashCode() : 0);
        }
    }

    /**
     * TASK 02: Obtém hash do arquivo PDF salvo (se existir) para comparação
     */
    private String getPayslipFileHash(Payslip payslip) {
        try {
            if (payslip == null || payslip.getFileName() == null) {
                return null;
            }
            
            // Tentar encontrar o arquivo nas diferentes possíveis localizações
            String mesAno = String.format("%s-%s", payslip.getMonth(), payslip.getYear());
            Path candidatePath = Paths.get(OUTPUT_DIR, mesAno, payslip.getFileName());
            
            if (!Files.exists(candidatePath)) {
                // Tentar fallbacks
                Optional<String> pathOpt = resolvePayslipPathByCpfMonthYear(payslip.getCpf(), payslip.getMonth(), payslip.getYear());
                if (pathOpt.isPresent()) {
                    candidatePath = Paths.get(pathOpt.get());
                } else {
                    log.debug("📄 Arquivo PDF não encontrado para calcular hash: {}", payslip.getFileName());
                    return null;
                }
            }
            
            if (!Files.exists(candidatePath)) {
                log.debug("📄 Arquivo PDF não existe para calcular hash: {}", candidatePath);
                return null;
            }
            
            // Ler conteúdo do arquivo e calcular hash
            byte[] fileBytes = Files.readAllBytes(candidatePath);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(fileBytes);
            String hash = Base64.getEncoder().encodeToString(hashBytes);
            
            log.debug("🔐 Hash calculado do arquivo original {}: {}", payslip.getFileName(), hash.substring(0, Math.min(16, hash.length())) + "...");
            return hash;
        } catch (Exception e) {
            log.warn("⚠️ Erro ao obter hash do arquivo salvo {}: {}", payslip != null ? payslip.getFileName() : "null", e.getMessage());
            return null;
        }
    }

    /**
     * TASK 02: Compara dois holerites e detecta alterações (dados extraídos e conteúdo do arquivo)
     */
    private PayslipComparisonResult comparePayslips(Payslip existing, Payslip newPayslip, String hashArquivoOriginal, String hashPaginaAtual) {
        PayslipComparisonResult result = PayslipComparisonResult.builder()
            .hasChanges(false)
            .differences(new ArrayList<>())
            .build();
        
        if (existing == null || newPayslip == null) {
            if (existing == null && newPayslip != null) {
                result.addDifference("Holerite novo", "não existia", "criado");
            }
            return result;
        }
        
        // 1. Comparar hash do arquivo (mais confiável para detectar mudanças no PDF original)
        if (hashArquivoOriginal != null && hashPaginaAtual != null) {
            if (!hashArquivoOriginal.equals(hashPaginaAtual)) {
                result.addDifference("Hash do arquivo", "diferente", "arquivo foi modificado");
                log.info("🔐 Hash do arquivo diferente detectado - arquivo original foi modificado");
            } else {
                log.debug("✅ Hash do arquivo idêntico - conteúdo do PDF não mudou");
            }
        } else if (hashArquivoOriginal == null && hashPaginaAtual != null) {
            // Se não temos hash do original mas temos do novo, assumir mudança
            log.warn("⚠️ Hash do arquivo original não disponível - assumindo possível mudança");
            result.addDifference("Hash do arquivo", "não disponível", "verificação não possível");
        }
        
        // 2. Comparar dados extraídos (campos críticos)
        if (!Objects.equals(normalizeString(existing.getEmployeeName()), normalizeString(newPayslip.getEmployeeName()))) {
            result.addDifference("Nome do funcionário", existing.getEmployeeName(), newPayslip.getEmployeeName());
        }
        
        if (!Objects.equals(normalizeString(existing.getCpf()), normalizeString(newPayslip.getCpf()))) {
            result.addDifference("CPF", existing.getCpf(), newPayslip.getCpf());
        }
        
        if (!Objects.equals(normalizeString(existing.getCompanyCnpj()), normalizeString(newPayslip.getCompanyCnpj()))) {
            result.addDifference("CNPJ da empresa", existing.getCompanyCnpj(), newPayslip.getCompanyCnpj());
        }
        
        if (!Objects.equals(normalizeString(existing.getCompanyName()), normalizeString(newPayslip.getCompanyName()))) {
            result.addDifference("Nome da empresa", existing.getCompanyName(), newPayslip.getCompanyName());
        }
        
        if (!Objects.equals(normalizeString(existing.getWorkPostName()), normalizeString(newPayslip.getWorkPostName()))) {
            result.addDifference("Setor", existing.getWorkPostName(), newPayslip.getWorkPostName());
        }
        
        if (!Objects.equals(existing.getMonth(), newPayslip.getMonth())) {
            result.addDifference("Mês", String.valueOf(existing.getMonth()), String.valueOf(newPayslip.getMonth()));
        }
        
        if (!Objects.equals(existing.getYear(), newPayslip.getYear())) {
            result.addDifference("Ano", String.valueOf(existing.getYear()), String.valueOf(newPayslip.getYear()));
        }
        
        // 3. Comparar nome do arquivo (pode indicar versão diferente)
        if (!Objects.equals(normalizeString(existing.getFileName()), normalizeString(newPayslip.getFileName()))) {
            // Não adicionar como diferença crítica se for apenas versão diferente
            if (existing.getFileName() != null && newPayslip.getFileName() != null) {
                String baseNameExisting = existing.getFileName().replaceAll("_V\\d+\\.pdf$", ".pdf");
                String baseNameNew = newPayslip.getFileName().replaceAll("_V\\d+\\.pdf$", ".pdf");
                if (!baseNameExisting.equals(baseNameNew)) {
                    result.addDifference("Nome do arquivo (base)", baseNameExisting, baseNameNew);
                }
            }
        }
        
        // 4. TASK 02: Comparar valores financeiros (camada adicional de verificação)
        // Esta é uma verificação CRÍTICA - qualquer diferença nos valores financeiros deve ser detectada
        log.debug("🔍 Comparando valores financeiros...");
        
        // Comparar Total Vencimentos
        if (existing.getTotalEarnings() != null && newPayslip.getTotalEarnings() != null) {
            int comparison = existing.getTotalEarnings().compareTo(newPayslip.getTotalEarnings());
            if (comparison != 0) {
                result.addDifference("Total Vencimentos", 
                    existing.getTotalEarnings().toString(), 
                    newPayslip.getTotalEarnings().toString());
                log.warn("💰 ALTERAÇÃO DETECTADA em Total Vencimentos: {} -> {}", 
                    existing.getTotalEarnings(), newPayslip.getTotalEarnings());
            } else {
                log.debug("✅ Total Vencimentos idêntico: {}", existing.getTotalEarnings());
            }
        } else if (existing.getTotalEarnings() == null && newPayslip.getTotalEarnings() != null) {
            result.addDifference("Total Vencimentos", "não disponível", newPayslip.getTotalEarnings().toString());
            log.warn("💰 Total Vencimentos adicionado: {}", newPayslip.getTotalEarnings());
        } else if (existing.getTotalEarnings() != null && newPayslip.getTotalEarnings() == null) {
            result.addDifference("Total Vencimentos", existing.getTotalEarnings().toString(), "não disponível");
            log.warn("💰 Total Vencimentos removido: {}", existing.getTotalEarnings());
        } else {
            log.debug("⚠️ Total Vencimentos não disponível em ambos os holerites");
        }
        
        // Comparar Total Descontos
        if (existing.getTotalDeductions() != null && newPayslip.getTotalDeductions() != null) {
            int comparison = existing.getTotalDeductions().compareTo(newPayslip.getTotalDeductions());
            if (comparison != 0) {
                result.addDifference("Total Descontos", 
                    existing.getTotalDeductions().toString(), 
                    newPayslip.getTotalDeductions().toString());
                log.warn("💰 ALTERAÇÃO DETECTADA em Total Descontos: {} -> {}", 
                    existing.getTotalDeductions(), newPayslip.getTotalDeductions());
            } else {
                log.debug("✅ Total Descontos idêntico: {}", existing.getTotalDeductions());
            }
        } else if (existing.getTotalDeductions() == null && newPayslip.getTotalDeductions() != null) {
            result.addDifference("Total Descontos", "não disponível", newPayslip.getTotalDeductions().toString());
            log.warn("💰 Total Descontos adicionado: {}", newPayslip.getTotalDeductions());
        } else if (existing.getTotalDeductions() != null && newPayslip.getTotalDeductions() == null) {
            result.addDifference("Total Descontos", existing.getTotalDeductions().toString(), "não disponível");
            log.warn("💰 Total Descontos removido: {}", existing.getTotalDeductions());
        } else {
            log.debug("⚠️ Total Descontos não disponível em ambos os holerites");
        }
        
        // Comparar Valor Líquido
        if (existing.getNetValue() != null && newPayslip.getNetValue() != null) {
            int comparison = existing.getNetValue().compareTo(newPayslip.getNetValue());
            if (comparison != 0) {
                result.addDifference("Valor Líquido", 
                    existing.getNetValue().toString(), 
                    newPayslip.getNetValue().toString());
                log.warn("💰 ALTERAÇÃO DETECTADA em Valor Líquido: {} -> {}", 
                    existing.getNetValue(), newPayslip.getNetValue());
            } else {
                log.debug("✅ Valor Líquido idêntico: {}", existing.getNetValue());
            }
        } else if (existing.getNetValue() == null && newPayslip.getNetValue() != null) {
            result.addDifference("Valor Líquido", "não disponível", newPayslip.getNetValue().toString());
            log.warn("💰 Valor Líquido adicionado: {}", newPayslip.getNetValue());
        } else if (existing.getNetValue() != null && newPayslip.getNetValue() == null) {
            result.addDifference("Valor Líquido", existing.getNetValue().toString(), "não disponível");
            log.warn("💰 Valor Líquido removido: {}", existing.getNetValue());
        } else {
            log.debug("⚠️ Valor Líquido não disponível em ambos os holerites");
        }
        
        // 5. Comparar dados detalhados da tabela (Cód, Descrição, Referência, Vencimentos, Descontos)
        // Esta é a verificação mais importante para detectar alterações nos dados da tabela
        log.debug("🔍 Comparando dados detalhados da tabela...");
        log.debug("   Holerite existente: {} linhas", existing.getTableDetails() != null ? existing.getTableDetails().size() : 0);
        log.debug("   Holerite novo: {} linhas", newPayslip.getTableDetails() != null ? newPayslip.getTableDetails().size() : 0);
        
        if (existing.getTableDetails() != null && newPayslip.getTableDetails() != null) {
            boolean tableDetailsChanged = compareTableDetails(existing.getTableDetails(), newPayslip.getTableDetails(), result);
            if (tableDetailsChanged) {
                log.warn("📋 ALTERAÇÕES DETECTADAS nos dados detalhados da tabela!");
            } else {
                log.debug("✅ Dados da tabela idênticos");
            }
        } else if (existing.getTableDetails() == null && newPayslip.getTableDetails() != null && !newPayslip.getTableDetails().isEmpty()) {
            result.addDifference("Dados da tabela", "não disponível", newPayslip.getTableDetails().size() + " linha(s)");
            log.warn("📋 Dados da tabela não disponíveis no holerite existente, mas presentes no novo ({} linhas)", 
                newPayslip.getTableDetails().size());
        } else if (existing.getTableDetails() != null && !existing.getTableDetails().isEmpty() && 
                   (newPayslip.getTableDetails() == null || newPayslip.getTableDetails().isEmpty())) {
            result.addDifference("Dados da tabela", existing.getTableDetails().size() + " linha(s)", "não disponível");
            log.warn("📋 Dados da tabela presentes no holerite existente ({} linhas), mas não no novo", 
                existing.getTableDetails().size());
        } else {
            log.debug("⚠️ Dados da tabela não disponíveis em ambos os holerites");
        }
        
        // Verificação adicional: Se houver diferenças nos valores financeiros ou tableDetails, 
        // garantir que hasChanges seja true (pode ter sido perdido em algum caso edge)
        boolean hasFinancialDifferences = false;
        if (existing.getTotalEarnings() != null && newPayslip.getTotalEarnings() != null) {
            hasFinancialDifferences = existing.getTotalEarnings().compareTo(newPayslip.getTotalEarnings()) != 0;
        } else if (existing.getTotalEarnings() == null ^ newPayslip.getTotalEarnings() == null) {
            hasFinancialDifferences = true;
        }
        
        if (!hasFinancialDifferences && existing.getTotalDeductions() != null && newPayslip.getTotalDeductions() != null) {
            hasFinancialDifferences = existing.getTotalDeductions().compareTo(newPayslip.getTotalDeductions()) != 0;
        } else if (!hasFinancialDifferences && (existing.getTotalDeductions() == null ^ newPayslip.getTotalDeductions() == null)) {
            hasFinancialDifferences = true;
        }
        
        if (!hasFinancialDifferences && existing.getNetValue() != null && newPayslip.getNetValue() != null) {
            hasFinancialDifferences = existing.getNetValue().compareTo(newPayslip.getNetValue()) != 0;
        } else if (!hasFinancialDifferences && (existing.getNetValue() == null ^ newPayslip.getNetValue() == null)) {
            hasFinancialDifferences = true;
        }
        
        // Verificar se tableDetails tem diferenças
        boolean hasTableDetailsDifferences = false;
        if (existing.getTableDetails() != null && newPayslip.getTableDetails() != null) {
            if (existing.getTableDetails().size() != newPayslip.getTableDetails().size()) {
                hasTableDetailsDifferences = true;
            } else {
                // Comparar conteúdo das linhas
                for (int i = 0; i < existing.getTableDetails().size(); i++) {
                    var existingRow = existing.getTableDetails().get(i);
                    var newRow = newPayslip.getTableDetails().get(i);
                    if (!Objects.equals(existingRow.getCodigo(), newRow.getCodigo()) ||
                        !Objects.equals(existingRow.getDescricao(), newRow.getDescricao()) ||
                        !Objects.equals(existingRow.getReferencia(), newRow.getReferencia()) ||
                        (existingRow.getVencimentos() != null && newRow.getVencimentos() != null && 
                         existingRow.getVencimentos().compareTo(newRow.getVencimentos()) != 0) ||
                        (existingRow.getDescontos() != null && newRow.getDescontos() != null && 
                         existingRow.getDescontos().compareTo(newRow.getDescontos()) != 0)) {
                        hasTableDetailsDifferences = true;
                        break;
                    }
                }
            }
        } else if (existing.getTableDetails() == null ^ newPayslip.getTableDetails() == null) {
            hasTableDetailsDifferences = true;
        }
        
        // Se detectou diferenças financeiras ou em tableDetails mas hasChanges está false, forçar true
        if ((hasFinancialDifferences || hasTableDetailsDifferences) && !result.hasChanges()) {
            log.warn("⚠️ DIFERENÇAS DETECTADAS mas hasChanges estava false - FORÇANDO hasChanges=true");
            if (hasFinancialDifferences) {
                result.addDifference("Valores financeiros", "diferentes", "detectado na verificação adicional");
            }
            if (hasTableDetailsDifferences) {
                result.addDifference("Dados da tabela", "diferentes", "detectado na verificação adicional");
            }
        }
        
        // Log final do resultado da comparação
        log.info("🔍 Comparação concluída: hasChanges={}, total de diferenças={}", 
            result.hasChanges(), result.getDifferences().size());
        if (result.hasChanges()) {
            log.warn("📝 RESUMO DAS ALTERAÇÕES DETECTADAS:");
            for (int idx = 0; idx < result.getDifferences().size(); idx++) {
                log.warn("   {}. {}", idx + 1, result.getDifferences().get(idx));
            }
        } else {
            log.info("✅ Nenhuma alteração detectada - holerites são idênticos");
        }
        
        return result;
    }
    
    /**
     * Compara os dados detalhados da tabela de dois holerites
     * Retorna true se houver diferenças
     */
    private boolean compareTableDetails(
            List<com.z7design.secured_guard.dto.PayslipTableRow> existingDetails,
            List<com.z7design.secured_guard.dto.PayslipTableRow> newDetails,
            PayslipComparisonResult result) {
        
        if (existingDetails == null || newDetails == null) {
            log.debug("⚠️ compareTableDetails: existingDetails ou newDetails é null");
            return false;
        }
        
        boolean hasChanges = false;
        
        log.debug("🔍 Comparando tableDetails: {} linhas existentes vs {} linhas novas", 
            existingDetails.size(), newDetails.size());
        
        // Se o número de linhas é diferente, já há mudanças
        if (existingDetails.size() != newDetails.size()) {
            result.addDifference("Número de linhas na tabela", 
                String.valueOf(existingDetails.size()), 
                String.valueOf(newDetails.size()));
            hasChanges = true;
            log.warn("📋 Número de linhas diferente: {} vs {}", existingDetails.size(), newDetails.size());
        }
        
        // Criar mapas por código para comparação mais eficiente
        Map<String, com.z7design.secured_guard.dto.PayslipTableRow> existingMap = new HashMap<>();
        Map<String, com.z7design.secured_guard.dto.PayslipTableRow> newMap = new HashMap<>();
        
        for (com.z7design.secured_guard.dto.PayslipTableRow row : existingDetails) {
            if (row.getCodigo() != null) {
                existingMap.put(row.getCodigo(), row);
            }
        }
        
        for (com.z7design.secured_guard.dto.PayslipTableRow row : newDetails) {
            if (row.getCodigo() != null) {
                newMap.put(row.getCodigo(), row);
            }
        }
        
        // Verificar linhas que foram adicionadas ou removidas
        Set<String> allCodes = new HashSet<>(existingMap.keySet());
        allCodes.addAll(newMap.keySet());
        
        log.debug("🔍 Comparando {} códigos únicos", allCodes.size());
        
        for (String codigo : allCodes) {
            com.z7design.secured_guard.dto.PayslipTableRow existingRow = existingMap.get(codigo);
            com.z7design.secured_guard.dto.PayslipTableRow newRow = newMap.get(codigo);
            
            if (existingRow == null && newRow != null) {
                result.addDifference("Linha adicionada", 
                    "não existia", 
                    String.format("Cód: %s, Desc: %s, Ref: %s, Venc: %s, Desc: %s", 
                        newRow.getCodigo(), newRow.getDescricao(), newRow.getReferencia(),
                        newRow.getVencimentos(), newRow.getDescontos()));
                hasChanges = true;
                log.warn("📋 Linha ADICIONADA: Código {}", codigo);
            } else if (existingRow != null && newRow == null) {
                result.addDifference("Linha removida", 
                    String.format("Cód: %s, Desc: %s, Ref: %s, Venc: %s, Desc: %s", 
                        existingRow.getCodigo(), existingRow.getDescricao(), existingRow.getReferencia(),
                        existingRow.getVencimentos(), existingRow.getDescontos()),
                    "não existe mais");
                hasChanges = true;
                log.warn("📋 Linha REMOVIDA: Código {}", codigo);
            } else if (existingRow != null && newRow != null) {
                // Comparar campos da linha
                boolean rowChanged = false;
                
                if (!Objects.equals(normalizeString(existingRow.getDescricao()), normalizeString(newRow.getDescricao()))) {
                    result.addDifference(String.format("Descrição (Cód: %s)", codigo), 
                        existingRow.getDescricao() != null ? existingRow.getDescricao() : "null", 
                        newRow.getDescricao() != null ? newRow.getDescricao() : "null");
                    hasChanges = true;
                    rowChanged = true;
                    log.warn("📋 Descrição alterada para código {}: '{}' -> '{}'", codigo, existingRow.getDescricao(), newRow.getDescricao());
                }
                
                if (!Objects.equals(normalizeString(existingRow.getReferencia()), normalizeString(newRow.getReferencia()))) {
                    result.addDifference(String.format("Referência (Cód: %s)", codigo), 
                        existingRow.getReferencia() != null ? existingRow.getReferencia() : "null", 
                        newRow.getReferencia() != null ? newRow.getReferencia() : "null");
                    hasChanges = true;
                    rowChanged = true;
                    log.warn("📋 Referência alterada para código {}: '{}' -> '{}'", codigo, existingRow.getReferencia(), newRow.getReferencia());
                }
                
                if (existingRow.getVencimentos() != null && newRow.getVencimentos() != null) {
                    if (existingRow.getVencimentos().compareTo(newRow.getVencimentos()) != 0) {
                        result.addDifference(String.format("Vencimentos (Cód: %s)", codigo), 
                            existingRow.getVencimentos().toString(), newRow.getVencimentos().toString());
                        hasChanges = true;
                        rowChanged = true;
                        log.warn("📋 Vencimentos alterados para código {}: {} -> {}", codigo, existingRow.getVencimentos(), newRow.getVencimentos());
                    }
                } else if (existingRow.getVencimentos() == null && newRow.getVencimentos() != null) {
                    result.addDifference(String.format("Vencimentos (Cód: %s)", codigo), 
                        "não disponível", newRow.getVencimentos().toString());
                    hasChanges = true;
                    rowChanged = true;
                    log.warn("📋 Vencimentos adicionados para código {}: {}", codigo, newRow.getVencimentos());
                } else if (existingRow.getVencimentos() != null && newRow.getVencimentos() == null) {
                    result.addDifference(String.format("Vencimentos (Cód: %s)", codigo), 
                        existingRow.getVencimentos().toString(), "não disponível");
                    hasChanges = true;
                    rowChanged = true;
                    log.warn("📋 Vencimentos removidos para código {}: {}", codigo, existingRow.getVencimentos());
                }
                
                if (existingRow.getDescontos() != null && newRow.getDescontos() != null) {
                    if (existingRow.getDescontos().compareTo(newRow.getDescontos()) != 0) {
                        result.addDifference(String.format("Descontos (Cód: %s)", codigo), 
                            existingRow.getDescontos().toString(), newRow.getDescontos().toString());
                        hasChanges = true;
                        rowChanged = true;
                        log.warn("📋 Descontos alterados para código {}: {} -> {}", codigo, existingRow.getDescontos(), newRow.getDescontos());
                    }
                } else if (existingRow.getDescontos() == null && newRow.getDescontos() != null) {
                    result.addDifference(String.format("Descontos (Cód: %s)", codigo), 
                        "não disponível", newRow.getDescontos().toString());
                    hasChanges = true;
                    rowChanged = true;
                    log.warn("📋 Descontos adicionados para código {}: {}", codigo, newRow.getDescontos());
                } else if (existingRow.getDescontos() != null && newRow.getDescontos() == null) {
                    result.addDifference(String.format("Descontos (Cód: %s)", codigo), 
                        existingRow.getDescontos().toString(), "não disponível");
                    hasChanges = true;
                    rowChanged = true;
                    log.warn("📋 Descontos removidos para código {}: {}", codigo, existingRow.getDescontos());
                }
                
                if (!rowChanged) {
                    log.debug("✅ Linha com código {} idêntica", codigo);
                }
            }
        }
        
        log.info("📋 Comparação de tableDetails concluída: hasChanges={}", hasChanges);
        return hasChanges;
    }
    
    /**
     * Extrai os dados detalhados da tabela de vencimentos/descontos do holerite
     * Procura por linhas que seguem o padrão: Cód | Descrição | Referência | Vencimentos | Descontos
     * Funciona tanto com texto extraído via PDFBox quanto via OCR
     */
    private List<com.z7design.secured_guard.dto.PayslipTableRow> extractTableDetails(String[] linhas) {
        List<com.z7design.secured_guard.dto.PayslipTableRow> tableRows = new ArrayList<>();
        
        if (linhas == null || linhas.length == 0) {
            log.warn("⚠️ Nenhuma linha disponível para extrair dados da tabela");
            return tableRows;
        }
        
        boolean inTableSection = false;
        int linhaIndex = 0;
        
        log.debug("🔍 Iniciando extração de dados da tabela de {} linha(s)", linhas.length);
        
        for (String linha : linhas) {
            linhaIndex++;
            String linhaTrimmed = linha.trim();
            
            // Detectar início da tabela (linha com cabeçalho) - mais flexível
            String linhaUpper = linhaTrimmed.toUpperCase();
            if (linhaUpper.contains("CÓD") || linhaUpper.contains("COD") ||
                linhaUpper.contains("DESCRIÇÃO") || linhaUpper.contains("DESCRICAO") ||
                linhaUpper.contains("REFERÊNCIA") || linhaUpper.contains("REFERENCIA") ||
                linhaUpper.contains("VENCIMENTOS") || linhaUpper.contains("VENCIMENTO") ||
                linhaUpper.contains("DESCONTOS") || linhaUpper.contains("DESCONTO")) {
                inTableSection = true;
                log.debug("📋 Início da tabela detectado na linha {}: {}", linhaIndex, linhaTrimmed);
                continue;
            }
            
            // Detectar fim da tabela (linha com totais)
            if (inTableSection && (
                linhaUpper.contains("TOTAL") ||
                linhaUpper.contains("VALOR LÍQUIDO") || linhaUpper.contains("VALOR LIQUIDO") ||
                linhaUpper.contains("LÍQUIDO") || linhaUpper.contains("LIQUIDO") ||
                linhaUpper.contains("SALDO BASE") ||
                linhaUpper.contains("BASE CÁLC") || linhaUpper.contains("BASE CALC"))) {
                log.debug("📋 Fim da tabela detectado na linha {}: {}", linhaIndex, linhaTrimmed);
                break;
            }
            
            if (inTableSection && linhaTrimmed.length() > 5) {
                // Padrão 1: Código de 3 dígitos no início (mais comum)
                // Exemplo: "001 Salário Base 30,00 1.649,12" ou "903 INSS Folha 7,62 % 125,65"
                Pattern pattern1 = Pattern.compile(
                    "^(\\d{3})\\s+" +                    // Código (3 dígitos)
                    "([A-ZÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇa-záàâãäéèêëíìîïóòôõöúùûüç\\s]+?)\\s+" +  // Descrição
                    "([\\d.,%\\s]+?)\\s+" +             // Referência
                    "([\\d.,]+)?\\s*" +                  // Vencimentos (opcional)
                    "([\\d.,]+)?$"                       // Descontos (opcional)
                );
                
                // Padrão 2: Mais flexível para OCR (pode ter espaços extras ou caracteres estranhos)
                Pattern pattern2 = Pattern.compile(
                    "^(\\d{3})[\\s|]+" +                 // Código seguido de espaço ou pipe
                    "([A-ZÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇa-záàâãäéèêëíìîïóòôõöúùûüç\\s]+?)[\\s|]+" +  // Descrição
                    "([\\d.,%\\s]+?)[\\s|]+" +          // Referência
                    "([\\d.,]+)?[\\s|]*" +               // Vencimentos (opcional)
                    "([\\d.,]+)?$"                       // Descontos (opcional)
                );
                
                // Padrão 3: Ainda mais flexível - apenas código e descrição obrigatórios
                Pattern pattern3 = Pattern.compile(
                    "^(\\d{3})\\s+" +                    // Código
                    "(.+?)\\s+" +                        // Descrição (qualquer coisa)
                    "([\\d.,%\\s]*?)\\s*" +             // Referência (opcional)
                    "([\\d.,]+)?\\s*" +                  // Vencimentos (opcional)
                    "([\\d.,]+)?$"                       // Descontos (opcional)
                );
                
                Matcher matcher = pattern1.matcher(linhaTrimmed);
                if (!matcher.find()) {
                    matcher = pattern2.matcher(linhaTrimmed);
                }
                if (!matcher.find()) {
                    matcher = pattern3.matcher(linhaTrimmed);
                }
                
                if (matcher.find()) {
                    try {
                        String codigo = matcher.group(1);
                        String descricao = matcher.group(2).trim();
                        String referencia = matcher.groupCount() >= 3 && matcher.group(3) != null ? matcher.group(3).trim() : "";
                        String vencimentosStr = matcher.groupCount() >= 4 && matcher.group(4) != null ? matcher.group(4).trim() : null;
                        String descontosStr = matcher.groupCount() >= 5 && matcher.group(5) != null ? matcher.group(5).trim() : null;
                        
                        // Limpar descrição (remover caracteres estranhos do OCR)
                        descricao = descricao.replaceAll("[|\\|]", " ").replaceAll("\\s+", " ").trim();
                        
                        // Converter valores monetários
                        java.math.BigDecimal vencimentos = parseMonetaryValue(vencimentosStr);
                        java.math.BigDecimal descontos = parseMonetaryValue(descontosStr);
                        
                        // Validar código (deve ser 3 dígitos)
                        if (codigo != null && codigo.matches("\\d{3}") && 
                            descricao != null && !descricao.isEmpty() && descricao.length() >= 3) {
                            
                            com.z7design.secured_guard.dto.PayslipTableRow row = 
                                com.z7design.secured_guard.dto.PayslipTableRow.builder()
                                    .codigo(codigo)
                                    .descricao(descricao)
                                    .referencia(referencia)
                                    .vencimentos(vencimentos)
                                    .descontos(descontos)
                                    .build();
                            
                            tableRows.add(row);
                            log.debug("📋 Linha {} extraída: Cód: {}, Desc: {}, Ref: {}, Venc: {}, Desc: {}", 
                                linhaIndex, codigo, descricao, referencia, vencimentos, descontos);
                        } else {
                            log.debug("⚠️ Linha {} ignorada (validação falhou): {}", linhaIndex, linhaTrimmed);
                        }
                    } catch (Exception e) {
                        log.debug("⚠️ Erro ao extrair linha {} da tabela: {} - {}", linhaIndex, linhaTrimmed, e.getMessage());
                    }
                } else {
                    // Se não encontrou padrão, mas está na seção da tabela e tem código de 3 dígitos, tentar extrair manualmente
                    if (linhaTrimmed.matches("^\\d{3}.*")) {
                        log.debug("⚠️ Linha {} na seção da tabela mas não correspondeu ao padrão: {}", linhaIndex, linhaTrimmed);
                    }
                }
            }
        }
        
        if (tableRows.isEmpty() && inTableSection) {
            log.warn("⚠️ Seção da tabela detectada mas nenhuma linha foi extraída. Verifique o formato do PDF.");
        } else if (!inTableSection) {
            log.warn("⚠️ Seção da tabela não foi detectada. Tentando busca alternativa...");
            // Tentar busca alternativa sem detectar seção
            tableRows = extractTableDetailsAlternative(linhas);
        }
        
        log.info("📋 Extração da tabela concluída: {} linha(s) extraída(s)", tableRows.size());
        return tableRows;
    }
    
    /**
     * Método alternativo para extrair dados da tabela quando a seção não foi detectada
     * Procura por linhas que começam com código de 3 dígitos em qualquer lugar do texto
     */
    private List<com.z7design.secured_guard.dto.PayslipTableRow> extractTableDetailsAlternative(String[] linhas) {
        List<com.z7design.secured_guard.dto.PayslipTableRow> tableRows = new ArrayList<>();
        
        log.debug("🔍 Tentando extração alternativa da tabela...");
        
        for (int i = 0; i < linhas.length; i++) {
            String linha = linhas[i].trim();
            
            // Procurar por linhas que começam com código de 3 dígitos seguido de texto
            Pattern altPattern = Pattern.compile("^(\\d{3})\\s+(.+)$");
            Matcher matcher = altPattern.matcher(linha);
            
            if (matcher.find() && linha.length() > 10) {
                try {
                    String codigo = matcher.group(1);
                    String resto = matcher.group(2);
                    
                    // Tentar extrair descrição e valores do resto
                    String[] partes = resto.split("\\s+");
                    if (partes.length >= 1) {
                        StringBuilder descricao = new StringBuilder();
                        String referencia = "";
                        String vencimentosStr = null;
                        String descontosStr = null;
                        
                        int idx = 0;
                        // Primeiras palavras são a descrição
                        while (idx < partes.length && !partes[idx].matches("^[\\d.,]+$") && !partes[idx].contains("%")) {
                            if (descricao.length() > 0) descricao.append(" ");
                            descricao.append(partes[idx]);
                            idx++;
                        }
                        
                        // Próxima parte pode ser referência
                        if (idx < partes.length) {
                            referencia = partes[idx];
                            idx++;
                        }
                        
                        // Próximas partes podem ser vencimentos e descontos
                        if (idx < partes.length) {
                            vencimentosStr = partes[idx];
                            idx++;
                        }
                        if (idx < partes.length) {
                            descontosStr = partes[idx];
                        }
                        
                        java.math.BigDecimal vencimentos = parseMonetaryValue(vencimentosStr);
                        java.math.BigDecimal descontos = parseMonetaryValue(descontosStr);
                        
                        if (descricao.length() >= 3) {
                            com.z7design.secured_guard.dto.PayslipTableRow row = 
                                com.z7design.secured_guard.dto.PayslipTableRow.builder()
                                    .codigo(codigo)
                                    .descricao(descricao.toString())
                                    .referencia(referencia)
                                    .vencimentos(vencimentos)
                                    .descontos(descontos)
                                    .build();
                            
                            tableRows.add(row);
                            log.debug("📋 Linha alternativa extraída: Cód: {}, Desc: {}", codigo, descricao.toString());
                        }
                    }
                } catch (Exception e) {
                    log.debug("⚠️ Erro na extração alternativa da linha {}: {}", i, e.getMessage());
                }
            }
        }
        
        return tableRows;
    }
    
    /**
     * Converte string monetária brasileira para BigDecimal
     * Ex: "1.649,12" -> 1649.12
     */
    private java.math.BigDecimal parseMonetaryValue(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        
        try {
            String cleaned = value.replace(".", "").replace(",", ".");
            return new java.math.BigDecimal(cleaned);
        } catch (Exception e) {
            log.debug("⚠️ Erro ao converter valor monetário: {}", value);
            return null;
        }
    }
    
    /**
     * Normaliza string para comparação (remove espaços, converte para maiúsculas, trata null)
     */
    private String normalizeString(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().toUpperCase().replaceAll("\\s+", " ");
    }

    /**
     * TASK 04: Organiza holerites por tipo de empresa (Terceirização vs Vigilância e ADM)
     * Estrutura: Tipo → Empresa → Setor → Período
     */
    public CompanyTypeOrganizationResponse organizePayslipsByCompanyType(List<Payslip> payslips) {
        CompanyTypeOrganizationResponse response = new CompanyTypeOrganizationResponse();
        response.setGeneratedAt(LocalDateTime.now());

        try {
            // Primeiro organizar por empresa (reutilizar método existente)
            PayslipOrganizationResponse companyOrganization = organizePayslipsByCompany(payslips);
            response.setTotalPayslips(companyOrganization.getTotalPayslips());
            response.setTotalCompanies(companyOrganization.getTotalCompanies());
            response.setTotalSectors(companyOrganization.getTotalSectors());

            // Separar empresas por tipo
            List<CompanyTypeOrganizationResponse.CompanyGroup> terceirizacaoCompanies = new ArrayList<>();
            List<CompanyTypeOrganizationResponse.CompanyGroup> vigilanciaCompanies = new ArrayList<>();
            List<CompanyTypeOrganizationResponse.CompanyGroup> administrativoCompanies = new ArrayList<>();
            
            Set<String> terceirizacaoSectorKeys = new HashSet<>();
            Set<String> vigilanciaSectorKeys = new HashSet<>();
            Set<String> administrativoSectorKeys = new HashSet<>();
            long terceirizacaoTotalPayslips = 0;
            long vigilanciaTotalPayslips = 0;
            long administrativoTotalPayslips = 0;

            for (PayslipOrganizationResponse.CompanyGroup company : companyOrganization.getCompanies()) {
                String sigla = company.getCompanySigla() != null ? company.getCompanySigla().toUpperCase() : "";
                
                // Determinar tipo de empresa: TERC = Terceirização, VIG = Vigilância, ADM = Administrativo
                boolean isTerceirizacao = sigla.equals("TERC");
                boolean isVigilancia = sigla.equals("VIG");
                boolean isAdministrativo = sigla.equals("ADM") || sigla.isEmpty() || sigla.equals("OUTROS");
                
                // Converter para CompanyTypeOrganizationResponse.CompanyGroup
                CompanyTypeOrganizationResponse.CompanyGroup typeCompanyGroup = convertToCompanyTypeGroup(company);
                
                if (isTerceirizacao) {
                    terceirizacaoCompanies.add(typeCompanyGroup);
                    terceirizacaoTotalPayslips += company.getTotalPayslips();
                    
                    // Contar setores únicos
                    if (company.getSectors() != null) {
                        for (PayslipOrganizationResponse.SectorGroup sector : company.getSectors()) {
                            terceirizacaoSectorKeys.add(company.getCompanySigla() + "|" + sector.getNormalizedSectorName());
                        }
                    }
                } else if (isVigilancia) {
                    // VIG = Vigilância
                    vigilanciaCompanies.add(typeCompanyGroup);
                    vigilanciaTotalPayslips += company.getTotalPayslips();
                    
                    // Contar setores únicos
                    if (company.getSectors() != null) {
                        for (PayslipOrganizationResponse.SectorGroup sector : company.getSectors()) {
                            vigilanciaSectorKeys.add(company.getCompanySigla() + "|" + sector.getNormalizedSectorName());
                        }
                    }
                } else if (isAdministrativo) {
                    // ADM ou OUTROS = Administrativo
                    administrativoCompanies.add(typeCompanyGroup);
                    administrativoTotalPayslips += company.getTotalPayslips();
                    
                    // Contar setores únicos
                    if (company.getSectors() != null) {
                        for (PayslipOrganizationResponse.SectorGroup sector : company.getSectors()) {
                            administrativoSectorKeys.add(company.getCompanySigla() + "|" + sector.getNormalizedSectorName());
                        }
                    }
                }
            }

            // Ordenar empresas por sigla e nome
            terceirizacaoCompanies.sort((a, b) -> {
                int siglaCompare = defaultString(a.getCompanySigla(), "").compareToIgnoreCase(defaultString(b.getCompanySigla(), ""));
                if (siglaCompare != 0) return siglaCompare;
                return defaultString(a.getCompanyName(), "").compareToIgnoreCase(defaultString(b.getCompanyName(), ""));
            });

            vigilanciaCompanies.sort((a, b) -> {
                int siglaCompare = defaultString(a.getCompanySigla(), "").compareToIgnoreCase(defaultString(b.getCompanySigla(), ""));
                if (siglaCompare != 0) return siglaCompare;
                return defaultString(a.getCompanyName(), "").compareToIgnoreCase(defaultString(b.getCompanyName(), ""));
            });

            administrativoCompanies.sort((a, b) -> {
                int siglaCompare = defaultString(a.getCompanySigla(), "").compareToIgnoreCase(defaultString(b.getCompanySigla(), ""));
                if (siglaCompare != 0) return siglaCompare;
                return defaultString(a.getCompanyName(), "").compareToIgnoreCase(defaultString(b.getCompanyName(), ""));
            });

            // Criar grupos de tipo
            CompanyTypeOrganizationResponse.CompanyTypeGroup terceirizacaoGroup = new CompanyTypeOrganizationResponse.CompanyTypeGroup();
            terceirizacaoGroup.setTypeName("Terceirização");
            terceirizacaoGroup.setTypeCode("TERCEIRIZACAO");
            terceirizacaoGroup.setTotalCompanies(terceirizacaoCompanies.size());
            terceirizacaoGroup.setTotalPayslips(terceirizacaoTotalPayslips);
            terceirizacaoGroup.setTotalSectors(terceirizacaoSectorKeys.size());
            terceirizacaoGroup.setCompanies(terceirizacaoCompanies);

            CompanyTypeOrganizationResponse.CompanyTypeGroup vigilanciaGroup = new CompanyTypeOrganizationResponse.CompanyTypeGroup();
            vigilanciaGroup.setTypeName("Vigilância");
            vigilanciaGroup.setTypeCode("VIGILANCIA");
            vigilanciaGroup.setTotalCompanies(vigilanciaCompanies.size());
            vigilanciaGroup.setTotalPayslips(vigilanciaTotalPayslips);
            vigilanciaGroup.setTotalSectors(vigilanciaSectorKeys.size());
            vigilanciaGroup.setCompanies(vigilanciaCompanies);

            CompanyTypeOrganizationResponse.CompanyTypeGroup administrativoGroup = new CompanyTypeOrganizationResponse.CompanyTypeGroup();
            administrativoGroup.setTypeName("Administrativo");
            administrativoGroup.setTypeCode("ADMINISTRATIVO");
            administrativoGroup.setTotalCompanies(administrativoCompanies.size());
            administrativoGroup.setTotalPayslips(administrativoTotalPayslips);
            administrativoGroup.setTotalSectors(administrativoSectorKeys.size());
            administrativoGroup.setCompanies(administrativoCompanies);

            response.setTerceirizacao(terceirizacaoGroup);
            response.setVigilancia(vigilanciaGroup);
            response.setAdministrativo(administrativoGroup);

            log.info("📊 Organização por tipo concluída:");
            log.info("   Terceirização: {} empresa(s), {} setor(es), {} holerite(s)", 
                terceirizacaoGroup.getTotalCompanies(), terceirizacaoGroup.getTotalSectors(), terceirizacaoGroup.getTotalPayslips());
            log.info("   Vigilância: {} empresa(s), {} setor(es), {} holerite(s)", 
                vigilanciaGroup.getTotalCompanies(), vigilanciaGroup.getTotalSectors(), vigilanciaGroup.getTotalPayslips());
            log.info("   Administrativo: {} empresa(s), {} setor(es), {} holerite(s)", 
                administrativoGroup.getTotalCompanies(), administrativoGroup.getTotalSectors(), administrativoGroup.getTotalPayslips());

            return response;
        } catch (Exception e) {
            log.error("Erro ao organizar holerites por tipo de empresa: {}", e.getMessage(), e);
            // Retornar resposta vazia em caso de erro
            CompanyTypeOrganizationResponse.CompanyTypeGroup emptyTerceirizacao = new CompanyTypeOrganizationResponse.CompanyTypeGroup();
            emptyTerceirizacao.setTypeName("Terceirização");
            emptyTerceirizacao.setTypeCode("TERCEIRIZACAO");
            emptyTerceirizacao.setTotalCompanies(0);
            emptyTerceirizacao.setTotalPayslips(0);
            emptyTerceirizacao.setTotalSectors(0);
            emptyTerceirizacao.setCompanies(Collections.emptyList());

            CompanyTypeOrganizationResponse.CompanyTypeGroup emptyVigilancia = new CompanyTypeOrganizationResponse.CompanyTypeGroup();
            emptyVigilancia.setTypeName("Vigilância");
            emptyVigilancia.setTypeCode("VIGILANCIA");
            emptyVigilancia.setTotalCompanies(0);
            emptyVigilancia.setTotalPayslips(0);
            emptyVigilancia.setTotalSectors(0);
            emptyVigilancia.setCompanies(Collections.emptyList());

            CompanyTypeOrganizationResponse.CompanyTypeGroup emptyAdministrativo = new CompanyTypeOrganizationResponse.CompanyTypeGroup();
            emptyAdministrativo.setTypeName("Administrativo");
            emptyAdministrativo.setTypeCode("ADMINISTRATIVO");
            emptyAdministrativo.setTotalCompanies(0);
            emptyAdministrativo.setTotalPayslips(0);
            emptyAdministrativo.setTotalSectors(0);
            emptyAdministrativo.setCompanies(Collections.emptyList());

            response.setTerceirizacao(emptyTerceirizacao);
            response.setVigilancia(emptyVigilancia);
            response.setAdministrativo(emptyAdministrativo);
            response.setTotalPayslips(0);
            response.setTotalCompanies(0);
            response.setTotalSectors(0);
            return response;
        }
    }

    /**
     * Converte PayslipOrganizationResponse.CompanyGroup para CompanyTypeOrganizationResponse.CompanyGroup
     */
    private CompanyTypeOrganizationResponse.CompanyGroup convertToCompanyTypeGroup(PayslipOrganizationResponse.CompanyGroup company) {
        CompanyTypeOrganizationResponse.CompanyGroup typeGroup = new CompanyTypeOrganizationResponse.CompanyGroup();
        typeGroup.setCompanyId(company.getCompanyId());
        typeGroup.setCompanySigla(company.getCompanySigla());
        typeGroup.setCompanyName(company.getCompanyName());
        typeGroup.setCompanyCnpj(company.getCompanyCnpj());
        typeGroup.setTotalPayslips(company.getTotalPayslips());
        typeGroup.setTotalSectors(company.getSectors() != null ? company.getSectors().size() : 0);

        // Converter setores
        List<CompanyTypeOrganizationResponse.SectorGroup> typeSectors = new ArrayList<>();
        if (company.getSectors() != null) {
            for (PayslipOrganizationResponse.SectorGroup sector : company.getSectors()) {
                CompanyTypeOrganizationResponse.SectorGroup typeSector = new CompanyTypeOrganizationResponse.SectorGroup();
                typeSector.setSectorName(sector.getSectorName());
                typeSector.setNormalizedSectorName(sector.getNormalizedSectorName());
                typeSector.setTotalPayslips(sector.getTotalPayslips());

                // Converter períodos
                List<CompanyTypeOrganizationResponse.PeriodGroup> typePeriods = new ArrayList<>();
                if (sector.getPeriods() != null) {
                    for (PayslipOrganizationResponse.PeriodGroup period : sector.getPeriods()) {
                        CompanyTypeOrganizationResponse.PeriodGroup typePeriod = new CompanyTypeOrganizationResponse.PeriodGroup();
                        typePeriod.setMonth(period.getMonth());
                        typePeriod.setYear(period.getYear());
                        typePeriod.setFormattedPeriod(period.getFormattedPeriod());
                        typePeriod.setTotalPayslips(period.getTotalPayslips());

                        // Converter holerites
                        List<CompanyTypeOrganizationResponse.PayslipEntry> typeEntries = new ArrayList<>();
                        if (period.getPayslips() != null) {
                            for (PayslipOrganizationResponse.PayslipEntry entry : period.getPayslips()) {
                                CompanyTypeOrganizationResponse.PayslipEntry typeEntry = new CompanyTypeOrganizationResponse.PayslipEntry();
                                typeEntry.setId(entry.getId());
                                typeEntry.setEmployeeName(entry.getEmployeeName());
                                typeEntry.setCpf(entry.getCpf());
                                typeEntry.setMonth(entry.getMonth());
                                typeEntry.setYear(entry.getYear());
                                typeEntry.setFileName(entry.getFileName());
                                typeEntry.setCompanySigla(entry.getCompanySigla());
                                typeEntry.setCompanyName(entry.getCompanyName());
                                typeEntry.setCompanyCnpj(entry.getCompanyCnpj());
                                typeEntry.setSectorName(entry.getSectorName());
                                typeEntry.setWorkPostName(entry.getWorkPostName());
                                typeEntry.setProcessedAt(entry.getProcessedAt());
                                typeEntries.add(typeEntry);
                            }
                        }
                        typePeriod.setPayslips(typeEntries);
                        typePeriods.add(typePeriod);
                    }
                }
                typeSector.setPeriods(typePeriods);
                typeSectors.add(typeSector);
            }
        }
        typeGroup.setSectors(typeSectors);
        return typeGroup;
    }
} 