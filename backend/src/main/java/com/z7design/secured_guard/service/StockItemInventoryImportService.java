package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.PhysicalInventoryImportLineResultDTO;
import com.z7design.secured_guard.dto.PhysicalInventoryImportResultDTO;
import com.z7design.secured_guard.dto.StockItemDTO;
import com.z7design.secured_guard.dto.StockMovementDTO;
import com.z7design.secured_guard.model.StockItem;
import com.z7design.secured_guard.model.StockItemLocation;
import com.z7design.secured_guard.model.StorageShelf;
import com.z7design.secured_guard.model.enums.MovementReason;
import com.z7design.secured_guard.model.enums.MovementType;
import com.z7design.secured_guard.model.enums.StockCategory;
import com.z7design.secured_guard.repository.StockItemLocationRepository;
import com.z7design.secured_guard.repository.StockItemRepository;
import com.z7design.secured_guard.repository.StorageShelfRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.FormulaEvaluator;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Importação de inventário por linha (código + item + categoria + quantidade).
 * Zera o estoque de todos os itens ativos e das localizações em prateleira, depois aplica cada linha da planilha
 * com movimentação de ajuste (entrada) por item. Se houver colunas Prateleira e opcionalmente Compartimento/Andar,
 * a entrada é vinculada à localização (quantidade na prateleira + total do item). Vários registros com o mesmo código
 * em prateleiras diferentes são permitidos. Se a identificação da prateleira ainda não existir no cadastro, ela é
 * criada automaticamente (ativa) com esse código; prateleiras inativas com a mesma identificação são reativadas.
 * Planilhas no formato uniforme (colunas Tamanho, Quantidade, Localização) por aba de categoria são reconhecidas; o código
 * do item é derivado da aba + tamanho quando não há coluna Código. Matriz tamanho × produto (ex.: aba Calçados: coluna
 * Tamanho e várias colunas de modelos) gera um item por célula (código ABA-MODELO-TAMANHO). Aba Descartes com colunas
 * Item + Quantidade importa cada linha. Todas as abas detalhadas são processadas (aba Resumo Estoque ignorada).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class StockItemInventoryImportService {

    private static final DataFormatter DATA_FORMATTER = new DataFormatter();
    /** Quantidade + mínimo na mesma célula: "10 Min: 2" ou quebra de linha entre eles (como na UI). */
    private static final Pattern STOCK_MIN_PATTERN = Pattern.compile(
            "^\\s*(\\d+)\\s*(?:\\r?\\n|\\r|\\s)+Min\\s*:\\s*(\\d+)\\s*$", Pattern.CASE_INSENSITIVE);

    private final StockItemRepository stockItemRepository;
    private final StockItemLocationRepository stockItemLocationRepository;
    private final StorageShelfRepository storageShelfRepository;
    private final StockService stockService;

    private record ItemSheetHeader(
            int headerRow,
            int codeCol,
            int nameCol,
            int catCol,
            int qtyCol,
            int minCol,
            int priceCol,
            int shelfCol,
            int floorCol,
            /** Coluna de código é "Tamanho" (variante); gera código estável aba+tamanho. */
            boolean variantSizedCode) {}

    @Transactional
    public PhysicalInventoryImportResultDTO importWorkbook(MultipartFile file, UUID userId) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Arquivo vazio ou não enviado.");
        }
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "inventario.xlsx";
        String requisitionNumber = "REQ-INV-ITEM-" + LocalDateTime.now()
                .format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss"))
                + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase(Locale.ROOT);

        List<PhysicalInventoryImportLineResultDTO> lines = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        try (InputStream in = file.getInputStream(); Workbook wb = WorkbookFactory.create(in)) {
            FormulaEvaluator evaluator = wb.getCreationHelper().createFormulaEvaluator();
            List<SheetAndHeader> detailSheets = new ArrayList<>();
            List<SizeMatrixSheetSpec> matrixSheets = new ArrayList<>();
            List<DescartesSheetSpec> descartesSheets = new ArrayList<>();
            collectImportSheets(wb, evaluator, detailSheets, matrixSheets, descartesSheets);
            if (detailSheets.isEmpty() && matrixSheets.isEmpty() && descartesSheets.isEmpty()) {
                String preview = describeWorkbookHeaderPreview(wb, evaluator);
                throw new IllegalArgumentException(
                        "Nenhuma aba detalhada reconhecida. Use Código (ou Tamanho) e Estoque/Quantidade, matriz Tamanho "
                                + "× produtos (várias colunas de modelos), ou aba Descartes (Item + Quantidade). "
                                + "A aba \"Resumo Estoque\" não é usada nesta importação. Leitura da 1.ª aba: " + preview);
            }
            log.info("Import inventário: abas linha a linha={}, matriz tamanho×produto={}, descartes={}",
                    detailSheets.stream().map(s -> s.sheet().getSheetName()).toList(),
                    matrixSheets.stream().map(s -> s.sheet().getSheetName()).toList(),
                    descartesSheets.stream().map(s -> s.sheet().getSheetName()).toList());
            if (detailSheets.stream().anyMatch(s -> s.header().variantSizedCode())) {
                warnings.add("Planilha com coluna \"Tamanho\" (sem código de item): o sistema gera códigos como ABA-TAMANHO "
                        + "(ex.: CAMISAS-VIGILANCIA-P). O reset inicial zera todos os itens ativos; só recebem saldo de volta "
                        + "os códigos que existirem neste arquivo. Para atualizar itens já cadastrados, inclua a coluna "
                        + "\"Código\" igual ao cadastro.");
            }
            if (!matrixSheets.isEmpty()) {
                warnings.add("Aba(s) em matriz (ex.: Calçados): cada combinação tamanho × coluna de produto vira um item "
                        + "(código ABA-PRODUTO-TAMANHO, ex.: CALCADOS-SAPATO-SEGURANCA-34).");
            }
            if (!descartesSheets.isEmpty()) {
                warnings.add("Aba(s) Descartes: cada linha vira um item com prefixo no nome e categoria alinhada a descarte.");
            }

            int locReset = stockItemLocationRepository.resetLocationQuantitiesForActiveStockItems();
            int itemReset = stockItemRepository.resetCurrentQuantityAllActive();
            log.info("Reset inventário: {} itens ativos zerados, {} linhas de localização em prateleira zeradas", itemReset, locReset);

            Set<String> seenLineKeys = new HashSet<>();

            for (SizeMatrixSheetSpec mx : matrixSheets) {
                importSizeMatrixSheet(mx, originalName, requisitionNumber, userId, evaluator, lines, warnings, seenLineKeys);
            }
            for (DescartesSheetSpec ds : descartesSheets) {
                importDescartesSheet(ds, originalName, requisitionNumber, userId, evaluator, lines, warnings, seenLineKeys);
            }

            for (SheetAndHeader sh : detailSheets) {
                Sheet sheet = sh.sheet();
                ItemSheetHeader hdr = sh.header();
                log.info("Import inventário por item: aba '{}', cabeçalho (linha Excel): {}",
                        sheet.getSheetName(),
                        hdr.headerRow() < 0 ? "omitido (dados desde linha 1)" : Integer.toString(hdr.headerRow() + 1));
                log.info("Import inventário: mapeamento (1=A): código={} item={} categoria={} qtd={} min={} valor={} prateleira/local={} comp={} varianteTamanho={}",
                        hdr.codeCol() + 1,
                        hdr.nameCol() >= 0 ? Integer.toString(hdr.nameCol() + 1) : "-",
                        hdr.catCol() >= 0 ? Integer.toString(hdr.catCol() + 1) : "-",
                        hdr.qtyCol() + 1,
                        hdr.minCol() >= 0 ? Integer.toString(hdr.minCol() + 1) : "-",
                        hdr.priceCol() >= 0 ? Integer.toString(hdr.priceCol() + 1) : "-",
                        hdr.shelfCol() >= 0 ? Integer.toString(hdr.shelfCol() + 1) : "-",
                        hdr.floorCol() >= 0 ? Integer.toString(hdr.floorCol() + 1) : "-",
                        Boolean.toString(hdr.variantSizedCode()));

                for (int r = hdr.headerRow() + 1; r <= sheet.getLastRowNum(); r++) {
                    Row row = sheet.getRow(r);
                    if (row == null) {
                        continue;
                    }
                    String rawVariant = trimCell(row.getCell(hdr.codeCol()), evaluator);
                    if (rawVariant.isEmpty()) {
                        continue;
                    }
                    String code = hdr.variantSizedCode()
                            ? deriveInventoryCodeFromSheetNameAndVariant(sheet.getSheetName(), rawVariant)
                            : rawVariant;
                    if (code.isEmpty()) {
                        continue;
                    }
                    String shelfIdent = hdr.shelfCol() >= 0 ? trimCell(row.getCell(hdr.shelfCol()), evaluator) : "";
                    String floorVal = hdr.floorCol() >= 0 ? trimCell(row.getCell(hdr.floorCol()), evaluator) : "";

                    String name = hdr.nameCol() >= 0 ? trimCell(row.getCell(hdr.nameCol()), evaluator) : "";
                    if (name.isEmpty()) {
                        name = hdr.variantSizedCode()
                                ? (sheet.getSheetName().trim() + " — " + rawVariant.trim())
                                : code;
                    }
                    String rawCat = hdr.catCol() >= 0 ? trimCell(row.getCell(hdr.catCol()), evaluator) : "";
                    String categoryLabel = rawCat.isBlank() ? sheet.getSheetName().trim() : rawCat;
                    String categorySource = rawCat.isBlank() ? sheet.getSheetName() : rawCat;
                    StockCategory category = resolveCategory(categorySource);
                    if (category == null) {
                        category = resolveCategoryFromItemHints(name, code);
                    }
                    if (category == null) {
                        category = StockCategory.ACESSORIOS;
                        warnings.add(sheet.getSheetName() + " — linha " + (r + 1) + " (" + code + "): categoria \""
                                + categoryLabel + "\" não mapeada; usado \""
                                + StockCategory.ACESSORIOS.getDescription() + "\".");
                    }

                    int targetQty;
                    int minQty = 0;
                    try {
                        if (hdr.minCol() >= 0) {
                            targetQty = parseQuantity(row.getCell(hdr.qtyCol()), evaluator);
                            String minRaw = trimCell(row.getCell(hdr.minCol()), evaluator);
                            if (!minRaw.isEmpty()) {
                                minQty = parseQuantityLoose(minRaw);
                            }
                        } else {
                            int[] sq = parseStockCell(row.getCell(hdr.qtyCol()), evaluator);
                            targetQty = sq[0];
                            if (sq[1] >= 0) {
                                minQty = sq[1];
                            }
                        }
                    } catch (Exception ex) {
                        warnings.add(sheet.getSheetName() + " — linha " + (r + 1) + " (" + code + "): quantidade inválida.");
                        lines.add(PhysicalInventoryImportLineResultDTO.builder()
                                .stockItemCode(code)
                                .itemName(name)
                                .categoryLabel(categoryLabel)
                                .skipped(true)
                                .message("Quantidade inválida")
                                .build());
                        continue;
                    }

                    if (targetQty < 0) {
                        warnings.add(sheet.getSheetName() + " — linha " + (r + 1) + " (" + code + "): quantidade negativa não permitida.");
                        lines.add(PhysicalInventoryImportLineResultDTO.builder()
                                .stockItemCode(code)
                                .itemName(name)
                                .categoryLabel(categoryLabel)
                                .skipped(true)
                                .message("Quantidade negativa")
                                .build());
                        continue;
                    }

                    BigDecimal unitCost = null;
                    if (hdr.priceCol() >= 0) {
                        unitCost = parseMoney(row.getCell(hdr.priceCol()), evaluator);
                    }

                    applyInventoryQuantityLine(
                            originalName,
                            requisitionNumber,
                            userId,
                            sheet.getSheetName(),
                            r + 1,
                            code,
                            name,
                            categoryLabel,
                            category,
                            targetQty,
                            minQty,
                            unitCost,
                            hdr.shelfCol() >= 0,
                            shelfIdent,
                            floorVal,
                            lines,
                            warnings,
                            seenLineKeys);
                }
            }
        }

        return PhysicalInventoryImportResultDTO.builder()
                .importMode("DETAIL")
                .requisitionNumber(requisitionNumber)
                .importedAt(LocalDateTime.now())
                .fileName(originalName)
                .lines(lines)
                .warnings(warnings)
                .build();
    }

    /**
     * Cria/atualiza item e movimentação de ajuste (uma linha lógica de inventário).
     * {@code hasShelfColumn} indica se a planilha prevê coluna de prateleira (mesmo que vazia na linha).
     */
    private void applyInventoryQuantityLine(
            String originalName,
            String requisitionNumber,
            UUID userId,
            String sheetName,
            int excelRow,
            String code,
            String name,
            String categoryLabel,
            StockCategory category,
            int targetQty,
            int minQty,
            BigDecimal unitCost,
            boolean hasShelfColumn,
            String shelfIdent,
            String floorVal,
            List<PhysicalInventoryImportLineResultDTO> lines,
            List<String> warnings,
            Set<String> seenLineKeys) {
        String codeKey = code.toUpperCase(Locale.ROOT);
        String shelfKey = shelfIdent == null ? "" : shelfIdent;
        String floorKey = floorVal == null ? "" : floorVal;
        String lineKey = hasShelfColumn
                ? codeKey + "\u0001" + shelfKey.toUpperCase(Locale.ROOT) + "\u0001" + floorKey.toUpperCase(Locale.ROOT)
                : codeKey;
        if (seenLineKeys.contains(lineKey)) {
            warnings.add(sheetName + " — linha " + excelRow + ": duplicada (mesmo código"
                    + (hasShelfColumn ? ", local e compartimento" : "")
                    + ") \"" + code + "\" — ignorada.");
            lines.add(PhysicalInventoryImportLineResultDTO.builder()
                    .stockItemCode(code)
                    .skipped(true)
                    .message(hasShelfColumn ? "Linha duplicada (código + localização)" : "Código duplicado no arquivo")
                    .build());
            return;
        }
        seenLineKeys.add(lineKey);

        try {
            StockItem item = stockItemRepository.findByCodeIgnoreCase(code).orElse(null);
            int previous = 0;
            if (item == null) {
                StockItemDTO dto = new StockItemDTO();
                dto.setCode(code);
                dto.setName(name);
                dto.setCategory(category);
                dto.setCurrentQuantity(0);
                dto.setMinimumQuantity(minQty);
                dto.setUnitCost(unitCost);
                dto.setActive(true);
                dto.setDescription("Criado na importação de inventário por planilha.");
                stockService.createItem(dto);
                item = stockItemRepository.findByCodeIgnoreCase(code)
                        .orElseThrow(() -> new IllegalStateException("Falha ao criar item " + code));
            } else {
                previous = item.getCurrentQuantity() != null ? item.getCurrentQuantity() : 0;
                StockItemDTO upd = new StockItemDTO();
                upd.setCode(item.getCode());
                upd.setName(name);
                upd.setCategory(category);
                upd.setMinimumQuantity(minQty);
                upd.setUnitCost(unitCost != null ? unitCost : item.getUnitCost());
                upd.setActive(true);
                stockService.updateItem(item.getId(), upd);
                item = stockItemRepository.findById(item.getId()).orElse(item);
            }

            if (targetQty == 0) {
                lines.add(PhysicalInventoryImportLineResultDTO.builder()
                        .categoryLabel(categoryLabel)
                        .stockItemCode(item.getCode())
                        .itemName(name)
                        .previousQuantity(previous)
                        .targetQuantity(0)
                        .delta(0)
                        .skipped(false)
                        .message("Estoque zerado conforme planilha")
                        .build());
                return;
            }

            StockMovementDTO mov = new StockMovementDTO();
            mov.setStockItemId(item.getId());
            mov.setMovementType(MovementType.ENTRADA);
            mov.setReason(MovementReason.AJUSTE_ENTRADA);
            mov.setQuantity(targetQty);
            mov.setRequisitionNumber(requisitionNumber);
            StringBuilder notes = new StringBuilder("Inventário por planilha (itens) | ").append(originalName);
            if (hasShelfColumn) {
                if (shelfKey.isBlank()) {
                    warnings.add(sheetName + " — linha " + excelRow + " (" + code
                            + "): localização/prateleira vazia — quantidade só no total do item (sem posição).");
                } else {
                    StorageShelf shelf = resolveOrCreateShelfByIdentification(shelfKey);
                    StockItemLocation loc = getOrCreateItemLocation(item, shelf, floorKey);
                    mov.setItemLocationId(loc.getId());
                    notes.append(" | Prat.: ").append(shelf.getIdentification());
                    if (loc.getFloor() != null && !loc.getFloor().isBlank()) {
                        notes.append(" | Comp.: ").append(loc.getFloor());
                    }
                }
            }
            mov.setNotes(notes.toString());

            StockMovementDTO saved = stockService.createMovement(mov, userId);
            lines.add(PhysicalInventoryImportLineResultDTO.builder()
                    .categoryLabel(categoryLabel)
                    .stockItemCode(item.getCode())
                    .itemName(name)
                    .previousQuantity(0)
                    .targetQuantity(targetQty)
                    .delta(targetQty)
                    .movementId(saved.getId())
                    .skipped(false)
                    .build());
        } catch (Exception ex) {
            log.warn("{} — linha {} item {}: {}", sheetName, excelRow, code, ex.getMessage());
            warnings.add(sheetName + " — linha " + excelRow + " (" + code + "): " + ex.getMessage());
            lines.add(PhysicalInventoryImportLineResultDTO.builder()
                    .stockItemCode(code)
                    .itemName(name)
                    .categoryLabel(categoryLabel)
                    .skipped(true)
                    .message(ex.getMessage() != null ? ex.getMessage() : "Erro ao processar")
                    .build());
        }
    }

    private record SheetAndHeader(Sheet sheet, ItemSheetHeader header) {}

    /** Aba em matriz: linha de cabeçalho com "Tamanho" e duas ou mais colunas de produto (quantidades por tamanho). */
    private record SizeMatrixSheetSpec(Sheet sheet, int headerRow, int sizeCol, List<Integer> productCols, List<String> productHeaders) {}

    /** Aba Descartes: colunas Item (ou nome/descrição) + Quantidade. */
    private record DescartesSheetSpec(Sheet sheet, int headerRow, int itemCol, int qtyCol) {}

    /** Código estável para planilhas com coluna Tamanho (uma aba por tipo de peça). */
    private static String deriveInventoryCodeFromSheetNameAndVariant(String sheetName, String sizeRaw) {
        String slug = sheetNameToSlug(sheetName);
        String sz = normalizeLabel(sizeRaw).replaceAll("[^a-z0-9]+", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
        if (sz.isEmpty()) {
            sz = "item";
        }
        return (slug + "-" + sz).toUpperCase(Locale.ROOT);
    }

    private static String sheetNameToSlug(String sheetName) {
        if (sheetName == null || sheetName.isBlank()) {
            return "aba";
        }
        String n = normalizeLabel(sheetName).replaceAll("[^a-z0-9]+", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
        return n.isEmpty() ? "aba" : n;
    }

    /** Layouts típicos: [código, item, categoria, estoque, valor unit.]; 2.ª variante ignora 1.ª coluna vazia/checkbox. */
    private static final int[][] PROMOVER_GRID_LAYOUTS = {
            {0, 1, 2, 3, 5},
            {1, 2, 3, 4, 6},
            // Coluna extra entre categoria e estoque (ex.: status)
            {0, 1, 2, 4, 6},
            {1, 2, 3, 5, 7},
    };

    /** Ignora apenas a aba de totais por categoria (não tem linhas por item neste fluxo). */
    private static boolean isSummaryStockSheet(Sheet sheet) {
        String n = normalizeLabel(sheet.getSheetName());
        return n.contains("resumo") && n.contains("estoque");
    }

    private static void collectImportSheets(
            Workbook wb,
            FormulaEvaluator ev,
            List<SheetAndHeader> detailSheets,
            List<SizeMatrixSheetSpec> matrixSheets,
            List<DescartesSheetSpec> descartesSheets) {
        for (int i = 0; i < wb.getNumberOfSheets(); i++) {
            Sheet sheet = wb.getSheetAt(i);
            if (isSummaryStockSheet(sheet)) {
                continue;
            }
            SizeMatrixSheetSpec matrix = findSizeMatrixSheet(sheet, ev);
            if (matrix != null) {
                log.info("Inventário por item: aba '{}' reconhecida como matriz tamanho × produtos ({} colunas de quantidade).",
                        sheet.getSheetName(),
                        matrix.productCols().size());
                matrixSheets.add(matrix);
                continue;
            }
            DescartesSheetSpec desc = findDescartesSheet(sheet, ev);
            if (desc != null) {
                log.info("Inventário por item: aba '{}' reconhecida como Descartes (Item + Quantidade).", sheet.getSheetName());
                descartesSheets.add(desc);
                continue;
            }
            ItemSheetHeader hdr = findItemColumns(sheet, ev);
            if (hdr != null) {
                detailSheets.add(new SheetAndHeader(sheet, hdr));
                continue;
            }
            hdr = findPromoverDefaultGridLayout(sheet, ev);
            if (hdr != null) {
                log.info("Inventário por item: aba '{}' reconhecida pelo layout fixo de colunas (fallback).", sheet.getSheetName());
                detailSheets.add(new SheetAndHeader(sheet, hdr));
            }
        }
    }

    /**
     * Matriz: linha de cabeçalho com coluna "Tamanho" e duas ou mais colunas seguintes com rótulos de produto
     * (não "Quantidade"/"Total"/prateleira). Linhas seguintes: tamanho na coluna de tamanho e números nas colunas de produto.
     */
    private static SizeMatrixSheetSpec findSizeMatrixSheet(Sheet sheet, FormulaEvaluator ev) {
        int lastHeaderScan = Math.min(sheet.getLastRowNum(), 250);
        for (int r = 0; r <= lastHeaderScan; r++) {
            Row headerRow = sheet.getRow(r);
            if (headerRow == null) {
                continue;
            }
            int sizeCol = -1;
            for (Cell cell : headerRow) {
                String v = normalizeCellHeader(DATA_FORMATTER.formatCellValue(cell, ev));
                if (matchesTamanhoHeader(v)) {
                    sizeCol = cell.getColumnIndex();
                    break;
                }
            }
            if (sizeCol < 0) {
                continue;
            }
            int lastCol = Math.max((int) headerRow.getLastCellNum(), sizeCol + 2);
            List<Integer> productCols = new ArrayList<>();
            List<String> productHeaders = new ArrayList<>();
            for (int c = 0; c < lastCol; c++) {
                if (c == sizeCol) {
                    continue;
                }
                String rawTitle = trimCell(headerRow.getCell(c), ev);
                if (isExcludedMatrixProductHeader(rawTitle)) {
                    continue;
                }
                productCols.add(c);
                productHeaders.add(rawTitle.trim());
            }
            if (productCols.size() < 2) {
                continue;
            }
            boolean dataLooksLikeMatrix = false;
            int probeEnd = Math.min(r + 8, sheet.getLastRowNum());
            for (int pr = r + 1; pr <= probeEnd; pr++) {
                Row dataRow = sheet.getRow(pr);
                if (dataRow == null) {
                    continue;
                }
                String sizeProbe = trimCell(dataRow.getCell(sizeCol), ev);
                if (sizeProbe.isEmpty()) {
                    continue;
                }
                int qtyHits = 0;
                for (int pc : productCols) {
                    if (looksLikeQuantityCell(dataRow.getCell(pc), ev)) {
                        qtyHits++;
                    }
                }
                if (qtyHits >= 1) {
                    dataLooksLikeMatrix = true;
                    break;
                }
            }
            if (dataLooksLikeMatrix) {
                return new SizeMatrixSheetSpec(sheet, r, sizeCol, productCols, productHeaders);
            }
        }
        return null;
    }

    private static boolean isExcludedMatrixProductHeader(String rawHeader) {
        if (rawHeader == null || rawHeader.isBlank()) {
            return true;
        }
        String v = normalizeCellHeader(rawHeader);
        if (v.isEmpty()) {
            return true;
        }
        if (matchesTamanhoHeader(v)) {
            return true;
        }
        if (matchesQtyHeaderPrimary(v) || matchesQtyHeaderSecondary(v)) {
            return true;
        }
        if (matchesMinHeader(v) || matchesShelfHeader(v) || matchesFloorHeader(v) || matchesPriceHeader(v)) {
            return true;
        }
        if (matchesCategoryHeader(v)) {
            return true;
        }
        String n = normalizeLabel(v);
        if (n.equals("total") || n.equals("subtotal") || n.startsWith("total ") || n.endsWith(" total")) {
            return true;
        }
        return false;
    }

    /** Aba cujo nome sugere descarte e contém colunas de item + quantidade. */
    private static DescartesSheetSpec findDescartesSheet(Sheet sheet, FormulaEvaluator ev) {
        String sn = normalizeLabel(sheet.getSheetName());
        if (!sn.contains("descarte")) {
            return null;
        }
        int last = Math.min(sheet.getLastRowNum(), 120);
        for (int r = 0; r <= last; r++) {
            Row row = sheet.getRow(r);
            if (row == null) {
                continue;
            }
            int itemCol = -1;
            int qtyCol = -1;
            for (Cell cell : row) {
                String v = normalizeCellHeader(DATA_FORMATTER.formatCellValue(cell, ev));
                if (matchesNameHeader(v) && itemCol < 0) {
                    itemCol = cell.getColumnIndex();
                } else if (matchesQtyHeaderPrimary(v) && qtyCol < 0) {
                    qtyCol = cell.getColumnIndex();
                }
            }
            if (qtyCol < 0) {
                for (Cell cell : row) {
                    String v = normalizeCellHeader(DATA_FORMATTER.formatCellValue(cell, ev));
                    if (matchesQtyHeaderSecondary(v)) {
                        qtyCol = cell.getColumnIndex();
                        break;
                    }
                }
            }
            if (itemCol >= 0 && qtyCol >= 0 && itemCol != qtyCol) {
                return new DescartesSheetSpec(sheet, r, itemCol, qtyCol);
            }
        }
        return null;
    }

    private static String deriveMatrixItemCode(String sheetName, String productHeader, String sizeRaw) {
        String a = sheetNameToSlug(sheetName);
        String b = sheetNameToSlug(productHeader);
        String s = sheetNameToSlug(sizeRaw);
        if (b.isEmpty()) {
            b = "item";
        }
        if (s.isEmpty()) {
            s = "tam";
        }
        String code = (a + "-" + b + "-" + s).toUpperCase(Locale.ROOT).replaceAll("-+", "-");
        if (code.length() > 64) {
            code = code.substring(0, 64).replaceAll("-+$", "");
        }
        return code;
    }

    private static String deriveDescartesItemCode(String itemName, int excelRow) {
        String slug = sheetNameToSlug(itemName);
        if (slug.isEmpty()) {
            slug = "item";
        }
        if (slug.length() > 36) {
            slug = slug.substring(0, 36).replaceAll("-+$", "");
        }
        return ("DESCARTES-" + slug + "-L" + (excelRow + 1)).toUpperCase(Locale.ROOT);
    }

    private void importSizeMatrixSheet(
            SizeMatrixSheetSpec spec,
            String originalName,
            String requisitionNumber,
            UUID userId,
            FormulaEvaluator ev,
            List<PhysicalInventoryImportLineResultDTO> lines,
            List<String> warnings,
            Set<String> seenLineKeys) {
        Sheet sheet = spec.sheet();
        StockCategory sheetCategory = resolveCategory(sheet.getSheetName());
        if (sheetCategory == null) {
            sheetCategory = resolveCategoryFromItemHints(sheet.getSheetName(), null);
        }
        if (sheetCategory == null) {
            sheetCategory = StockCategory.CALCADOS;
        }
        for (int r = spec.headerRow() + 1; r <= sheet.getLastRowNum(); r++) {
            Row row = sheet.getRow(r);
            if (row == null) {
                continue;
            }
            String sizeRaw = trimCell(row.getCell(spec.sizeCol()), ev);
            if (sizeRaw.isEmpty()) {
                continue;
            }
            for (int i = 0; i < spec.productCols().size(); i++) {
                int col = spec.productCols().get(i);
                String productHeader = spec.productHeaders().get(i);
                int targetQty;
                try {
                    targetQty = parseQuantity(row.getCell(col), ev);
                } catch (Exception ex) {
                    warnings.add(sheet.getSheetName() + " — linha " + (r + 1) + ", col. " + (col + 1)
                            + " (" + productHeader + "): quantidade inválida.");
                    lines.add(PhysicalInventoryImportLineResultDTO.builder()
                            .stockItemCode("-")
                            .itemName(productHeader + " / " + sizeRaw)
                            .categoryLabel(sheet.getSheetName())
                            .skipped(true)
                            .message("Quantidade inválida")
                            .build());
                    continue;
                }
                if (targetQty < 0) {
                    warnings.add(sheet.getSheetName() + " — linha " + (r + 1) + " (" + productHeader + "): quantidade negativa.");
                    continue;
                }
                String code = deriveMatrixItemCode(sheet.getSheetName(), productHeader, sizeRaw);
                String name = productHeader + " — Tam. " + sizeRaw.trim();
                String categoryLabel = sheet.getSheetName().trim() + " / " + productHeader.trim();
                StockCategory category = resolveCategoryFromItemHints(productHeader + " " + sheet.getSheetName(), code);
                if (category == null) {
                    category = sheetCategory;
                }
                applyInventoryQuantityLine(
                        originalName,
                        requisitionNumber,
                        userId,
                        sheet.getSheetName(),
                        r + 1,
                        code,
                        name,
                        categoryLabel,
                        category,
                        targetQty,
                        0,
                        null,
                        false,
                        "",
                        "",
                        lines,
                        warnings,
                        seenLineKeys);
            }
        }
    }

    private void importDescartesSheet(
            DescartesSheetSpec spec,
            String originalName,
            String requisitionNumber,
            UUID userId,
            FormulaEvaluator ev,
            List<PhysicalInventoryImportLineResultDTO> lines,
            List<String> warnings,
            Set<String> seenLineKeys) {
        Sheet sheet = spec.sheet();
        for (int r = spec.headerRow() + 1; r <= sheet.getLastRowNum(); r++) {
            Row row = sheet.getRow(r);
            if (row == null) {
                continue;
            }
            String itemName = trimCell(row.getCell(spec.itemCol()), ev);
            if (itemName.isEmpty()) {
                continue;
            }
            int targetQty;
            try {
                targetQty = parseQuantity(row.getCell(spec.qtyCol()), ev);
            } catch (Exception ex) {
                warnings.add(sheet.getSheetName() + " — linha " + (r + 1) + " (\"" + itemName + "\"): quantidade inválida.");
                lines.add(PhysicalInventoryImportLineResultDTO.builder()
                        .stockItemCode("-")
                        .itemName(itemName)
                        .categoryLabel("Descartes")
                        .skipped(true)
                        .message("Quantidade inválida")
                        .build());
                continue;
            }
            if (targetQty < 0) {
                continue;
            }
            String code = deriveDescartesItemCode(itemName, r);
            String name = "[Descarte] " + itemName.trim();
            StockCategory category = resolveCategoryFromItemHints(itemName, code);
            if (category == null) {
                category = StockCategory.ACESSORIOS;
            }
            applyInventoryQuantityLine(
                    originalName,
                    requisitionNumber,
                    userId,
                    sheet.getSheetName(),
                    r + 1,
                    code,
                    name,
                    "Descartes",
                    category,
                    targetQty,
                    0,
                    null,
                    false,
                    "",
                    "",
                    lines,
                    warnings,
                    seenLineKeys);
        }
    }

    private static ItemSheetHeader findItemColumns(Sheet sheet, FormulaEvaluator ev) {
        int last = Math.min(sheet.getLastRowNum(), 250);
        for (int r = 0; r <= last; r++) {
            Row row = sheet.getRow(r);
            if (row == null) {
                continue;
            }
            int codeCol = -1;
            int nameCol = -1;
            int catCol = -1;
            int qtyCol = -1;
            int minCol = -1;
            int priceCol = -1;
            int shelfCol = -1;
            int floorCol = -1;
            boolean variantSizedCode = false;
            // Iterar só células definidas (evita getLastCellNum() errado em linhas esparsas / exportações diversas)
            for (Cell cell : row) {
                int c = cell.getColumnIndex();
                String rawHeader = DATA_FORMATTER.formatCellValue(cell, ev);
                String v = normalizeCellHeader(rawHeader);
                if (v.isEmpty()) {
                    continue;
                }
                // Primeira coluna que casa (evita sobrescrever "Estoque" com cabeçalhos como "Valor total em estoque").
                if (matchesCodeHeader(v) && codeCol < 0) {
                    codeCol = c;
                    variantSizedCode = false;
                } else if (matchesTamanhoHeader(v) && codeCol < 0) {
                    codeCol = c;
                    variantSizedCode = true;
                } else if (matchesNameHeader(v) && nameCol < 0) {
                    nameCol = c;
                } else if (matchesCategoryHeader(v) && catCol < 0) {
                    catCol = c;
                } else if (matchesQtyHeaderPrimary(v) && qtyCol < 0) {
                    qtyCol = c;
                } else if (matchesMinHeader(v) && minCol < 0) {
                    minCol = c;
                } else if (matchesPriceHeader(v) && priceCol < 0) {
                    priceCol = c;
                } else if (matchesShelfHeader(v) && shelfCol < 0) {
                    shelfCol = c;
                } else if (matchesFloorHeader(v) && floorCol < 0) {
                    floorCol = c;
                }
            }
            if (qtyCol < 0) {
                for (Cell cell : row) {
                    int c = cell.getColumnIndex();
                    String rawHeader = DATA_FORMATTER.formatCellValue(cell, ev);
                    String v = normalizeCellHeader(rawHeader);
                    if (v.isEmpty()) {
                        continue;
                    }
                    if (matchesQtyHeaderSecondary(v)) {
                        qtyCol = c;
                        break;
                    }
                }
            }
            // Reaplicar só se ainda faltar min/preço (segunda passagem leve)
            for (Cell cell : row) {
                int c = cell.getColumnIndex();
                String rawHeader = DATA_FORMATTER.formatCellValue(cell, ev);
                String v = normalizeCellHeader(rawHeader);
                if (v.isEmpty()) {
                    continue;
                }
                if (matchesMinHeader(v) && minCol < 0) {
                    minCol = c;
                } else if (matchesPriceHeader(v) && priceCol < 0) {
                    priceCol = c;
                } else if (matchesShelfHeader(v) && shelfCol < 0) {
                    shelfCol = c;
                } else if (matchesFloorHeader(v) && floorCol < 0) {
                    floorCol = c;
                }
            }
            if (codeCol >= 0 && qtyCol >= 0) {
                if (nameCol < 0) {
                    nameCol = -1;
                }
                if (catCol < 0) {
                    catCol = -1;
                }
                if (minCol < 0) {
                    minCol = -1;
                }
                if (priceCol < 0) {
                    priceCol = -1;
                }
                if (shelfCol < 0) {
                    shelfCol = -1;
                }
                if (floorCol < 0) {
                    floorCol = -1;
                }
                return new ItemSheetHeader(r, codeCol, nameCol, catCol, qtyCol, minCol, priceCol, shelfCol, floorCol, variantSizedCode);
            }
        }
        return null;
    }

    /**
     * Fallback: grade como na UI (Código, Item, Categoria, Estoque, …) sem cabeçalhos reconhecidos
     * (export CSV/HTML, fórmulas, ou textos fora do padrão).
     */
    private static ItemSheetHeader findPromoverDefaultGridLayout(Sheet sheet, FormulaEvaluator ev) {
        for (int headerIdx = -1; headerIdx <= 15; headerIdx++) {
            int dataStart = headerIdx + 1;
            if (dataStart < 0) {
                dataStart = 0;
            }
            Row dr1 = sheet.getRow(dataStart);
            Row dr2 = sheet.getRow(dataStart + 1);
            if (dr1 == null || dr2 == null) {
                continue;
            }
            for (int[] lay : PROMOVER_GRID_LAYOUTS) {
                int cCode = lay[0];
                int cName = lay[1];
                int cCat = lay[2];
                int cQty = lay[3];
                int cPrice = lay[4];
                int needMax = Math.max(Math.max(cCode, cQty), cPrice);
                if (dr1.getLastCellNum() <= needMax && dr1.getCell(needMax) == null && dr2.getCell(needMax) == null) {
                    continue;
                }
                if (!rowPairLooksLikeInventoryRows(dr1, dr2, cCode, cQty, ev)) {
                    continue;
                }
                if (isHeaderLikeRow(dr1, cCode, cQty, ev)) {
                    continue;
                }
                int resolvedHeaderRow = headerIdx < 0 ? -1 : headerIdx;
                boolean hasPriceCol = dr1.getLastCellNum() > cPrice || dr1.getCell(cPrice) != null;
                int priceCol = hasPriceCol ? cPrice : -1;
                return new ItemSheetHeader(resolvedHeaderRow, cCode, cName, cCat, cQty, -1, priceCol, -1, -1, false);
            }
        }
        return null;
    }

    /**
     * Localiza prateleira pela identificação (ignora maiúsculas) ou cria registro novo na base.
     * Reativa cadastro existente se estiver inativo.
     */
    private StorageShelf resolveOrCreateShelfByIdentification(String identificationRaw) {
        String id = identificationRaw == null ? "" : identificationRaw.trim();
        if (id.isEmpty()) {
            throw new IllegalArgumentException("Identificação de prateleira vazia.");
        }
        Optional<StorageShelf> existing = storageShelfRepository.findByIdentificationIgnoreCase(id);
        if (existing.isPresent()) {
            StorageShelf s = existing.get();
            if (Boolean.FALSE.equals(s.getActive())) {
                s.setActive(true);
                log.info("Inventário por item: prateleira \"{}\" reativada (estava inativa).", s.getIdentification());
                return storageShelfRepository.save(s);
            }
            return s;
        }
        StorageShelf created = StorageShelf.builder()
                .identification(id)
                .active(true)
                .build();
        created = storageShelfRepository.save(created);
        log.info("Inventário por item: prateleira \"{}\" criada automaticamente a partir da planilha (id {}).",
                id, created.getId());
        return created;
    }

    private StockItemLocation getOrCreateItemLocation(StockItem item, StorageShelf shelf, String floorRaw) {
        String floorNorm = normalizeLocationFloor(floorRaw);
        Optional<StockItemLocation> found = stockItemLocationRepository.findByStockItemIdAndShelfIdAndFloor(
                item.getId(), shelf.getId(), floorNorm);
        if (found.isPresent()) {
            return found.get();
        }
        if (floorNorm == null) {
            found = stockItemLocationRepository.findByStockItemIdAndShelfIdAndFloor(item.getId(), shelf.getId(), "");
            if (found.isPresent()) {
                return found.get();
            }
        }
        StockItemLocation loc = StockItemLocation.builder()
                .stockItem(item)
                .shelf(shelf)
                .floor(floorNorm)
                .quantity(0)
                .build();
        return stockItemLocationRepository.save(loc);
    }

    private static String normalizeLocationFloor(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return raw.trim();
    }

    private static boolean rowPairLooksLikeInventoryRows(Row a, Row b, int colCode, int colQty, FormulaEvaluator ev) {
        String ca = trimCell(a.getCell(colCode), ev);
        String cb = trimCell(b.getCell(colCode), ev);
        if (!looksLikeSkuOrCode(ca) || !looksLikeSkuOrCode(cb)) {
            return false;
        }
        return looksLikeQuantityCell(a.getCell(colQty), ev) && looksLikeQuantityCell(b.getCell(colQty), ev);
    }

    private static boolean isHeaderLikeRow(Row row, int colCode, int colQty, FormulaEvaluator ev) {
        String c = normalizeLabel(trimCell(row.getCell(colCode), ev));
        String q = normalizeLabel(trimCell(row.getCell(colQty), ev));
        boolean codeH = c.equals("codigo") || c.equals("code") || c.equals("sku") || c.startsWith("codigo");
        boolean qtyH = q.equals("estoque") || q.equals("quantidade") || q.equals("saldo") || q.startsWith("qtd");
        return codeH && qtyH;
    }

    private static boolean looksLikeSkuOrCode(String s) {
        if (s == null) {
            return false;
        }
        s = s.trim();
        if (s.length() < 1 || s.length() > 80) {
            return false;
        }
        String n = normalizeLabel(s);
        if (n.equals("codigo") || n.equals("code") || n.equals("sku") || n.equals("item") || n.equals("categoria")
                || n.equals("total") || n.equals("subtotal") || n.startsWith("total ")) {
            return false;
        }
        // Planilhas exportadas costumam usar espaços em volta de hífens (ex.: "CAMISAS - TERCEIRIZADAS - G")
        if (!s.matches("(?U).*\\p{L}.*") && !s.matches("(?U).*[\\p{N}].*[\\p{N}].*")) {
            return false;
        }
        return s.matches("(?U)[\\p{L}\\p{N}\\s\\-_./]+");
    }

    private static boolean looksLikeQuantityCell(Cell cell, FormulaEvaluator ev) {
        return looksLikeQuantityText(trimCell(cell, ev));
    }

    private static boolean looksLikeQuantityText(String s) {
        if (s == null || s.isBlank()) {
            return false;
        }
        String t = s.trim();
        if (STOCK_MIN_PATTERN.matcher(t).find()) {
            return true;
        }
        try {
            parseQuantityLoose(t);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private static String describeWorkbookHeaderPreview(Workbook wb, FormulaEvaluator ev) {
        if (wb.getNumberOfSheets() == 0) {
            return "(sem abas)";
        }
        Sheet s = wb.getSheetAt(0);
        StringBuilder sb = new StringBuilder();
        int lastR = Math.min(4, s.getLastRowNum());
        for (int r = 0; r <= lastR; r++) {
            Row row = s.getRow(r);
            sb.append("L").append(r + 1).append("=[");
            if (row == null) {
                sb.append("vazia]; ");
                continue;
            }
            int maxC = Math.min(Math.max(row.getLastCellNum(), 0), 10);
            List<String> parts = new ArrayList<>();
            for (int c = 0; c < maxC; c++) {
                Cell cell = row.getCell(c);
                String t = trimCell(cell, ev);
                if (t.length() > 35) {
                    t = t.substring(0, 35) + "…";
                }
                parts.add((c + 1) + ":" + t);
            }
            sb.append(String.join(", ", parts)).append("]; ");
        }
        return sb.toString();
    }

    /** Normaliza texto de cabeçalho: NBSP, pontuação comum em Excel (Cód., Qtd.), barras. */
    private static String normalizeCellHeader(String raw) {
        if (raw == null) {
            return "";
        }
        String s = raw.replace('\u00A0', ' ').trim();
        String v = normalizeLabel(s);
        v = v.replace('.', ' ').replace('/', ' ').replace('-', ' ').replace('_', ' ');
        v = v.replace('(', ' ').replace(')', ' ').replace('[', ' ').replace(']', ' ');
        v = v.replaceAll("\\s+", " ").trim();
        return v;
    }

    private static boolean matchesTamanhoHeader(String v) {
        if (matchesCodeHeader(v)) {
            return false;
        }
        return v.equals("tamanho") || v.equals("tam") || v.startsWith("tamanho ");
    }

    private static boolean matchesCodeHeader(String v) {
        if (v.contains("barra")) {
            return false;
        }
        if (v.equals("codigo") || v.equals("cod") || v.equals("code") || v.equals("sku")
                || v.equals("ref") || v.equals("referencia")) {
            return true;
        }
        if (v.startsWith("codigo ") || v.startsWith("cod ")) {
            return true;
        }
        // "cód item", "cod produto" após normalizeCellHeader
        String first = v.contains(" ") ? v.substring(0, v.indexOf(' ')) : v;
        if (first.equals("cod") || first.equals("codigo")) {
            return true;
        }
        return v.contains("codigo") && !v.contains("barra");
    }

    private static boolean matchesNameHeader(String v) {
        if (v.contains("categoria")) {
            return false;
        }
        return v.equals("item") || v.equals("nome") || v.equals("produto") || v.equals("descricao")
                || v.equals("descricao do produto") || v.equals("material") || v.equals("produto servico")
                || v.startsWith("descricao");
    }

    private static boolean matchesCategoryHeader(String v) {
        return v.equals("categoria") || v.equals("category") || v.equals("tipo")
                || v.equals("familia") || v.equals("grupo");
    }

    /** Cabeçalhos inequívocos de quantidade (preferir a 1.ª coluna que casar). */
    private static boolean matchesQtyHeaderPrimary(String v) {
        if (v.contains("min") || v.contains("minimo")) {
            return false;
        }
        if (v.contains("baixo") || v.contains("status") || v.contains("situacao")) {
            return false;
        }
        if (v.equals("acoes") || v.equals("acao") || v.startsWith("acoes ") || v.endsWith(" acoes")) {
            return false;
        }
        if (v.startsWith("qtd") || v.startsWith("qtde")) {
            return true;
        }
        if (v.equals("stock") || v.equals("inventory") || v.equals("qty") || v.equals("quantity")
                || v.equals("on hand") || v.equals("in stock")) {
            return true;
        }
        if (v.equals("estoque") || v.equals("quantidade") || v.equals("saldo") || v.equals("quantidade atual")) {
            return true;
        }
        return v.contains("disponivel") && !v.contains("min");
    }

    /**
     * Só se não houver coluna primária: textos com "estoque"/"quantidade" que não sejam rótulo de status ou valor agregado.
     */
    private static boolean matchesQtyHeaderSecondary(String v) {
        if (matchesQtyHeaderPrimary(v)) {
            return false;
        }
        if (v.contains("min") || v.contains("minimo")) {
            return false;
        }
        if (v.contains("baixo") || v.contains("status") || v.contains("situacao")) {
            return false;
        }
        if (v.contains("estado") && v.contains("estoque")) {
            return false;
        }
        if (v.contains("moviment") || v.contains("transferencia")) {
            return false;
        }
        if (v.contains("atualiza") || v.contains("historico")) {
            return false;
        }
        if (v.contains("valor") && v.contains("estoque")) {
            return false;
        }
        if (v.contains("total") && v.contains("estoque")) {
            return false;
        }
        return (v.contains("quantidade") && !v.contains("min"))
                || (v.contains("estoque") && !v.contains("min"));
    }

    private static boolean matchesMinHeader(String v) {
        return v.equals("min") || v.equals("minimo") || v.equals("min estoque") || v.equals("estoque minimo")
                || v.contains("quantidade min");
    }

    private static boolean matchesPriceHeader(String v) {
        return (v.contains("valor") && (v.contains("unit") || v.contains("unitario")))
                || v.equals("preco unitario")
                || (v.equals("preco") && v.contains("unit"))
                || v.equals("valor unit");
    }

    private static boolean matchesShelfHeader(String v) {
        if (matchesCodeHeader(v)) {
            return false;
        }
        if (v.contains("item") && (v.contains("codigo") || v.contains("cod "))) {
            return false;
        }
        return v.equals("prateleira")
                || v.equals("shelf")
                || v.equals("localizacao")
                || v.startsWith("localizacao ")
                || v.equals("codigo prateleira")
                || v.equals("cod prateleira")
                || v.startsWith("prateleira ")
                || v.equals("identificacao prateleira")
                || v.equals("id prateleira")
                || (v.contains("prateleira") && (v.contains("cod") || v.contains("ident") || v.contains("id")));
    }

    private static boolean matchesFloorHeader(String v) {
        return v.equals("compartimento")
                || v.equals("andar")
                || v.equals("floor")
                || v.equals("nivel")
                || v.equals("piso")
                || v.equals("box")
                || v.startsWith("compartimento ");
    }

    private static StockCategory resolveCategory(String raw) {
        if (raw == null || raw.isBlank()) {
            return StockCategory.ACESSORIOS;
        }
        String n = normalizeLabel(raw);
        StockCategory mapped = mapCategoryKeywords(n);
        if (mapped != null) {
            return mapped;
        }
        for (StockCategory c : StockCategory.values()) {
            if (n.equals(normalizeLabel(c.getDescription()))) {
                return c;
            }
        }
        return null;
    }

    /**
     * Quando aba/célula de categoria não casa com o cadastro (ex.: "Material", "Operacional"),
     * tenta deduzir a partir do nome ou código do item.
     */
    private static StockCategory resolveCategoryFromItemHints(String itemName, String code) {
        if (itemName == null && code == null) {
            return null;
        }
        return mapCategoryKeywords(normalizeLabel(
                (itemName != null ? itemName : "") + " " + (code != null ? code : "")));
    }

    private static StockCategory mapCategoryKeywords(String n) {
        if (n == null || n.isBlank()) {
            return null;
        }
        if (n.contains("vigil") || n.contains("operacional") || n.contains("seguranca patrimonial")) {
            return StockCategory.UNIFORME_VIGILANCIA;
        }
        if (n.contains("servic") || n.contains("terceiriz") || n.contains("limpeza") || n.contains("zelador")) {
            return StockCategory.UNIFORME_SERVICOS;
        }
        if (n.contains("administrativ") || n.contains("social") || n.contains("recepcao")) {
            return StockCategory.UNIFORME_ADMINISTRATIVO;
        }
        if (n.contains("cozinha")) {
            return StockCategory.UNIFORME_COZINHA;
        }
        if (n.equals("epi")
                || n.contains("protecao individual")
                || n.contains("equipamento de protecao")
                || n.contains("luva")
                || n.contains("mascara")
                || n.contains("oculos")
                || n.contains("capacete")) {
            return StockCategory.EPI;
        }
        if (n.contains("acessor")
                || n.contains("material")
                || n.contains("consumo")
                || n.contains("escritorio")
                || n.contains("higiene")
                || n.contains("descart")
                || n.contains("cinto")
                || n.contains("bone")
                || n.contains("chapeu")
                || n.contains("gorro")) {
            return StockCategory.ACESSORIOS;
        }
        if (n.contains("calcad")
                || n.contains("sapato")
                || n.contains("tenis")
                || n.contains("bota")
                || n.contains("botina")) {
            return StockCategory.CALCADOS;
        }
        if (n.contains("camisa") || n.contains("camiseta") || n.contains("polo")) {
            if (n.contains("vigil") || n.contains("patrulh")) {
                return StockCategory.UNIFORME_VIGILANCIA;
            }
            if (n.contains("terceiriz") || n.contains("servic")) {
                return StockCategory.UNIFORME_SERVICOS;
            }
            return StockCategory.UNIFORME_SERVICOS;
        }
        if (n.contains("calca") || n.contains("bermuda") || n.contains("jaqueta") || n.contains("blusa")) {
            if (n.contains("vigil") || n.contains("patrulh")) {
                return StockCategory.UNIFORME_VIGILANCIA;
            }
            if (n.contains("terceiriz") || n.contains("servic")) {
                return StockCategory.UNIFORME_SERVICOS;
            }
            return StockCategory.UNIFORME_VIGILANCIA;
        }
        if (n.contains("uniforme")) {
            return StockCategory.UNIFORME_SERVICOS;
        }
        return null;
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

    private static String trimCell(Cell cell, FormulaEvaluator ev) {
        if (cell == null) {
            return "";
        }
        return DATA_FORMATTER.formatCellValue(cell, ev).trim();
    }

    private static int[] parseStockCell(Cell cell, FormulaEvaluator ev) {
        if (cell == null) {
            return new int[]{0, -1};
        }
        CellType effective = cell.getCellType();
        if (effective == CellType.FORMULA) {
            effective = cell.getCachedFormulaResultType();
        }
        if (effective == CellType.NUMERIC) {
            return new int[]{(int) Math.round(cell.getNumericCellValue()), -1};
        }
        String raw = DATA_FORMATTER.formatCellValue(cell, ev).trim();
        if (raw.isEmpty()) {
            return new int[]{0, -1};
        }
        Matcher m = STOCK_MIN_PATTERN.matcher(raw);
        if (m.matches()) {
            return new int[]{Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2))};
        }
        return new int[]{parseQuantityLoose(stripLeadingQtyFromMultilineCell(raw)), -1};
    }

    private static int parseQuantity(Cell cell, FormulaEvaluator ev) throws NumberFormatException {
        if (cell == null) {
            throw new NumberFormatException("null");
        }
        CellType effective = cell.getCellType();
        if (effective == CellType.FORMULA) {
            effective = cell.getCachedFormulaResultType();
        }
        if (effective == CellType.NUMERIC) {
            return (int) Math.round(cell.getNumericCellValue());
        }
        String raw = DATA_FORMATTER.formatCellValue(cell, ev).trim();
        Matcher m = STOCK_MIN_PATTERN.matcher(raw);
        if (m.matches()) {
            return Integer.parseInt(m.group(1));
        }
        return parseQuantityLoose(stripLeadingQtyFromMultilineCell(raw));
    }

    /** Evita "10\\nMin: 3" virar 103 no parse só por dígitos; usa só a 1.ª linha se não casar STOCK_MIN. */
    private static String stripLeadingQtyFromMultilineCell(String raw) {
        String t = raw.trim();
        Matcher m = STOCK_MIN_PATTERN.matcher(t);
        if (m.matches()) {
            return m.group(1);
        }
        int nl = t.indexOf('\n');
        if (nl > 0) {
            return t.substring(0, nl).trim();
        }
        int cr = t.indexOf('\r');
        if (cr > 0) {
            return t.substring(0, cr).trim();
        }
        return t;
    }

    private static int parseQuantityLoose(String raw) throws NumberFormatException {
        if (raw == null || raw.isEmpty()) {
            throw new NumberFormatException("empty");
        }
        raw = raw.replace(".", "").replace(',', '.');
        double d = Double.parseDouble(raw.replaceAll("[^0-9.\\-]", ""));
        return (int) Math.round(d);
    }

    private static BigDecimal parseMoney(Cell cell, FormulaEvaluator ev) {
        if (cell == null) {
            return null;
        }
        try {
            if (cell.getCellType() == org.apache.poi.ss.usermodel.CellType.NUMERIC) {
                return BigDecimal.valueOf(cell.getNumericCellValue()).setScale(2, RoundingMode.HALF_UP);
            }
        } catch (Exception ignored) {
            // fall through to string
        }
        String raw = DATA_FORMATTER.formatCellValue(cell, ev).trim();
        if (raw.isEmpty()) {
            return null;
        }
        raw = raw.replace("R$", "").replace("r$", "").trim();
        raw = raw.replace(".", "").replace(',', '.');
        raw = raw.replaceAll("[^0-9.\\-]", "");
        if (raw.isEmpty()) {
            return null;
        }
        return new BigDecimal(raw).setScale(2, RoundingMode.HALF_UP);
    }
}
