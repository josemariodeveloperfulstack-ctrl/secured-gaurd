package com.z7design.secured_guard.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import com.z7design.secured_guard.dto.CreateEPIDeliveryFormDTO;
import com.z7design.secured_guard.dto.EPIDeliveryFormItemDTO;
import com.z7design.secured_guard.dto.StockMovementDTO;
import com.z7design.secured_guard.model.EPIDeliveryForm;
import com.z7design.secured_guard.model.EPIDeliveryFormItem;
import com.z7design.secured_guard.model.StockItem;
import com.z7design.secured_guard.model.StockRequisition;
import com.z7design.secured_guard.model.StockRequisitionLine;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.EPIDeliveryFormStatus;
import com.z7design.secured_guard.model.enums.EPIDeliveryType;

/**
 * Regressão do 400 "Quantidade insuficiente em estoque" ao gerar/salvar novamente uma ficha
 * de EPI já concluída: a baixa de estoque só deve ser refeita quando os itens realmente mudam.
 */
@MockitoSettings(strictness = Strictness.LENIENT)
class EPIDeliveryFormStockSyncIdempotencyTest extends AbstractEPIDeliveryFormConfirmationTest {

    private static final UUID REQUISITION_ID = UUID.randomUUID();
    private static final UUID STOCK_ITEM_ID = UUID.randomUUID();
    private static final String REQUISITION_NUMBER = "REQ-EPI-ABC12345";

    @Test
    void naoRefazEstoqueQuandoABaixaJaRefleteOsItensAtivos() {
        EPIDeliveryForm form = formConcluidaComEstoque(2);
        form.setStockRequisitionId(REQUISITION_ID);
        stubFormularioSalvo(form);
        when(stockItemRepository.existsById(STOCK_ITEM_ID)).thenReturn(true);
        when(stockRequisitionRepository.findById(REQUISITION_ID))
                .thenReturn(Optional.of(requisicaoDeBaixa(2)));

        epiDeliveryFormService.update(FORM_ID, dtoConcluido(2), USER_ID);

        // Nenhum estorno nem nova baixa: a requisição de baixa já está igual aos itens da ficha.
        verifyNoInteractions(stockService);
        verify(stockRequisitionRepository, never()).delete(any());
    }

    @Test
    void refazEstoqueQuandoAQuantidadeDoItemMuda() {
        EPIDeliveryForm form = formConcluidaComEstoque(2);
        form.setStockRequisitionId(REQUISITION_ID);
        stubFormularioSalvo(form);
        when(stockItemRepository.existsById(STOCK_ITEM_ID)).thenReturn(true);
        when(stockItemRepository.findById(STOCK_ITEM_ID)).thenReturn(Optional.of(itemEstoque()));
        when(stockRequisitionRepository.findById(REQUISITION_ID))
                .thenReturn(Optional.of(requisicaoDeBaixa(1)));
        when(stockMovementRepository.findByRequisitionNumberOrderByMovementDateAsc(REQUISITION_NUMBER))
                .thenReturn(new ArrayList<>());
        when(stockRequisitionRepository.save(any(StockRequisition.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.findById(USER_ID))
                .thenReturn(Optional.of(User.builder().id(USER_ID).username("tester").build()));

        epiDeliveryFormService.update(FORM_ID, dtoConcluido(3), USER_ID);

        // Mudou a quantidade: cancela a baixa antiga e gera a nova.
        verify(stockRequisitionRepository).delete(any(StockRequisition.class));
        verify(stockService).createMovement(any(StockMovementDTO.class), eq(USER_ID));
    }

    private void stubFormularioSalvo(EPIDeliveryForm form) {
        when(epiDeliveryFormRepository.findById(FORM_ID)).thenReturn(Optional.of(form));
        when(epiDeliveryFormRepository.save(any(EPIDeliveryForm.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    private EPIDeliveryForm formConcluidaComEstoque(int quantity) {
        EPIDeliveryForm form = EPIDeliveryForm.builder()
                .id(FORM_ID)
                .employee(employee)
                .deliveryDate(LocalDate.of(2025, 10, 15))
                .deliveryType(EPIDeliveryType.PRIMEIRA_ENTREGA)
                .status(EPIDeliveryFormStatus.COMPLETED)
                .signatureType("ON_SCREEN")
                .build();
        form.getItems().add(EPIDeliveryFormItem.builder()
                .id(UUID.randomUUID())
                .epiName("SAPATO SEGURANCA")
                .quantity(quantity)
                .stockItemId(STOCK_ITEM_ID)
                .build());
        return form;
    }

    private StockRequisition requisicaoDeBaixa(int quantity) {
        StockRequisition requisition = StockRequisition.builder()
                .id(REQUISITION_ID)
                .requisitionNumber(REQUISITION_NUMBER)
                .build();
        requisition.addLine(StockRequisitionLine.builder()
                .stockItem(itemEstoque())
                .quantity(quantity)
                .build());
        return requisition;
    }

    private StockItem itemEstoque() {
        StockItem item = new StockItem();
        item.setId(STOCK_ITEM_ID);
        item.setName("SAPATO SEGURANCA");
        item.setCurrentQuantity(10);
        return item;
    }

    private CreateEPIDeliveryFormDTO dtoConcluido(int quantity) {
        EPIDeliveryFormItemDTO item = new EPIDeliveryFormItemDTO();
        item.setEpiName("SAPATO SEGURANCA");
        item.setQuantity(quantity);
        item.setStockItemId(STOCK_ITEM_ID);

        CreateEPIDeliveryFormDTO dto = new CreateEPIDeliveryFormDTO();
        dto.setEmployeeId(EMPLOYEE_ID);
        dto.setCompanyId(UUID.randomUUID());
        dto.setDeliveryDate(LocalDate.of(2025, 10, 15));
        dto.setDeliveryType(EPIDeliveryType.PRIMEIRA_ENTREGA);
        dto.setSignatureType("ON_SCREEN");
        dto.setStatus(EPIDeliveryFormStatus.COMPLETED);
        dto.setItems(List.of(item));
        return dto;
    }
}
