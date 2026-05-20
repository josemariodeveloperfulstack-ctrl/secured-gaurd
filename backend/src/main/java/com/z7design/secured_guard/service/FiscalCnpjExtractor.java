package com.z7design.secured_guard.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Extrai CNPJ de arquivos XML (NFe) e PDF para validação no Módulo Fiscal.
 */
@Slf4j
public final class FiscalCnpjExtractor {

    private static final Pattern CNPJ_PATTERN = Pattern.compile("\\b(\\d{2}\\.?\\d{3}\\.?\\d{3}/?\\d{4}-?\\d{2})\\b|\\b(\\d{14})\\b");

    public static final class XmlData {
        public final Optional<String> cnpj;
        public final Optional<String> clientName;
        /** Ano de emissão da nota (ide/dhEmi ou ide/dEmi). */
        public final Optional<Integer> emissionYear;
        /** Mês de emissão da nota (1-12). */
        public final Optional<Integer> emissionMonth;

        public XmlData(Optional<String> cnpj, Optional<String> clientName,
                       Optional<Integer> emissionYear, Optional<Integer> emissionMonth) {
            this.cnpj = cnpj;
            this.clientName = clientName;
            this.emissionYear = emissionYear;
            this.emissionMonth = emissionMonth;
        }
    }

    private FiscalCnpjExtractor() {}

    /**
     * Normaliza CNPJ para apenas dígitos (14 caracteres).
     */
    public static String normalizeCnpj(String cnpj) {
        if (cnpj == null) return "";
        String digits = cnpj.replaceAll("\\D", "");
        return digits.length() >= 14 ? digits.substring(0, 14) : digits;
    }

