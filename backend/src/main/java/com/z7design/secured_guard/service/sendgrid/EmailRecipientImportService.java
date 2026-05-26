package com.z7design.secured_guard.service.sendgrid;

import com.z7design.secured_guard.dto.sendgrid.EmailCampaignRecipientDto;
import com.z7design.secured_guard.dto.sendgrid.ImportRecipientsResponse;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Parser de arquivos de destinatários (CSV / XLSX).
 *
 * <p>Detecta colunas pelo cabeçalho da primeira linha. Reconhece automaticamente
 * variações de nome para os campos canônicos:
 * <ul>
 *   <li>{@code email}: "email", "e-mail", "endereço de e-mail", "mail"</li>
 *   <li>{@code name}: "nome", "name", "contato"</li>
 *   <li>{@code company}: "empresa", "company", "nome da empresa"</li>
 *   <li>{@code position}: "cargo", "position", "função"</li>
 *   <li>{@code phone}: "telefone", "phone", "fone"</li>
 *   <li>{@code mobile}: "celular", "mobile", "whatsapp"</li>
 * </ul>
 * Demais colunas são incluídas no campo {@code metadata} preservando o nome
 * original do cabeçalho.
 */
@Service
public class EmailRecipientImportService {

    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final long MAX_BYTES = 5L * 1024 * 1024; // 5MB

    private static final Map<String, String> CANONICAL = Map.ofEntries(
            Map.entry("email", "email"),
            Map.entry("e-mail", "email"),
            Map.entry("mail", "email"),
            Map.entry("endereco de e-mail", "email"),
            Map.entry("endereço de e-mail", "email"),
            Map.entry("nome", "name"),
            Map.entry("name", "name"),
            Map.entry("contato", "name"),
            Map.entry("empresa", "company"),
            Map.entry("company", "company"),
            Map.entry("nome da empresa", "company"),
            Map.entry("cargo", "position"),
            Map.entry("position", "position"),
            Map.entry("funcao", "position"),
            Map.entry("função", "position"),
            Map.entry("telefone", "phone"),
            Map.entry("phone", "phone"),
            Map.entry("fone", "phone"),
            Map.entry("celular", "mobile"),
            Map.entry("mobile", "mobile"),
            Map.entry("whatsapp", "mobile"),
            Map.entry("cidade", "city"),
            Map.entry("city", "city"),
            Map.entry("municipio", "city"),
            Map.entry("município", "city"),
            Map.entry("estado", "state"),
            Map.entry("state", "state"),
            Map.entry("uf", "state"),
            Map.entry("tipo de empresa", "companyType"),
            Map.entry("tipo empresa", "companyType"),
            Map.entry("tipo_empresa", "companyType"),
            Map.entry("ramo", "companyType"),
            Map.entry("atividade", "companyType"),
            Map.entry("segmento", "companyType"),
            Map.entry("classificacao", "companyType"),
            Map.entry("classificação", "companyType")
    );

