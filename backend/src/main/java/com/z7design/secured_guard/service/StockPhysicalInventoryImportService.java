package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.InventoryRequisitionSummaryDTO;
import com.z7design.secured_guard.dto.PhysicalInventoryImportLineResultDTO;
import com.z7design.secured_guard.dto.PhysicalInventoryImportResultDTO;
import com.z7design.secured_guard.dto.StockItemDTO;
import com.z7design.secured_guard.dto.StockMovementDTO;
import com.z7design.secured_guard.model.StockItem;
import com.z7design.secured_guard.model.enums.MovementReason;
import com.z7design.secured_guard.model.enums.MovementType;
import com.z7design.secured_guard.model.enums.StockCategory;
import com.z7design.secured_guard.repository.StockItemRepository;
import com.z7design.secured_guard.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockPhysicalInventoryImportService {

    private static final DataFormatter DATA_FORMATTER = new DataFormatter();

    private record CategoryMapping(String needle, String itemCode, StockCategory category, String displayName) {}

    /** Ordem: mais específico primeiro. */
    private static final List<CategoryMapping> CATEGORY_ORDER = List.of(
            new CategoryMapping("camisa terceiriz", "INV-CAM-TERC", StockCategory.UNIFORME_SERVICOS, "Camisas Terceirizadas (inventário)"),
            new CategoryMapping("camisa vigil", "INV-CAM-VIG", StockCategory.UNIFORME_VIGILANCIA, "Camisas Vigilância (inventário)"),
            new CategoryMapping("calca social", "INV-CAL-SOC", StockCategory.UNIFORME_ADMINISTRATIVO, "Calças Sociais (inventário)"),
            new CategoryMapping("calca vigil", "INV-CAL-VIG", StockCategory.UNIFORME_VIGILANCIA, "Calças Vigilância (inventário)"),
            new CategoryMapping("jaqueta terceiriz", "INV-JAQ-TERC", StockCategory.UNIFORME_SERVICOS, "Jaquetas Terceirizadas (inventário)"),
            new CategoryMapping("jaqueta vigil", "INV-JAQ-VIG", StockCategory.UNIFORME_VIGILANCIA, "Jaquetas Vigilância (inventário)"),
            new CategoryMapping("calcad", "INV-CALCADO", StockCategory.CALCADOS, "Calçados — pares (inventário)"),
            new CategoryMapping("descart", "INV-DESCARTE", StockCategory.ACESSORIOS, "Itens descartados (inventário)")
    );

    private final StockItemRepository stockItemRepository;
    private final StockMovementRepository stockMovementRepository;
    private final StockService stockService;

    @Transactional
    public PhysicalInventoryImportResultDTO importWorkbook(MultipartFile file, UUID userId) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Arquivo vazio ou não enviado.");
        }

        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "inventario.xlsx";
        String requisitionNumber = "REQ-INV-" + LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss"))
                + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase(Locale.ROOT);

        List<PhysicalInventoryImportLineResultDTO> lines = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        try (InputStream in = file.getInputStream(); Workbook wb = WorkbookFactory.create(in)) {
            Sheet sheet = findSummarySheet(wb);
            if (sheet == null) {
                throw new IllegalArgumentException(
                        "Não foi encontrada aba de resumo. Use uma planilha com aba \"Resumo Estoque\" ou nome contendo \"Resumo\".");
            }

            int[] cols = findCategoryAndQuantityColumns(sheet);
            int catCol = cols[0];
            int qtyCol = cols[1];
            int headerRow = cols[2];
            if (catCol < 0 || qtyCol < 0) {
                throw new IllegalArgumentException(
                        "Cabeçalho não reconhecido. A primeira linha deve conter \"Categoria\" e \"Quantidade\" (ex.: Quantidade Total).");
            }

            for (int r = headerRow + 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) {
                    continue;
                }
                Cell catCell = row.getCell(catCol);
                Cell qtyCell = row.getCell(qtyCol);
                String rawCat = DATA_FORMATTER.formatCellValue(catCell).trim();
                if (rawCat.isEmpty()) {
                    continue;
                }
                String normCat = normalizeLabel(rawCat);
                if (normCat.equals("categoria") || normCat.startsWith("total geral")) {
                    continue;
                }

                int targetQty;
                try {
                    targetQty = parseQuantity(qtyCell);
                } catch (NumberFormatException ex) {
                    warnings.add("Linha " + (r + 1) + ": quantidade inválida para \"" + rawCat + "\" — ignorada.");
                    lines.add(PhysicalInventoryImportLineResultDTO.builder()
                            .categoryLabel(rawCat)
                            .skipped(true)
                            .message("Quantidade inválida")
                            .build());
                    continue;
                }

                CategoryMapping mapping = resolveMapping(normCat);
                if (mapping == null) {
                    warnings.add("Categoria não mapeada (adicione manualmente ou ajuste o nome): \"" + rawCat + "\"");
                    lines.add(PhysicalInventoryImportLineResultDTO.builder()
                            .categoryLabel(rawCat)
                            .skipped(true)
                            .message("Categoria não reconhecida para import automático")
                            .build());
                    continue;
                }

                StockItem item = ensureStockItem(mapping);
                int previous = item.getCurrentQuantity() != null ? item.getCurrentQuantity() : 0;
                int delta = targetQty - previous;

                if (delta == 0) {
                    lines.add(PhysicalInventoryImportLineResultDTO.builder()
                            .categoryLabel(rawCat)
                            .stockItemCode(item.getCode())
                            .previousQuantity(previous)
                            .targetQuantity(targetQty)
                            .delta(0)
                            .skipped(true)
                            .message("Sem ajuste (já igual ao contado)")
                            .build());
                    continue;
                }

                MovementType type = delta > 0 ? MovementType.ENTRADA : MovementType.SAIDA;
                MovementReason reason = delta > 0 ? MovementReason.AJUSTE_ENTRADA : MovementReason.AJUSTE_SAIDA;
                int qty = Math.abs(delta);

                StockMovementDTO mov = new StockMovementDTO();
                mov.setStockItemId(item.getId());
                mov.setMovementType(type);
                mov.setReason(reason);
                mov.setQuantity(qty);
                mov.setRequisitionNumber(requisitionNumber);
                mov.setNotes("Inventário físico | " + rawCat + " | arquivo: " + originalName);

                StockMovementDTO saved = stockService.createMovement(mov, userId);
                lines.add(PhysicalInventoryImportLineResultDTO.builder()
                        .categoryLabel(rawCat)
                        .stockItemCode(item.getCode())
                        .previousQuantity(previous)
                        .targetQuantity(targetQty)
                        .delta(delta)
                        .movementId(saved.getId())
                        .skipped(false)
                        .build());

                item = stockItemRepository.findById(item.getId()).orElse(item);
            }
        }

        return PhysicalInventoryImportResultDTO.builder()
                .importMode("SUMMARY")
                .requisitionNumber(requisitionNumber)
                .importedAt(LocalDateTime.now())
                .fileName(originalName)
                .lines(lines)
                .warnings(warnings)
                .build();
    }

    @Transactional(readOnly = true)
    public List<InventoryRequisitionSummaryDTO> listRequisitions(LocalDateTime start, LocalDateTime end) {
        List<Object[]> rows = stockMovementRepository.summarizePhysicalInventoryRequisitions(start, end);
        List<InventoryRequisitionSummaryDTO> out = new ArrayList<>();
        for (Object[] row : rows) {
            String num = (String) row[0];
            LocalDateTime first = (LocalDateTime) row[1];
            long cnt = ((Number) row[2]).longValue();
            out.add(InventoryRequisitionSummaryDTO.builder()
                    .requisitionNumber(num)
                    .firstMovementAt(first)
                    .movementCount(cnt)
                    .build());
        }
        return out;
    }

    private static Sheet findSummarySheet(Workbook wb) {
        for (int i = 0; i < wb.getNumberOfSheets(); i++) {
            String n = normalizeLabel(wb.getSheetName(i));
            if (n.contains("resumo") && n.contains("estoque")) {
                return wb.getSheetAt(i);
            }
        }
        for (int i = 0; i < wb.getNumberOfSheets(); i++) {
            String n = normalizeLabel(wb.getSheetName(i));
            if (n.contains("resumo")) {
                return wb.getSheetAt(i);
            }
        }
        return wb.getNumberOfSheets() > 0 ? wb.getSheetAt(0) : null;
    }

    /**
     * @return [categoryCol, quantityCol, headerRowIndex]
     */
    private static int[] findCategoryAndQuantityColumns(Sheet sheet) {
        int catCol = -1;
        int qtyCol = -1;
        int headerRow = -1;
        int last = Math.min(sheet.getLastRowNum(), 30);
        for (int r = 0; r <= last; r++) {
            Row row = sheet.getRow(r);
            if (row == null) {
                continue;
            }
            for (int c = 0; c < row.getLastCellNum(); c++) {
                Cell cell = row.getCell(c);
                if (cell == null) {
                    continue;
                }
                String v = normalizeLabel(DATA_FORMATTER.formatCellValue(cell));
                if (v.contains("categoria")) {
                    catCol = c;
                }
                if (v.contains("quantidade")) {
                    qtyCol = c;
                }
            }
            if (catCol >= 0 && qtyCol >= 0) {
                headerRow = r;
                break;
            }
            catCol = -1;
            qtyCol = -1;
        }
        return new int[]{catCol, qtyCol, headerRow};
    }

    private static CategoryMapping resolveMapping(String normalizedCategoryLabel) {
        for (CategoryMapping m : CATEGORY_ORDER) {
            if (normalizedCategoryLabel.contains(m.needle())) {
                return m;
            }
        }
        return null;
    }

    private StockItem ensureStockItem(CategoryMapping mapping) {
        return stockItemRepository.findByCode(mapping.itemCode())
                .orElseGet(() -> {
                    StockItemDTO dto = new StockItemDTO();
                    dto.setCode(mapping.itemCode());
                    dto.setName(mapping.displayName());
                    dto.setCategory(mapping.category());
                    dto.setCurrentQuantity(0);
                    dto.setMinimumQuantity(0);
                    dto.setActive(true);
                    dto.setDescription("Criado automaticamente na importação do resumo de inventário físico.");
                    stockService.createItem(dto);
                    return stockItemRepository.findByCode(mapping.itemCode())
                            .orElseThrow(() -> new IllegalStateException("Falha ao criar item " + mapping.itemCode()));
                });
    }

    private static String normalizeLabel(String s) {
        if (s == null) {
            return "";
        }
        String n = Normalizer.normalize(s.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT)
                .replace('ç', 'c');
        return n.replaceAll("\\s+", " ").trim();
    }

    private static int parseQuantity(Cell cell) {
        if (cell == null) {
            throw new NumberFormatException("null");
        }
        String raw = DATA_FORMATTER.formatCellValue(cell).trim();
        if (raw.isEmpty()) {
            throw new NumberFormatException("empty");
        }
        raw = raw.replace(".", "").replace(',', '.');
        double d = Double.parseDouble(raw.replaceAll("[^0-9.\\-]", ""));
        return (int) Math.round(d);
    }
}