    /**
     * Extrai CNPJ, nome do destinatário e data de emissão do XML da NFe numa única leitura.
     * A data de emissão vem de ide/dhEmi (datetime) ou ide/dEmi (data).
     */
    public static XmlData extractFromXml(InputStream xmlInput) {
        Optional<String> cnpj = Optional.empty();
        Optional<String> clientName = Optional.empty();
        Optional<Integer> emissionYear = Optional.empty();
        Optional<Integer> emissionMonth = Optional.empty();
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(true);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            DocumentBuilder builder = factory.newDocumentBuilder();
            Document doc = builder.parse(xmlInput);
            Element root = doc.getDocumentElement();

            Element dest = findElementByLocalName(root, "dest");
            if (dest != null) {
                String cnpjVal = getFirstTextByLocalName(dest, "CNPJ");
                if (cnpjVal != null && !cnpjVal.isBlank()) {
                    cnpj = Optional.of(normalizeCnpj(cnpjVal));
                }
                String xNome = getFirstTextByLocalName(dest, "xNome");
                if (xNome != null && !xNome.isBlank()) {
                    clientName = Optional.of(xNome.trim());
                }
            }
            if (cnpj.isEmpty()) {
                NodeList list = doc.getElementsByTagNameNS("*", "CNPJ");
                if (list.getLength() == 0) list = doc.getElementsByTagName("CNPJ");
                for (int i = list.getLength() - 1; i >= 0; i--) {
                    Node n = list.item(i);
                    String text = n.getTextContent();
                    if (text != null && text.replaceAll("\\D", "").length() >= 14) {
                        cnpj = Optional.of(normalizeCnpj(text.trim()));
                        break;
                    }
                }
            }

            Element ide = findElementByLocalName(root, "ide");
            if (ide != null) {
                LocalDate emissionDate = parseEmissionDate(
                    getFirstTextByLocalName(ide, "dhEmi"),
                    getFirstTextByLocalName(ide, "dEmi"));
                if (emissionDate != null) {
                    emissionYear = Optional.of(emissionDate.getYear());
                    emissionMonth = Optional.of(emissionDate.getMonthValue());
                }
            }
        } catch (Exception e) {
            log.warn("Falha ao extrair dados do XML: {}", e.getMessage());
        }
        return new XmlData(cnpj, clientName, emissionYear, emissionMonth);
    }

    /**
     * Tenta obter data de emissão a partir de dhEmi (ISO datetime) ou dEmi (yyyy-MM-dd).
     */
    private static LocalDate parseEmissionDate(String dhEmi, String dEmi) {
        if (dhEmi != null && !dhEmi.isBlank()) {
            try {
                return OffsetDateTime.parse(dhEmi.trim()).toLocalDate();
            } catch (DateTimeParseException e) {
                try {
                    return LocalDate.parse(dhEmi.trim().substring(0, Math.min(10, dhEmi.trim().length())), DateTimeFormatter.ISO_LOCAL_DATE);
                } catch (Exception ignored) {
                    // fallback falhou; usar dEmi abaixo
                }
            }
        }
        if (dEmi != null && !dEmi.isBlank()) {
            try {
                return LocalDate.parse(dEmi.trim(), DateTimeFormatter.ISO_LOCAL_DATE);
            } catch (DateTimeParseException ignored) {
                // formato de data não reconhecido
            }
        }
        return null;
    }

    /**
     * Extrai texto que contenha CNPJ do PDF (busca por padrão 14 dígitos ou formatado).
     * Usa PDFBox 2.x: PDDocument.load(InputStream).
     */
    public static Optional<String> extractCnpjFromPdf(InputStream pdfInput) {
        try {
            byte[] bytes = pdfInput.readAllBytes();
            try (PDDocument document = PDDocument.load(new ByteArrayInputStream(bytes))) {
                String fullText = new PDFTextStripper().getText(document);
                Matcher m = CNPJ_PATTERN.matcher(fullText);
                while (m.find()) {
                    String group = m.group(1) != null ? m.group(1) : m.group(2);
                    if (group != null) {
                        String normalized = normalizeCnpj(group);
                        if (normalized.length() == 14) {
                            return Optional.of(normalized);
                        }
                    }
                }
            }
        } catch (IOException e) {
            log.warn("Falha ao extrair texto do PDF: {}", e.getMessage());
        }
        return Optional.empty();
    }

    private static Element findElementByLocalName(Element root, String localName) {
        if (root == null) return null;
        if (localName.equals(root.getLocalName()) || localName.equals(root.getTagName())) {
            return root;
        }
        NodeList children = root.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            Node n = children.item(i);
            if (n instanceof Element e) {
                Element found = findElementByLocalName(e, localName);
                if (found != null) return found;
            }
        }
        return null;
    }

    private static String getFirstTextByLocalName(Element parent, String localName) {
        NodeList children = parent.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            Node n = children.item(i);
            if (n instanceof Element e) {
                if (localName.equals(e.getLocalName()) || localName.equals(e.getTagName())) {
                    return e.getTextContent();
                }
            }
        }
        return null;
    }

    /**
     * Analisa o texto do PDF e extrai o nome do Cliente (Tomador), Mês e Ano de Emissão.
     * Retorna um DTO FiscalInvoiceAnalysisDTO.
     */
    public static com.z7design.secured_guard.dto.FiscalInvoiceAnalysisDTO analyzePdf(InputStream pdfInput) {
        String clientName = "";
        Integer month = java.time.LocalDate.now().getMonthValue();
        Integer year = java.time.LocalDate.now().getYear();

        try {
            byte[] bytes = pdfInput.readAllBytes();
            try (PDDocument document = PDDocument.load(new ByteArrayInputStream(bytes))) {
                String fullText = new PDFTextStripper().getText(document);
                if (fullText != null && !fullText.isBlank()) {
                    // 1. Extração do Cliente (Tomador dos Serviços)
                    clientName = extractClientName(fullText);

                    // 2. Extração da Data (Mês e Ano)
                    java.time.LocalDate date = extractEmissionDate(fullText);
                    if (date != null) {
                        month = date.getMonthValue();
                        year = date.getYear();
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Falha ao analisar PDF para extração de dados: {}", e.getMessage());
        }

        // Sanitização final do nome do cliente
        if (clientName == null || clientName.trim().isBlank()) {
            clientName = "Cliente Não Identificado";
        } else {
            clientName = clientName.trim();
        }

        return new com.z7design.secured_guard.dto.FiscalInvoiceAnalysisDTO(clientName, month, year);
    }

    private static String extractClientName(String text) {
        String[] lines = text.split("\\r?\\n");
        
        // Rótulos que indicam a seção do Tomador / Destinatário
        String[] tomadorLabels = {
            "TOMADOR DO(S) SERVIÇO(S)",
            "TOMADOR DOS SERVIÇOS",
            "TOMADOR DE SERVIÇO",
            "TOMADOR DE SERVIÇOS",
            "DADOS DO TOMADOR",
            "DADOS DO DESTINATÁRIO",
            "TOMADOR",
            "DESTINATÁRIO",
            "DESTINATARIO / REMETENTE",
            "DESTINATARIO/REMETENTE"
        };

        // Rótulos que indicam diretamente o Nome / Razão Social
        String[] nameLabels = {
            "Razão Social / Nome:",
            "Razão Social/Nome:",
            "Nome/Razão Social:",
            "Nome / Razão Social:",
            "Razão Social:",
            "Nome:",
            "Razao Social / Nome:",
            "Razao Social/Nome:",
            "Razao Social:"
        };

        // 1. Primeiro passo: Tentar achar a seção do Tomador
        int tomadorIndex = -1;
        for (int i = 0; i < lines.length; i++) {
            String lineUpper = lines[i].toUpperCase().trim();
            for (String label : tomadorLabels) {
                if (lineUpper.contains(label)) {
                    tomadorIndex = i;
                    break;
                }
            }
            if (tomadorIndex != -1) break;
        }

        // Se achou a seção do Tomador, analisa as próximas 7 linhas
        if (tomadorIndex != -1) {
            int maxLine = Math.min(lines.length, tomadorIndex + 8);
            
            // A. Procurar por rótulos específicos de Razão Social/Nome nas linhas subsequentes
            for (int i = tomadorIndex + 1; i < maxLine; i++) {
                String line = lines[i];
                for (String label : nameLabels) {
                    if (line.toLowerCase().contains(label.toLowerCase())) {
                        int startIdx = line.toLowerCase().indexOf(label.toLowerCase()) + label.length();
                        String extracted = line.substring(startIdx).trim();
                        if (isValidClientName(extracted)) {
                            return cleanClientName(extracted);
                        }
                    }
                }
            }

            // B. Se não achou rótulos de nome específicos, pegar a primeira linha no bloco do tomador
            // que pareça um nome próprio / razão social legítimo, pulando CNPJ, CPF, Endereço, etc.
            for (int i = tomadorIndex + 1; i < maxLine; i++) {
                String line = lines[i].trim();
                if (isValidClientName(line) 
                        && !containsFiscalOrAddressKeywords(line)
                        && line.replaceAll("[^a-zA-Z]", "").length() > 5) {
                    return cleanClientName(line);
                }
            }
        }

        // 2. Fallback global: Se não achou seção do tomador, busca por "Razão Social:" ou "Nome:" em todo o documento
        for (String line : lines) {
            for (String label : nameLabels) {
                if (line.toLowerCase().contains(label.toLowerCase())) {
                    int startIdx = line.toLowerCase().indexOf(label.toLowerCase()) + label.length();
                    String extracted = line.substring(startIdx).trim();
                    if (isValidClientName(extracted) && !containsFiscalOrAddressKeywords(extracted)) {
                        return cleanClientName(extracted);
                    }
                }
            }
        }

        return "Cliente Não Identificado";
    }

    private static boolean isValidClientName(String name) {
        if (name == null) return false;
        name = name.trim();
        if (name.length() < 3) return false;
        
        // Não deve ser puramente números ou códigos
        if (name.matches("^\\d+$") || name.matches("^[\\d\\.\\-/]+$")) return false;
        
        // Evitar nomes que correspondam a rótulos fiscais conhecidos
        String upper = name.toUpperCase();
        if (upper.startsWith("CNPJ") || upper.startsWith("CPF") || upper.startsWith("INSCRIÇÃO") || upper.startsWith("ENDEREÇO")) {
            return false;
        }

        return true;
    }

    private static boolean containsFiscalOrAddressKeywords(String line) {
        String upper = line.toUpperCase();
        return upper.contains("CNPJ:") || upper.contains("CPF:") || upper.contains("TELEFONE:")
                || upper.contains("EMAIL:") || upper.contains("INSCRIÇÃO") || upper.contains("MUNICIPIO")
                || upper.contains("ENDEREÇO") || upper.contains("BARRACÃO") || upper.contains("AVENIDA")
                || upper.contains("RUA ") || upper.contains("LOGRADOURO") || upper.contains("INSCR. ESTADUAL")
                || upper.contains("PREFEITURA") || upper.contains("NOTA FISCAL") || upper.contains("SECRETARIA");
    }

    private static String cleanClientName(String name) {
        // Remove pontuações desnecessárias e limpa espaços extras
        String cleaned = name.replaceAll("[-;:_\\|]+", " ").trim();
        // Se houver múltiplos espaços, colapsa para apenas um
        cleaned = cleaned.replaceAll("\\s+", " ");
        // Se a linha tiver dados depois do CNPJ separados por tab/espaços duplos, pega apenas o nome anterior
        if (cleaned.contains("   ")) {
            cleaned = cleaned.split("   ")[0].trim();
        }
        return cleaned;
    }

    private static LocalDate extractEmissionDate(String text) {
        String[] lines = text.split("\\r?\\n");
        
        // Palavras-chave associadas à data de emissão ou competência
        String[] dateKeywords = {
            "DATA DE EMISSÃO",
            "DATA EMISSÃO",
            "DATA DA EMISSÃO",
            "EMISSÃO:",
            "EMISSÃO",
            "COMPETÊNCIA:",
            "COMPETÊNCIA",
            "COMPETENCIA",
            "DATA/HORA EMISSÃO",
            "DATA E HORA DA EMISSÃO"
        };

        // Regex para buscar data no formato dd/MM/yyyy ou MM/yyyy
        Pattern fullDatePattern = Pattern.compile("\\b(\\d{2})/(\\d{2})/(\\d{4})\\b");
        Pattern monthYearPattern = Pattern.compile("\\b(\\d{2})/(\\d{4})\\b");

        // 1. Procurar nas linhas que contêm as palavras-chave
        for (String line : lines) {
            String lineUpper = line.toUpperCase();
            boolean hasKeyword = false;
            for (String kw : dateKeywords) {
                if (lineUpper.contains(kw)) {
                    hasKeyword = true;
                    break;
                }
            }

            if (hasKeyword) {
                // Tenta achar data completa dd/MM/yyyy
                Matcher mFull = fullDatePattern.matcher(line);
                if (mFull.find()) {
                    try {
                        int day = Integer.parseInt(mFull.group(1));
                        int month = Integer.parseInt(mFull.group(2));
                        int year = Integer.parseInt(mFull.group(3));
                        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                            return LocalDate.of(year, month, day);
                        }
                    } catch (Exception ignored) {}
                }

                // Tenta achar data MM/yyyy
                Matcher mMY = monthYearPattern.matcher(line);
                if (mMY.find()) {
                    try {
                        int month = Integer.parseInt(mMY.group(1));
                        int year = Integer.parseInt(mMY.group(2));
                        if (month >= 1 && month <= 12) {
                            return LocalDate.of(year, month, 1);
                        }
                    } catch (Exception ignored) {}
                }
            }
        }

        // 2. Fallback global: Buscar qualquer data no formato dd/MM/yyyy nas primeiras 30 linhas (cabeçalho)
        int checkLimit = Math.min(lines.length, 30);
        for (int i = 0; i < checkLimit; i++) {
            String line = lines[i];
            Matcher mFull = fullDatePattern.matcher(line);
            if (mFull.find()) {
                try {
                    int day = Integer.parseInt(mFull.group(1));
                    int month = Integer.parseInt(mFull.group(2));
                    int year = Integer.parseInt(mFull.group(3));
                    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                        return LocalDate.of(year, month, day);
                    }
                } catch (Exception ignored) {}
            }
        }

        // 3. Fallback secundário global: Qualquer MM/yyyy no cabeçalho
        for (int i = 0; i < checkLimit; i++) {
            String line = lines[i];
            Matcher mMY = monthYearPattern.matcher(line);
            if (mMY.find()) {
                try {
                    int month = Integer.parseInt(mMY.group(1));
                    int year = Integer.parseInt(mMY.group(2));
                    if (month >= 1 && month <= 12) {
                        return LocalDate.of(year, month, 1);
                    }
                } catch (Exception ignored) {}
            }
        }

        return null;
    }
}