    public ImportRecipientsResponse parse(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Arquivo vazio.");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Arquivo excede 5MB.");
        }
        String originalName = file.getOriginalFilename() != null
                ? file.getOriginalFilename().toLowerCase()
                : "";
        try (InputStream in = file.getInputStream()) {
            if (originalName.endsWith(".csv") || originalName.endsWith(".tsv") || originalName.endsWith(".txt")) {
                char sep = originalName.endsWith(".tsv") ? '\t' : ',';
                return parseCsv(in, sep);
            }
            return parseXlsx(in);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Falha ao ler arquivo: " + e.getMessage());
        }
    }

    private ImportRecipientsResponse parseCsv(InputStream in, char sep) throws IOException {
        try (BufferedReader r = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
            String headerLine = r.readLine();
            if (headerLine == null) {
                return new ImportRecipientsResponse(List.of(), 0, 0, List.of());
            }
            // tenta autodetectar ; quando csv brasileiro
            if (sep == ',' && headerLine.contains(";") && !headerLine.contains(",")) {
                sep = ';';
            }
            String[] header = splitCsvLine(headerLine, sep);
            List<String> detectedCols = Arrays.asList(header);
            String[] canon = canonicalizeHeader(header);

            List<EmailCampaignRecipientDto> recipients = new ArrayList<>();
            int total = 0;
            int invalid = 0;
            String line;
            while ((line = r.readLine()) != null) {
                if (line.isBlank()) continue;
                total++;
                String[] values = splitCsvLine(line, sep);
                EmailCampaignRecipientDto dto = toRecipient(canon, header, values);
                if (dto == null) invalid++;
                else recipients.add(dto);
            }
            return new ImportRecipientsResponse(recipients, total, invalid, detectedCols);
        }
    }

    private ImportRecipientsResponse parseXlsx(InputStream in) throws IOException {
        try (Workbook wb = WorkbookFactory.create(in)) {
            Sheet sheet = wb.getSheetAt(0);
            if (sheet == null) {
                return new ImportRecipientsResponse(List.of(), 0, 0, List.of());
            }
            Row headerRow = sheet.getRow(sheet.getFirstRowNum());
            if (headerRow == null) {
                return new ImportRecipientsResponse(List.of(), 0, 0, List.of());
            }
            int cols = headerRow.getLastCellNum();
            String[] header = new String[cols];
            DataFormatter fmt = new DataFormatter();
            for (int c = 0; c < cols; c++) {
                Cell cell = headerRow.getCell(c);
                header[c] = cell == null ? "" : fmt.formatCellValue(cell).trim();
            }
            List<String> detectedCols = Arrays.asList(header);
            String[] canon = canonicalizeHeader(header);

            List<EmailCampaignRecipientDto> recipients = new ArrayList<>();
            int total = 0;
            int invalid = 0;
            int last = sheet.getLastRowNum();
            for (int rIdx = sheet.getFirstRowNum() + 1; rIdx <= last; rIdx++) {
                Row row = sheet.getRow(rIdx);
                if (row == null || isEmptyRow(row, fmt)) continue;
                total++;
                String[] values = new String[cols];
                for (int c = 0; c < cols; c++) {
                    Cell cell = row.getCell(c);
                    if (cell == null) {
                        values[c] = "";
                    } else if (cell.getCellType() == CellType.NUMERIC) {
                        // Evita notação 1.23E10 para telefones
                        double d = cell.getNumericCellValue();
                        if (d == Math.floor(d)) values[c] = String.valueOf((long) d);
                        else values[c] = fmt.formatCellValue(cell);
                    } else {
                        values[c] = fmt.formatCellValue(cell);
                    }
                }
                EmailCampaignRecipientDto dto = toRecipient(canon, header, values);
                if (dto == null) invalid++;
                else recipients.add(dto);
            }
            return new ImportRecipientsResponse(recipients, total, invalid, detectedCols);
        }
    }

    private boolean isEmptyRow(Row row, DataFormatter fmt) {
        for (int c = row.getFirstCellNum(); c < row.getLastCellNum(); c++) {
            Cell cell = row.getCell(c);
            if (cell != null && !fmt.formatCellValue(cell).isBlank()) return false;
        }
        return true;
    }

    private String[] canonicalizeHeader(String[] header) {
        String[] out = new String[header.length];
        for (int i = 0; i < header.length; i++) {
            String h = header[i] == null ? "" : header[i].trim().toLowerCase();
            out[i] = CANONICAL.getOrDefault(h, h.isEmpty() ? "col" + i : h);
        }
        return out;
    }

    private EmailCampaignRecipientDto toRecipient(String[] canon, String[] header, String[] values) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        String email = null;
        String name = null;
        for (int i = 0; i < canon.length && i < values.length; i++) {
            String key = canon[i];
            String val = values[i] == null ? "" : values[i].trim();
            if (val.isEmpty()) continue;
            if ("email".equals(key)) email = val;
            else if ("name".equals(key)) name = val;
            else metadata.put(key, val);
        }
        if (email == null || !EMAIL.matcher(email).matches()) return null;
        // Garante chave 'name' apenas se houver
        Map<String, Object> meta = metadata.isEmpty() ? new HashMap<>() : metadata;
        return new EmailCampaignRecipientDto(email, name, meta, "IMPORT", null);
    }

    /** Split CSV simples com suporte a campos entre aspas. */
    private String[] splitCsvLine(String line, char sep) {
        List<String> out = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    current.append('"');
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c == sep && !inQuotes) {
                out.add(current.toString());
                current.setLength(0);
            } else {
                current.append(c);
            }
        }
        out.add(current.toString());
        return out.toArray(new String[0]);
    }
}
