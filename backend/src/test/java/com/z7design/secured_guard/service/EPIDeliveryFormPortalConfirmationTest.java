package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.EPIDeliveryFormDTO;
import com.z7design.secured_guard.exception.BusinessException;
import com.z7design.secured_guard.model.EPIDeliveryForm;
import com.z7design.secured_guard.model.enums.EPIDeliveryFormStatus;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Testes da confirmação de recebimento pelo PRÓPRIO FUNCIONÁRIO no portal
 * (confirmOwnReceipt), cobrindo os três caminhos:
 *  - código da FICHA (origem PORTAL_CODE);
 *  - código individual de ITEM (origem PORTAL_CODE);
 *  - confirmação direta sem WhatsApp (origem PORTAL_SELF, assinatura ON_SCREEN).
 */
class EPIDeliveryFormPortalConfirmationTest extends AbstractEPIDeliveryFormConfirmationTest {

    // ------------------------------------------------------------------
    // Guardas de autorização
    // ------------------------------------------------------------------

    @Test
    void confirmOwnReceipt_funcionarioDiferente_lancaBusinessException() {
        EPIDeliveryForm form = buildPerItemForm();
        form.getItems().add(itemCapacete);
        when(epiDeliveryFormRepository.findByIdWithDetails(FORM_ID)).thenReturn(Optional.of(form));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> epiDeliveryFormService.confirmOwnReceipt(FORM_ID, UUID.randomUUID(), "123456", USER_ID));
        assertEquals("Você só pode confirmar o recebimento das suas próprias fichas de EPI.", ex.getMessage());
        verify(epiDeliveryFormRepository, never()).save(any());
    }

    @Test
    void confirmOwnReceipt_fichaJaConfirmada_lancaBusinessException() {
        EPIDeliveryForm form = buildPerItemForm();
        form.setStatus(EPIDeliveryFormStatus.COMPLETED);
        form.setSignedAt(LocalDateTime.now());
        form.getItems().add(itemCapacete);
        when(epiDeliveryFormRepository.findByIdWithDetails(FORM_ID)).thenReturn(Optional.of(form));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> epiDeliveryFormService.confirmOwnReceipt(FORM_ID, EMPLOYEE_ID, "123456", USER_ID));
        assertEquals("Recebimento já confirmado.", ex.getMessage());
    }

    @Test
    void confirmOwnReceipt_fichaComSignedAtMasDraft_lancaBusinessException() {
        // Segunda metade da guarda: signedAt != null mesmo com status DRAFT
        EPIDeliveryForm form = buildPerItemForm();
        form.setSignedAt(LocalDateTime.now());
        form.getItems().add(itemCapacete);
        when(epiDeliveryFormRepository.findByIdWithDetails(FORM_ID)).thenReturn(Optional.of(form));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> epiDeliveryFormService.confirmOwnReceipt(FORM_ID, EMPLOYEE_ID, "123456", USER_ID));
        assertEquals("Recebimento já confirmado.", ex.getMessage());
    }

    // ------------------------------------------------------------------
    // Caminho 1 — código da FICHA (origem PORTAL_CODE)
    // ------------------------------------------------------------------

    @Test
    void confirmOwnReceipt_codigoDaFichaCorreto_concluiComOrigemPortalCode() {
        EPIDeliveryForm form = buildPerItemForm();
        form.setConfirmationCode("123456");
        form.setConfirmationExpiresAt(LocalDateTime.now().plusHours(48));
        form.getItems().add(itemCapacete);
        vincularRequisicaoNaoEpi(form);
        when(epiDeliveryFormRepository.findByIdWithDetails(FORM_ID)).thenReturn(Optional.of(form));
        when(epiDeliveryFormRepository.save(any(EPIDeliveryForm.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        EPIDeliveryFormDTO dto = epiDeliveryFormService.confirmOwnReceipt(FORM_ID, EMPLOYEE_ID, "123456", USER_ID);

        assertEquals(EPIDeliveryFormStatus.COMPLETED, form.getStatus());
        assertNotNull(form.getSignedAt());
        assertEquals("PORTAL_CODE", form.getSignatureOrigin());
        assertEquals("WHATSAPP_CONFIRM", form.getSignatureType());
        assertNull(itemCapacete.getConfirmedAt(), "Código da ficha não confirma itens individualmente");
        assertNotNull(dto);
        assertEquals(EPIDeliveryFormStatus.COMPLETED, dto.getStatus());
        verify(epiDeliveryFormRepository).save(any(EPIDeliveryForm.class));
    }

    @Test
    void confirmOwnReceipt_codigoDaFichaInvalido_lancaBusinessException() {
        EPIDeliveryForm form = buildPerItemForm();
        form.setConfirmationCode("123456");
        form.setConfirmationExpiresAt(LocalDateTime.now().plusHours(48));
        form.getItems().add(itemCapacete);
        when(epiDeliveryFormRepository.findByIdWithDetails(FORM_ID)).thenReturn(Optional.of(form));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> epiDeliveryFormService.confirmOwnReceipt(FORM_ID, EMPLOYEE_ID, "000000", USER_ID));
        assertEquals("Código de confirmação inválido.", ex.getMessage());
        assertEquals(EPIDeliveryFormStatus.DRAFT, form.getStatus());
        verify(epiDeliveryFormRepository, never()).save(any());
    }

    // ------------------------------------------------------------------
    // Caminho 2 — código de ITEM (origem PORTAL_CODE)
    // ------------------------------------------------------------------

    @Test
    void confirmOwnReceipt_codigoDeItemCorreto_confirmaParcialmente() {
        EPIDeliveryForm form = buildPerItemForm();
        armazenarCodigosNosItens();
        form.getItems().add(itemCapacete);
        form.getItems().add(itemLuvas);
        when(epiDeliveryFormRepository.findByIdWithDetails(FORM_ID)).thenReturn(Optional.of(form));

        epiDeliveryFormService.confirmOwnReceipt(FORM_ID, EMPLOYEE_ID, "111111", USER_ID);

        assertNotNull(itemCapacete.getConfirmedAt());
        assertNull(itemLuvas.getConfirmedAt());
        assertEquals(EPIDeliveryFormStatus.DRAFT, form.getStatus());
        assertNull(form.getSignedAt());
        verify(epiDeliveryFormRepository).save(any(EPIDeliveryForm.class));
    }

    @Test
    void confirmOwnReceipt_ultimoItemConfirmado_concluiComOrigemPortalCode() {
        EPIDeliveryForm form = buildPerItemForm();
        armazenarCodigosNosItens();
        vincularRequisicaoNaoEpi(form);
        form.getItems().add(itemCapacete);
        form.getItems().add(itemLuvas);
        when(epiDeliveryFormRepository.findByIdWithDetails(FORM_ID)).thenReturn(Optional.of(form));
        when(epiDeliveryFormRepository.save(any(EPIDeliveryForm.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        epiDeliveryFormService.confirmOwnReceipt(FORM_ID, EMPLOYEE_ID, "111111", USER_ID);
        assertEquals(EPIDeliveryFormStatus.DRAFT, form.getStatus(),
                "Com apenas um item confirmado a ficha deve seguir DRAFT");

        epiDeliveryFormService.confirmOwnReceipt(FORM_ID, EMPLOYEE_ID, "222222", USER_ID);

        assertNotNull(itemLuvas.getConfirmedAt());
        assertEquals(EPIDeliveryFormStatus.COMPLETED, form.getStatus(),
                "Ao confirmar o último item a ficha deve ser concluída");
        assertNotNull(form.getSignedAt());
        assertEquals("PORTAL_CODE", form.getSignatureOrigin());
        assertEquals("WHATSAPP_CONFIRM", form.getSignatureType());
        verify(epiDeliveryFormRepository, times(2)).save(any(EPIDeliveryForm.class));
    }

    @Test
    void confirmOwnReceipt_codigoDeItemInvalido_lancaBusinessException() {
        EPIDeliveryForm form = buildPerItemForm();
        armazenarCodigosNosItens();
        form.getItems().add(itemCapacete);
        when(epiDeliveryFormRepository.findByIdWithDetails(FORM_ID)).thenReturn(Optional.of(form));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> epiDeliveryFormService.confirmOwnReceipt(FORM_ID, EMPLOYEE_ID, "999999", USER_ID));
        assertEquals("Código de confirmação inválido.", ex.getMessage());
        assertNull(itemCapacete.getConfirmedAt());
    }

    // ------------------------------------------------------------------
    // Caminho 3 — confirmação direta no portal (sem WhatsApp)
    // ------------------------------------------------------------------

    @Test
    void confirmOwnReceipt_semCodigoWhatsApp_confirmaDiretoNoPortal() {
        EPIDeliveryForm form = buildPerItemForm();
        form.getItems().add(itemCapacete); // sem código de confirmação (nem na ficha, nem no item)
        vincularRequisicaoNaoEpi(form);
        when(epiDeliveryFormRepository.findByIdWithDetails(FORM_ID)).thenReturn(Optional.of(form));
        when(epiDeliveryFormRepository.save(any(EPIDeliveryForm.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        EPIDeliveryFormDTO dto = epiDeliveryFormService.confirmOwnReceipt(FORM_ID, EMPLOYEE_ID, null, USER_ID);

        assertEquals(EPIDeliveryFormStatus.COMPLETED, form.getStatus());
        assertNotNull(form.getSignedAt());
        assertEquals("PORTAL_SELF", form.getSignatureOrigin());
        assertEquals("ON_SCREEN", form.getSignatureType());
        assertNull(itemCapacete.getConfirmedAt());
        assertNotNull(dto);
        assertEquals(EPIDeliveryFormStatus.COMPLETED, dto.getStatus());
        assertEquals("ON_SCREEN", dto.getSignatureType());
        verify(epiDeliveryFormRepository).save(any(EPIDeliveryForm.class));
    }
}
