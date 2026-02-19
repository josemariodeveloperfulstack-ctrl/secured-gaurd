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
}
