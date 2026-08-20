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
import org.apache.pdfbox.pdmodel.PDPage;
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
import com.z7design.secured_guard.dto.PayslipComparisonResult;

import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.repository.EmployeeRepository;
import com.z7design.secured_guard.repository.RoleRepository;
import com.z7design.secured_guard.repository.UserRepository;
import org.springframework.util.StringUtils;
import org.springframework.transaction.annotation.Transactional;
import java.time.Month;

@Service
@Slf4j
@RequiredArgsConstructor
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
        int paginasProcessadas = 0;
        int paginasComErro = 0;
        int paginasPuladasPorDuplicidade = 0;

        try {
            // Create output directory if it doesn't exist
            Path outputPath = Paths.get(OUTPUT_DIR);
            if (!Files.exists(outputPath)) {
                Files.createDirectories(outputPath);
            }

            // Carregar arquivo em memória para evitar problemas de stream fechado
            byte[] fileBytes = file.getBytes();
            log.info("📦 Arquivo carregado em memória: {} bytes", fileBytes.length);

            if (fileBytes.length == 0) {
                log.error("❌ Arquivo carregado está vazio!");
                throw new IllegalArgumentException("O arquivo está vazio após carregamento");
            }

            try (PDDocument document = PDDocument.load(new java.io.ByteArrayInputStream(fileBytes))) {
                if (document.isEncrypted()) {
                    throw new IllegalArgumentException("O PDF está criptografado");
                }

                PDFTextStripper stripper = new PDFTextStripper();
                pageCount = document.getNumberOfPages();
                log.info("📄 PDF contém {} página(s) - Arquivo: {}", pageCount, file.getOriginalFilename());
                log.info("   📊 Expectativa: {} holerite(s) serão processados (1 holerite por página)", pageCount);

                if (pageCount == 0) {
                    log.error("❌ ERRO: PDF não contém páginas!");
                    return processedPayslips;
                }

                if (pageCount > 1000) {
                    log.warn("⚠️ ATENÇÃO: PDF muito grande ({} páginas). Processamento pode demorar.", pageCount);
                }
                log.info("");
                log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                log.info("🔍 ETAPA 1: LENDO TODAS AS PÁGINAS E IDENTIFICANDO CPFs");
                log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

                // Estrutura para armazenar informações de cada holerite encontrado
                class HoleriteInfo {
                    String cpf;
                    int pagina;
                    int posicaoNaPagina; // Posição do CPF no texto da página
                    String textoCompleto;
                    String secaoTexto; // Seção do texto correspondente a este CPF
                }

                List<HoleriteInfo> holeritesEncontrados = new ArrayList<>();
                Map<Integer, String> textosDasPaginas = new HashMap<>();

                // ETAPA 1: Ler todas as páginas e identificar todos os CPFs
                for (int i = 1; i <= pageCount; i++) {
                    log.info("📖 Lendo página {}/{}", i, pageCount);
                    stripper.setStartPage(i);
                    stripper.setEndPage(i);
                    String pageText = stripper.getText(document);

                    // Verificar se o texto foi extraído
                    if (pageText == null || pageText.trim().isEmpty()) {
                        log.warn("⚠️ ATENÇÃO: Página {} não contém texto extraível. O PDF pode ser escaneado (imagem).",
                                i);
                        log.warn(
                                "⚠️ SOLUÇÃO: Use o endpoint /api/v1/document-processing/upload-payslips que suporta OCR.");
                        continue; // Pular esta página
                    }

                    log.info("   📝 Texto extraído: {} caracteres", pageText.length());
                    if (pageText.length() < 50) {
                        log.warn("⚠️ ATENÇÃO: Texto muito curto ({} caracteres). O PDF pode ser escaneado (imagem).",
                                pageText.length());
                        log.warn(
                                "⚠️ SOLUÇÃO: Use o endpoint /api/v1/document-processing/upload-payslips que suporta OCR.");
                    }

                    textosDasPaginas.put(i, pageText);

                    // Identificar todos os CPFs nesta página
                    List<String> cpfsUnicos = detectarTodosCPFsNaPagina(pageText);
                    log.info("   ✅ {} CPF(s) encontrado(s) na página {}: {}", cpfsUnicos.size(), i, cpfsUnicos);

                    if (cpfsUnicos.isEmpty()) {
                        log.warn(
                                "⚠️ Nenhum CPF encontrado na página {}. Verifique se o PDF contém texto ou se é uma imagem escaneada.",
                                i);
                        log.warn(
                                "⚠️ SOLUÇÃO: Use o endpoint /api/v1/document-processing/upload-payslips que suporta OCR.");
                    }

                    // Para cada CPF, encontrar sua posição no texto
                    for (String cpf : cpfsUnicos) {
                        HoleriteInfo info = new HoleriteInfo();
                        info.cpf = cpf;
                        info.pagina = i;
                        info.textoCompleto = pageText;

                        // Encontrar posição do CPF no texto
                        String cpfFormatado = cpf.replaceAll("(\\d{3})(\\d{3})(\\d{3})(\\d{2})", "$1.$2.$3-$4");
                        Pattern[] cpfPatterns = {
                                Pattern.compile("CPF[:\\s]*" + cpfFormatado.replace(".", "\\.").replace("-", "\\-"),
                                        Pattern.CASE_INSENSITIVE),
                                Pattern.compile("CPF[:\\s]*" + cpf, Pattern.CASE_INSENSITIVE),
                                Pattern.compile(cpfFormatado.replace(".", "\\.").replace("-", "\\-")),
                                Pattern.compile(cpf)
                        };

                        for (Pattern pattern : cpfPatterns) {
                            Matcher matcher = pattern.matcher(pageText);
                            if (matcher.find()) {
                                info.posicaoNaPagina = matcher.start();
                                break;
                            }
                        }

                        holeritesEncontrados.add(info);
                    }
                }

                log.info("");
                log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                log.info("📊 RESUMO DA ETAPA 1:");
                log.info("   Total de holerites encontrados: {}", holeritesEncontrados.size());
                log.info("   CPFs únicos: {}", holeritesEncontrados.stream().map(h -> h.cpf).distinct().count());
                log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

                if (holeritesEncontrados.isEmpty()) {
                    log.error("❌ ERRO CRÍTICO: Nenhum CPF foi detectado em nenhuma página do PDF!");
                    log.error("❌ POSSÍVEIS CAUSAS:");
                    log.error("   1. O PDF é uma imagem escaneada (não contém texto extraível)");
                    log.error("   2. O PDF está corrompido ou protegido");
                    log.error("   3. Os holerites não contêm CPF no formato esperado");
                    log.error(
                            "❌ SOLUÇÃO: Use o endpoint /api/v1/document-processing/upload-payslips que suporta OCR para PDFs escaneados.");
                    log.error("📊 Tentando processar páginas mesmo sem CPF detectado (fallback)...");

                    // FALLBACK: Tentar processar páginas mesmo sem CPF detectado
                    // Pode ser que o CPF esteja em formato diferente ou o texto não foi extraído
                    // corretamente
                    for (int i = 1; i <= pageCount; i++) {
                        try {
                            String pageText = textosDasPaginas.get(i);
                            if (pageText != null && !pageText.trim().isEmpty()) {
                                log.info("🔄 Tentando processar página {} sem CPF detectado (fallback)", i);
                                Payslip payslip = extractPayslipInfo(pageText, i);
                                if (payslip != null && payslip.getCpf() != null) {
                                    log.info("✅ CPF encontrado no fallback: {} na página {}", payslip.getCpf(), i);
                                    if (processarHoleriteUnico(document, i, payslip, pageText, processedPayslips)) {
                                        paginasProcessadas++;
                                    }
                                }
                            }
                        } catch (Exception e) {
                            log.warn("⚠️ Erro ao processar página {} no fallback: {}", i, e.getMessage());
                        }
                    }

                    if (processedPayslips.isEmpty()) {
                        log.error("❌ Nenhum holerite foi processado mesmo com fallback");
                        return processedPayslips; // Retornar lista vazia
                    } else {
                        log.info("✅ Fallback processou {} holerite(s)", processedPayslips.size());
                    }
                }

                log.info("");
                log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                log.info("🔍 ETAPA 2: IDENTIFICANDO EMPRESA E CNPJ PARA CADA CPF");
                log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

                // ETAPA 2: Para cada CPF, identificar empresa e CNPJ
                for (HoleriteInfo info : holeritesEncontrados) {
                    log.info("🔍 Processando CPF {} (página {})", info.cpf, info.pagina);

                    // Dividir texto em seção correspondente ao CPF
                    String pageText = info.textoCompleto;
                    int posicaoCpf = info.posicaoNaPagina;

                    // Encontrar posição do próximo CPF (ou fim do texto)
                    int posicaoProximoCpf = pageText.length();
                    for (HoleriteInfo outro : holeritesEncontrados) {
                        if (outro.pagina == info.pagina && !outro.cpf.equals(info.cpf)
                                && outro.posicaoNaPagina > posicaoCpf) {
                            if (outro.posicaoNaPagina < posicaoProximoCpf) {
                                posicaoProximoCpf = outro.posicaoNaPagina;
                            }
                        }
                    }

                    // Extrair seção do texto (incluir contexto antes do CPF)
                    // CORREÇÃO CRÍTICA: Se for o primeiro CPF da página (ou o único holerite da página/arquivo),
                    // inicioSecao DEVE ser 0 para capturar o cabeçalho completo (Empresa, CNPJ, Período, etc.)
                    boolean isPrimeiroCpfDaPagina = true;
                    for (HoleriteInfo outro : holeritesEncontrados) {
                        if (outro.pagina == info.pagina && !outro.cpf.equals(info.cpf)
                                && outro.posicaoNaPagina < info.posicaoNaPagina) {
                            isPrimeiroCpfDaPagina = false;
                            break;
                        }
                    }
                    int inicioSecao = isPrimeiroCpfDaPagina ? 0 : Math.max(0, posicaoCpf - 500);
                    int fimSecao = posicaoProximoCpf;
                    info.secaoTexto = pageText.substring(inicioSecao, fimSecao);

                    log.debug("   Seção extraída: {} caracteres (primeiro CPF: {})", info.secaoTexto.length(), isPrimeiroCpfDaPagina);
                }

                log.info("");
                log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                log.info("🔍 ETAPA 3: IDENTIFICANDO SETOR PARA CADA CPF");
                log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

                // ETAPA 3: Identificar setor para cada CPF (já está na seção do texto)

                log.info("");
                log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                log.info("🔍 ETAPA 4: PROCESSANDO CADA HOLERITE COM SEPARAÇÃO");
                log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

                // ETAPA 4: Processar cada holerite
                // Resetar contadores para este arquivo
                paginasProcessadas = 0;
                paginasComErro = 0;
                paginasPuladasPorDuplicidade = 0;

                log.info("🔄 Iniciando processamento de {} holerite(s) encontrado(s)...", holeritesEncontrados.size());

                for (int idx = 0; idx < holeritesEncontrados.size(); idx++) {
                    HoleriteInfo info = holeritesEncontrados.get(idx);
                    log.info("📄 [{}/{}] Processando holerite - CPF: {} (página {})",
                            idx + 1, holeritesEncontrados.size(), info.cpf, info.pagina);

                    try {
                        // Extrair informações do holerite usando a seção do texto
                        Payslip payslip = extractPayslipInfo(info.secaoTexto, info.pagina);

                        // Se a extração com seção do texto falhar em bater o CPF, tentar com o texto completo da página
                        if (payslip == null || payslip.getCpf() == null || !payslip.getCpf().equals(info.cpf)) {
                            log.info("🔄 Tentando extração com texto completo da página {} para CPF {}", info.pagina, info.cpf);
                            Payslip payslipTextoCompleto = extractPayslipInfo(info.textoCompleto, info.pagina);
                            if (payslipTextoCompleto != null && payslipTextoCompleto.getCpf() != null && payslipTextoCompleto.getCpf().equals(info.cpf)) {
                                payslip = payslipTextoCompleto;
                            }
                        }

                        // Verificar se o CPF extraído corresponde
                        if (payslip == null || payslip.getCpf() == null || !payslip.getCpf().equals(info.cpf)) {
                            log.warn("⚠️ CPF extraído ({}) não corresponde ao esperado ({}). Tentando OCR...",
                                    payslip != null && payslip.getCpf() != null ? payslip.getCpf() : "null", info.cpf);
                            payslip = extractPayslipInfoWithOCR(document, info.pagina);
                        }

                        if (payslip != null && payslip.getCpf() != null && payslip.getCpf().equals(info.cpf)) {
                            if (processarHoleriteUnico(document, info.pagina, payslip, info.textoCompleto,
                                    processedPayslips)) {
                                paginasProcessadas++;
                                log.debug("✅ Holerite CPF {} (página {}) processado com sucesso", info.cpf,
                                        info.pagina);
                            } else {
                                paginasPuladasPorDuplicidade++;
                                // NÃO incrementar paginasProcessadas quando pulado por duplicidade
                                // A página já foi processada anteriormente, não deve contar novamente
                                log.debug(
                                        "⏭️ Holerite CPF {} (página {}) pulado por duplicidade - já foi processado anteriormente",
                                        info.cpf, info.pagina);
                            }
                        } else {
                            paginasComErro++;
                            log.warn("⚠️ Não foi possível extrair holerite para CPF {} na página {} - CPF extraído: {}",
                                    info.cpf, info.pagina,
                                    payslip != null && payslip.getCpf() != null ? payslip.getCpf() : "null");
                        }
                    } catch (Exception e) {
                        paginasComErro++;
                        log.error("❌ Erro ao processar holerite CPF {} na página {}: {}",
                                info.cpf, info.pagina, e.getMessage(), e);
                    }
                }

                log.info("✅ Processamento de holerites concluído: {} processados, {} erros, {} duplicidades",
                        paginasProcessadas - paginasPuladasPorDuplicidade, paginasComErro,
                        paginasPuladasPorDuplicidade);

                // VALIDAÇÃO: Verificar se quantidade de holerites processados corresponde à
                // quantidade de páginas
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

                // Validação principal: holerites processados devem ser igual a páginas (menos
                // duplicidades)
                if (holeritesProcessados != paginasEsperadasProcessadas) {
                    log.warn(
                            "⚠️ ATENÇÃO: Quantidade de holerites processados ({}) não corresponde à quantidade esperada ({} páginas - {} duplicidades = {} esperados)",
                            holeritesProcessados, pageCount, paginasPuladasPorDuplicidade, paginasEsperadasProcessadas);
                    log.warn("⚠️ Diferença: {} holerite(s) a mais/menos do esperado",
                            Math.abs(holeritesProcessados - paginasEsperadasProcessadas));

                    if (holeritesProcessados > paginasEsperadasProcessadas) {
                        log.info(
                                "ℹ️ Mais holerites que páginas: Algumas páginas contêm múltiplos holerites (comportamento esperado)");
                    } else if (holeritesProcessados < paginasEsperadasProcessadas) {
                        log.warn(
                                "⚠️ POSSÍVEL CAUSA: Uma ou mais páginas não geraram holerite (erro na extração ou dados inválidos)");
                        log.warn("⚠️ SOLUÇÃO: Verificar logs de erro acima para identificar páginas problemáticas");
                    }
                } else {
                    log.info(
                            "✅ VALIDAÇÃO OK: Quantidade de holerites processados ({}) corresponde à quantidade de páginas processadas ({})",
                            holeritesProcessados, paginasEsperadasProcessadas);
                }

                log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            }

            log.info("🎉 Processamento concluído. {} holerite(s) processado(s) com sucesso de {} página(s) do arquivo",
                    processedPayslips.size(), pageCount);

            // Validação final: garantir que processamos todas as páginas possíveis
            if (processedPayslips.size() < pageCount - paginasComErro - paginasPuladasPorDuplicidade) {
                log.warn("⚠️ ATENÇÃO: Algumas páginas podem não ter sido processadas completamente!");
                log.warn("   Esperado: {} holerites ({} páginas - {} erros - {} duplicidades)",
                        pageCount - paginasComErro - paginasPuladasPorDuplicidade,
                        pageCount, paginasComErro, paginasPuladasPorDuplicidade);
                log.warn("   Processado: {} holerites", processedPayslips.size());
            }

            return processedPayslips;
        } catch (IllegalArgumentException e) {
            // Re-lançar IllegalArgumentException para que o controller possa tratá-la
            log.error("❌ Erro de validação: {}", e.getMessage());
            throw e;
        } catch (IOException e) {
            // Re-lançar IOException conforme a assinatura do método
            log.error("❌ Erro de I/O ao processar arquivo {}: {}",
                    file != null ? file.getOriginalFilename() : "null", e.getMessage(), e);
            throw e;
        } catch (Exception e) {
            // Capturar qualquer outra exceção não esperada
            log.error("❌ ERRO INESPERADO ao processar arquivo {}: {}",
                    file != null ? file.getOriginalFilename() : "null", e.getMessage(), e);
            log.error("   Tipo da exceção: {}", e.getClass().getName());
            // Retornar lista vazia em vez de lançar exceção para não quebrar o
            // processamento de outros arquivos
            return processedPayslips;
        }
    }

    /**
     * Detecta todos os CPFs únicos na página
     * Suporta múltiplos formatos: CPF: 123.456.789-00, CPF 12345678900, etc.
     */
    private List<String> detectarTodosCPFsNaPagina(String pageText) {
        List<String> cpfs = new ArrayList<>();

        // Padrão 1: CPF: 123.456.789-00, C.P.F.: 123.456.789-00, CPF/MF: 12345678900, etc.
        // Melhorado para capturar CPF com rótulos variados e com/sem formatação
        Pattern cpfPattern1 = Pattern.compile("(?:CPF|C\\.P\\.F\\.|CPF/MF|DOC)[:\\s]*([0-9]{3}\\.?[0-9]{3}\\.?[0-9]{3}-?[0-9]{2}|[0-9]{11})",
                Pattern.CASE_INSENSITIVE);
        Matcher matcher1 = cpfPattern1.matcher(pageText);

        while (matcher1.find()) {
            String cpf = matcher1.group(1).replaceAll("[^0-9]", "");
            if (cpf.length() == 11 && !cpfs.contains(cpf)) {
                cpfs.add(cpf);
                log.info("✅ CPF detectado (padrão 1): {} (contexto: '{}')", cpf,
                        matcher1.group(0).substring(0, Math.min(50, matcher1.group(0).length())));
            }
        }

        // Padrão 2: Apenas números de 11 dígitos (pode ser CPF sem rótulo)
        // Mas apenas se não estiver dentro de um CNPJ (14 dígitos)
        Pattern cpfPattern2 = Pattern.compile("(?<!\\d)([0-9]{11})(?!\\d)");
        Matcher matcher2 = cpfPattern2.matcher(pageText);

        while (matcher2.find()) {
            String cpf = matcher2.group(1);
            // Verificar se não é parte de um CNPJ (14 dígitos)
            int start = matcher2.start();
            int end = matcher2.end();
            if (start > 0 && end < pageText.length()) {
                // Verificar contexto: se há "CNPJ" próximo, pode ser parte de CNPJ
                String contexto = pageText.substring(Math.max(0, start - 20), Math.min(pageText.length(), end + 20));
                if (!contexto.toUpperCase().contains("CNPJ") && !cpfs.contains(cpf)) {
                    // Validar se parece um CPF válido (não todos zeros, não sequencial)
                    if (!cpf.matches("0{11}|1{11}|2{11}|3{11}|4{11}|5{11}|6{11}|7{11}|8{11}|9{11}")) {
                        cpfs.add(cpf);
                        log.debug("✅ CPF detectado (padrão 2 - sem rótulo): {}", cpf);
                    }
                }
            }
        }

        // Padrão 3: CPF formatado com pontos e traço: 123.456.789-00 (sem rótulo CPF)
        Pattern cpfPattern3 = Pattern.compile("([0-9]{3}\\.[0-9]{3}\\.[0-9]{3}-[0-9]{2})");
        Matcher matcher3 = cpfPattern3.matcher(pageText);

        while (matcher3.find()) {
            String cpf = matcher3.group(1).replaceAll("[^0-9]", "");
            if (cpf.length() == 11 && !cpfs.contains(cpf)) {
                cpfs.add(cpf);
                log.debug("✅ CPF detectado (padrão 3 - formatado): {}", cpf);
            }
        }

        log.info("🔍 Total de CPFs únicos detectados na página: {}", cpfs.size());
        return cpfs;
    }

    /**
     * Extrai informações do holerite para um CPF específico
     * Quando há múltiplos holerites na mesma página, divide o texto em seções
     * e extrai apenas a seção correspondente ao CPF alvo
     */
    private Payslip extractPayslipInfoPorCPF(String text, int pageNumber, String cpfAlvo) {
        log.info("🔍 Extraindo holerite para CPF específico: {} na página {}", cpfAlvo, pageNumber);

        // Se o texto contém múltiplos CPFs, dividir em seções
        List<String> cpfsEncontrados = detectarTodosCPFsNaPagina(text);

        if (cpfsEncontrados.size() > 1) {
            log.info("📄 Múltiplos CPFs detectados na página {}: {}. Dividindo texto em seções...", pageNumber,
                    cpfsEncontrados);

            // Encontrar a posição do CPF alvo no texto
            String cpfAlvoFormatado = cpfAlvo.replaceAll("(\\d{3})(\\d{3})(\\d{3})(\\d{2})", "$1.$2.$3-$4");
            String cpfAlvoSemFormatacao = cpfAlvo;

            // Procurar por diferentes formatos do CPF
            Pattern[] cpfPatterns = {
                    Pattern.compile("CPF[:\\s]*" + cpfAlvoFormatado.replace(".", "\\.").replace("-", "\\-")),
                    Pattern.compile("CPF[:\\s]*" + cpfAlvoSemFormatacao),
                    Pattern.compile(cpfAlvoFormatado.replace(".", "\\.").replace("-", "\\-")),
                    Pattern.compile(cpfAlvoSemFormatacao)
            };

            int posicaoCpfAlvo = -1;
            for (Pattern pattern : cpfPatterns) {
                Matcher matcher = pattern.matcher(text);
                if (matcher.find()) {
                    posicaoCpfAlvo = matcher.start();
                    log.debug("✅ CPF alvo encontrado na posição {} usando padrão: {}", posicaoCpfAlvo,
                            pattern.pattern());
                    break;
                }
            }

            if (posicaoCpfAlvo == -1) {
                log.warn("⚠️ CPF alvo {} não encontrado no texto. Tentando extração completa...", cpfAlvo);
                Payslip payslip = extractPayslipInfo(text, pageNumber);
                // Verificar se o CPF extraído corresponde
                if (payslip != null && payslip.getCpf() != null && payslip.getCpf().equals(cpfAlvo)) {
                    return payslip;
                }
                return null;
            }

            // Encontrar a posição do próximo CPF (ou fim do texto)
            int posicaoProximoCpf = text.length();
            for (String outroCpf : cpfsEncontrados) {
                if (!outroCpf.equals(cpfAlvo)) {
                    String outroCpfFormatado = outroCpf.replaceAll("(\\d{3})(\\d{3})(\\d{3})(\\d{2})", "$1.$2.$3-$4");
                    Pattern outroCpfPattern = Pattern
                            .compile("CPF[:\\s]*" + outroCpfFormatado.replace(".", "\\.").replace("-", "\\-"));
                    Matcher outroMatcher = outroCpfPattern.matcher(text);
                    while (outroMatcher.find()) {
                        int pos = outroMatcher.start();
                        if (pos > posicaoCpfAlvo && pos < posicaoProximoCpf) {
                            posicaoProximoCpf = pos;
                        }
                    }
                }
            }

            // Extrair apenas a seção do texto correspondente ao CPF alvo
            // Incluir um pouco antes do CPF para pegar contexto (ex: nome, código)
            int inicioSecao = Math.max(0, posicaoCpfAlvo - 500);
            int fimSecao = posicaoProximoCpf;
            String secaoTexto = text.substring(inicioSecao, fimSecao);

            log.info("📄 Seção extraída para CPF {}: {} caracteres (posição {} a {})",
                    cpfAlvo, secaoTexto.length(), inicioSecao, fimSecao);
            log.debug("📄 Conteúdo da seção (primeiros 500 chars): {}",
                    secaoTexto.length() > 500 ? secaoTexto.substring(0, 500) + "..." : secaoTexto);

            // Extrair informações apenas desta seção
            Payslip payslip = extractPayslipInfo(secaoTexto, pageNumber);

            // Verificar se o CPF extraído corresponde ao alvo
            if (payslip != null && payslip.getCpf() != null && payslip.getCpf().equals(cpfAlvo)) {
                log.info("✅ Holerite extraído com sucesso para CPF {}", cpfAlvo);
                return payslip;
            } else {
                log.warn("⚠️ CPF extraído ({}) não corresponde ao alvo ({}). Tentando extração completa...",
                        payslip != null && payslip.getCpf() != null ? payslip.getCpf() : "null", cpfAlvo);
                // Fallback: tentar extração completa mas verificar CPF
                payslip = extractPayslipInfo(text, pageNumber);
                if (payslip != null && payslip.getCpf() != null && payslip.getCpf().equals(cpfAlvo)) {
                    return payslip;
                }
                return null;
            }
        } else {
            // Apenas um CPF na página, extrair normalmente
            Payslip payslip = extractPayslipInfo(text, pageNumber);
            if (payslip != null && payslip.getCpf() != null && payslip.getCpf().equals(cpfAlvo)) {
                return payslip;
            }
            return payslip;
        }
    }

    /**
     * Processa um holerite único (usado tanto para holerite único quanto para
     * múltiplos)
     * 
     * @return true se o holerite foi processado, false se foi pulado por
     *         duplicidade
     */
    private boolean processarHoleriteUnico(PDDocument document, int pageNumber, Payslip payslip, String pageText,
            List<Payslip> processedPayslips) {
        try {
            if (payslip == null || payslip.getEmployeeName() == null || payslip.getEmployeeName().equals("Desconhecido")
                    || payslip.getCpf() == null) {
                log.warn("⚠️ Holerite inválido - não será processado");
                return false;
            }

            // Verificar se os dados da tabela foram extraídos
            if (payslip.getTableDetails() == null || payslip.getTableDetails().isEmpty()) {
                log.warn(
                        "⚠️ PDFBox extraiu dados básicos mas não encontrou dados da tabela. Tentando re-extrair tabela do texto...");
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
                    List<Payslip> holeritesExistentes = payslipRepository
                            .findByCompanyCnpjAndCpfAndWorkPostNameAndMonthAndYear(
                                    payslip.getCompanyCnpj(),
                                    payslip.getCpf(),
                                    payslip.getWorkPostName(),
                                    payslip.getMonth(),
                                    payslip.getYear());

                    if (!holeritesExistentes.isEmpty()) {
                        // Filtrar apenas holerites que ainda existem fisicamente (não foram excluídos)
                        List<Payslip> holeritesExistentesNaoExcluidos = holeritesExistentes.stream()
                                .filter(p -> {
                                    try {
                                        boolean exists = p.getArquivoCaminho() != null &&
                                                java.nio.file.Files
                                                        .exists(java.nio.file.Paths.get(p.getArquivoCaminho()));
                                        if (!exists) {
                                            log.debug(
                                                    "   ⚠️ Holerite ID {} foi excluído fisicamente, ignorando na verificação de duplicatas",
                                                    p.getId());
                                        }
                                        return exists;
                                    } catch (Exception e) {
                                        log.warn("   ⚠️ Erro ao verificar arquivo físico do holerite ID {}: {}",
                                                p.getId(), e.getMessage());
                                        return false;
                                    }
                                })
                                .collect(java.util.stream.Collectors.toList());

                        if (holeritesExistentesNaoExcluidos.isEmpty()) {
                            log.info(
                                    "✅ Todos os holerites existentes foram excluídos fisicamente - permitindo processamento");
                        } else {
                            log.info(
                                    "🔍 {} holerite(s) já processado(s) e não excluído(s) encontrado(s) para CPF: {}, Empresa: {}, Setor: {}, Período: {}/{}",
                                    holeritesExistentesNaoExcluidos.size(),
                                    payslip.getCpf(),
                                    payslip.getCompanyCnpj() != null ? payslip.getCompanyCnpj() : "não informado",
                                    payslip.getWorkPostName() != null ? payslip.getWorkPostName() : "não informado",
                                    payslip.getMonth(),
                                    payslip.getYear());

                            // Usar apenas holerites não excluídos para comparação
                            holeritesExistentes = holeritesExistentesNaoExcluidos;
                        }
                    }

                    if (!holeritesExistentes.isEmpty()) {

                        // Calcular hash do arquivo PDF da página atual para comparar com arquivo
                        // original
                        // IMPORTANTE: Usar hash do PDF (bytes) em vez de hash do texto para comparação
                        // mais confiável
                        String hashPaginaAtual = calculatePagePdfHash(document, pageNumber);
                        if (hashPaginaAtual == null) {
                            // Fallback: usar hash do texto se não conseguir calcular do PDF
                            log.warn("⚠️ Não foi possível calcular hash do PDF, usando hash do texto como fallback");
                            hashPaginaAtual = calculatePageHash(pageText);
                        }
                        log.debug("🔐 Hash da página atual (PDF): {}",
                                hashPaginaAtual != null
                                        ? hashPaginaAtual.substring(0, Math.min(16, hashPaginaAtual.length())) + "..."
                                        : "null");

                        // Comparar com o holerite mais recente (primeiro da lista ordenada por
                        // processedAt DESC)
                        Payslip holeriteExistente = holeritesExistentes.get(0);
                        log.info(
                                "📄 Comparando com holerite existente mais recente: ID={}, Versão={}, Arquivo={}, Processado em: {}",
                                holeriteExistente.getId(),
                                holeriteExistente.getVersao() != null ? holeriteExistente.getVersao() : "N/A",
                                holeriteExistente.getFileName(),
                                holeriteExistente.getProcessedAt());

                        // IMPORTANTE: Sempre recalcular hash do arquivo PDF salvo para garantir
                        // comparação correta
                        // Não usar hash do banco porque pode ter sido calculado do texto (método
                        // antigo)
                        // Sempre comparar hash do PDF (bytes) com hash do PDF (bytes)
                        String hashArquivoOriginal = getPayslipFileHash(holeriteExistente);
                        if (hashArquivoOriginal == null) {
                            // Se não conseguir calcular do arquivo, tentar usar do banco como fallback
                            hashArquivoOriginal = holeriteExistente.getHashConteudo();
                            log.warn(
                                    "⚠️ Não foi possível calcular hash do arquivo PDF salvo, usando hash do banco como fallback");
                        } else {
                            log.info(
                                    "🔐 Hash recalculado do arquivo PDF salvo: {}... (garantindo comparação PDF vs PDF)",
                                    hashArquivoOriginal.substring(0, Math.min(16, hashArquivoOriginal.length())));
                        }

                        if (hashArquivoOriginal == null || hashArquivoOriginal.isEmpty()) {
                            log.warn(
                                    "⚠️ Hash do arquivo original não disponível - não será possível verificar duplicidade por hash");
                        } else {
                            log.info("🔐 Hash da página atual (PDF): {}...",
                                    hashPaginaAtual != null
                                            ? hashPaginaAtual.substring(0, Math.min(16, hashPaginaAtual.length()))
                                            : "null");
                            log.info("🔐 Hash do arquivo original (PDF): {}...",
                                    hashArquivoOriginal.substring(0, Math.min(16, hashArquivoOriginal.length())));
                            if (hashPaginaAtual != null && hashArquivoOriginal != null) {
                                if (hashPaginaAtual.equals(hashArquivoOriginal)) {
                                    log.info("✅ HASHES IDÊNTICOS - Arquivo PDF não foi modificado");
                                } else {
                                    log.warn(
                                            "⚠️ HASHES DIFERENTES - Arquivo PDF foi modificado ou há diferença nos metadados");
                                }
                            }
                        }

                        // Comparar dados extraídos e hash do arquivo
                        log.info("🔍 Iniciando comparação detalhada de holerites...");
                        log.info("   📊 Holerite EXISTENTE:");
                        log.info("      - Vencimentos: {}", holeriteExistente.getTotalEarnings());
                        log.info("      - Descontos: {}", holeriteExistente.getTotalDeductions());
                        log.info("      - Líquido: {}", holeriteExistente.getNetValue());
                        log.info("      - TableDetails: {} linha(s)",
                                holeriteExistente.getTableDetails() != null ? holeriteExistente.getTableDetails().size()
                                        : 0);
                        log.info("   📊 Holerite NOVO:");
                        log.info("      - Vencimentos: {}", payslip.getTotalEarnings());
                        log.info("      - Descontos: {}", payslip.getTotalDeductions());
                        log.info("      - Líquido: {}", payslip.getNetValue());
                        log.info("      - TableDetails: {} linha(s)",
                                payslip.getTableDetails() != null ? payslip.getTableDetails().size() : 0);

                        PayslipComparisonResult comparacao = comparePayslips(holeriteExistente, payslip,
                                hashArquivoOriginal, hashPaginaAtual);

                        log.info("🔍 Resultado da comparação: hasChanges={}, total de diferenças={}",
                                comparacao.hasChanges(), comparacao.getDifferences().size());

                        if (comparacao.hasChanges()) {
                            log.warn("📝 ⚠️ ALTERAÇÕES FINANCEIRAS DETECTADAS no holerite! Criando nova versão...");
                            log.warn("📋 Diferenças encontradas ({}):", comparacao.getDifferences().size());
                            for (int idx = 0; idx < comparacao.getDifferences().size(); idx++) {
                                log.warn("   {}. {}", idx + 1, comparacao.getDifferences().get(idx));
                            }

                            // IMPORTANTE: A versão anterior será MANTIDA no banco e no sistema de arquivos
                            // Uma NOVA versão será criada automaticamente em organizarEmPastas()
                            // baseada nas versões existentes no mesmo caminho (versão máxima + 1)
                            log.info("🔄 Nova versão será criada automaticamente durante organização em pastas");
                            log.info("   ✅ Versão anterior será preservada - não será excluída ou sobrescrita");
                            log.info("   📁 Novo arquivo será salvo como: holerite_v{N+1}.pdf");
                            log.info("   💾 Novo registro será criado no banco mantendo todos os registros anteriores");
                        } else {
                            log.warn(
                                    "⚠️ NENHUMA ALTERAÇÃO DETECTADA - Verificando se valores financeiros ou tableDetails estão sendo comparados corretamente...");
                            log.warn(
                                    "   Se houver diferenças visíveis nos valores, pode ser um problema na extração ou comparação");
                            log.warn("   Valores comparados:");
                            log.warn("      Vencimentos: {} vs {}", holeriteExistente.getTotalEarnings(),
                                    payslip.getTotalEarnings());
                            log.warn("      Descontos: {} vs {}", holeriteExistente.getTotalDeductions(),
                                    payslip.getTotalDeductions());
                            log.warn("      Líquido: {} vs {}", holeriteExistente.getNetValue(), payslip.getNetValue());
                            log.warn("      TableDetails: {} vs {} linhas",
                                    holeriteExistente.getTableDetails() != null
                                            ? holeriteExistente.getTableDetails().size()
                                            : 0,
                                    payslip.getTableDetails() != null ? payslip.getTableDetails().size() : 0);
                            String msg = String.format(
                                    "Holerite idêntico já processado. Não há alterações detectadas. Empresa CNPJ %s, CPF %s, Setor %s, mês %d, ano %d. Pulando página %d.",
                                    payslip.getCompanyCnpj() != null ? payslip.getCompanyCnpj() : "não informado",
                                    payslip.getCpf(),
                                    payslip.getWorkPostName() != null ? payslip.getWorkPostName() : "não informado",
                                    payslip.getMonth(),
                                    payslip.getYear(),
                                    pageNumber);
                            log.warn(msg);
                            return false; // Retornar false indicando que foi pulado por duplicidade
                        }
                    } else {
                        log.info(
                                "✅ Holerite não duplicado - permitindo importação (Empresa CNPJ: {}, CPF: {}, Setor: {}, Período: {}/{})",
                                payslip.getCompanyCnpj() != null ? payslip.getCompanyCnpj() : "não informado",
                                payslip.getCpf(),
                                payslip.getWorkPostName() != null ? payslip.getWorkPostName() : "não informado",
                                payslip.getMonth(),
                                payslip.getYear());
                    }
                } catch (Exception e) {
                    log.warn("⚠️ Erro ao verificar duplicidade e comparar holerites, continuando processamento: {}",
                            e.getMessage(), e);
                }

                // Organizar em pastas e salvar PDF individual (já define versao, hash_conteudo,
                // arquivo_caminho)
                organizarEmPastas(document, pageNumber, payslip);

                // Salvar dados extraídos na tabela tb_extract_data_holerites
                salvarDadosExtraidos(payslip);

                // Save to payslip database (versao, hash_conteudo e arquivo_caminho já foram
                // definidos em organizarEmPastas)
                payslip = payslipRepository.save(payslip);
                processedPayslips.add(payslip);

                log.info("✅ Holerite salvo: ID={}, Versão={}, Hash={}...",
                        payslip.getId(),
                        payslip.getVersao(),
                        payslip.getHashConteudo() != null
                                ? payslip.getHashConteudo().substring(0,
                                        Math.min(16, payslip.getHashConteudo().length()))
                                : "N/A");

                // === CRIAÇÃO AUTOMÁTICA DE USUÁRIO ===
                try {
                    createUserFromPayslip(payslip);
                } catch (Exception userException) {
                    log.warn("⚠️ Erro ao criar usuário automático para {}: {}", payslip.getEmployeeName(),
                            userException.getMessage());
                    // Não interromper processamento por erro na criação de usuário
                }

                log.info("✅ Holerite processado com sucesso: {} (CPF: {})", payslip.getEmployeeName(),
                        payslip.getCpf());
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
            log.warn(
                    "⚠️ Texto extraído é muito curto ({} caracteres) para página {} via {}. Pode indicar PDF escaneado ou corrompido.",
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
        // IMPORTANTE: Cada página contém as duas vias do holerite (frente e verso do
        // mesmo funcionário)
        // Portanto, deve haver apenas 1 CPF único por página. Se houver múltiplos, usar
        // apenas o primeiro.
        // Melhorado para capturar CPF com ou sem formatação: "CPF: 12724178670" ou
        // "CPF: 127.241.786-70"
        Pattern cpfPattern = Pattern.compile("CPF[:\\s]*([0-9]{3}\\.?[0-9]{3}\\.?[0-9]{3}-?[0-9]{2}|[0-9]{11})",
                Pattern.CASE_INSENSITIVE);

        // Contar quantos CPFs diferentes foram encontrados na página
        Set<String> cpfsEncontrados = new HashSet<>();

        for (int linhaIndex = 0; linhaIndex < linhas.length; linhaIndex++) {
            String linha = linhas[linhaIndex];
            Matcher cpfMatcher = cpfPattern.matcher(linha);
            if (cpfMatcher.find()) {
                String cpfEncontrado = cpfMatcher.group(1).replaceAll("[^0-9]", "");
                if (cpfEncontrado.length() == 11) {
                    cpfsEncontrados.add(cpfEncontrado);

                    // Usar apenas o PRIMEIRO CPF encontrado (frente e verso têm o mesmo CPF)
                    if (cpf == null) {
                        cpf = cpfEncontrado;
                        log.info("✅ CPF encontrado (primeiro): {} na linha {}: '{}'", cpf, linhaIndex + 1,
                                linha.trim());

                        // Na linha do CPF, tentar extrair código e nome
                        String linhaCpf = linha.trim();

                        // IMPORTANTE: Se não encontrar nome na mesma linha, tentar linha anterior
                        // (estrutura comum: linha anterior tem matrícula e nome, linha atual tem CPF)
                        String linhaAnterior = (linhaIndex > 0) ? linhas[linhaIndex - 1].trim() : null;

                        // PADRÃO 2a (TESTAR PRIMEIRO - mais flexível): CODIGO NOME CPF ou NOME CPF
                        // Este padrão captura tudo antes de CPF e depois separa código e nome
                        // Funciona para casos como:
                        // - "000230 JEREMIAS DA COSTA ALMEIDA CPF: 12724178670"
                        // - "MARCO TULIO MENEZES CPF: 11396510648"
                        int cpfIndex2 = linhaCpf.toUpperCase().indexOf("CPF");
                        if (cpfIndex2 > 5) {
                            String textoAntesCpf = linhaCpf.substring(0, cpfIndex2).trim().replaceAll("\\s+", " ");
                            log.debug("🔍 Padrão 2a - Linha completa: '{}'", linhaCpf);
                            log.debug("🔍 Padrão 2a - Texto antes de CPF: '{}'", textoAntesCpf);

                            // Verificar se há código no início (4-6 dígitos)
                            Pattern codigoPattern = Pattern.compile("^(\\d{4,6})\\s+(.+)$");
                            Matcher codigoMatcher = codigoPattern.matcher(textoAntesCpf);
                            String nomeCandidate;

                            if (codigoMatcher.find()) {
                                // Há código no início, extrair código e nome
                                codigo = codigoMatcher.group(1).trim();
                                nomeCandidate = codigoMatcher.group(2).trim();
                                log.debug("🔍 Padrão 2a - Código encontrado: '{}', Nome: '{}'", codigo, nomeCandidate);
                            } else {
                                // Não há código, usar todo o texto como nome
                                nomeCandidate = textoAntesCpf;
                                log.debug("🔍 Padrão 2a - Sem código, usando todo o texto como nome: '{}'",
                                        nomeCandidate);
                            }

                            // Validar se é um nome válido (pelo menos 5 caracteres, contém letras)
                            if (nomeCandidate.length() >= 5
                                    && nomeCandidate.matches(".*[A-ZÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ].*")) {
                                boolean isValid = isValidEmployeeName(nomeCandidate);
                                log.debug("🔍 Padrão 2a - Validação do nome '{}': isValid={}", nomeCandidate, isValid);

                                if (isValid) {
                                    nome = nomeCandidate.toUpperCase();
                                    log.info("✅ Padrão 2a - Código: {}, Nome: {} (extraído de tudo antes de CPF)",
                                            codigo, nome);
                                    break;
                                } else {
                                    // Se isValidEmployeeName falhou, mas o nome parece válido (tem pelo menos 2
                                    // palavras),
                                    // aceitar mesmo assim (pode ser um caso edge)
                                    String[] palavras = nomeCandidate.split("\\s+");
                                    if (palavras.length >= 2 && palavras[0].length() >= 3) {
                                        nome = nomeCandidate.toUpperCase();
                                        log.warn(
                                                "⚠️ Padrão 2a - Nome aceito mesmo com validação falhando (parece válido): Código: {}, Nome: {}",
                                                codigo, nome);
                                        break;
                                    }
                                }
                            } else {
                                log.debug("🔍 Padrão 2a - Nome candidato rejeitado: comprimento={}, tem letras={}",
                                        nomeCandidate.length(),
                                        nomeCandidate.matches(".*[A-ZÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ].*"));
                            }
                        }

                        // Padrão 1: CODIGO NOME CPF (ex: 000044 ELAINE APARECIDA SOARES PEREIRA CPF:
                        // 073.495.276-75)
                        // Melhorado para aceitar CPF: ou CPF (com ou sem dois pontos)
                        // IMPORTANTE: Usar .+? (non-greedy) mas garantir que capture até o CPF
                        Pattern linhaCompleta1 = Pattern.compile("(\\d{4,6})\\s+(.+?)\\s+CPF[:\\s]",
                                Pattern.CASE_INSENSITIVE);
                        Matcher lineMatch1 = linhaCompleta1.matcher(linhaCpf);
                        if (lineMatch1.find()) {
                            codigo = lineMatch1.group(1).trim();
                            String nomeCandidate = lineMatch1.group(2).trim().replaceAll("\\s+", " ");

                            // Log detalhado para debug
                            log.debug("🔍 Padrão 1 - Linha completa: '{}'", linhaCpf);
                            log.debug("🔍 Padrão 1 - Código extraído: '{}'", codigo);
                            log.debug("🔍 Padrão 1 - Nome candidato: '{}'", nomeCandidate);

                            if (isValidEmployeeName(nomeCandidate)) {
                                nome = nomeCandidate.toUpperCase();
                                log.info("✅ Padrão 1 - Código: {}, Nome: {}", codigo, nome);
                                break;
                            } else {
                                log.warn(
                                        "⚠️ Padrão 1 - Nome candidato '{}' não passou na validação isValidEmployeeName",
                                        nomeCandidate);
                            }
                        }

                        // Padrão 2: NOME CPF (sem código no início) - melhorado para capturar melhor
                        // Aceita múltiplos espaços e diferentes formatos
                        Pattern linhaCompleta2 = Pattern.compile(
                                "([A-ZÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ][A-ZÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ\\s]{4,}?)\\s{1,}CPF",
                                Pattern.CASE_INSENSITIVE);
                        Matcher lineMatch2 = linhaCompleta2.matcher(linhaCpf);
                        if (lineMatch2.find()) {
                            String nomeCandidate = lineMatch2.group(1).trim().replaceAll("\\s+", " ");
                            if (isValidEmployeeName(nomeCandidate)) {
                                nome = nomeCandidate.toUpperCase();
                                log.info("✅ Padrão 2 - Nome: {} (sem código)", nome);
                                break;
                            }
                        }

                        // Padrão 2c: CODIGO NOME CPF (formato: 000224 MARCO TULIO MENEZES CPF:
                        // 11396510648)
                        // Este padrão é mais específico para quando há código antes do nome
                        Pattern linhaCompleta3 = Pattern.compile(
                                "(\\d{4,6})\\s+([A-ZÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ][A-ZÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ\\s]{4,}?)\\s+CPF",
                                Pattern.CASE_INSENSITIVE);
                        Matcher lineMatch3 = linhaCompleta3.matcher(linhaCpf);
                        if (lineMatch3.find()) {
                            codigo = lineMatch3.group(1).trim();
                            String nomeCandidate = lineMatch3.group(2).trim().replaceAll("\\s+", " ");
                            if (isValidEmployeeName(nomeCandidate)) {
                                nome = nomeCandidate.toUpperCase();
                                log.info("✅ Padrão 2c - Código: {}, Nome: {} (com código antes do nome)", codigo, nome);
                                break;
                            }
                        }

                        // Se não encontrou nome na mesma linha, tentar linha anterior
                        // Estrutura comum: linha anterior = "000224 MARCO TULIO MENEZES", linha atual =
                        // "CPF: 11396510648"
                        if (nome.equals("Desconhecido") && linhaAnterior != null && !linhaAnterior.isEmpty()) {
                            log.info("🔍 Nome não encontrado na linha do CPF, tentando linha anterior: {}",
                                    linhaAnterior);

                            // Padrão: MATRÍCULA NOME (ex: 000224 MARCO TULIO MENEZES)
                            Pattern linhaAnteriorPattern = Pattern.compile("(\\d{4,6})\\s+(.+)",
                                    Pattern.CASE_INSENSITIVE);
                            Matcher linhaAnteriorMatch = linhaAnteriorPattern.matcher(linhaAnterior);
                            if (linhaAnteriorMatch.find()) {
                                codigo = linhaAnteriorMatch.group(1).trim();
                                String nomeCandidate = linhaAnteriorMatch.group(2).trim().replaceAll("\\s+", " ");
                                // Remover possíveis sufixos como "CPF", "CNPJ", etc.
                                nomeCandidate = nomeCandidate.replaceAll("\\s+(CPF|CNPJ|MATRICULA|MATRÍCULA).*$", "")
                                        .trim();
                                if (nomeCandidate.length() >= 5 && isValidEmployeeName(nomeCandidate)) {
                                    nome = nomeCandidate.toUpperCase();
                                    log.info("✅ Nome encontrado na linha anterior - Código: {}, Nome: {}", codigo,
                                            nome);
                                    break;
                                }
                            }

                            // Padrão alternativo: apenas NOME (sem matrícula)
                            // Verificar se a linha anterior parece ser um nome
                            if (nome.equals("Desconhecido")) {
                                String nomeCandidate = linhaAnterior
                                        .replaceAll("\\s+(CPF|CNPJ|MATRICULA|MATRÍCULA).*$", "").trim();
                                // Verificar se não contém números (exceto se for parte do nome)
                                if (nomeCandidate.length() >= 5 &&
                                        !nomeCandidate.matches(".*\\d{4,}.*") && // Não deve ter sequências de 4+
                                                                                 // dígitos
                                        nomeCandidate.matches(".*[A-ZÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ].*") &&
                                        isValidEmployeeName(nomeCandidate)) {
                                    nome = nomeCandidate.toUpperCase();
                                    log.info("✅ Nome encontrado na linha anterior (sem matrícula): {}", nome);
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }

        // Validação: Se foram encontrados múltiplos CPFs diferentes na mesma página,
        // avisar
        if (cpfsEncontrados.size() > 1) {
            log.warn("⚠️ ATENÇÃO: Foram encontrados {} CPF(s) diferente(s) na página {}: {}",
                    cpfsEncontrados.size(), pageNumber, cpfsEncontrados);
            log.warn("⚠️ Usando apenas o primeiro CPF encontrado: {} (frente e verso devem ter o mesmo CPF)", cpf);
            log.warn("⚠️ Esta página pode conter múltiplos holerites de funcionários diferentes ou formato inesperado");
            log.warn(
                    "⚠️ VERIFICAÇÃO: Cada página deve conter apenas as duas vias (frente e verso) do MESMO funcionário");
        } else if (cpfsEncontrados.size() == 1 && cpf != null) {
            log.info(
                    "✅ Validação OK: Apenas 1 CPF único encontrado na página {}: {} (confirma que a página contém apenas as duas vias do mesmo funcionário)",
                    pageNumber, cpf);
        } else if (cpfsEncontrados.size() == 0) {
            log.warn("⚠️ Nenhum CPF encontrado na página {} - pode indicar problema na extração do texto", pageNumber);
        }

        // 1.5. EXTRAÇÃO DO CNPJ DA EMPRESA
        Pattern cnpjPattern = Pattern
                .compile("CNPJ[:\\s]*([0-9]{2}\\.?[0-9]{3}\\.?[0-9]{3}/?[0-9]{4}-?[0-9]{2}|[0-9]{14})");
        for (String linhaCnpj : linhas) {
            Matcher cnpjMatcher = cnpjPattern.matcher(linhaCnpj);
            if (cnpjMatcher.find()) {
                empresaCnpj = cnpjMatcher.group(1).replaceAll("[^0-9]", "");
                log.info("✅ CNPJ da empresa encontrado: {} na linha: {}", empresaCnpj, linhaCnpj.trim());

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
                String linhaCnpjFallback = linhas[i];
                Matcher fallbackMatcher = fallbackCnpjPattern.matcher(linhaCnpjFallback.replaceAll("\\s+", ""));
                if (fallbackMatcher.find()) {
                    empresaCnpj = fallbackMatcher.group(1);
                    log.info("✅ CNPJ (fallback) encontrado: {} na linha {}", empresaCnpj, linhaCnpjFallback.trim());

                    // Tentar capturar o nome da empresa na mesma linha (removendo números)
                    if (empresaNome == null) {
                        String possibleName = linhaCnpjFallback.replaceAll("\\d", " ").replaceAll("\\s+", " ").trim();
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
            String linhaEmpresa = linhas[i].trim();
            String linhaUpper = linhaEmpresa.toUpperCase();

            // Se encontrar CNPJ na linha, tentar pegar nome da linha anterior ou mesma
            // linha
            if (linhaUpper.contains("CNPJ") && empresaNome == null) {
                // Tentar extrair nome da mesma linha (antes do CNPJ)
                int cnpjIndex = linhaUpper.indexOf("CNPJ");
                if (cnpjIndex > 10) { // Se há texto suficiente antes
                    String possibleName = linhaEmpresa.substring(0, cnpjIndex).trim();
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

            // Procurar por linhas com "LTDA", "S.A", "ME", etc. que geralmente indicam nome
            // de empresa
            if (empresaNome == null && (linhaUpper.contains("LTDA") || linhaUpper.contains("S.A") ||
                    linhaUpper.contains(" ME ") || linhaUpper.contains("EIRELI")) &&
                    !linhaUpper.contains("FUNCIONARIO") && !linhaUpper.contains("CPF") &&
                    linhaEmpresa.length() > 10 && linhaEmpresa.length() < 150) {
                empresaNome = linhaEmpresa;
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
                    for (int j = Math.max(0, i - 3); j <= Math.min(linhas.length - 1, i + 3); j++) {
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
            String linhaPeriodo = linhas[idx];
            Matcher periodoMatcher = periodoPattern1.matcher(linhaPeriodo);
            if (periodoMatcher.find()) {
                mes = periodoMatcher.group(5); // mês da data final (período de referência)
                ano = periodoMatcher.group(6); // ano da data final (período de referência)
                log.info("✅ Período de referência encontrado (padrão 1): {}/{} - Linha: {}", mes, ano,
                        linhaPeriodo.trim());
                workPostName = findWorkPostName(linhas, idx, linhaPeriodo.substring(periodoMatcher.end()));
                break;
            }
        }

        // Padrão 2: "DD/MM/AAAA a DD/MM/AAAA" com espaços diferentes
        if (mes == null || ano == null) {
            Pattern periodoPattern1b = Pattern.compile("(\\d{2})/(\\d{2})/(\\d{4})\\s+à\\s+(\\d{2})/(\\d{2})/(\\d{4})");
            for (int idx = 0; idx < linhas.length; idx++) {
                String linhaPeriodo1b = linhas[idx];
                Matcher periodoMatcher = periodoPattern1b.matcher(linhaPeriodo1b);
                if (periodoMatcher.find()) {
                    mes = periodoMatcher.group(5);
                    ano = periodoMatcher.group(6);
                    log.info("✅ Período de referência encontrado (padrão 1b): {}/{} - Linha: {}", mes, ano,
                            linhaPeriodo1b.trim());
                    if (workPostName == null) {
                        workPostName = findWorkPostName(linhas, idx, linhaPeriodo1b.substring(periodoMatcher.end()));
                    }
                    break;
                }
            }
        }

        // Padrão 3: "MM/AAAA" direto - encontrar a última ocorrência quando há
        // múltiplas datas
        if (mes == null || ano == null) {
            Pattern periodoPattern2 = Pattern.compile("(\\d{2})/(\\d{4})");
            for (int idx = 0; idx < linhas.length; idx++) {
                String linhaPeriodo2 = linhas[idx];
                Matcher periodoMatcher = periodoPattern2.matcher(linhaPeriodo2);
                String lastMatch = null;
                int lastEnd = -1;
                // Encontrar a última ocorrência do padrão na linha
                while (periodoMatcher.find()) {
                    lastMatch = periodoMatcher.group(1) + "/" + periodoMatcher.group(2);
                    lastEnd = periodoMatcher.end();
                }
                if (lastMatch != null && lastEnd > 0) {
                    // Extrair mês e ano da última ocorrência
                    String[] parts = lastMatch.split("/");
                    mes = parts[0];
                    ano = parts[1];
                    log.info("✅ Período de referência encontrado (padrão 2): {}/{} - Linha: {}", mes, ano,
                            linhaPeriodo2.trim());
                    if (workPostName == null) {
                        workPostName = findWorkPostName(linhas, idx, linhaPeriodo2.substring(lastEnd));
                    }
                    break;
                }
            }
        }

        // Padrão 4: "DD/MM/AAAA" (data única - usar o mês/ano dessa data)
        if (mes == null || ano == null) {
            Pattern periodoPattern3 = Pattern.compile("(\\d{2})/(\\d{2})/(\\d{4})");
            for (int idx = 0; idx < linhas.length; idx++) {
                String linhaPeriodo3 = linhas[idx];
                Matcher periodoMatcher = periodoPattern3.matcher(linhaPeriodo3);
                if (periodoMatcher.find()) {
                    mes = periodoMatcher.group(2);
                    ano = periodoMatcher.group(3);
                    log.info("✅ Período de referência encontrado (padrão 3): {}/{} - Linha: {}", mes, ano,
                            linhaPeriodo3.trim());
                    if (workPostName == null) {
                        workPostName = findWorkPostName(linhas, idx, linhaPeriodo3.substring(periodoMatcher.end()));
                    }
                    break;
                }
            }
        }

        // Padrão 5: Nomes de meses em português via OCR
        if ((mes == null || ano == null) && ocrText != null) {
            log.info("🔍 Tentando extrair período via OCR...");
            String[] meses = { "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
                    "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO" };
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
                String linhaSetor = linhas[idx];
                String linhaUpper = linhaSetor.toUpperCase();
                if (linhaUpper.contains("PERÍODO") || linhaUpper.contains("REFERÊNCIA") ||
                        linhaUpper.contains("COMPETÊNCIA") || linhaUpper.contains("MÊS")) {

                    // Tentar extrair data dessa linha
                    Pattern dataPattern = Pattern.compile("(\\d{2})/(\\d{2})/(\\d{4})");
                    Matcher dataMatcher = dataPattern.matcher(linhaSetor);
                    if (dataMatcher.find()) {
                        mes = dataMatcher.group(2);
                        ano = dataMatcher.group(3);
                        log.info("✅ Período de referência encontrado por palavra-chave: {}/{} - Linha: {}", mes, ano,
                                linhaSetor.trim());
                        if (workPostName == null) {
                            workPostName = findWorkPostName(linhas, idx, linhaSetor.substring(dataMatcher.end()));
                        }
                        break;
                    }
                }
            }
        }

        if (workPostName == null) {
            workPostName = searchForLabeledWorkPost(linhas);
        }

        // 3.5. TASK 02: EXTRAÇÃO DE VALORES FINANCEIROS (Total Vencimentos, Total
        // Descontos, Valor Líquido)
        java.math.BigDecimal totalVencimentos = null;
        java.math.BigDecimal totalDescontos = null;
        java.math.BigDecimal valorLiquido = null;

        // Extrair Total Vencimentos
        // Padrões: "Total Vencimentos: 1.912,65", "TOTAL VENCIMENTOS 1.912,65", "Total
        // Ganhos: 1.912,65"
        // Melhorado para capturar valores com ou sem separadores
        Pattern totalVencimentosPattern = Pattern.compile(
                "(?i)(?:TOTAL\\s+VENCIMENTOS?|VENCIMENTOS?\\s+TOTAL|TOTAL\\s+GANHOS?)\\s*:?\\s*([\\d.]+[,.]?\\d{0,2}|[\\d,]+)",
                Pattern.CASE_INSENSITIVE);
        for (String linhaVencimentos : linhas) {
            Matcher matcher = totalVencimentosPattern.matcher(linhaVencimentos);
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
                        log.info("✅ Total Vencimentos encontrado: {} (linha: {})", totalVencimentos,
                                linhaVencimentos.trim());
                        break;
                    }
                } catch (Exception e) {
                    log.warn("⚠️ Erro ao extrair Total Vencimentos da linha '{}': {}", linhaVencimentos.trim(),
                            e.getMessage());
                }
            }
        }

        // Extrair Total Descontos
        // Padrões: "Total Descontos: 500,65", "TOTAL DESCONTOS 500,65"
        Pattern totalDescontosPattern = Pattern.compile(
                "(?i)(?:TOTAL\\s+DESCONTOS?|DESCONTOS?\\s+TOTAL)\\s*:?\\s*([\\d.]+[,.]?\\d{0,2}|[\\d,]+)",
                Pattern.CASE_INSENSITIVE);
        for (String linhaDescontos : linhas) {
            Matcher matcher = totalDescontosPattern.matcher(linhaDescontos);
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
                        log.info("✅ Total Descontos encontrado: {} (linha: {})", totalDescontos, linhaDescontos.trim());
                        break;
                    }
                } catch (Exception e) {
                    log.warn("⚠️ Erro ao extrair Total Descontos da linha '{}': {}", linhaDescontos.trim(),
                            e.getMessage());
                }
            }
        }

        // Extrair Valor Líquido
        // Padrões: "Valor Líquido: 1.412,00", "VALOR LÍQUIDO 1.412,00", "Líquido:
        // 1.412,00"
        Pattern valorLiquidoPattern = Pattern.compile(
                "(?i)(?:VALOR\\s+L[IÍ]QUIDO|L[IÍ]QUIDO|VALOR\\s+FINAL|VALOR\\s+A\\s+RECEBER)\\s*:?\\s*([\\d.]+[,.]?\\d{0,2}|[\\d,]+)",
                Pattern.CASE_INSENSITIVE);
        for (String linhaLiquido : linhas) {
            Matcher matcher = valorLiquidoPattern.matcher(linhaLiquido);
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
                        log.info("✅ Valor Líquido encontrado: {} (linha: {})", valorLiquido, linhaLiquido.trim());
                        break;
                    }
                } catch (Exception e) {
                    log.warn("⚠️ Erro ao extrair Valor Líquido da linha '{}': {}", linhaLiquido.trim(), e.getMessage());
                }
            }
        }

        // Se não encontrou Valor Líquido diretamente, calcular como diferença (Total
        // Vencimentos - Total Descontos)
        if (valorLiquido == null && totalVencimentos != null && totalDescontos != null) {
            valorLiquido = totalVencimentos.subtract(totalDescontos);
            log.info("📊 Valor Líquido calculado: {} ({} - {})", valorLiquido, totalVencimentos, totalDescontos);
        }

        // 3.6. EXTRAÇÃO DA CONTA CORRENTE DO HOLERITE
        // Necessária para validar a unificação automática/manual com o comprovante:
        // a conta corrente do holerite deve ser a mesma conta creditada no comprovante.
        // Padrões comuns: "Conta corrente: 12345-6", "Conta: 123456", "C/C 12345-6",
        // "Conta Corrente: 000123456", ou na mesma linha da agência "Agência: 1234 Conta: 5678-9"
        String contaCorrente = null;
        String contaCorrenteLinha = null;
        // IMPORTANTE: o padrão específico "Conta corrente" deve ter PRIORIDADE sobre o
        // genérico "Conta"/"C/C", pois o holerite também exibe a conta de débito da
        // empresa — usar o genérico primeiro pode capturar a conta errada.
        java.util.List<String> contaPatterns = java.util.List.of(
                "Conta\\s*corrente\\s*:?\\s*([\\d]{4,}[\\d\\s\\-]*)",
                "Conta\\s*(?:corrente)?\\s*:\\s*([\\d]{4,}[\\d\\s\\-]*)",
                "C/C\\s*:\\s*([\\d]{4,}[\\d\\s\\-]*)");
        for (String linhaConta : linhas) {
            String linhaLimpa = linhaConta.trim();
            if (linhaLimpa.isEmpty() || (!linhaLimpa.toLowerCase().contains("conta") && !linhaLimpa.contains("C/C"))) {
                continue;
            }
            for (String patternStr : contaPatterns) {
                Matcher contaMatcher = Pattern.compile(patternStr, Pattern.CASE_INSENSITIVE).matcher(linhaLimpa);
                if (contaMatcher.find()) {
                    String candidata = contaMatcher.group(1).trim();
                    String digitos = candidata.replaceAll("[^0-9]", "");
                    // Validar que tem pelo menos 4 dígitos (conta corrente real)
                    if (digitos.length() >= 4) {
                        contaCorrente = digitos;
                        contaCorrenteLinha = linhaLimpa;
                        log.info("✅ Conta corrente do holerite encontrada: {} (linha: {})", contaCorrente, contaCorrenteLinha);
                        break;
                    }
                }
            }
            if (contaCorrente != null) {
                break;
            }
        }
        if (contaCorrente == null) {
            log.warn("⚠️ Conta corrente não encontrada no holerite (página {}). A unificação com comprovante dependerá do cadastro do funcionário.", pageNumber);
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

        if (empresaCnpj == null || empresaCnpj.trim().isEmpty()
                || empresaCnpj.replaceAll("[^0-9]", "").length() != 14) {
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
            log.error("❌ CAMPOS OBRIGATÓRIOS FALTANDO na página {}: {}", pageNumber,
                    String.join(", ", camposFaltantes));
            log.error(
                    "❌ Holerite não será processado. Campos obrigatórios: Empresa, CNPJ, Período, Setor, Nome do Funcionário, CPF");
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

            log.info(
                    "✅ Dados extraídos com sucesso - Página: {}, Código: {}, Nome: {}, CPF: {}, Empresa: {} (CNPJ: {}), Período de Referência: {}/{}",
                    pageNumber, codigo, nome, cpf, empresaNome, empresaCnpj, mes, ano);

            if (totalVencimentos != null || totalDescontos != null || valorLiquido != null) {
                log.info("💰 Valores financeiros extraídos - Vencimentos: {}, Descontos: {}, Líquido: {}",
                        totalVencimentos, totalDescontos, valorLiquido);
            }

            // Extrair dados detalhados da tabela (Cód, Descrição, Referência, Vencimentos,
            // Descontos)
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
                    .contaCorrente(contaCorrente)
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
        // Primeiro, tentar extrair do texto que vem após o período na mesma linha
        if (trailingText != null && !trailingText.trim().isEmpty()) {
            String candidate = sanitizeWorkPostCandidate(trailingText);
            if (candidate != null) {
                log.info("✅ Setor encontrado no texto após o período: {}", candidate);
                return candidate;
            }
            // Se não encontrou, tentar extrair removendo possíveis prefixos comuns
            String cleaned = trailingText.trim();
            // Remover "FOLHA DE PAGAMENTO" se estiver presente
            cleaned = cleaned.replaceAll("(?i)\\s*FOLHA\\s+DE\\s+PAGAMENTO.*$", "").trim();
            if (!cleaned.isEmpty()) {
                candidate = sanitizeWorkPostCandidate(cleaned);
                if (candidate != null) {
                    log.info("✅ Setor encontrado após limpeza do texto: {}", candidate);
                    return candidate;
                }
            }
        }

        // Se não encontrou na mesma linha, procurar nas próximas 2 linhas
        for (int offset = 1; offset <= 2; offset++) {
            int idx = currentIndex + offset;
            if (idx < lines.length) {
                String candidate = sanitizeWorkPostCandidate(lines[idx]);
                if (candidate != null) {
                    log.info("✅ Setor encontrado na linha {} (offset {}): {}", idx, offset, candidate);
                    return candidate;
                }
            }
        }

        log.warn("⚠️ Setor não encontrado após o período na linha {}", currentIndex);
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

        // Remover "FOLHA DE PAGAMENTO" se estiver no final
        cleaned = cleaned.replaceAll("(?i)\\s*FOLHA\\s+DE\\s+PAGAMENTO.*$", "").trim();

        cleaned = cleaned.replaceAll("[•·]+", " ");
        cleaned = cleaned.replaceAll("[\\s]+", " ").trim();
        cleaned = cleaned.replaceAll("[.,;]+$", "").trim();

        if (cleaned.length() < 3) {
            return null;
        }

        String upper = cleaned.toUpperCase(java.util.Locale.ROOT);

        // Tokens que SEMPRE invalidam (não devem aparecer em setores)
        String[] alwaysInvalidTokens = {
                "CPF", "CNPJ", "DEMONSTRATIVO", "PAGAMENTO", "FOLHA", "HOLERITE",
                "ENDERECO", "ENDEREÇO", "RUA", "AVENIDA", "TELEFONE"
        };

        for (String token : alwaysInvalidTokens) {
            if (upper.contains(token)) {
                return null;
            }
        }

        // Tokens da empresa principal que invalidam (PROMOVER VIGILANCIA PATRIMONIAL)
        String[] empresaPrincipalTokens = {
                "PROMOVER", "VIGILANCIA", "PATRIMONIAL"
        };

        boolean isEmpresaPrincipal = false;
        for (String token : empresaPrincipalTokens) {
            if (upper.contains(token)) {
                isEmpresaPrincipal = true;
                break;
            }
        }

        // Se contém tokens da empresa principal E "LTDA" ou "EMPRESA", é a empresa
        // principal, não um setor
        if (isEmpresaPrincipal && (upper.contains("LTDA") || upper.contains("EMPRESA"))) {
            return null;
        }

        // Permitir "LTDA", "S.A", "ME", "EIRELI" em setores (alguns setores são
        // empresas)
        // Mas rejeitar se for apenas "LTDA" ou "S.A" sozinho
        if (upper.matches("^(LTDA|S\\.A|ME|EIRELI)$")) {
            return null;
        }

        // Rejeitar se contém apenas números ou caracteres especiais
        if (!upper.matches(".*[A-Z].*")) {
            return null;
        }

        // Rejeitar se contém vírgulas ou asteriscos (geralmente são listas ou
        // formatação)
        if (upper.contains(",") || upper.contains("*")) {
            return null;
        }

        // Se passou todas as validações, retornar o setor normalizado
        return upper;
    }

    private boolean isValidEmployeeName(String name) {
        if (name == null || name.trim().isEmpty() || name.length() < 5) {
            log.debug("⚠️ Nome inválido: null, vazio ou muito curto (< 5 caracteres)");
            return false;
        }

        String nameUpper = name.toUpperCase().trim();

        // Filtrar títulos e cargos (mas apenas se for o nome completo, não se for parte
        // do nome)
        String[] invalidNames = {
                "FOLHA", "PAGAMENTO", "DEMONSTRATIVO", "HOLERITE", "CONTRACHEQUE",
                "PORTEIRO", "CONTROLADOR", "VIGIA", "AUXILIAR", "SERVICOS", "SEGURANCA",
                "EMPRESA", "LTDA", "ME", "EIRELI", "S.A", "CNPJ", "ENDERECO", "TELEFONE",
                "PERIODO", "REFERENCIA", "FUNCIONARIO", "COLABORADOR", "SALARIO"
        };

        // Verificar se o nome completo é exatamente um dos nomes inválidos
        for (String invalid : invalidNames) {
            if (nameUpper.equals(invalid)) {
                log.debug("⚠️ Nome inválido: é exatamente '{}' (título/cargo)", invalid);
                return false;
            }
        }

        // Verificar se contém apenas letras, espaços e acentos (permitir preposições
        // como DA, DE, DOS, etc.)
        if (!nameUpper.matches("^[A-ZÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ ]+$")) {
            log.debug("⚠️ Nome inválido: contém caracteres inválidos. Nome: '{}'", nameUpper);
            return false;
        }

        // Deve ter pelo menos 2 palavras (primeiro nome e sobrenome)
        String[] palavras = nameUpper.split("\\s+");
        if (palavras.length < 2) {
            log.debug("⚠️ Nome inválido: tem menos de 2 palavras. Nome: '{}'", nameUpper);
            return false;
        }

        // Primeira palavra deve ter pelo menos 3 caracteres
        if (palavras[0].length() < 3) {
            log.debug("⚠️ Nome inválido: primeira palavra muito curta. Nome: '{}'", nameUpper);
            return false;
        }

        log.debug("✅ Nome válido: '{}'", nameUpper);
        return true;
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

    /** Normaliza CPF para uso em username/cpf na tabela users (apenas dígitos). */
    private String normalizeCpfForUser(String cpf) {
        if (cpf == null) return null;
        String digits = cpf.replaceAll("\\D", "");
        return digits.length() == 11 ? digits : cpf.trim();
    }

    /**
     * Criar usuário automaticamente a partir dos dados do holerite.
     * Só insere em users se CPF e username forem diferentes dos já existentes na tabela users.
     */
    private void createUserFromPayslip(Payslip payslip) {
        String cpfNormalized = normalizeCpfForUser(payslip.getCpf());
        String username = cpfNormalized != null && !cpfNormalized.isEmpty() ? cpfNormalized : payslip.getCpf();
        String email = generateUniqueEmail(payslip.getCpf(), payslip.getEmployeeName());
        String password = "Promover@2026"; // Senha padrão - usuário deve trocar no primeiro acesso
        String name = payslip.getEmployeeName();

        log.info("🔐 INÍCIO - Verificando se usuário existe para funcionário: {} (CPF: {})", name, username);

        try {
            // Só inserir se CPF e username forem diferentes dos existentes na tabela users
            Optional<com.z7design.secured_guard.model.User> existingByUsername = userRepository.findByUsername(username);
            if (existingByUsername.isPresent()) {
                log.info("👤 Usuário já existe com username: {} - PULANDO criação", username);
                return;
            }
            if (cpfNormalized != null && !cpfNormalized.isEmpty()) {
                Optional<com.z7design.secured_guard.model.User> existingByCpf = userRepository.findByCpf(cpfNormalized);
                if (existingByCpf.isPresent()) {
                    log.info("👤 Usuário já existe com CPF: {} - PULANDO criação", cpfNormalized);
                    return;
                }
            }

            log.info("🆕 Nenhum usuário com este CPF/username - PROSSEGUINDO com criação para CPF: {}", username);

            // Buscar role COLABORADOR
            log.info("🔍 Buscando role COLABORADOR no banco de dados...");
            Optional<com.z7design.secured_guard.model.Role> colaboradorRole = roleRepository.findByName("COLABORADOR");
            if (colaboradorRole.isEmpty()) {
                log.error("❌ Role COLABORADOR não encontrado no banco de dados!");
                log.error("   Para criar o role COLABORADOR, execute:");
                log.error(
                        "   INSERT INTO roles (id, name, description) VALUES (gen_random_uuid(), 'COLABORADOR', 'Funcionário colaborador');");
                throw new IllegalArgumentException(
                        "Role COLABORADOR não encontrado. Consulte os logs para instruções de criação.");
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
            if (cpfNormalized != null && !cpfNormalized.isEmpty()) {
                novoUser.setCpf(cpfNormalized);
            }
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
        String nomeFuncionario = normalizeFolderName(
                payslip.getEmployeeName() != null ? payslip.getEmployeeName() : "FUNCIONARIO_NAO_INFORMADO");
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
        log.info("📂 PayslipService.getProcessedPayslipFiles: Buscando todos os payslips no banco...");
        List<Payslip> payslips = payslipRepository.findAll();
        log.info("📂 PayslipService.getProcessedPayslipFiles: Encontrados {} payslips no banco", payslips.size());

        if (payslips.isEmpty()) {
            log.warn("⚠️ PayslipService.getProcessedPayslipFiles: Nenhum payslip encontrado no banco de dados");
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
        // PRD: Estrutura de pastas:
        // {empresa-cnpj}/{setor-normalizado}/{ano-mes}/{funcionario-cpf}/

        // 1. Empresa: usar CNPJ normalizado (apenas números)
        String empresaCnpj = normalizeCnpj(payslip.getCompanyCnpj());
        if (empresaCnpj == null || empresaCnpj.isEmpty()) {
            empresaCnpj = "EMPRESA_NAO_INFORMADA";
            log.warn("⚠️ CNPJ da empresa não encontrado, usando fallback: {}", empresaCnpj);
        }

        // 2. Setor: normalizar removendo acentos e caracteres especiais
        String setorNome = normalizeSectorName(payslip.getWorkPostName());

        // 3. Período: formato ano-mes (ex: 2025-10)
        String periodo = String.format("%d-%02d", payslip.getYear(), payslip.getMonth());

        // 4. Funcionário: usar NOME e CPF normalizado
        String funcionarioNome = payslip.getEmployeeName() != null ? normalizeEmployeeName(payslip.getEmployeeName())
                : null;
        String funcionarioCpf = payslip.getCpf() != null ? payslip.getCpf().replaceAll("[^0-9]", "") : null;

        if (funcionarioNome == null || funcionarioNome.isEmpty()) {
            funcionarioNome = "FUNCIONARIO_NAO_INFORMADO";
            log.warn("⚠️ Nome do funcionário não encontrado, usando fallback: {}", funcionarioNome);
        }
        if (funcionarioCpf == null || funcionarioCpf.isEmpty()) {
            funcionarioCpf = "00000000000";
            log.warn("⚠️ CPF do funcionário não encontrado, usando fallback: {}", funcionarioCpf);
        }

        // Criar pasta do funcionário: nome_funcionario_cpf (ex:
        // MARCO_TULIO_MENEZES_11396510648)
        String pastaFuncionario = String.format("%s_%s", funcionarioNome, funcionarioCpf);

        // Criar caminho completo conforme PRD:
        // empresa-cnpj/setor/ano-mes/nome_funcionario_cpf/
        Path pastaCompleta = Paths.get(OUTPUT_DIR, empresaCnpj, setorNome, periodo, pastaFuncionario);

        // Criar diretório se não existir
        if (!Files.exists(pastaCompleta)) {
            Files.createDirectories(pastaCompleta);
            log.info("📁 Estrutura de pastas criada conforme PRD: {}", pastaCompleta);
        }

        // 5. Versionamento: buscar versões existentes no mesmo caminho e determinar
        // próxima versão
        int proximaVersao = determinarProximaVersao(pastaCompleta, payslip);
        payslip.setVersao(proximaVersao);

        // 6. Nome do arquivo conforme PRD atualizado: NOME_CPF_V1.pdf, NOME_CPF_V2.pdf,
        // etc.
        String nomeArquivo = String.format("%s_V%d.pdf", pastaFuncionario, proximaVersao);
        Path caminhoCompleto = pastaCompleta.resolve(nomeArquivo);

        // 7. Calcular hash do arquivo PDF antes de salvar (usar hash do PDF, não do
        // texto)
        // Isso garante comparação mais confiável quando verificar duplicatas
        String hashConteudo = calculatePagePdfHash(document, pageNumber);
        if (hashConteudo == null) {
            // Fallback: usar hash do texto se não conseguir calcular do PDF
            log.warn("⚠️ Não foi possível calcular hash do PDF, usando hash do texto como fallback");
            String pageText = extractPageText(document, pageNumber);
            hashConteudo = calculatePageHash(pageText);
        }
        payslip.setHashConteudo(hashConteudo);
        payslip.setFileName(nomeArquivo);
        payslip.setArquivoCaminho(caminhoCompleto.toString().replace('\\', '/'));

        // Salvar PDF individual
        try (PDDocument newDoc = new PDDocument()) {
            newDoc.addPage(document.getPage(pageNumber - 1));
            newDoc.save(caminhoCompleto.toString());
            log.info("📄 PDF salvo conforme PRD: {} (versão {})", caminhoCompleto, proximaVersao);
        }

        return caminhoCompleto.toString();
    }

    /**
     * Determina a próxima versão do holerite verificando arquivos existentes no
     * diretório e no banco
     * 
     * IMPORTANTE: Este método NUNCA exclui ou sobrescreve versões anteriores.
     * Ele apenas determina qual será o número da próxima versão (versão máxima +
     * 1).
     * 
     * Comportamento:
     * - Mantém TODAS as versões anteriores intactas (arquivos físicos e registros
     * no banco)
     * - Cria uma NOVA versão com número sequencial incremental
     * - Retorna a versão mais alta encontrada + 1, ou 1 se não houver versões
     * anteriores
     * 
     * @param pastaCompleta Caminho completo da pasta onde os holerites são
     *                      armazenados
     * @param payslip       Payslip que será versionado (usado para buscar versões
     *                      existentes no banco)
     * @return Número da próxima versão (ex: se máximo é 2, retorna 3)
     */
    private int determinarProximaVersao(Path pastaCompleta, Payslip payslip) {
        try {
            if (!Files.exists(pastaCompleta)) {
                log.info("📁 Diretório não existe - será criado. Primeira versão: v1");
                return 1; // Primeira versão
            }

            // Buscar todos os arquivos holerite_v*.pdf no diretório
            // IMPORTANTE: Apenas LÊ os arquivos - não os exclui ou modifica
            Pattern versaoPattern = Pattern.compile(".*_V(\\d+)\\.pdf", Pattern.CASE_INSENSITIVE);
            Pattern versaoFallbackPattern = Pattern.compile("holerite_v(\\d+)\\.pdf", Pattern.CASE_INSENSITIVE);
            int versaoMaxima = 0;

            try (var stream = Files.list(pastaCompleta)) {
                versaoMaxima = stream
                        .filter(Files::isRegularFile)
                        .map(path -> path.getFileName().toString())
                        .map(path -> {
                            Matcher matcher = versaoPattern.matcher(path);
                            if (matcher.matches()) {
                                return matcher.group(1);
                            }
                            Matcher fallbackMatcher = versaoFallbackPattern.matcher(path);
                            if (fallbackMatcher.matches()) {
                                return fallbackMatcher.group(1);
                            }
                            return null;
                        })
                        .filter(Objects::nonNull)
                        .mapToInt(Integer::parseInt)
                        .max()
                        .orElse(0);
            }

            // Buscar também no banco de dados para garantir consistência
            // IMPORTANTE: Versões anteriores no banco serão MANTIDAS - apenas consultamos
            // para determinar próxima versão
            // (pode haver arquivos que não estão mais no disco mas estão no banco)
            if (payslip.getCompanyCnpj() != null && payslip.getCpf() != null && payslip.getWorkPostName() != null) {
                List<Payslip> holeritesExistentes = payslipRepository
                        .findByCompanyCnpjAndCpfAndWorkPostNameAndMonthAndYear(
                                payslip.getCompanyCnpj(),
                                payslip.getCpf(),
                                payslip.getWorkPostName(),
                                payslip.getMonth(),
                                payslip.getYear());

                int versaoMaximaBanco = holeritesExistentes.stream()
                        .filter(h -> h.getVersao() != null)
                        .mapToInt(Payslip::getVersao)
                        .max()
                        .orElse(0);

                versaoMaxima = Math.max(versaoMaxima, versaoMaximaBanco);

                log.info(
                        "📊 Versões existentes encontradas: {} arquivo(s) no disco, {} registro(s) no banco (máxima: v{})",
                        versaoMaxima > 0 ? "até v" + versaoMaxima : "nenhum",
                        holeritesExistentes.size(),
                        versaoMaxima);
            }

            int proximaVersao = versaoMaxima + 1;
            log.info("🔢 Próxima versão determinada: v{} (versão máxima encontrada: v{})", proximaVersao, versaoMaxima);
            log.info("   ✅ Todas as versões anteriores serão preservadas (não serão excluídas ou sobrescritas)");
            log.info("   📄 Novo arquivo será salvo como: holerite_v{}.pdf", proximaVersao);
            log.info("   💾 Novo registro será criado no banco mantendo {} registro(s) anterior(es)", versaoMaxima);
            return proximaVersao;

        } catch (Exception e) {
            log.warn("⚠️ Erro ao determinar próxima versão, usando versão 1: {}", e.getMessage());
            return 1;
        }
    }

    /**
     * Extrai o texto de uma página específica do documento
     */
    private String extractPageText(PDDocument document, int pageNumber) {
        try {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setStartPage(pageNumber);
            stripper.setEndPage(pageNumber);
            return stripper.getText(document);
        } catch (Exception e) {
            log.warn("⚠️ Erro ao extrair texto da página {}: {}", pageNumber, e.getMessage());
            return "";
        }
    }

    /**
     * O processamento de holerites NÃO deve inserir nem atualizar registros na tabela de funcionários (employees).
     * Apenas a tabela users pode ser populada, e somente quando CPF e username forem diferentes dos existentes.
     * Este método foi esvaziado para atender a essa regra.
     */
    private void salvarFuncionario(Payslip payslip, String caminhoPdf) {
        // Intencionalmente vazio: não inserir nem atualizar employees no processamento de holerites
        log.debug("Processamento de holerite: tabela de funcionários não é alterada (apenas users quando aplicável).");
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
                    anoReferencia);

            log.info(
                    "💾 Dados extraídos salvos na tabela tb_extract_data_holerites: {} - CPF: {} - Código: {} - Período: {}/{}",
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

    public Payslip getPayslipById(java.util.UUID id) {
        log.info("🔍 Buscando payslip pelo ID: {}", id);
        return payslipRepository.findById(id)
                .orElse(null);
    }

    public Payslip getPayslipByFileName(String fileName) {
        log.info("🔍 Buscando payslip pelo nome do arquivo: {}", fileName);
        // Pode haver múltiplos holerites com o mesmo nome de arquivo (em diferentes
        // setores/empresas)
        // Retornar o mais recente
        Payslip payslip = payslipRepository.findFirstByFileNameOrderByProcessedAtDesc(fileName);
        if (payslip == null) {
            log.warn("⚠️ Nenhum payslip encontrado para o arquivo: {}", fileName);
            // Tentar buscar sem a extensão .pdf
            if (fileName.endsWith(".pdf")) {
                String fileNameWithoutExt = fileName.substring(0, fileName.length() - 4);
                log.info("🔍 Tentando buscar sem extensão: {}", fileNameWithoutExt);
                payslip = payslipRepository.findFirstByFileNameOrderByProcessedAtDesc(fileNameWithoutExt);
            }
            if (payslip == null) {
                log.error("❌ Payslip não encontrado para o arquivo: {} (tentativas esgotadas)", fileName);
            }
        } else {
            log.info("✅ Payslip encontrado: ID={}, CPF={}, Nome={}, Arquivo={}",
                    payslip.getId(), payslip.getCpf(), payslip.getEmployeeName(), payslip.getFileName());
        }
        return payslip;
    }

    public Optional<String> resolvePayslipPathByCpfMonthYear(String cpf, Integer month, Integer year) {
        Payslip payslip = payslipRepository.findFirstByCpfAndMonthAndYear(cpf, month, year);
        if (payslip == null) {
            return Optional.empty();
        }

        // PRIORIDADE 1: Usar arquivo_caminho se disponível (nova estrutura PRD)
        if (payslip.getArquivoCaminho() != null && !payslip.getArquivoCaminho().isEmpty()) {
            Path candidate = Paths.get(payslip.getArquivoCaminho());
            if (Files.exists(candidate)) {
                log.debug("📄 Usando arquivo_caminho do banco: {}", candidate);
                return Optional.of(candidate.toString());
            } else {
                log.warn("⚠️ arquivo_caminho do banco não existe: {}", payslip.getArquivoCaminho());
            }
        }

        // PRIORIDADE 2: Tentar construir caminho conforme nova estrutura PRD
        if (payslip.getCompanyCnpj() != null && payslip.getWorkPostName() != null) {
            String empresaCnpj = normalizeCnpj(payslip.getCompanyCnpj());
            String setorNome = normalizeSectorName(payslip.getWorkPostName());
            String periodo = String.format("%d-%02d", payslip.getYear(), payslip.getMonth());
            String funcionarioNome = payslip.getEmployeeName() != null
                    ? normalizeEmployeeName(payslip.getEmployeeName())
                    : null;
            String funcionarioCpf = payslip.getCpf() != null ? payslip.getCpf().replaceAll("[^0-9]", "") : null;

            if (empresaCnpj != null && setorNome != null && funcionarioNome != null && funcionarioCpf != null) {
                String pastaFuncionario = String.format("%s_%s", funcionarioNome, funcionarioCpf);
                Path candidate = Paths.get(OUTPUT_DIR, empresaCnpj, setorNome, periodo, pastaFuncionario,
                        payslip.getFileName());
                if (Files.exists(candidate)) {
                    log.debug("📄 Arquivo encontrado na nova estrutura PRD: {}", candidate);
                    return Optional.of(candidate.toString());
                }
            }
        }

        // PRIORIDADE 3: Fallback - estrutura antiga
        String mesAno = String.format("%s-%s", payslip.getMonth(), payslip.getYear());
        Path candidate = Paths.get(OUTPUT_DIR, mesAno, payslip.getFileName());
        if (Files.exists(candidate)) {
            log.debug("📄 Arquivo encontrado na estrutura antiga: {}", candidate);
            return Optional.of(candidate.toString());
        }

        // PRIORIDADE 4: Outros fallbacks
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

        log.warn("⚠️ Arquivo não encontrado em nenhum caminho conhecido para: {}", payslip.getFileName());
        return Optional.empty();
    }

    // Exclusão individual de payslip
    public void deletePayslip(UUID id) {
        Payslip payslip = payslipRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Payslip não encontrado para o ID: " + id));

        // Usar arquivo_caminho se disponível (nova estrutura PRD)
        Path arquivo = null;
        if (payslip.getArquivoCaminho() != null && !payslip.getArquivoCaminho().isEmpty()) {
            arquivo = Paths.get(payslip.getArquivoCaminho());
            log.info("🗑️ Usando caminho do banco de dados: {}", arquivo.toAbsolutePath());
        } else {
            // Fallback: tentar construir caminho conforme nova estrutura PRD
            String empresaCnpj = normalizeCnpj(payslip.getCompanyCnpj());
            String setorNome = normalizeSectorName(payslip.getWorkPostName());
            String periodo = String.format("%d-%02d", payslip.getYear(), payslip.getMonth());
            String funcionarioNome = payslip.getEmployeeName() != null
                    ? normalizeEmployeeName(payslip.getEmployeeName())
                    : null;
            String funcionarioCpf = payslip.getCpf() != null ? payslip.getCpf().replaceAll("[^0-9]", "") : null;

            if (empresaCnpj != null && setorNome != null && funcionarioNome != null && funcionarioCpf != null) {
                String pastaFuncionario = String.format("%s_%s", funcionarioNome, funcionarioCpf);
                arquivo = Paths.get(OUTPUT_DIR, empresaCnpj, setorNome, periodo, pastaFuncionario,
                        payslip.getFileName());
                log.info("🗑️ Construindo caminho conforme PRD: {}", arquivo.toAbsolutePath());
            } else {
                // Fallback final: estrutura antiga
                String mesAno = String.format("%s-%s", payslip.getMonth(), payslip.getYear());
                Path pastaMesAno = Paths.get(OUTPUT_DIR, mesAno);
                arquivo = pastaMesAno.resolve(payslip.getFileName());
                log.warn("⚠️ Usando estrutura antiga (fallback): {}", arquivo.toAbsolutePath());
            }
        }

        log.info("🗑️ Tentando remover o arquivo: {}", arquivo.toAbsolutePath());
        try {
            if (arquivo != null && Files.exists(arquivo)) {
                Files.delete(arquivo);
                log.info("✅ Arquivo removido com sucesso: {}", arquivo.toAbsolutePath());

                // Verificar se a pasta do funcionário ficou vazia (nova estrutura)
                Path pastaFuncionario = arquivo.getParent();
                if (pastaFuncionario != null && Files.exists(pastaFuncionario)) {
                    try {
                        boolean pastaVazia;
                        try (var stream = Files.list(pastaFuncionario)) {
                            pastaVazia = stream.findAny().isEmpty();
                        }
                        if (pastaVazia) {
                            log.info("📁 Pasta do funcionário está vazia, removendo: {}",
                                    pastaFuncionario.toAbsolutePath());
                            Files.delete(pastaFuncionario);

                            // Verificar se a pasta do período ficou vazia
                            Path pastaPeriodo = pastaFuncionario.getParent();
                            if (pastaPeriodo != null && Files.exists(pastaPeriodo)) {
                                boolean periodoVazio;
                                try (var stream = Files.list(pastaPeriodo)) {
                                    periodoVazio = stream.findAny().isEmpty();
                                }
                                if (periodoVazio) {
                                    log.info("📁 Pasta do período está vazia, removendo: {}",
                                            pastaPeriodo.toAbsolutePath());
                                    Files.delete(pastaPeriodo);

                                    // Verificar se a pasta do setor ficou vazia
                                    Path pastaSetor = pastaPeriodo.getParent();
                                    if (pastaSetor != null && Files.exists(pastaSetor)) {
                                        boolean setorVazio;
                                        try (var stream = Files.list(pastaSetor)) {
                                            setorVazio = stream.findAny().isEmpty();
                                        }
                                        if (setorVazio) {
                                            log.info("📁 Pasta do setor está vazia, removendo: {}",
                                                    pastaSetor.toAbsolutePath());
                                            Files.delete(pastaSetor);

                                            // Verificar se a pasta da empresa ficou vazia
                                            Path pastaEmpresa = pastaSetor.getParent();
                                            if (pastaEmpresa != null && Files.exists(pastaEmpresa)) {
                                                boolean empresaVazia;
                                                try (var stream = Files.list(pastaEmpresa)) {
                                                    empresaVazia = stream.findAny().isEmpty();
                                                }
                                                if (empresaVazia) {
                                                    log.info("📁 Pasta da empresa está vazia, removendo: {}",
                                                            pastaEmpresa.toAbsolutePath());
                                                    Files.delete(pastaEmpresa);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } catch (Exception e) {
                        log.warn("⚠️ Erro ao verificar/remover pastas vazias: {}", e.getMessage());
                    }
                }
            } else {
                log.warn("⚠️ Arquivo não encontrado: {}", arquivo != null ? arquivo.toAbsolutePath() : "null");
            }
        } catch (Exception e) {
            log.error("❌ Erro ao remover o arquivo: {} - {}", arquivo != null ? arquivo.toAbsolutePath() : "null",
                    e.getMessage());
        }

        // Excluir do banco de dados
        payslipRepository.deleteById(id);
        log.info("✅ Registro excluído do banco de dados: ID {}", id);
    }

    // Exclusão em massa de payslips
    public Map<String, Object> deleteMultiplePayslips(List<UUID> ids) {
        int deleted = 0;
        int failed = 0;
        List<String> errors = new ArrayList<>();
        List<Path> arquivosParaRemover = new ArrayList<>();

        log.info("🗑️ Iniciando exclusão em massa de {} payslips", ids.size());

        // Primeiro, coletar informações de todos os payslips
        for (UUID id : ids) {
            try {
                Payslip payslip = payslipRepository.findById(id)
                        .orElseThrow(() -> new IllegalArgumentException("Payslip não encontrado para o ID: " + id));

                // Usar arquivo_caminho se disponível (nova estrutura PRD)
                Path arquivo = null;
                if (payslip.getArquivoCaminho() != null && !payslip.getArquivoCaminho().isEmpty()) {
                    arquivo = Paths.get(payslip.getArquivoCaminho());
                } else {
                    // Fallback: tentar construir caminho conforme nova estrutura PRD
                    String empresaCnpj = normalizeCnpj(payslip.getCompanyCnpj());
                    String setorNome = normalizeSectorName(payslip.getWorkPostName());
                    String periodo = String.format("%d-%02d", payslip.getYear(), payslip.getMonth());
                    String funcionarioNome = payslip.getEmployeeName() != null
                            ? normalizeEmployeeName(payslip.getEmployeeName())
                            : null;
                    String funcionarioCpf = payslip.getCpf() != null ? payslip.getCpf().replaceAll("[^0-9]", "") : null;

                    if (empresaCnpj != null && setorNome != null && funcionarioNome != null && funcionarioCpf != null) {
                        String pastaFuncionario = String.format("%s_%s", funcionarioNome, funcionarioCpf);
                        arquivo = Paths.get(OUTPUT_DIR, empresaCnpj, setorNome, periodo, pastaFuncionario,
                                payslip.getFileName());
                    } else {
                        // Fallback final: estrutura antiga
                        String mesAno = String.format("%s-%s", payslip.getMonth(), payslip.getYear());
                        Path pastaMesAno = Paths.get(OUTPUT_DIR, mesAno);
                        arquivo = pastaMesAno.resolve(payslip.getFileName());
                    }
                }

                if (arquivo != null) {
                    arquivosParaRemover.add(arquivo);
                }

                // Excluir do banco de dados
                payslipRepository.deleteById(id);
                deleted++;
            } catch (Exception e) {
                failed++;
                errors.add("ID " + id + ": " + e.getMessage());
                log.error("❌ Erro ao processar exclusão do payslip {}: {}", id, e.getMessage());
            }
        }

        // Remover todos os arquivos
        Set<Path> pastasParaVerificar = new HashSet<>();
        for (Path arquivo : arquivosParaRemover) {
            log.info("🗑️ Tentando remover o arquivo: {}", arquivo.toAbsolutePath());
            try {
                if (Files.exists(arquivo)) {
                    Files.delete(arquivo);
                    log.info("✅ Arquivo removido com sucesso: {}", arquivo.toAbsolutePath());

                    // Coletar pastas para verificar se ficaram vazias
                    Path pastaAtual = arquivo.getParent();
                    while (pastaAtual != null && !pastaAtual.equals(Paths.get(OUTPUT_DIR))) {
                        pastasParaVerificar.add(pastaAtual);
                        pastaAtual = pastaAtual.getParent();
                    }
                } else {
                    log.warn("⚠️ Arquivo não encontrado: {}", arquivo.toAbsolutePath());
                }
            } catch (Exception e) {
                log.error("❌ Erro ao remover o arquivo: {} - {}", arquivo.toAbsolutePath(), e.getMessage());
            }
        }

        // Verificar e remover pastas vazias (da mais específica para a mais geral)
        List<Path> pastasOrdenadas = new ArrayList<>(pastasParaVerificar);
        pastasOrdenadas.sort((a, b) -> Integer.compare(b.getNameCount(), a.getNameCount())); // Mais profunda primeiro

        for (Path pasta : pastasOrdenadas) {
            try {
                if (Files.exists(pasta) && Files.isDirectory(pasta)) {
                    boolean pastaVazia;
                    try (var stream = Files.list(pasta)) {
                        pastaVazia = stream.findAny().isEmpty();
                    }
                    if (pastaVazia) {
                        Files.delete(pasta);
                        log.info("📁 Pasta vazia removida: {}", pasta.toAbsolutePath());
                    }
                }
            } catch (Exception e) {
                log.warn("⚠️ Erro ao verificar/remover pasta: {} - {}", pasta.toAbsolutePath(), e.getMessage());
            }
        }

        Map<String, Object> result = new java.util.HashMap<>();
        result.put("deleted", deleted);
        result.put("failed", failed);
        result.put("errors", errors);

        log.info("✅ Exclusão em massa concluída: {} excluídos, {} falhas", deleted, failed);
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

                // CORREÇÃO: Como agora agrupamos por CNPJ, escolher o nome de empresa mais
                // comum ou mais recente
                // para garantir consistência na exibição
                String companyName = resolveBestCompanyName(companyPayslips);
                String companyCnpj = normalizeCnpj(companyPayslips.get(0).getCompanyCnpj());

                Payslip sample = companyPayslips.get(0);
                PayslipOrganizationResponse.CompanyGroup companyGroup = new PayslipOrganizationResponse.CompanyGroup();
                String companySigla = resolveCompanySigla(sample);
                companyGroup.setCompanySigla(companySigla);
                companyGroup.setCompanyName(defaultString(companyName, "Empresa não informada"));
                companyGroup.setCompanyCnpj(defaultString(companyCnpj, ""));
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
                            .collect(Collectors.groupingBy(this::buildPeriodKey, LinkedHashMap::new,
                                    Collectors.toList()));

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
                            log.warn(
                                    "⚠️ Nenhum holerite com mês/ano ({}/{}) consistente no período {}. Ignorando grupo.",
                                    month, year, periodKey);
                            continue;
                        }

                        PayslipOrganizationResponse.PeriodGroup periodGroup = new PayslipOrganizationResponse.PeriodGroup();
                        periodGroup.setYear(year);
                        periodGroup.setMonth(month);
                        periodGroup.setFormattedPeriod(formatPeriodLabel(month, year));

                        List<PayslipOrganizationResponse.PayslipEntry> entries = consistentPayslips.stream()
                                .sorted(Comparator.comparing(p -> defaultString(p.getEmployeeName(), ""),
                                        String.CASE_INSENSITIVE_ORDER))
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

                sectors.sort(Comparator.comparing(PayslipOrganizationResponse.SectorGroup::getSectorName,
                        String.CASE_INSENSITIVE_ORDER));
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
        // CORREÇÃO: Agrupar PRIMARIAMENTE pelo CNPJ normalizado, que é o identificador
        // único da empresa
        // O nome pode variar na extração, mas o CNPJ é sempre o mesmo para a mesma
        // empresa
        String normalizedCnpj = normalizeCnpj(payslip.getCompanyCnpj());

        // Se não tiver CNPJ, usar nome + sigla como fallback
        if (normalizedCnpj == null || normalizedCnpj.isEmpty()) {
            String sigla = resolveCompanySigla(payslip);
            String name = defaultString(payslip.getCompanyName(), "Empresa não informada").trim().toUpperCase();
            String companyId = payslip.getCompanyId() != null ? payslip.getCompanyId().toString() : "";
            return String.join("|", "NO_CNPJ", sigla, name, companyId);
        }

        // CORREÇÃO: Usar CNPJ normalizado como chave primária, ignorando variações no
        // nome
        // O nome será resolvido depois para exibição, usando o mais comum ou mais
        // recente
        String sigla = resolveCompanySigla(payslip);
        String companyId = payslip.getCompanyId() != null ? payslip.getCompanyId().toString() : "";
        return String.join("|", normalizedCnpj, sigla, companyId);
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

    /**
     * CORREÇÃO: Resolve o melhor nome da empresa entre vários payslips agrupados
     * pelo mesmo CNPJ
     * Prefere o nome mais comum, ou o mais longo (completo), ou o primeiro não
     * vazio
     */
    private String resolveBestCompanyName(List<Payslip> payslips) {
        if (payslips == null || payslips.isEmpty()) {
            return "Empresa não informada";
        }

        // Filtrar apenas nomes não vazios e normalizar
        Map<String, Integer> nameFrequency = new HashMap<>();
        Map<String, String> normalizedToOriginal = new HashMap<>();

        for (Payslip p : payslips) {
            String name = p.getCompanyName();
            if (name != null && !name.trim().isEmpty()) {
                String normalized = name.trim().toUpperCase();
                nameFrequency.put(normalized, nameFrequency.getOrDefault(normalized, 0) + 1);
                // Manter o original mais longo/completo
                if (!normalizedToOriginal.containsKey(normalized) ||
                        name.length() > normalizedToOriginal.get(normalized).length()) {
                    normalizedToOriginal.put(normalized, name);
                }
            }
        }

        if (nameFrequency.isEmpty()) {
            return "Empresa não informada";
        }

        // Encontrar o nome mais frequente
        String mostCommonNormalized = nameFrequency.entrySet().stream()
                .max(Map.Entry.<String, Integer>comparingByValue()
                        .thenComparing((e1, e2) -> Integer.compare(
                                normalizedToOriginal.get(e2.getKey()).length(),
                                normalizedToOriginal.get(e1.getKey()).length()))) // Preferir mais longo em caso de
                                                                                  // empate
                .map(Map.Entry::getKey)
                .orElse(null);

        if (mostCommonNormalized != null) {
            return normalizedToOriginal.get(mostCommonNormalized);
        }

        // Fallback: retornar o primeiro nome não vazio encontrado
        return payslips.stream()
                .map(Payslip::getCompanyName)
                .filter(n -> n != null && !n.trim().isEmpty())
                .findFirst()
                .orElse("Empresa não informada");
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
     * Normaliza nome do funcionário para uso em pastas do sistema de arquivos
     * Remove acentos, caracteres especiais e limita tamanho
     */
    private String normalizeEmployeeName(String name) {
        if (!StringUtils.hasText(name)) {
            return "FUNCIONARIO_NAO_INFORMADO";
        }
        String upper = name.trim().toUpperCase();
        String normalized = Normalizer.normalize(upper, Normalizer.Form.NFD)
                .replaceAll("[\\p{M}]", "")
                .replaceAll("[^A-Z0-9]+", "_")
                .replaceAll("^_+", "")
                .replaceAll("_+$", "");

        // Limitar tamanho para evitar problemas com sistemas de arquivos (máximo 100
        // caracteres)
        if (normalized.length() > 100) {
            normalized = normalized.substring(0, 100);
        }

        return StringUtils.hasText(normalized) ? normalized : "FUNCIONARIO_NAO_INFORMADO";
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
        // Substituir caracteres especiais por underscore e manter apenas letras,
        // números e espaços
        normalized = normalized.replaceAll("[^a-zA-Z0-9\\s]", "_");
        // Substituir múltiplos espaços/underscores por um único underscore
        normalized = normalized.replaceAll("[\\s_]+", "_");
        // Remover underscores no início e fim
        normalized = normalized.replaceAll("^_+", "").replaceAll("_+$", "");
        // Limitar tamanho (máximo 100 caracteres para evitar problemas com sistemas de
        // arquivos)
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

    private int compareCompanyGroups(PayslipOrganizationResponse.CompanyGroup a,
            PayslipOrganizationResponse.CompanyGroup b) {
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
     * TASK 02: Calcula hash SHA-256 do conteúdo da página para comparação com
     * arquivos anteriores
     */
    /**
     * Calcula hash SHA-256 do conteúdo em formato hexadecimal (64 caracteres)
     * Conforme PRD: hash_conteudo VARCHAR(64)
     */
    /**
     * Calcula hash do texto extraído (método legado - mantido para compatibilidade)
     * 
     * @deprecated Use calculatePagePdfHash para comparação mais confiável
     */
    private String calculatePageHash(String pageText) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(pageText.getBytes(StandardCharsets.UTF_8));
            // Converter para hexadecimal (64 caracteres)
            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            log.warn("⚠️ Erro ao calcular hash da página: {}", e.getMessage());
            // Retornar hash simples baseado no tamanho do texto como fallback
            return String.format("%064x", pageText != null ? pageText.hashCode() : 0);
        }
    }

    /**
     * Calcula hash SHA-256 do arquivo completo (bytes do arquivo)
     * Usado para verificar se o arquivo completo já foi processado anteriormente
     */
    public String calculateFileHash(byte[] fileBytes) {
        try {
            if (fileBytes == null || fileBytes.length == 0) {
                log.warn("⚠️ Arquivo vazio - não é possível calcular hash");
                return null;
            }

            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(fileBytes);

            // Converter para hexadecimal (64 caracteres)
            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }

            return hexString.toString();
        } catch (Exception e) {
            log.error("❌ Erro ao calcular hash do arquivo completo: {}", e.getMessage(), e);
            return null;
        }
    }

    /**
     * Verifica se o arquivo completo já foi processado anteriormente
     * Para arquivos multi-página, verifica se todas as páginas já foram processadas
     * Retorna true se já foi processado e não foi excluído
     */
    public boolean isFileAlreadyProcessed(byte[] fileBytes, String originalFilename) {
        if (fileBytes == null || fileBytes.length == 0) {
            return false;
        }

        try {
            // Carregar o documento para verificar páginas
            PDDocument document = PDDocument.load(new java.io.ByteArrayInputStream(fileBytes));
            int pageCount = document.getNumberOfPages();

            log.info("🔍 Verificando se arquivo '{}' já foi processado ({} página(s))...", originalFilename, pageCount);

            // Verificar cada página do arquivo
            int pagesAlreadyProcessed = 0;
            int pagesWithNonDeletedPayslips = 0;

            for (int pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
                // Calcular hash da página
                String pageHash = calculatePagePdfHash(document, pageNumber);
                if (pageHash == null) {
                    // Fallback: usar hash do texto
                    PDFTextStripper stripper = new PDFTextStripper();
                    stripper.setStartPage(pageNumber);
                    stripper.setEndPage(pageNumber);
                    String pageText = stripper.getText(document);
                    pageHash = calculatePageHash(pageText);
                }

                if (pageHash != null && !pageHash.isEmpty()) {
                    log.debug("   📄 Página {}: Hash calculado = {}...", pageNumber,
                            pageHash.substring(0, Math.min(16, pageHash.length())));

                    // Verificar se existe holerite com este hash
                    List<Payslip> existing = payslipRepository.findByHashConteudo(pageHash);
                    log.debug("   📊 Página {}: Encontrados {} holerite(s) com este hash", pageNumber, existing.size());

                    if (!existing.isEmpty()) {
                        pagesAlreadyProcessed++;
                        log.info("   ✅ Página {}: Já foi processada anteriormente", pageNumber);

                        // Verificar se pelo menos um holerite não foi excluído
                        boolean hasNonDeleted = existing.stream()
                                .anyMatch(p -> {
                                    try {
                                        boolean exists = p.getArquivoCaminho() != null &&
                                                java.nio.file.Files
                                                        .exists(java.nio.file.Paths.get(p.getArquivoCaminho()));
                                        if (exists) {
                                            log.debug("      ✅ Holerite ID {}: Arquivo físico existe em {}", p.getId(),
                                                    p.getArquivoCaminho());
                                        } else {
                                            log.debug(
                                                    "      ⚠️ Holerite ID {}: Arquivo físico NÃO existe (foi excluído)",
                                                    p.getId());
                                        }
                                        return exists;
                                    } catch (Exception e) {
                                        log.warn("      ⚠️ Erro ao verificar arquivo físico do holerite ID {}: {}",
                                                p.getId(), e.getMessage());
                                        return false;
                                    }
                                });
                        if (hasNonDeleted) {
                            pagesWithNonDeletedPayslips++;
                            log.info("      ✅ Página {}: Pelo menos um holerite não foi excluído", pageNumber);
                        } else {
                            log.warn("      ⚠️ Página {}: Todos os holerites foram excluídos", pageNumber);
                        }
                    } else {
                        log.info(
                                "   ❌ Página {}: Hash não encontrado no banco. Tentando verificação alternativa por CPF/período...",
                                pageNumber);

                        // VERIFICAÇÃO ALTERNATIVA: Se hash não foi encontrado, tentar extrair dados da
                        // página
                        // e verificar se já existe holerite com mesmo CPF, período, empresa e setor
                        try {
                            PDFTextStripper stripper = new PDFTextStripper();
                            stripper.setStartPage(pageNumber);
                            stripper.setEndPage(pageNumber);
                            String pageText = stripper.getText(document);

                            if (pageText == null || pageText.trim().isEmpty()) {
                                log.debug("   ⚠️ Página {}: Texto vazio, não é possível fazer verificação alternativa",
                                        pageNumber);
                            } else {
                                // Extrair dados básicos da página
                                Payslip tempPayslip = extractPayslipInfo(pageText, pageNumber);
                                if (tempPayslip != null && tempPayslip.getCpf() != null &&
                                        tempPayslip.getMonth() != null && tempPayslip.getYear() != null) {

                                    log.debug(
                                            "   📋 Página {}: Dados extraídos - CPF: {}, Período: {}/{}, Empresa: {}, Setor: {}",
                                            pageNumber, tempPayslip.getCpf(), tempPayslip.getMonth(),
                                            tempPayslip.getYear(),
                                            tempPayslip.getCompanyCnpj(), tempPayslip.getWorkPostName());

                                    // Buscar holerites existentes com mesmo CPF, período, empresa e setor
                                    List<Payslip> existingByData = payslipRepository
                                            .findByCompanyCnpjAndCpfAndWorkPostNameAndMonthAndYear(
                                                    tempPayslip.getCompanyCnpj(),
                                                    tempPayslip.getCpf(),
                                                    tempPayslip.getWorkPostName(),
                                                    tempPayslip.getMonth(),
                                                    tempPayslip.getYear());

                                    log.debug(
                                            "   🔍 Página {}: Verificação alternativa encontrou {} holerite(s) com dados idênticos",
                                            pageNumber, existingByData.size());

                                    if (!existingByData.isEmpty()) {
                                        // Verificar se pelo menos um holerite não foi excluído
                                        boolean hasNonDeleted = existingByData.stream()
                                                .anyMatch(p -> {
                                                    try {
                                                        boolean exists = p.getArquivoCaminho() != null &&
                                                                java.nio.file.Files.exists(
                                                                        java.nio.file.Paths.get(p.getArquivoCaminho()));
                                                        if (exists) {
                                                            log.debug(
                                                                    "      ✅ Holerite ID {}: Arquivo físico existe em {}",
                                                                    p.getId(), p.getArquivoCaminho());
                                                        } else {
                                                            log.debug(
                                                                    "      ⚠️ Holerite ID {}: Arquivo físico NÃO existe (foi excluído)",
                                                                    p.getId());
                                                        }
                                                        return exists;
                                                    } catch (Exception e) {
                                                        log.warn(
                                                                "      ⚠️ Erro ao verificar arquivo físico do holerite ID {}: {}",
                                                                p.getId(), e.getMessage());
                                                        return false;
                                                    }
                                                });

                                        if (hasNonDeleted) {
                                            log.warn(
                                                    "   ⚠️ Página {}: Encontrado holerite existente por CPF/período/empresa (CPF: {}, Período: {}/{}, Empresa: {}, Setor: {})",
                                                    pageNumber, tempPayslip.getCpf(), tempPayslip.getMonth(),
                                                    tempPayslip.getYear(),
                                                    tempPayslip.getCompanyCnpj(), tempPayslip.getWorkPostName());
                                            log.warn(
                                                    "      Hash diferente, mas dados idênticos - considerando como já processado");
                                            pagesAlreadyProcessed++;
                                            pagesWithNonDeletedPayslips++;
                                        } else {
                                            log.debug(
                                                    "   ⚠️ Página {}: Holerites encontrados por dados, mas todos foram excluídos",
                                                    pageNumber);
                                        }
                                    } else {
                                        log.debug(
                                                "   ✅ Página {}: Nenhum holerite encontrado com dados idênticos - página não foi processada anteriormente",
                                                pageNumber);
                                    }
                                } else {
                                    log.debug(
                                            "   ⚠️ Página {}: Não foi possível extrair dados suficientes (CPF, mês ou ano) para verificação alternativa completa",
                                            pageNumber);
                                    // CORREÇÃO: Tentar verificação alternativa mais simples apenas por CPF/período
                                    // mesmo sem empresa/setor para aumentar chances de detectar duplicatas
                                    try {
                                        if (tempPayslip != null && tempPayslip.getCpf() != null &&
                                                tempPayslip.getMonth() != null && tempPayslip.getYear() != null) {

                                            // Buscar holerites existentes apenas por CPF/período (sem empresa/setor)
                                            List<Payslip> existingByCpfPeriod = payslipRepository
                                                    .findByCompanyCnpjAndCpfAndWorkPostNameAndMonthAndYear(
                                                            null, // Empresa não informada - buscar qualquer
                                                            tempPayslip.getCpf(),
                                                            null, // Setor não informado - buscar qualquer
                                                            tempPayslip.getMonth(),
                                                            tempPayslip.getYear());

                                            if (!existingByCpfPeriod.isEmpty()) {
                                                // Verificar se pelo menos um holerite não foi excluído
                                                boolean hasNonDeleted = existingByCpfPeriod.stream()
                                                        .anyMatch(p -> {
                                                            try {
                                                                return p.getArquivoCaminho() != null &&
                                                                        java.nio.file.Files.exists(java.nio.file.Paths
                                                                                .get(p.getArquivoCaminho()));
                                                            } catch (Exception ex) {
                                                                return false;
                                                            }
                                                        });

                                                if (hasNonDeleted) {
                                                    log.warn(
                                                            "   ⚠️ Página {}: Encontrado holerite existente por CPF/período (sem empresa/setor) - CPF: {}, Período: {}/{}",
                                                            pageNumber, tempPayslip.getCpf(), tempPayslip.getMonth(),
                                                            tempPayslip.getYear());
                                                    log.warn(
                                                            "      Considerando como já processado para evitar duplicação");
                                                    pagesAlreadyProcessed++;
                                                    pagesWithNonDeletedPayslips++;
                                                }
                                            }
                                        }
                                    } catch (Exception e2) {
                                        log.debug("   ⚠️ Erro na verificação alternativa simplificada da página {}: {}",
                                                pageNumber, e2.getMessage());
                                    }
                                }
                            }
                        } catch (Exception e) {
                            log.warn("   ⚠️ Erro ao fazer verificação alternativa da página {}: {}", pageNumber,
                                    e.getMessage());
                            // Não logar stack trace completo para não poluir logs - erro já foi registrado
                        }
                    }
                } else {
                    log.warn("   ⚠️ Página {}: Não foi possível calcular hash", pageNumber);
                }
            }

            document.close();

            log.info("📊 RESUMO DA VERIFICAÇÃO DO ARQUIVO '{}':", originalFilename);
            log.info("   Total de páginas: {}", pageCount);
            log.info("   Páginas já processadas: {}", pagesAlreadyProcessed);
            log.info("   Páginas com holerites não excluídos: {}", pagesWithNonDeletedPayslips);
            log.info(
                    "   Condição para bloquear: pagesAlreadyProcessed == pageCount ({}) && pagesWithNonDeletedPayslips == pageCount ({})",
                    pagesAlreadyProcessed == pageCount, pagesWithNonDeletedPayslips == pageCount);

            // CORREÇÃO: Se todas as páginas já foram processadas e não foram excluídas,
            // arquivo já foi processado
            if (pagesAlreadyProcessed == pageCount && pagesWithNonDeletedPayslips == pageCount) {
                log.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                log.warn("⚠️ ARQUIVO '{}' JÁ FOI PROCESSADO ANTERIORMENTE!", originalFilename);
                log.warn("   Todas as {} página(s) já foram processadas e não foram excluídas.", pageCount);
                log.warn("   O arquivo NÃO será processado novamente.");
                log.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                return true;
            }
            // CORREÇÃO: Se TODAS as páginas foram processadas mas algumas foram excluídas,
            // ainda assim considerar como já processado
            // para evitar reprocessar o mesmo arquivo e somar na contagem
            else if (pagesAlreadyProcessed == pageCount && pagesWithNonDeletedPayslips < pageCount) {
                log.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                log.warn("⚠️ ARQUIVO '{}' JÁ FOI PROCESSADO ANTERIORMENTE!", originalFilename);
                log.warn("   Todas as {} página(s) já foram processadas, mas {} foram excluídas.",
                        pageCount, pageCount - pagesWithNonDeletedPayslips);
                log.warn("   Para evitar duplicação na contagem, o arquivo NÃO será processado novamente.");
                log.warn("   Se necessário reprocessar, exclua os registros existentes primeiro.");
                log.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                return true; // CORREÇÃO: Retornar true para bloquear reprocessamento
            }
            // CORREÇÃO: Se a maioria das páginas já foi processada (>80%), considerar como
            // já processado
            // para evitar reprocessar parcialmente e somar na contagem incorretamente
            else if (pagesAlreadyProcessed > 0 && pagesWithNonDeletedPayslips > 0) {
                double percentProcessed = (double) pagesWithNonDeletedPayslips / pageCount * 100.0;
                if (percentProcessed >= 80.0) {
                    log.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                    log.warn("⚠️ ARQUIVO '{}' PARCIALMENTE PROCESSADO E BLOQUEADO!", originalFilename);
                    log.warn("   {}/{} página(s) já foram processadas ({:.1f}%).",
                            pagesWithNonDeletedPayslips, pageCount, percentProcessed);
                    log.warn("   Para evitar duplicação na contagem, o arquivo NÃO será processado novamente.");
                    log.warn("   Se necessário reprocessar, exclua os registros existentes primeiro.");
                    log.warn("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                    return true; // CORREÇÃO: Retornar true para bloquear reprocessamento quando maioria já
                                 // processada
                } else {
                    log.warn(
                            "⚠️ Arquivo '{}' parcialmente processado: {}/{} página(s) ({:.1f}%). Permitindo processar páginas faltantes...",
                            originalFilename, pagesAlreadyProcessed, pageCount, percentProcessed);
                    return false;
                }
            } else if (pagesAlreadyProcessed == 0) {
                log.info("✅ Arquivo '{}' não foi processado anteriormente. Todas as {} página(s) serão processadas.",
                        originalFilename, pageCount);
                return false;
            } else {
                log.warn(
                        "⚠️ Situação inesperada: pagesAlreadyProcessed={}, pagesWithNonDeletedPayslips={}, pageCount={}",
                        pagesAlreadyProcessed, pagesWithNonDeletedPayslips, pageCount);
                log.warn("   Por segurança, permitindo processamento...");
                return false;
            }
        } catch (Exception e) {
            log.error("❌ Erro ao verificar se arquivo já foi processado: {}", e.getMessage(), e);
            return false;
        }
    }

    /**
     * Calcula hash do arquivo PDF de uma página específica (método recomendado para
     * comparação)
     * Este método extrai a página do PDF, cria um documento temporário e calcula o
     * hash dos bytes
     * Isso garante comparação mais confiável do que comparar apenas o texto
     * extraído
     */
    private String calculatePagePdfHash(PDDocument document, int pageNumber) {
        try {
            if (document == null || pageNumber < 1 || pageNumber > document.getNumberOfPages()) {
                log.warn("⚠️ Parâmetros inválidos para calcular hash do PDF: document={}, pageNumber={}",
                        document != null, pageNumber);
                return null;
            }

            // Criar um novo documento com apenas a página desejada
            try (PDDocument singlePageDoc = new PDDocument()) {
                PDPage page = document.getPage(pageNumber - 1);
                singlePageDoc.addPage(page);

                // Salvar em um ByteArrayOutputStream para obter os bytes
                java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
                singlePageDoc.save(baos);
                byte[] pdfBytes = baos.toByteArray();

                // Calcular hash SHA-256 dos bytes do PDF
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                byte[] hashBytes = digest.digest(pdfBytes);

                // Converter para hexadecimal (64 caracteres)
                StringBuilder hexString = new StringBuilder();
                for (byte b : hashBytes) {
                    String hex = Integer.toHexString(0xff & b);
                    if (hex.length() == 1) {
                        hexString.append('0');
                    }
                    hexString.append(hex);
                }

                String hash = hexString.toString();
                log.debug("🔐 Hash do PDF da página {} calculado: {}...", pageNumber,
                        hash.substring(0, Math.min(16, hash.length())));
                return hash;
            }
        } catch (Exception e) {
            log.warn("⚠️ Erro ao calcular hash do PDF da página {}: {}", pageNumber, e.getMessage());
            return null;
        }
    }

    /**
     * TASK 02: Obtém hash do arquivo PDF salvo (se existir) para comparação
     * Usa arquivo_caminho se disponível, senão tenta construir o caminho conforme
     * nova estrutura
     */
    private String getPayslipFileHash(Payslip payslip) {
        try {
            if (payslip == null || payslip.getFileName() == null) {
                return null;
            }

            Path candidatePath = null;

            // 1. Tentar usar arquivo_caminho se disponível (nova estrutura)
            if (payslip.getArquivoCaminho() != null && !payslip.getArquivoCaminho().isEmpty()) {
                candidatePath = Paths.get(payslip.getArquivoCaminho());
                if (Files.exists(candidatePath)) {
                    log.debug("📄 Usando arquivo_caminho do banco: {}", candidatePath);
                } else {
                    candidatePath = null; // Tentar outras opções
                }
            }

            // 2. Se não encontrou, tentar construir caminho conforme nova estrutura PRD
            if (candidatePath == null || !Files.exists(candidatePath)) {
                String empresaCnpj = normalizeCnpj(payslip.getCompanyCnpj());
                String setorNome = normalizeSectorName(payslip.getWorkPostName());
                String periodo = String.format("%d-%02d", payslip.getYear(), payslip.getMonth());
                String funcionarioNome = payslip.getEmployeeName() != null
                        ? normalizeEmployeeName(payslip.getEmployeeName())
                        : null;
                String funcionarioCpf = payslip.getCpf() != null ? payslip.getCpf().replaceAll("[^0-9]", "") : null;

                if (empresaCnpj != null && setorNome != null && funcionarioNome != null && funcionarioCpf != null) {
                    String pastaFuncionario = String.format("%s_%s", funcionarioNome, funcionarioCpf);
                    candidatePath = Paths.get(OUTPUT_DIR, empresaCnpj, setorNome, periodo, pastaFuncionario,
                            payslip.getFileName());
                    if (Files.exists(candidatePath)) {
                        log.debug("📄 Arquivo encontrado na nova estrutura: {}", candidatePath);
                    } else {
                        candidatePath = null;
                    }
                }
            }

            // 3. Fallback: tentar estrutura antiga
            if (candidatePath == null || !Files.exists(candidatePath)) {
                String mesAno = String.format("%s-%s", payslip.getMonth(), payslip.getYear());
                candidatePath = Paths.get(OUTPUT_DIR, mesAno, payslip.getFileName());
                if (Files.exists(candidatePath)) {
                    log.debug("📄 Arquivo encontrado na estrutura antiga: {}", candidatePath);
                } else {
                    Optional<String> pathOpt = resolvePayslipPathByCpfMonthYear(payslip.getCpf(), payslip.getMonth(),
                            payslip.getYear());
                    if (pathOpt.isPresent()) {
                        candidatePath = Paths.get(pathOpt.get());
                    }
                }
            }

            if (candidatePath == null || !Files.exists(candidatePath)) {
                log.debug("📄 Arquivo PDF não encontrado para calcular hash: {}", payslip.getFileName());
                return null;
            }

            // Ler conteúdo do arquivo e calcular hash SHA-256 em hexadecimal
            byte[] fileBytes = Files.readAllBytes(candidatePath);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(fileBytes);
            // Converter para hexadecimal (64 caracteres)
            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            String hash = hexString.toString();

            log.debug("🔐 Hash calculado do arquivo original {}: {}...", payslip.getFileName(),
                    hash.substring(0, Math.min(16, hash.length())));
            return hash;
        } catch (Exception e) {
            log.warn("⚠️ Erro ao obter hash do arquivo salvo {}: {}", payslip != null ? payslip.getFileName() : "null",
                    e.getMessage());
            return null;
        }
    }

    /**
     * TASK 02: Compara dois holerites e detecta alterações (dados extraídos e
     * conteúdo do arquivo)
     */
    private PayslipComparisonResult comparePayslips(Payslip existing, Payslip newPayslip, String hashArquivoOriginal,
            String hashPaginaAtual) {
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

        // 1. Comparar hash do arquivo (mais confiável para detectar mudanças no PDF
        // original)
        // IMPORTANTE: Se o hash do PDF for idêntico, não há alterações reais - não
        // criar nova versão
        boolean hashIdentico = false;
        if (hashArquivoOriginal != null && hashPaginaAtual != null) {
            if (hashArquivoOriginal.equals(hashPaginaAtual)) {
                hashIdentico = true;
                log.info("✅ Hash do arquivo PDF idêntico - conteúdo do PDF não mudou. Não será criada nova versão.");
                // Se o hash é idêntico, não há alterações reais - retornar sem verificar outras
                // coisas
                return result; // Retorna hasChanges=false
            } else {
                // Hash diferente - mas vamos verificar APENAS os dados financeiros
                // Não adicionar diferença ainda - vamos verificar os dados financeiros primeiro
                log.info(
                        "🔐 Hash do arquivo diferente detectado - verificando dados financeiros para determinar se cria versão");
            }
        } else if (hashArquivoOriginal == null && hashPaginaAtual != null) {
            // Se não temos hash do original mas temos do novo, continuar verificando dados
            // financeiros
            log.warn("⚠️ Hash do arquivo original não disponível - verificando dados financeiros");
        } else if (hashArquivoOriginal != null && hashPaginaAtual == null) {
            log.warn("⚠️ Hash da página atual não disponível - verificando dados financeiros");
        }

        // 2. REGRA CRÍTICA: Comparar APENAS valores financeiros para determinar se cria
        // versão
        // NÃO comparar outros campos (nome, CPF, setor, etc.) - esses não devem criar
        // versão
        // Esta é uma verificação CRÍTICA - qualquer diferença nos valores financeiros
        // deve ser detectada
        log.info("🔍 Comparando APENAS valores financeiros para determinar se cria versão...");

        // Declarar variáveis para verificar diferenças financeiras
        boolean hasFinancialDifferences = false;
        boolean hasTableDetailsDifferences = false;

        // Comparar Total Vencimentos
        if (existing.getTotalEarnings() != null && newPayslip.getTotalEarnings() != null) {
            int comparison = existing.getTotalEarnings().compareTo(newPayslip.getTotalEarnings());
            if (comparison != 0) {
                hasFinancialDifferences = true;
                log.warn("💰 ALTERAÇÃO DETECTADA em Total Vencimentos: {} -> {}",
                        existing.getTotalEarnings(), newPayslip.getTotalEarnings());
            } else {
                log.debug("✅ Total Vencimentos idêntico: {}", existing.getTotalEarnings());
            }
        } else if (existing.getTotalEarnings() == null ^ newPayslip.getTotalEarnings() != null) {
            hasFinancialDifferences = true;
            log.warn("💰 Total Vencimentos: {} -> {}",
                    existing.getTotalEarnings() != null ? existing.getTotalEarnings() : "não disponível",
                    newPayslip.getTotalEarnings() != null ? newPayslip.getTotalEarnings() : "não disponível");
        } else {
            log.debug("⚠️ Total Vencimentos não disponível em ambos os holerites");
        }

        // Comparar Total Descontos
        if (!hasFinancialDifferences && existing.getTotalDeductions() != null
                && newPayslip.getTotalDeductions() != null) {
            int comparison = existing.getTotalDeductions().compareTo(newPayslip.getTotalDeductions());
            if (comparison != 0) {
                hasFinancialDifferences = true;
                log.warn("💰 ALTERAÇÃO DETECTADA em Total Descontos: {} -> {}",
                        existing.getTotalDeductions(), newPayslip.getTotalDeductions());
            } else {
                log.debug("✅ Total Descontos idêntico: {}", existing.getTotalDeductions());
            }
        } else if (!hasFinancialDifferences
                && (existing.getTotalDeductions() == null ^ newPayslip.getTotalDeductions() != null)) {
            hasFinancialDifferences = true;
            log.warn("💰 Total Descontos: {} -> {}",
                    existing.getTotalDeductions() != null ? existing.getTotalDeductions() : "não disponível",
                    newPayslip.getTotalDeductions() != null ? newPayslip.getTotalDeductions() : "não disponível");
        } else if (!hasFinancialDifferences) {
            log.debug("⚠️ Total Descontos não disponível em ambos os holerites");
        }

        // Comparar Valor Líquido
        if (!hasFinancialDifferences && existing.getNetValue() != null && newPayslip.getNetValue() != null) {
            int comparison = existing.getNetValue().compareTo(newPayslip.getNetValue());
            if (comparison != 0) {
                hasFinancialDifferences = true;
                log.warn("💰 ALTERAÇÃO DETECTADA em Valor Líquido: {} -> {}",
                        existing.getNetValue(), newPayslip.getNetValue());
            } else {
                log.debug("✅ Valor Líquido idêntico: {}", existing.getNetValue());
            }
        } else if (!hasFinancialDifferences && (existing.getNetValue() == null ^ newPayslip.getNetValue() != null)) {
            hasFinancialDifferences = true;
            log.warn("💰 Valor Líquido: {} -> {}",
                    existing.getNetValue() != null ? existing.getNetValue() : "não disponível",
                    newPayslip.getNetValue() != null ? newPayslip.getNetValue() : "não disponível");
        } else if (!hasFinancialDifferences) {
            log.debug("⚠️ Valor Líquido não disponível em ambos os holerites");
        }

        // Comparar dados detalhados da tabela (Cód, Descrição, Referência, Vencimentos,
        // Descontos)
        log.debug("🔍 Comparando dados detalhados da tabela...");
        log.debug("   Holerite existente: {} linhas",
                existing.getTableDetails() != null ? existing.getTableDetails().size() : 0);
        log.debug("   Holerite novo: {} linhas",
                newPayslip.getTableDetails() != null ? newPayslip.getTableDetails().size() : 0);

        if (existing.getTableDetails() != null && newPayslip.getTableDetails() != null) {
            if (existing.getTableDetails().size() != newPayslip.getTableDetails().size()) {
                hasTableDetailsDifferences = true;
                log.warn("📋 Número de linhas diferente: {} vs {}",
                        existing.getTableDetails().size(), newPayslip.getTableDetails().size());
            } else {
                // Comparar conteúdo das linhas
                for (int i = 0; i < existing.getTableDetails().size(); i++) {
                    var existingRow = existing.getTableDetails().get(i);
                    var newRow = newPayslip.getTableDetails().get(i);
                    if (!Objects.equals(existingRow.getCodigo(), newRow.getCodigo()) ||
                            !Objects.equals(existingRow.getDescricao(), newRow.getDescricao()) ||
                            !Objects.equals(existingRow.getReferencia(), newRow.getReferencia()) ||
                            (existingRow.getVencimentos() != null && newRow.getVencimentos() != null &&
                                    existingRow.getVencimentos().compareTo(newRow.getVencimentos()) != 0)
                            ||
                            (existingRow.getDescontos() != null && newRow.getDescontos() != null &&
                                    existingRow.getDescontos().compareTo(newRow.getDescontos()) != 0)) {
                        hasTableDetailsDifferences = true;
                        log.warn("📋 Linha {} diferente: Cód={}, Desc={}, Venc={}, Desc={}",
                                i, existingRow.getCodigo(), existingRow.getDescricao(),
                                existingRow.getVencimentos(), existingRow.getDescontos());
                        break;
                    }
                }
            }
        } else if (existing.getTableDetails() == null ^ newPayslip.getTableDetails() == null) {
            hasTableDetailsDifferences = true;
            log.warn("📋 TableDetails: {} -> {}",
                    existing.getTableDetails() != null ? existing.getTableDetails().size() + " linhas"
                            : "não disponível",
                    newPayslip.getTableDetails() != null ? newPayslip.getTableDetails().size() + " linhas"
                            : "não disponível");
        } else {
            log.debug("⚠️ Dados da tabela não disponíveis em ambos os holerites");
        }

        // Verificação final: Se o hash for diferente mas todos os dados extraídos forem
        // idênticos,
        // provavelmente é apenas diferença em metadados do PDF (data de criação, etc.)
        // - considerar como duplicado
        if (!hashIdentico && hashArquivoOriginal != null && hashPaginaAtual != null &&
                !hashArquivoOriginal.equals(hashPaginaAtual)) {
            // Hash diferente, mas vamos verificar se os dados são realmente idênticos
            // Verificar diretamente os dados, não através do result.getDifferences() que
            // pode já ter diferenças
            boolean dadosIdenticos = !hasFinancialDifferences && !hasTableDetailsDifferences;

            // Verificar também se não há diferenças nos campos básicos (nome, CPF, setor,
            // etc.)
            boolean camposBasicosIdenticos = Objects.equals(normalizeString(existing.getEmployeeName()),
                    normalizeString(newPayslip.getEmployeeName())) &&
                    Objects.equals(normalizeString(existing.getCpf()), normalizeString(newPayslip.getCpf())) &&
                    Objects.equals(normalizeString(existing.getCompanyCnpj()),
                            normalizeString(newPayslip.getCompanyCnpj()))
                    &&
                    Objects.equals(normalizeString(existing.getWorkPostName()),
                            normalizeString(newPayslip.getWorkPostName()))
                    &&
                    Objects.equals(existing.getMonth(), newPayslip.getMonth()) &&
                    Objects.equals(existing.getYear(), newPayslip.getYear());

            if (dadosIdenticos && camposBasicosIdenticos) {
                log.info("✅ Hash do PDF diferente, mas todos os dados extraídos são idênticos.");
                log.info("   Provavelmente é apenas diferença em metadados do PDF (data de criação, etc.).");
                log.info("   Considerando como duplicado - não será criada nova versão.");
                // Limpar diferenças e retornar sem alterações
                result = PayslipComparisonResult.builder()
                        .hasChanges(false)
                        .differences(new ArrayList<>())
                        .build();
                return result;
            } else {
                // Hash diferente E dados diferentes - realmente houve alteração
                if (!result.getDifferences().stream().anyMatch(d -> d.contains("Hash do arquivo"))) {
                    result.addDifference("Hash do arquivo", "diferente", "arquivo foi modificado");
                }
                log.info("🔐 Hash do arquivo diferente E dados diferentes - alteração real detectada");
                if (!dadosIdenticos) {
                    log.info("   Diferenças detectadas: financeiras={}, tableDetails={}", hasFinancialDifferences,
                            hasTableDetailsDifferences);
                }
                if (!camposBasicosIdenticos) {
                    log.info("   Diferenças detectadas nos campos básicos");
                }
            }
        }

        // REGRA CRÍTICA: Só criar versão se houver diferenças nos DADOS FINANCEIROS
        // Não criar versão por diferenças em outros campos (nome do arquivo, hash,
        // etc.)
        // Se não há diferenças financeiras, considerar como duplicado mesmo que hash
        // seja diferente
        if (!hasFinancialDifferences && !hasTableDetailsDifferences) {
            // Não há diferenças financeiras - não criar nova versão
            log.info("✅ Nenhuma diferença financeira detectada - não será criada nova versão");
            log.info("   Total Vencimentos: {} (idêntico)",
                    existing.getTotalEarnings() != null ? existing.getTotalEarnings() : "N/A");
            log.info("   Total Descontos: {} (idêntico)",
                    existing.getTotalDeductions() != null ? existing.getTotalDeductions() : "N/A");
            log.info("   Valor Líquido: {} (idêntico)",
                    existing.getNetValue() != null ? existing.getNetValue() : "N/A");
            log.info("   TableDetails: {} linhas (idêntico)",
                    existing.getTableDetails() != null ? existing.getTableDetails().size() : 0);

            // Limpar diferenças e retornar sem alterações
            result = PayslipComparisonResult.builder()
                    .hasChanges(false)
                    .differences(new ArrayList<>())
                    .build();
            return result;
        }

        // Se detectou diferenças financeiras ou em tableDetails, marcar como alteração
        if (hasFinancialDifferences || hasTableDetailsDifferences) {
            if (!result.hasChanges()) {
                log.warn("⚠️ DIFERENÇAS FINANCEIRAS DETECTADAS - FORÇANDO hasChanges=true");
                if (hasFinancialDifferences) {
                    result.addDifference("Valores financeiros", "diferentes", "detectado na verificação adicional");
                }
                if (hasTableDetailsDifferences) {
                    result.addDifference("Dados da tabela", "diferentes", "detectado na verificação adicional");
                }
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

                if (!Objects.equals(normalizeString(existingRow.getDescricao()),
                        normalizeString(newRow.getDescricao()))) {
                    result.addDifference(String.format("Descrição (Cód: %s)", codigo),
                            existingRow.getDescricao() != null ? existingRow.getDescricao() : "null",
                            newRow.getDescricao() != null ? newRow.getDescricao() : "null");
                    hasChanges = true;
                    rowChanged = true;
                    log.warn("📋 Descrição alterada para código {}: '{}' -> '{}'", codigo, existingRow.getDescricao(),
                            newRow.getDescricao());
                }

                if (!Objects.equals(normalizeString(existingRow.getReferencia()),
                        normalizeString(newRow.getReferencia()))) {
                    result.addDifference(String.format("Referência (Cód: %s)", codigo),
                            existingRow.getReferencia() != null ? existingRow.getReferencia() : "null",
                            newRow.getReferencia() != null ? newRow.getReferencia() : "null");
                    hasChanges = true;
                    rowChanged = true;
                    log.warn("📋 Referência alterada para código {}: '{}' -> '{}'", codigo, existingRow.getReferencia(),
                            newRow.getReferencia());
                }

                if (existingRow.getVencimentos() != null && newRow.getVencimentos() != null) {
                    if (existingRow.getVencimentos().compareTo(newRow.getVencimentos()) != 0) {
                        result.addDifference(String.format("Vencimentos (Cód: %s)", codigo),
                                existingRow.getVencimentos().toString(), newRow.getVencimentos().toString());
                        hasChanges = true;
                        rowChanged = true;
                        log.warn("📋 Vencimentos alterados para código {}: {} -> {}", codigo,
                                existingRow.getVencimentos(), newRow.getVencimentos());
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
                        log.warn("📋 Descontos alterados para código {}: {} -> {}", codigo, existingRow.getDescontos(),
                                newRow.getDescontos());
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
     * Procura por linhas que seguem o padrão: Cód | Descrição | Referência |
     * Vencimentos | Descontos
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
            if (inTableSection && (linhaUpper.contains("TOTAL") ||
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
                        "^(\\d{3})\\s+" + // Código (3 dígitos)
                                "([A-ZÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇa-záàâãäéèêëíìîïóòôõöúùûüç\\s]+?)\\s+" + // Descrição
                                "([\\d.,%\\s]+?)\\s+" + // Referência
                                "([\\d.,]+)?\\s*" + // Vencimentos (opcional)
                                "([\\d.,]+)?$" // Descontos (opcional)
                );

                // Padrão 2: Mais flexível para OCR (pode ter espaços extras ou caracteres
                // estranhos)
                Pattern pattern2 = Pattern.compile(
                        "^(\\d{3})[\\s|]+" + // Código seguido de espaço ou pipe
                                "([A-ZÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇa-záàâãäéèêëíìîïóòôõöúùûüç\\s]+?)[\\s|]+" + // Descrição
                                "([\\d.,%\\s]+?)[\\s|]+" + // Referência
                                "([\\d.,]+)?[\\s|]*" + // Vencimentos (opcional)
                                "([\\d.,]+)?$" // Descontos (opcional)
                );

                // Padrão 3: Ainda mais flexível - apenas código e descrição obrigatórios
                Pattern pattern3 = Pattern.compile(
                        "^(\\d{3})\\s+" + // Código
                                "(.+?)\\s+" + // Descrição (qualquer coisa)
                                "([\\d.,%\\s]*?)\\s*" + // Referência (opcional)
                                "([\\d.,]+)?\\s*" + // Vencimentos (opcional)
                                "([\\d.,]+)?$" // Descontos (opcional)
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
                        String referencia = matcher.groupCount() >= 3 && matcher.group(3) != null
                                ? matcher.group(3).trim()
                                : "";
                        String vencimentosStr = matcher.groupCount() >= 4 && matcher.group(4) != null
                                ? matcher.group(4).trim()
                                : null;
                        String descontosStr = matcher.groupCount() >= 5 && matcher.group(5) != null
                                ? matcher.group(5).trim()
                                : null;

                        // Limpar descrição (remover caracteres estranhos do OCR)
                        descricao = descricao.replaceAll("[|\\|]", " ").replaceAll("\\s+", " ").trim();

                        // Converter valores monetários
                        java.math.BigDecimal vencimentos = parseMonetaryValue(vencimentosStr);
                        java.math.BigDecimal descontos = parseMonetaryValue(descontosStr);

                        // Validar código (deve ser 3 dígitos)
                        if (codigo != null && codigo.matches("\\d{3}") &&
                                descricao != null && !descricao.isEmpty() && descricao.length() >= 3) {

                            com.z7design.secured_guard.dto.PayslipTableRow row = com.z7design.secured_guard.dto.PayslipTableRow
                                    .builder()
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
                        log.debug("⚠️ Erro ao extrair linha {} da tabela: {} - {}", linhaIndex, linhaTrimmed,
                                e.getMessage());
                    }
                } else {
                    // Se não encontrou padrão, mas está na seção da tabela e tem código de 3
                    // dígitos, tentar extrair manualmente
                    if (linhaTrimmed.matches("^\\d{3}.*")) {
                        log.debug("⚠️ Linha {} na seção da tabela mas não correspondeu ao padrão: {}", linhaIndex,
                                linhaTrimmed);
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
     * Método alternativo para extrair dados da tabela quando a seção não foi
     * detectada
     * Procura por linhas que começam com código de 3 dígitos em qualquer lugar do
     * texto
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
                        while (idx < partes.length && !partes[idx].matches("^[\\d.,]+$")
                                && !partes[idx].contains("%")) {
                            if (descricao.length() > 0)
                                descricao.append(" ");
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
                            com.z7design.secured_guard.dto.PayslipTableRow row = com.z7design.secured_guard.dto.PayslipTableRow
                                    .builder()
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
     * Normaliza string para comparação (remove espaços, converte para maiúsculas,
     * trata null)
     */
    private String normalizeString(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().toUpperCase().replaceAll("\\s+", " ");
    }

    /**
     * TASK 04: Organiza holerites por tipo de empresa (Terceirização vs Vigilância
     * e ADM)
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

                // Determinar tipo de empresa: TERC = Terceirização, VIG = Vigilância, ADM =
                // Administrativo
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
                            terceirizacaoSectorKeys
                                    .add(company.getCompanySigla() + "|" + sector.getNormalizedSectorName());
                        }
                    }
                } else if (isVigilancia) {
                    // VIG = Vigilância
                    vigilanciaCompanies.add(typeCompanyGroup);
                    vigilanciaTotalPayslips += company.getTotalPayslips();

                    // Contar setores únicos
                    if (company.getSectors() != null) {
                        for (PayslipOrganizationResponse.SectorGroup sector : company.getSectors()) {
                            vigilanciaSectorKeys
                                    .add(company.getCompanySigla() + "|" + sector.getNormalizedSectorName());
                        }
                    }
                } else if (isAdministrativo) {
                    // ADM ou OUTROS = Administrativo
                    administrativoCompanies.add(typeCompanyGroup);
                    administrativoTotalPayslips += company.getTotalPayslips();

                    // Contar setores únicos
                    if (company.getSectors() != null) {
                        for (PayslipOrganizationResponse.SectorGroup sector : company.getSectors()) {
                            administrativoSectorKeys
                                    .add(company.getCompanySigla() + "|" + sector.getNormalizedSectorName());
                        }
                    }
                }
            }

            // Ordenar empresas por sigla e nome
            terceirizacaoCompanies.sort((a, b) -> {
                int siglaCompare = defaultString(a.getCompanySigla(), "")
                        .compareToIgnoreCase(defaultString(b.getCompanySigla(), ""));
                if (siglaCompare != 0)
                    return siglaCompare;
                return defaultString(a.getCompanyName(), "").compareToIgnoreCase(defaultString(b.getCompanyName(), ""));
            });

            vigilanciaCompanies.sort((a, b) -> {
                int siglaCompare = defaultString(a.getCompanySigla(), "")
                        .compareToIgnoreCase(defaultString(b.getCompanySigla(), ""));
                if (siglaCompare != 0)
                    return siglaCompare;
                return defaultString(a.getCompanyName(), "").compareToIgnoreCase(defaultString(b.getCompanyName(), ""));
            });

            administrativoCompanies.sort((a, b) -> {
                int siglaCompare = defaultString(a.getCompanySigla(), "")
                        .compareToIgnoreCase(defaultString(b.getCompanySigla(), ""));
                if (siglaCompare != 0)
                    return siglaCompare;
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
                    terceirizacaoGroup.getTotalCompanies(), terceirizacaoGroup.getTotalSectors(),
                    terceirizacaoGroup.getTotalPayslips());
            log.info("   Vigilância: {} empresa(s), {} setor(es), {} holerite(s)",
                    vigilanciaGroup.getTotalCompanies(), vigilanciaGroup.getTotalSectors(),
                    vigilanciaGroup.getTotalPayslips());
            log.info("   Administrativo: {} empresa(s), {} setor(es), {} holerite(s)",
                    administrativoGroup.getTotalCompanies(), administrativoGroup.getTotalSectors(),
                    administrativoGroup.getTotalPayslips());

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
     * Converte PayslipOrganizationResponse.CompanyGroup para
     * CompanyTypeOrganizationResponse.CompanyGroup
     */
    private CompanyTypeOrganizationResponse.CompanyGroup convertToCompanyTypeGroup(
            PayslipOrganizationResponse.CompanyGroup company) {
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

    /**
     * Atualiza holerites existentes que não têm empresa ou setor, extraindo essas
     * informações dos PDFs salvos
     */
    @Transactional
    public Map<String, Object> updateMissingCompanyAndSectorData() {
        Map<String, Object> result = new HashMap<>();
        int totalProcessed = 0;
        int updated = 0;
        int failed = 0;
        List<String> errors = new ArrayList<>();

        try {
            // Buscar todos os holerites que não têm empresa ou setor
            List<Payslip> payslips = payslipRepository.findAll();
            List<Payslip> payslipsToUpdate = payslips.stream()
                    .filter(p -> (p.getCompanyName() == null || p.getCompanyName().trim().isEmpty() ||
                            p.getCompanyCnpj() == null || p.getCompanyCnpj().trim().isEmpty() ||
                            p.getWorkPostName() == null || p.getWorkPostName().trim().isEmpty()) &&
                            p.getArquivoCaminho() != null && !p.getArquivoCaminho().trim().isEmpty())
                    .collect(Collectors.toList());

            log.info("🔍 Encontrados {} holerites para atualizar (de {} total)", payslipsToUpdate.size(),
                    payslips.size());

            for (Payslip payslip : payslipsToUpdate) {
                totalProcessed++;
                try {
                    // Extrair texto do PDF
                    String pdfText = extractTextFromPdf(payslip.getArquivoCaminho());
                    if (pdfText == null || pdfText.trim().isEmpty()) {
                        log.warn("⚠️ Não foi possível extrair texto do PDF: {}", payslip.getArquivoCaminho());
                        failed++;
                        errors.add("Payslip " + payslip.getId() + ": Não foi possível extrair texto do PDF");
                        continue;
                    }

                    boolean updatedFlag = false;

                    // Extrair empresa e setor do texto
                    if (payslip.getCompanyName() == null || payslip.getCompanyName().trim().isEmpty() ||
                            payslip.getCompanyCnpj() == null || payslip.getCompanyCnpj().trim().isEmpty()) {
                        String companyName = extractCompanyNameFromText(pdfText);
                        String companyCnpj = extractCompanyCnpjFromText(pdfText);

                        if (companyName != null && !companyName.trim().isEmpty()) {
                            payslip.setCompanyName(companyName);
                            updatedFlag = true;
                        }
                        if (companyCnpj != null && !companyCnpj.trim().isEmpty()) {
                            payslip.setCompanyCnpj(companyCnpj);
                            updatedFlag = true;
                            // Tentar enriquecer com dados da empresa
                            enrichCompanyData(payslip);
                        }
                    }

                    if (payslip.getWorkPostName() == null || payslip.getWorkPostName().trim().isEmpty()) {
                        String workPostName = extractSectorFromText(pdfText);
                        if (workPostName != null && !workPostName.trim().isEmpty()) {
                            payslip.setWorkPostName(workPostName);
                            updatedFlag = true;
                        }
                    }

                    if (updatedFlag) {
                        payslipRepository.save(payslip);
                        updated++;
                        log.info("✅ Atualizado payslip {}: Empresa={}, CNPJ={}, Setor={}",
                                payslip.getId(), payslip.getCompanyName(), payslip.getCompanyCnpj(),
                                payslip.getWorkPostName());
                    }

                } catch (Exception e) {
                    log.error("❌ Erro ao atualizar payslip {}: {}", payslip.getId(), e.getMessage(), e);
                    failed++;
                    errors.add("Payslip " + payslip.getId() + ": " + e.getMessage());
                }
            }

            result.put("totalProcessed", totalProcessed);
            result.put("updated", updated);
            result.put("failed", failed);
            result.put("errors", errors);
            result.put("success", true);

            log.info("✅ Atualização concluída: {} processados, {} atualizados, {} falharam",
                    totalProcessed, updated, failed);

        } catch (Exception e) {
            log.error("❌ Erro ao atualizar holerites: {}", e.getMessage(), e);
            result.put("success", false);
            result.put("error", e.getMessage());
        }

        return result;
    }

    private String extractTextFromPdf(String filePath) {
        try {
            java.io.File pdfFile = new java.io.File(filePath);
            if (!pdfFile.exists()) {
                log.warn("⚠️ Arquivo não encontrado: {}", filePath);
                return null;
            }

            try (org.apache.pdfbox.pdmodel.PDDocument document = org.apache.pdfbox.pdmodel.PDDocument.load(pdfFile)) {
                org.apache.pdfbox.text.PDFTextStripper stripper = new org.apache.pdfbox.text.PDFTextStripper();
                stripper.setStartPage(1);
                stripper.setEndPage(Math.min(2, document.getNumberOfPages())); // Primeiras 2 páginas
                return stripper.getText(document);
            }
        } catch (Exception e) {
            log.error("❌ Erro ao extrair texto do PDF {}: {}", filePath, e.getMessage(), e);
            return null;
        }
    }

    private String extractCompanyNameFromText(String text) {
        if (text == null || text.trim().isEmpty()) {
            return null;
        }

        String[] linhas = text.split("\r?\n");

        // Padrão 1: Procurar por CNPJ e pegar nome da mesma linha ou linha anterior
        Pattern cnpjPattern = Pattern.compile(
                "CNPJ[:\\s]*([0-9]{2}\\.?[0-9]{3}\\.?[0-9]{3}/?[0-9]{4}-?[0-9]{2}|[0-9]{14})",
                Pattern.CASE_INSENSITIVE);
        for (int i = 0; i < linhas.length; i++) {
            String linha = linhas[i].trim();
            Matcher cnpjMatcher = cnpjPattern.matcher(linha);
            if (cnpjMatcher.find()) {
                int cnpjIndex = linha.toUpperCase().indexOf("CNPJ");
                if (cnpjIndex > 10) {
                    String possibleName = linha.substring(0, cnpjIndex).trim();
                    possibleName = possibleName.replaceAll("(?i)(EMPRESA|RAZÃO SOCIAL|EMPREGADOR)[:\\s]*", "").trim();
                    if (possibleName.length() > 5 && !possibleName.matches(".*\\d{3}.*")) {
                        return possibleName.toUpperCase();
                    }
                }

                if (i > 0) {
                    String linhaAnterior = linhas[i - 1].trim();
                    if (linhaAnterior.length() > 5 && !linhaAnterior.matches(".*\\d{3}.*") &&
                            !linhaAnterior.toUpperCase().contains("FOLHA") &&
                            !linhaAnterior.toUpperCase().contains("PAGAMENTO") &&
                            !linhaAnterior.toUpperCase().contains("HOLERITE")) {
                        return linhaAnterior.toUpperCase();
                    }
                }
            }
        }

        // Padrão 2: Procurar por linhas com "LTDA", "S.A", "ME", etc.
        for (String linha : linhas) {
            String linhaUpper = linha.toUpperCase();
            if ((linhaUpper.contains("LTDA") || linhaUpper.contains("S.A") ||
                    linhaUpper.contains(" ME ") || linhaUpper.contains("EIRELI")) &&
                    !linhaUpper.contains("FUNCIONARIO") && !linhaUpper.contains("CPF") &&
                    linha.length() > 10 && linha.length() < 150) {
                return linha.trim().toUpperCase();
            }
        }

        // Padrão 3: Código + Nome + CNPJ na mesma linha
        Pattern empresaPattern = Pattern.compile("^(\\d{4})\\s+(.+?)\\s+(\\d{14})$");
        for (String linha : linhas) {
            Matcher matcher = empresaPattern.matcher(linha);
            if (matcher.find()) {
                String nome = matcher.group(2).trim();
                if (nome.length() > 5) {
                    return nome.toUpperCase();
                }
            }
        }

        return null;
    }

    private String extractCompanyCnpjFromText(String text) {
        if (text == null || text.trim().isEmpty()) {
            return null;
        }

        Pattern cnpjPattern = Pattern.compile(
                "CNPJ[:\\s]*([0-9]{2}\\.?[0-9]{3}\\.?[0-9]{3}/?[0-9]{4}-?[0-9]{2}|[0-9]{14})",
                Pattern.CASE_INSENSITIVE);
        Matcher matcher = cnpjPattern.matcher(text);
        if (matcher.find()) {
            return matcher.group(1).replaceAll("[^0-9]", "");
        }

        Pattern fallbackPattern = Pattern.compile("(?<!\\d)(\\d{14})(?!\\d)");
        matcher = fallbackPattern.matcher(text.replaceAll("\\s+", ""));
        if (matcher.find()) {
            return matcher.group(1);
        }

        return null;
    }

    private String extractSectorFromText(String text) {
        if (text == null || text.trim().isEmpty()) {
            return null;
        }

        String[] linhas = text.split("\r?\n");

        // Padrão 1: Procurar por "Setor:", "Cargo:", "Local:", "Posto de Trabalho:"
        Pattern sectorPattern = Pattern.compile("(?i)(?:setor|cargo|local|posto\\s+de\\s+trabalho)[:\\s]+(.+)");
        for (String linha : linhas) {
            Matcher matcher = sectorPattern.matcher(linha);
            if (matcher.find()) {
                String setor = matcher.group(1).trim();
                if (setor.length() > 2 && setor.length() < 100) {
                    return setor.toUpperCase();
                }
            }
        }

        // Padrão 2: Procurar setor na linha do período
        Pattern periodoSetorPattern = Pattern.compile("(\\d{2}/\\d{2}/\\d{4})\\s+a\\s+(\\d{2}/\\d{2}/\\d{4})\\s+(.+)");
        for (String linha : linhas) {
            Matcher matcher = periodoSetorPattern.matcher(linha);
            if (matcher.find()) {
                String setor = matcher.group(3).trim();
                setor = setor.replaceAll("\\s+\\d{2}/\\d{4}$", "").trim();
                if (setor.length() > 2 && setor.length() < 100 && !setor.matches(".*\\d{4}.*")) {
                    return setor.toUpperCase();
                }
            }
        }

        return null;
    }
}