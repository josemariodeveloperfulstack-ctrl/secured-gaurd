package com.z7design.secured_guard.service;

import com.itextpdf.io.image.ImageData;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.VerticalAlignment;
import com.z7design.secured_guard.dto.StockRequisitionAnalyticsDTO;
import com.z7design.secured_guard.dto.StockRequisitionAnalyticsDTO.*;
import com.z7design.secured_guard.dto.StockRequisitionAnalyticsFilterDTO;
import com.z7design.secured_guard.model.*;
import com.z7design.secured_guard.model.enums.StockCategory;
import com.z7design.secured_guard.model.enums.StockRequisitionStatus;
import com.z7design.secured_guard.repository.CompanyRepository;
import com.z7design.secured_guard.repository.StockRequisitionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockRequisitionAnalyticsService {

    private final StockRequisitionRepository stockRequisitionRepository;
    private final CompanyRepository companyRepository;

    private static final DeviceRgb DARK_NAVY = new DeviceRgb(15, 23, 42);     // #0f172a
    private static final DeviceRgb BRAND_RED = new DeviceRgb(220, 38, 38);    // #dc2626
    private static final DeviceRgb TEXT_MUTED = new DeviceRgb(100, 116, 139);  // #64748b
    private static final DeviceRgb BG_ALT = new DeviceRgb(248, 250, 252);      // #f8fafc
    private static final DeviceRgb BORDER_LIGHT = new DeviceRgb(226, 232, 240);// #e2e8f0

    /**
     * Calcula as métricas do dashboard e os dados analíticos de requisições de estoque,
     * incluindo o ciclo e tempo de uso de EPIs.
     */
    @Transactional(readOnly = true)
    public StockRequisitionAnalyticsDTO getAnalytics(StockRequisitionAnalyticsFilterDTO filter) {
        log.info("📊 Calculando indicadores analíticos de requisições de estoque...");

        // 1. Carrega todas as requisições em ordem cronológica crescente para cálculo exato do tempo de uso
        List<StockRequisition> allAsc = stockRequisitionRepository.findAllWithFullDetailsAsc();

        // 2. Mapeamento histórico de entregas anteriores por funcionário e item
        // Chave: employeeId + "_" + stockItemId
        Map<String, LocalDateTime> lastItemDeliveryMap = new HashMap<>();
        Map<UUID, Map<UUID, LineUsageHistory>> requisitionLineUsageMap = new HashMap<>();

        for (StockRequisition r : allAsc) {
            if (r.getStatus() == StockRequisitionStatus.CANCELLED) {
                continue;
            }
            Employee emp = r.getEmployee();
            if (emp == null || emp.getId() == null) {
                continue;
            }
            UUID empId = emp.getId();
            LocalDateTime reqDate = r.getDeliveredAt() != null ? r.getDeliveredAt() : r.getCreatedAt();
            if (reqDate == null) {
                reqDate = LocalDateTime.now();
            }

            Map<UUID, LineUsageHistory> lineMap = requisitionLineUsageMap.computeIfAbsent(r.getId(), k -> new HashMap<>());

            if (r.getLines() != null) {
                for (StockRequisitionLine line : r.getLines()) {
                    StockItem item = line.getStockItem();
                    if (item == null || item.getId() == null) {
                        continue;
                    }
                    UUID itemId = item.getId();
                    String key = empId + "_" + itemId;

                    LocalDateTime prevDate = lastItemDeliveryMap.get(key);
                    Integer daysSince = null;
                    String usageText;

                    boolean isEpi = isItemEpi(item);

                    if (prevDate != null) {
                        daysSince = (int) ChronoUnit.DAYS.between(prevDate.toLocalDate(), reqDate.toLocalDate());
                        if (daysSince <= 0) {
                            usageText = "Mesmo dia da entrega anterior";
                        } else if (daysSince < 30) {
                            usageText = daysSince + " dias de uso";
                        } else {
                            long months = Math.round(daysSince / 30.0);
                            usageText = daysSince + " dias (~" + months + " meses) de uso";
                        }
                    } else {
                        usageText = "Primeira entrega registrada";
                    }

                    lineMap.put(itemId, new LineUsageHistory(daysSince, prevDate, usageText, isEpi));

                    // Atualiza o histórico apenas se for aprovada ou entregue
                    if (r.getStatus() == StockRequisitionStatus.APPROVED || r.getStatus() == StockRequisitionStatus.DELIVERED) {
                        lastItemDeliveryMap.put(key, reqDate);
                    }
                }
            }
        }

        // 3. Resolve os limites de data do filtro
        DateRange range = resolveDateRange(filter);

        // 4. Filtra as requisições conforme os critérios do usuário
        List<StockRequisition> filtered = allAsc.stream()
                .filter(r -> {
                    LocalDateTime d = r.getDeliveredAt() != null ? r.getDeliveredAt() : r.getCreatedAt();
                    if (d == null) return false;
                    if (range.start != null && d.isBefore(range.start)) return false;
                    if (range.end != null && d.isAfter(range.end)) return false;

                    Employee emp = r.getEmployee();
                    if (filter.getEmployeeId() != null) {
                        if (emp == null || !filter.getEmployeeId().equals(emp.getId())) return false;
                    }

                    if (filter.getCompanyId() != null) {
                        if (emp == null || emp.getCompany() == null || !filter.getCompanyId().equals(emp.getCompany().getId())) {
                            return false;
                        }
                    }

                    if (filter.getUnitId() != null) {
                        if (emp == null || emp.getUnit() == null || !filter.getUnitId().equals(emp.getUnit().getId())) {
                            return false;
                        }
                    }

                    if (filter.getDepartmentId() != null) {
                        if (emp == null || emp.getDepartment() == null || !filter.getDepartmentId().equals(emp.getDepartment().getId())) {
                            return false;
                        }
                    }

                    if (filter.getRequestedByUserId() != null) {
                        if (r.getRequestedByUser() == null || !filter.getRequestedByUserId().equals(r.getRequestedByUser().getId())) {
                            return false;
                        }
                    }

                    if (Boolean.TRUE.equals(filter.getOnlyEpi())) {
                        boolean hasEpi = r.getLines() != null && r.getLines().stream()
                                .anyMatch(l -> l.getStockItem() != null && isItemEpi(l.getStockItem()));
                        if (!hasEpi) return false;
                    }

                    if (filter.getSearch() != null && !filter.getSearch().isBlank()) {
                        String term = filter.getSearch().trim().toLowerCase();
                        boolean matchNum = r.getRequisitionNumber() != null && r.getRequisitionNumber().toLowerCase().contains(term);
                        boolean matchEmp = emp != null && emp.getName() != null && emp.getName().toLowerCase().contains(term);
                        boolean matchReq = r.getRequestedByUser() != null && r.getRequestedByUser().getName() != null
                                && r.getRequestedByUser().getName().toLowerCase().contains(term);
                        boolean matchSec = r.getEmployeeWorkSector() != null && r.getEmployeeWorkSector().toLowerCase().contains(term);
                        boolean matchItem = r.getLines() != null && r.getLines().stream().anyMatch(l ->
                                l.getStockItem() != null && l.getStockItem().getFullName().toLowerCase().contains(term));
                        if (!matchNum && !matchEmp && !matchReq && !matchSec && !matchItem) {
                            return false;
                        }
                    }

                    return true;
                })
                .sorted((a, b) -> {
                    LocalDateTime da = a.getCreatedAt() != null ? a.getCreatedAt() : LocalDateTime.MIN;
                    LocalDateTime db = b.getCreatedAt() != null ? b.getCreatedAt() : LocalDateTime.MIN;
                    return db.compareTo(da); // Mais recentes primeiro para visualização
                })
                .collect(Collectors.toList());

        // 5. Constrói DetailedRequisitionRowDTO e métricas de resumo
        List<DetailedRequisitionRowDTO> detailedRows = new ArrayList<>();
        Set<UUID> distinctEmployees = new HashSet<>();
        Set<UUID> distinctItems = new HashSet<>();
        List<Integer> epiDaysList = new ArrayList<>();
        Map<UUID, TopItemDTO> topItemsMap = new HashMap<>();
        Map<String, SectorConsumptionDTO> sectorMap = new HashMap<>();
        Map<String, CompanyConsumptionDTO> companyMap = new HashMap<>();
        Map<String, PeriodMetricDTO> periodMap = new TreeMap<>();

        int totalDeliveredItems = 0;
        int pending = 0;
        int approved = 0;
        int delivered = 0;

        DateTimeFormatter dayFormatter = DateTimeFormatter.ofPattern("dd/MM");
        DateTimeFormatter monthFormatter = DateTimeFormatter.ofPattern("MM/yyyy");

        for (StockRequisition r : filtered) {
            if (r.getStatus() == StockRequisitionStatus.PENDING) pending++;
            else if (r.getStatus() == StockRequisitionStatus.APPROVED) approved++;
            else if (r.getStatus() == StockRequisitionStatus.DELIVERED) delivered++;

            Employee emp = r.getEmployee();
            if (emp != null && emp.getId() != null) {
                distinctEmployees.add(emp.getId());
            }

            LocalDateTime rDate = r.getDeliveredAt() != null ? r.getDeliveredAt() : r.getCreatedAt();
            String periodKey = formatPeriodKey(rDate, filter.getPeriodType(), dayFormatter, monthFormatter);

            Map<UUID, LineUsageHistory> lineHistMap = requisitionLineUsageMap.getOrDefault(r.getId(), Collections.emptyMap());

            List<LineItemDetailDTO> lineDtos = new ArrayList<>();
            List<String> summaryParts = new ArrayList<>();
            int reqTotalQty = 0;
            String bestEpiUsageText = null;

            if (r.getLines() != null) {
                for (StockRequisitionLine line : r.getLines()) {
                    StockItem item = line.getStockItem();
                    if (item == null) continue;

                    int qty = line.getQuantity() != null && line.getQuantity() > 0 ? line.getQuantity() : 1;
                    reqTotalQty += qty;
                    totalDeliveredItems += qty;
                    distinctItems.add(item.getId());

                    LineUsageHistory hist = lineHistMap.get(item.getId());
                    boolean isEpi = hist != null ? hist.isEpi : isItemEpi(item);
                    Integer daysSince = hist != null ? hist.daysSince : null;
                    String usageText = hist != null ? hist.usageText : "—";
                    LocalDateTime prevDate = hist != null ? hist.prevDate : null;

                    if (isEpi && daysSince != null && daysSince > 0) {
                        epiDaysList.add(daysSince);
                        if (bestEpiUsageText == null) {
                            bestEpiUsageText = usageText;
                        }
                    }

                    lineDtos.add(LineItemDetailDTO.builder()
                            .stockItemId(item.getId())
                            .code(item.getCode() != null ? item.getCode() : "—")
                            .name(item.getFullName())
                            .ca(item.getCa())
                            .isEpi(isEpi)
                            .quantity(qty)
                            .daysSincePreviousDelivery(daysSince)
                            .previousDeliveryDate(prevDate)
                            .usageText(usageText)
                            .build());

                    summaryParts.add(qty + "x " + item.getFullName());

                    // Top itens consumidos
                    TopItemDTO top = topItemsMap.computeIfAbsent(item.getId(), id -> TopItemDTO.builder()
                            .stockItemId(item.getId())
                            .code(item.getCode())
                            .name(item.getFullName())
                            .category(item.getCategory() != null ? item.getCategory().name() : "OUTROS")
                            .ca(item.getCa())
                            .isEpi(isEpi)
                            .totalQuantity(0)
                            .currentStock(item.getCurrentQuantity())
                            .minimumStock(item.getMinimumQuantity())
                            .isLowStock(item.isLowStock())
                            .build());
                    top.setTotalQuantity(top.getTotalQuantity() + qty);
                }
            }

            // Agrupamento por Setor
            String sectorName = r.getEmployeeWorkSector() != null && !r.getEmployeeWorkSector().isBlank()
                    ? r.getEmployeeWorkSector()
                    : (emp != null && emp.getDepartment() != null ? emp.getDepartment().getName() : "Não especificado");
            SectorConsumptionDTO secDto = sectorMap.computeIfAbsent(sectorName, s -> SectorConsumptionDTO.builder()
                    .sectorName(s)
                    .requisitionsCount(0)
                    .totalQuantity(0)
                    .build());
            secDto.setRequisitionsCount(secDto.getRequisitionsCount() + 1);
            secDto.setTotalQuantity(secDto.getTotalQuantity() + reqTotalQty);

            // Agrupamento por Empresa / Filial
            String companyName = emp != null && emp.getCompany() != null ? emp.getCompany().getName() : "Empresa Padrão";
            String unitName = emp != null && emp.getUnit() != null ? emp.getUnit().getName() : "Matriz / Operacional";
            String compKey = companyName + " - " + unitName;
            CompanyConsumptionDTO compDto = companyMap.computeIfAbsent(compKey, k -> CompanyConsumptionDTO.builder()
                    .companyName(companyName)
                    .unitName(unitName)
                    .requisitionsCount(0)
                    .totalQuantity(0)
                    .build());
            compDto.setRequisitionsCount(compDto.getRequisitionsCount() + 1);
            compDto.setTotalQuantity(compDto.getTotalQuantity() + reqTotalQty);

            // Agrupamento Temporal
            PeriodMetricDTO perDto = periodMap.computeIfAbsent(periodKey, k -> PeriodMetricDTO.builder()
                    .periodLabel(k)
                    .dateSortKey(rDate != null ? rDate.format(DateTimeFormatter.ofPattern("yyyyMMdd")) : "00000000")
                    .requisitionsCount(0)
                    .itemsCount(0)
                    .build());
            perDto.setRequisitionsCount(perDto.getRequisitionsCount() + 1);
            perDto.setItemsCount(perDto.getItemsCount() + reqTotalQty);

            detailedRows.add(DetailedRequisitionRowDTO.builder()
                    .id(r.getId())
                    .requisitionNumber(r.getRequisitionNumber())
                    .date(rDate)
                    .status(r.getStatus() != null ? r.getStatus().name() : "PENDING")
                    .statusLabel(resolveStatusLabel(r.getStatus()))
                    .employeeName(emp != null ? emp.getName() : "—")
                    .employeeCpf(emp != null ? emp.getCpf() : null)
                    .employeeId(emp != null ? emp.getId() : null)
                    .companyName(companyName)
                    .unitName(unitName)
                    .workSector(sectorName)
                    .requestedByName(r.getRequestedByUser() != null ? r.getRequestedByUser().getName() : "—")
                    .deliveredByName(r.getDeliveredByUser() != null ? r.getDeliveredByUser().getName() : "Almoxarifado")
                    .movementReason(r.getMovementReason() != null ? r.getMovementReason().getDescription() : "Saída Almoxarifado")
                    .totalQuantity(reqTotalQty)
                    .items(lineDtos)
                    .summaryItemsText(String.join(", ", summaryParts))
                    .epiUsageEstimate(bestEpiUsageText != null ? bestEpiUsageText : "—")
                    .build());
        }

        // Média de vida útil / tempo de uso de EPI
        Double avgLifespan = null;
        if (!epiDaysList.isEmpty()) {
            double avg = epiDaysList.stream().mapToInt(Integer::intValue).average().orElse(0.0);
            avgLifespan = Math.round(avg * 10.0) / 10.0;
        }

        SummaryDTO summary = SummaryDTO.builder()
                .totalRequisitions(filtered.size())
                .totalItemsDelivered(totalDeliveredItems)
                .pendingCount(pending)
                .approvedCount(approved)
                .deliveredCount(delivered)
                .distinctEmployeesCount(distinctEmployees.size())
                .distinctItemsCount(distinctItems.size())
                .averageEpiLifespanDays(avgLifespan)
                .build();

        List<TopItemDTO> topItems = topItemsMap.values().stream()
                .sorted(Comparator.comparingInt(TopItemDTO::getTotalQuantity).reversed())
                .limit(10)
                .collect(Collectors.toList());

        List<SectorConsumptionDTO> sectors = sectorMap.values().stream()
                .sorted(Comparator.comparingInt(SectorConsumptionDTO::getTotalQuantity).reversed())
                .limit(8)
                .collect(Collectors.toList());

        List<CompanyConsumptionDTO> companies = companyMap.values().stream()
                .sorted(Comparator.comparingInt(CompanyConsumptionDTO::getTotalQuantity).reversed())
                .collect(Collectors.toList());

        List<PeriodMetricDTO> periods = new ArrayList<>(periodMap.values());

        return StockRequisitionAnalyticsDTO.builder()
                .summary(summary)
                .periodBreakdown(periods)
                .topConsumedItems(topItems)
                .consumptionBySector(sectors)
                .consumptionByCompany(companies)
                .detailedRows(detailedRows)
                .build();
    }

    /**
     * Exporta relatório analítico completo em formato Excel (.xlsx) profissional
     */
    @Transactional(readOnly = true)
    public byte[] generateExcelReport(StockRequisitionAnalyticsFilterDTO filter) throws IOException {
        StockRequisitionAnalyticsDTO data = getAnalytics(filter);

        try (Workbook workbook = new XSSFWorkbook()) {
            // Estilos
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_80_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            CellStyle titleStyle = workbook.createCellStyle();
            Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 14);
            titleStyle.setFont(titleFont);

            CellStyle borderStyle = workbook.createCellStyle();
            borderStyle.setBorderBottom(BorderStyle.THIN);
            borderStyle.setBorderTop(BorderStyle.THIN);
            borderStyle.setBorderLeft(BorderStyle.THIN);
            borderStyle.setBorderRight(BorderStyle.THIN);

            // Aba 1: Requisições Detalhadas
            Sheet sheet1 = workbook.createSheet("Consumo Detalhado");
            int rIdx = 0;

            Row titleRow = sheet1.createRow(rIdx++);
            org.apache.poi.ss.usermodel.Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("RELATÓRIO DE CONSUMO E REQUISIÇÕES DO ALMOXARIFADO");
            titleCell.setCellStyle(titleStyle);

            Row infoRow = sheet1.createRow(rIdx++);
            infoRow.createCell(0).setCellValue("Gerado em: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"))
                    + " | Total de Requisições: " + data.getSummary().getTotalRequisitions()
                    + " | Total de Itens: " + data.getSummary().getTotalItemsDelivered()
                    + " | Colaboradores Atendidos: " + data.getSummary().getDistinctEmployeesCount());

            rIdx++; // Linha em branco

            String[] headers = {
                    "Número", "Data/Hora", "Status", "Beneficiário (Quem Pegou)",
                    "Empresa", "Unidade / Filial", "Setor / Posto de Trabalho",
                    "Solicitante (Quem Pediu)", "Responsável Entrega", "Motivo",
                    "Itens Entregues", "Qtd Total"
            };

            Row hRow = sheet1.createRow(rIdx++);
            for (int i = 0; i < headers.length; i++) {
                org.apache.poi.ss.usermodel.Cell c = hRow.createCell(i);
                c.setCellValue(headers[i]);
                c.setCellStyle(headerStyle);
            }

            DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

            for (DetailedRequisitionRowDTO row : data.getDetailedRows()) {
                Row dRow = sheet1.createRow(rIdx++);
                dRow.createCell(0).setCellValue(row.getRequisitionNumber());
                dRow.createCell(1).setCellValue(row.getDate() != null ? row.getDate().format(dtf) : "—");
                dRow.createCell(2).setCellValue(row.getStatusLabel());
                dRow.createCell(3).setCellValue(row.getEmployeeName());
                dRow.createCell(4).setCellValue(row.getCompanyName());
                dRow.createCell(5).setCellValue(row.getUnitName());
                dRow.createCell(6).setCellValue(row.getWorkSector());
                dRow.createCell(7).setCellValue(row.getRequestedByName());
                dRow.createCell(8).setCellValue(row.getDeliveredByName());
                dRow.createCell(9).setCellValue(row.getMovementReason());
                dRow.createCell(10).setCellValue(row.getSummaryItemsText());
                dRow.createCell(11).setCellValue(row.getTotalQuantity());
            }

            for (int i = 0; i < headers.length; i++) {
                sheet1.autoSizeColumn(i);
            }

            // Aba 2: Itens Mais Consumidos (Planejamento de Reposição)
            Sheet sheet2 = workbook.createSheet("Itens Críticos & Reposição");
            int r2Idx = 0;

            Row t2Row = sheet2.createRow(r2Idx++);
            org.apache.poi.ss.usermodel.Cell t2Cell = t2Row.createCell(0);
            t2Cell.setCellValue("RANKING DE ITENS CONSUMIDOS & GESTÃO DE REPOSIÇÃO");
            t2Cell.setCellStyle(titleStyle);

            r2Idx++; // Blank

            String[] h2 = {"Código", "Item / Material", "Categoria", "CA", "Qtd Requisitada", "Estoque Atual", "Estoque Mínimo", "Status"};
            Row h2Row = sheet2.createRow(r2Idx++);
            for (int i = 0; i < h2.length; i++) {
                org.apache.poi.ss.usermodel.Cell c = h2Row.createCell(i);
                c.setCellValue(h2[i]);
                c.setCellStyle(headerStyle);
            }

            for (TopItemDTO item : data.getTopConsumedItems()) {
                Row row = sheet2.createRow(r2Idx++);
                row.createCell(0).setCellValue(item.getCode());
                row.createCell(1).setCellValue(item.getName());
                row.createCell(2).setCellValue(item.getCategory());
                row.createCell(3).setCellValue(item.getCa() != null ? item.getCa() : "—");
                row.createCell(4).setCellValue(item.getTotalQuantity());
                row.createCell(5).setCellValue(item.getCurrentStock() != null ? item.getCurrentStock() : 0);
                row.createCell(6).setCellValue(item.getMinimumStock() != null ? item.getMinimumStock() : 0);
                row.createCell(7).setCellValue(item.isLowStock() ? "⚠️ Reposição Necessária" : "Estoque Adequado");
            }

            for (int i = 0; i < h2.length; i++) {
                sheet2.autoSizeColumn(i);
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            workbook.write(baos);
            return baos.toByteArray();
        }
    }

    /**
     * Exporta relatório analítico em formato PDF executivo corporativo
     */
    @Transactional(readOnly = true)
    public byte[] generatePdfReport(StockRequisitionAnalyticsFilterDTO filter) throws IOException {
        StockRequisitionAnalyticsDTO data = getAnalytics(filter);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdfDoc = new PdfDocument(writer);
        pdfDoc.setDefaultPageSize(PageSize.A4.rotate()); // Formato Paisagem para máxima legibilidade
        Document document = new Document(pdfDoc, PageSize.A4.rotate());
        document.setMargins(20f, 25f, 25f, 25f);

        Company company = resolveCompany(filter.getCompanyId());

        // 1. Cabeçalho Executivo
        Table headerTable = new Table(UnitValue.createPercentArray(new float[]{65f, 35f})).useAllAvailableWidth();
        headerTable.setBackgroundColor(DARK_NAVY).setPadding(6f);

        Cell leftCell = new Cell().setBorder(Border.NO_BORDER).setPadding(4f).setVerticalAlignment(VerticalAlignment.MIDDLE);
        Image logoImg = loadCompanyLogoImage(company);
        String compName = company != null && company.getName() != null ? company.getName().toUpperCase() : "PROMOVER GESTÃO INTEGRADA";

        if (logoImg != null) {
            Table compBox = new Table(UnitValue.createPercentArray(new float[]{12f, 88f})).useAllAvailableWidth();
            compBox.setBorder(Border.NO_BORDER);

            Cell logoCell = new Cell()
                    .setBorder(Border.NO_BORDER)
                    .setPadding(0f)
                    .setTextAlignment(TextAlignment.LEFT)
                    .setVerticalAlignment(VerticalAlignment.MIDDLE)
                    .add(logoImg);

            Cell infoCell = new Cell().setBorder(Border.NO_BORDER).setVerticalAlignment(VerticalAlignment.MIDDLE).setPaddingLeft(8f);
            infoCell.add(new Paragraph(compName).setFontSize(10.5f).setBold().setFontColor(new DeviceRgb(255, 255, 255)).setMarginBottom(1f));
            infoCell.add(new Paragraph("RELATÓRIO GERENCIAL DE CONSUMO E REQUISIÇÕES DO ALMOXARIFADO").setFontSize(8f).setFontColor(new DeviceRgb(254, 240, 138)));

            compBox.addCell(logoCell);
            compBox.addCell(infoCell);
            leftCell.add(compBox);
        } else {
            leftCell.add(new Paragraph(compName).setFontSize(11f).setBold().setFontColor(new DeviceRgb(255, 255, 255)));
            leftCell.add(new Paragraph("RELATÓRIO GERENCIAL DE CONSUMO E REQUISIÇÕES DO ALMOXARIFADO").setFontSize(8.5f).setFontColor(new DeviceRgb(254, 240, 138)));
        }
        headerTable.addCell(leftCell);

        Cell rightCell = new Cell().setBorder(Border.NO_BORDER).setTextAlignment(TextAlignment.RIGHT).setPadding(6f).setVerticalAlignment(VerticalAlignment.MIDDLE);
        rightCell.add(new Paragraph("PAINEL DE AUDITORIA & REPOSIÇÃO").setFontSize(9f).setBold().setFontColor(BRAND_RED));
        rightCell.add(new Paragraph("Emissão: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))).setFontSize(7.5f).setFontColor(new DeviceRgb(203, 213, 225)));
        headerTable.addCell(rightCell);
        document.add(headerTable);

        // 2. Quadro de Indicadores (KPIs)
        Table kpiTable = new Table(UnitValue.createPercentArray(new float[]{33.33f, 33.33f, 33.34f})).useAllAvailableWidth().setMarginTop(8f).setMarginBottom(8f);
        kpiTable.addCell(createKpiCell("TOTAL DE REQUISIÇÕES", String.valueOf(data.getSummary().getTotalRequisitions())));
        kpiTable.addCell(createKpiCell("UNIDADES ENTREGUES", String.valueOf(data.getSummary().getTotalItemsDelivered())));
        kpiTable.addCell(createKpiCell("COLABORADORES ATENDIDOS", String.valueOf(data.getSummary().getDistinctEmployeesCount())));
        document.add(kpiTable);

        // 3. Tabela Analítica de Consumo
        Table table = new Table(UnitValue.createPercentArray(new float[]{14f, 10f, 20f, 17f, 15f, 24f})).useAllAvailableWidth();
        table.addHeaderCell(createPdfHeaderCell("Nº Requisição", TextAlignment.CENTER));
        table.addHeaderCell(createPdfHeaderCell("Data", TextAlignment.CENTER));
        table.addHeaderCell(createPdfHeaderCell("Quem Pegou (Beneficiário)", TextAlignment.LEFT));
        table.addHeaderCell(createPdfHeaderCell("Setor / Posto", TextAlignment.LEFT));
        table.addHeaderCell(createPdfHeaderCell("Solicitante", TextAlignment.LEFT));
        table.addHeaderCell(createPdfHeaderCell("Materiais Entregues", TextAlignment.LEFT));

        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        int rIdx = 0;

        for (DetailedRequisitionRowDTO row : data.getDetailedRows()) {
            boolean alt = (rIdx % 2 != 0);
            table.addCell(createPdfDataCell(row.getRequisitionNumber(), TextAlignment.CENTER, alt));
            table.addCell(createPdfDataCell(row.getDate() != null ? row.getDate().format(dtf) : "—", TextAlignment.CENTER, alt));
            table.addCell(createPdfDataCell(row.getEmployeeName(), TextAlignment.LEFT, alt));
            table.addCell(createPdfDataCell(row.getWorkSector(), TextAlignment.LEFT, alt));
            table.addCell(createPdfDataCell(row.getRequestedByName(), TextAlignment.LEFT, alt));
            table.addCell(createPdfDataCell(row.getSummaryItemsText(), TextAlignment.LEFT, alt));
            rIdx++;
        }

        document.add(table);
        document.close();
        return baos.toByteArray();
    }

    private Cell createKpiCell(String label, String value) {
        Cell cell = new Cell().setBorder(new SolidBorder(BORDER_LIGHT, 0.8f))
                .setBackgroundColor(BG_ALT)
                .setPadding(4f)
                .setTextAlignment(TextAlignment.CENTER);
        cell.add(new Paragraph(label).setFontSize(6.5f).setFontColor(TEXT_MUTED).setBold());
        cell.add(new Paragraph(value).setFontSize(11f).setBold().setFontColor(DARK_NAVY));
        return cell;
    }

    private Cell createPdfHeaderCell(String text, TextAlignment align) {
        return new Cell().add(new Paragraph(text).setFontSize(7f).setBold().setFontColor(new DeviceRgb(255, 255, 255)))
                .setBackgroundColor(DARK_NAVY)
                .setTextAlignment(align)
                .setPadding(3f);
    }

    private Cell createPdfDataCell(String text, TextAlignment align, boolean alt) {
        return new Cell().add(new Paragraph(text != null ? text : "—").setFontSize(6.5f))
                .setBackgroundColor(alt ? BG_ALT : new DeviceRgb(255, 255, 255))
                .setBorder(new SolidBorder(BORDER_LIGHT, 0.5f))
                .setTextAlignment(align)
                .setPadding(2.5f);
    }

    private boolean isItemEpi(StockItem item) {
        if (item == null) return false;
        if (item.getCategory() == StockCategory.EPI) {
            return true;
        }
        if (Boolean.TRUE.equals(item.getRequiresCa())) {
            return true;
        }
        return item.getCa() != null && !item.getCa().isBlank();
    }

    private String resolveStatusLabel(StockRequisitionStatus status) {
        if (status == null) return "Pendente";
        return switch (status) {
            case APPROVED -> "Aprovada";
            case DELIVERED -> "Entregue";
            case CANCELLED -> "Cancelada";
            default -> "Pendente";
        };
    }

    private String formatPeriodKey(LocalDateTime d, String periodType, DateTimeFormatter dayFormatter, DateTimeFormatter monthFormatter) {
        if (d == null) return "Outros";
        if ("MONTHLY".equalsIgnoreCase(periodType)) {
            return d.format(monthFormatter);
        }
        return d.format(dayFormatter);
    }

    private DateRange resolveDateRange(StockRequisitionAnalyticsFilterDTO filter) {
        LocalDate today = LocalDate.now();
        String type = filter.getPeriodType() != null ? filter.getPeriodType().toUpperCase() : "MONTHLY";

        if ("DAILY".equals(type)) {
            LocalDate target = filter.getStartDate() != null ? filter.getStartDate() : today;
            return new DateRange(target.atStartOfDay(), target.atTime(23, 59, 59));
        } else if ("WEEKLY".equals(type)) {
            LocalDate start = filter.getStartDate() != null ? filter.getStartDate() : today.minusDays(7);
            LocalDate end = filter.getEndDate() != null ? filter.getEndDate() : today;
            return new DateRange(start.atStartOfDay(), end.atTime(23, 59, 59));
        } else if ("CUSTOM".equals(type)) {
            LocalDateTime start = filter.getStartDate() != null ? filter.getStartDate().atStartOfDay() : null;
            LocalDateTime end = filter.getEndDate() != null ? filter.getEndDate().atTime(23, 59, 59) : null;
            return new DateRange(start, end);
        } else {
            // MONTHLY (padrão últimos 30 dias)
            LocalDate start = filter.getStartDate() != null ? filter.getStartDate() : today.minusDays(30);
            LocalDate end = filter.getEndDate() != null ? filter.getEndDate() : today;
            return new DateRange(start.atStartOfDay(), end.atTime(23, 59, 59));
        }
    }

    private Company resolveCompany(UUID companyId) {
        if (companyId != null) {
            return companyRepository.findById(companyId).orElse(null);
        }
        try {
            List<Company> list = companyRepository.findByStatus(Company.CompanyStatus.ACTIVE);
            if (!list.isEmpty()) return list.get(0);
        } catch (Exception ignored) {}
        return null;
    }

    private Image loadCompanyLogoImage(Company company) {
        String logoUrl = company != null ? company.getLogoUrl() : null;
        try {
            ImageData imageData = null;

            if (logoUrl != null && !logoUrl.isBlank()) {
                if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
                    try {
                        imageData = ImageDataFactory.create(logoUrl);
                    } catch (Exception ex) {
                        log.debug("Falha ao carregar logo por URL remota: {}", ex.getMessage());
                    }
                }

                if (imageData == null) {
                    String clean = logoUrl.replace("/api/uploads/companies/logos/", "")
                            .replace("api/uploads/companies/logos/", "")
                            .replace("/uploads/companies/logos/", "")
                            .replace("uploads/companies/logos/", "");

                    java.nio.file.Path[] uploadCandidates = new java.nio.file.Path[]{
                            java.nio.file.Paths.get(logoUrl),
                            java.nio.file.Paths.get("backend", "uploads", "companies", "logos", clean),
                            java.nio.file.Paths.get("uploads", "companies", "logos", clean),
                            java.nio.file.Paths.get("c:/dev/secured-guard/backend/uploads/companies/logos", clean),
                            java.nio.file.Paths.get("c:/dev/secured-guard/uploads/companies/logos", clean)
                    };

                    for (java.nio.file.Path p : uploadCandidates) {
                        if (java.nio.file.Files.exists(p)) {
                            try {
                                imageData = ImageDataFactory.create(java.nio.file.Files.readAllBytes(p));
                                break;
                            } catch (Exception ignored) {
                            }
                        }
                    }
                }
            }

            if (imageData == null) {
                String[] classpathResources = new String[]{
                        "static/certificates/nr06/promover-logo.png",
                        "static/email-marketing/promover-logomarca.png",
                        "static/email-marketing/promover-logo.png"
                };

                for (String cpRes : classpathResources) {
                    try {
                        org.springframework.core.io.ClassPathResource cpr = new org.springframework.core.io.ClassPathResource(cpRes);
                        if (cpr.exists()) {
                            try (java.io.InputStream is = cpr.getInputStream()) {
                                byte[] bytes = is.readAllBytes();
                                if (bytes.length > 0) {
                                    imageData = ImageDataFactory.create(bytes);
                                    break;
                                }
                            }
                        }
                    } catch (Exception ignored) {
                    }
                }
            }

            if (imageData == null) {
                java.nio.file.Path[] fileCandidates = new java.nio.file.Path[]{
                        java.nio.file.Paths.get("c:/dev/secured-guard/backend/src/main/resources/static/certificates/nr06/promover-logo.png"),
                        java.nio.file.Paths.get("backend/src/main/resources/static/certificates/nr06/promover-logo.png"),
                        java.nio.file.Paths.get("src/main/resources/static/certificates/nr06/promover-logo.png"),
                        java.nio.file.Paths.get("c:/dev/secured-guard/frontend/public/promover-logo.png"),
                        java.nio.file.Paths.get("frontend/public/promover-logo.png"),
                        java.nio.file.Paths.get("c:/dev/secured-guard/frontend/public/logo-sistema.png")
                };

                for (java.nio.file.Path p : fileCandidates) {
                    if (java.nio.file.Files.exists(p)) {
                        try {
                            imageData = ImageDataFactory.create(java.nio.file.Files.readAllBytes(p));
                            break;
                        } catch (Exception ignored) {
                        }
                    }
                }
            }

            if (imageData != null) {
                Image img = new Image(imageData);
                img.setMaxWidth(56f);
                img.setMaxHeight(34f);
                img.setAutoScale(true);
                return img;
            }
        } catch (Exception e) {
            log.warn("Não foi possível carregar logo da empresa: {}", e.getMessage());
        }
        return null;
    }

    private record DateRange(LocalDateTime start, LocalDateTime end) {}

    private record LineUsageHistory(Integer daysSince, LocalDateTime prevDate, String usageText, boolean isEpi) {}
}
