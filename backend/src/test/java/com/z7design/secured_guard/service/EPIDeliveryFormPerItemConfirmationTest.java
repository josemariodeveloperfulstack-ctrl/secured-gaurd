package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.EpiConfirmationSendResponseDTO;
import com.z7design.secured_guard.dto.PublicEpiConfirmationDTO;
import com.z7design.secured_guard.exception.BusinessException;
import com.z7design.secured_guard.model.EPIDeliveryForm;
import com.z7design.secured_guard.model.enums.EPIDeliveryFormStatus;
import com.z7design.secured_guard.model.enums.EPIDeliveryType;
import com.z7design.secured_guard.model.enums.EmploymentStatus;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Testes do fluxo de confirmação POR ITEM da ficha de entrega de EPI:
 *  - sendWhatsAppConfirmation no modo por item (substituição/troca com funcionário ativo);
 *  - applyItemConfirmation confirmando a ficha quando TODOS os itens são confirmados.
 */
class EPIDeliveryFormPerItemConfirmationTest extends AbstractEPIDeliveryFormConfirmationTest {

    // ------------------------------------------------------------------
    // sendWhatsAppConfirmation — modo por item
    // ------------------------------------------------------------------

    @Test
    void sendWhatsAppConfirmation_modoPorItem_geraTokenECodigoParaCadaItem() {
        EPIDeliveryForm form = buildPerItemForm();
        form.getItems().add(itemCapacete);
        form.getItems().add(itemLuvas);
        when(epiDeliveryFormRepository.findByIdWithDetails(FORM_ID)).thenReturn(Optional.of(form));
        when(whatsAppAgentService.sendTextMessage(anyString(), anyString())).thenReturn(true);

        EpiConfirmationSendResponseDTO response =
                epiDeliveryFormService.sendWhatsAppConfirmation(FORM_ID, "AUTO", BASE_URL);

        assertNotNull(response);
        assertEquals("AUTO", response.getMode());
        assertTrue(response.isSent());
        assertEquals(2, response.getItems().size());
        assertEquals("***1747", response.getPhoneMasked());

        for (EpiConfirmationSendResponseDTO.ItemConfirmation c : response.getItems()) {
            assertNotNull(c.getItemId());
            assertNotNull(c.getConfirmationCode());
            assertTrue(c.getConfirmationCode().matches("\\d{6}"));
            assertTrue(c.getConfirmUrl().startsWith(BASE_URL + "/epi-confirm/"));
            assertFalse(c.isConfirmed());
            assertNotNull(c.getExpiresAt());
        }

        // Cada item recebe token, código e janela de validade próprios
        assertNotNull(itemCapacete.getConfirmationToken());
        assertNotNull(itemLuvas.getConfirmationToken());
        assertNotEquals(itemCapacete.getConfirmationToken(), itemLuvas.getConfirmationToken());
        assertNull(itemCapacete.getConfirmedAt());
        assertNull(itemLuvas.getConfirmedAt());
        assertNotNull(itemCapacete.getConfirmationExpiresAt());
        assertNotNull(itemCapacete.getConfirmationSentAt());

        // Nível da ficha: o modo por item limpa o token/código da ficha e marca DRAFT + origem WhatsApp
        assertNull(form.getConfirmationToken());
        assertNull(form.getConfirmationCode());
        assertNull(form.getConfirmationExpiresAt());
        assertEquals(EPIDeliveryFormStatus.DRAFT, form.getStatus());
        assertEquals("WHATSAPP_CONFIRM", form.getSignatureType());
        assertNull(form.getSignedAt());
        assertNotNull(form.getConfirmationSentAt());

        verify(epiDeliveryFormRepository).save(any(EPIDeliveryForm.class));
        verify(whatsAppAgentService).sendTextMessage(eq(NORMALIZED_PHONE), anyString());
    }

    @Test
    void sendWhatsAppConfirmation_modoManual_naoEnviaAutomatico() {
        EPIDeliveryForm form = buildPerItemForm();
        form.getItems().add(itemCapacete);
        when(epiDeliveryFormRepository.findByIdWithDetails(FORM_ID)).thenReturn(Optional.of(form));

        EpiConfirmationSendResponseDTO response =
                epiDeliveryFormService.sendWhatsAppConfirmation(FORM_ID, "MANUAL", BASE_URL);

        assertNotNull(response);
        assertEquals("MANUAL", response.getMode());
        assertFalse(response.isSent());
        assertTrue(response.getWhatsappUrl().contains("wa.me/" + NORMALIZED_PHONE));
        assertEquals(1, response.getItems().size());
        verify(whatsAppAgentService, never()).sendTextMessage(anyString(), anyString());
        verify(epiDeliveryFormRepository).save(any(EPIDeliveryForm.class));
    }

    @Test
    void sendWhatsAppConfirmation_semItensPendentes_lancaBusinessException() {
        EPIDeliveryForm form = buildPerItemForm();
        itemCapacete.setConfirmedAt(LocalDateTime.now());
        itemLuvas.setConfirmedAt(LocalDateTime.now());
        form.getItems().add(itemCapacete);
        form.getItems().add(itemLuvas);
        when(epiDeliveryFormRepository.findByIdWithDetails(FORM_ID)).thenReturn(Optional.of(form));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> epiDeliveryFormService.sendWhatsAppConfirmation(FORM_ID, "AUTO", BASE_URL));
        assertTrue(ex.getMessage().contains("já foram confirmados"));
    }

    @Test
    void sendWhatsAppConfirmation_primeiraEntrega_usaConfirmacaoPorFicha() {
        EPIDeliveryForm form = buildPrimeiraEntregaForm();
        form.getItems().add(itemCapacete);
        when(epiDeliveryFormRepository.findByIdWithDetails(FORM_ID)).thenReturn(Optional.of(form));
        when(whatsAppAgentService.sendTextMessage(anyString(), anyString())).thenReturn(true);

        EpiConfirmationSendResponseDTO response =
                epiDeliveryFormService.sendWhatsAppConfirmation(FORM_ID, "AUTO", BASE_URL);

        // Primeira entrega: confirmação por ficha (token/código na ficha, sem itens no response)
        assertNotNull(form.getConfirmationToken());
        assertNotNull(form.getConfirmationCode());
        assertTrue(form.getConfirmationCode().matches("\\d{6}"));
        assertNull(response.getItems());
        assertNull(itemCapacete.getConfirmationToken(),
                "Primeira entrega não deve gerar confirmação individual por item");
    }

    @Test
    void sendWhatsAppConfirmation_funcionarioInativo_usaConfirmacaoPorFicha() {
        // Segundo critério do isPerItemMode: funcionário precisa estar ATIVO.
        employee.setStatus(EmploymentStatus.INACTIVE);
        EPIDeliveryForm form = buildPerItemForm();
        form.getItems().add(itemCapacete);
        when(epiDeliveryFormRepository.findByIdWithDetails(FORM_ID)).thenReturn(Optional.of(form));
        when(whatsAppAgentService.sendTextMessage(anyString(), anyString())).thenReturn(true);

        EpiConfirmationSendResponseDTO response =
                epiDeliveryFormService.sendWhatsAppConfirmation(FORM_ID, "AUTO", BASE_URL);

        assertNotNull(form.getConfirmationToken());
        assertNotNull(form.getConfirmationCode());
        assertNull(itemCapacete.getConfirmationToken(),
                "Funcionário inativo não deve gerar confirmação individual por item");
        assertNull(response.getItems());
    }

    @Test
    void sendWhatsAppConfirmation_fichaJaConcluida_lancaBusinessException() {
        EPIDeliveryForm form = buildPerItemForm();
        form.setStatus(EPIDeliveryFormStatus.COMPLETED);
        form.getItems().add(itemCapacete);
        when(epiDeliveryFormRepository.findByIdWithDetails(FORM_ID)).thenReturn(Optional.of(form));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> epiDeliveryFormService.sendWhatsAppConfirmation(FORM_ID, "AUTO", BASE_URL));
        assertEquals("Esta ficha já está concluída.", ex.getMessage());
    }

    @Test
    void sendWhatsAppConfirmation_funcionarioSemTelefone_lancaBusinessException() {
        employee.setPhone(null);
        EPIDeliveryForm form = buildPerItemForm();
        form.getItems().add(itemCapacete);
        when(epiDeliveryFormRepository.findByIdWithDetails(FORM_ID)).thenReturn(Optional.of(form));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> epiDeliveryFormService.sendWhatsAppConfirmation(FORM_ID, "AUTO", BASE_URL));
        assertTrue(ex.getMessage().contains("sem telefone"));
    }

    @Test
    void sendWhatsAppConfirmation_telefoneCurto_lancaBusinessException() {
        employee.setPhone("1234"); // normaliza para 551234 -> < 12 dígitos
        EPIDeliveryForm form = buildPerItemForm();
        form.getItems().add(itemCapacete);
        when(epiDeliveryFormRepository.findByIdWithDetails(FORM_ID)).thenReturn(Optional.of(form));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> epiDeliveryFormService.sendWhatsAppConfirmation(FORM_ID, "AUTO", BASE_URL));
        assertTrue(ex.getMessage().contains("inválido"));
    }

    // ------------------------------------------------------------------
    // applyItemConfirmation — via confirmWithCode
    // ------------------------------------------------------------------

    @Test
    void confirmWithCode_confirmaItemParcial_naoConcluiFicha() {
        EPIDeliveryForm form = buildPerItemForm();
        armazenarCodigosNosItens();
        form.getItems().add(itemCapacete);
        form.getItems().add(itemLuvas);
        when(epiDeliveryFormRepository.findByIdWithDetails(FORM_ID)).thenReturn(Optional.of(form));

        epiDeliveryFormService.confirmWithCode(FORM_ID, "111111", USER_ID);

        assertNotNull(itemCapacete.getConfirmedAt());
        assertNull(itemLuvas.getConfirmedAt());
        assertEquals(EPIDeliveryFormStatus.DRAFT, form.getStatus());
        assertNull(form.getSignedAt());
        verify(epiDeliveryFormRepository).save(any(EPIDeliveryForm.class));
        // Baixa de estoque NÃO é aplicada enquanto houver item pendente
        verify(stockService, never()).createMovement(any(), any());
    }

    @Test
    void confirmWithCode_confirmaTodosItens_concluiFicha() {
        EPIDeliveryForm form = buildPerItemForm();
        armazenarCodigosNosItens();
        vincularRequisicaoNaoEpi(form);
        form.getItems().add(itemCapacete);
        form.getItems().add(itemLuvas);
        when(epiDeliveryFormRepository.findByIdWithDetails(FORM_ID)).thenReturn(Optional.of(form));
        when(epiDeliveryFormRepository.save(any(EPIDeliveryForm.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        epiDeliveryFormService.confirmWithCode(FORM_ID, "111111", USER_ID);
        assertEquals(EPIDeliveryFormStatus.DRAFT, form.getStatus(),
                "Com apenas um item confirmado a ficha deve seguir DRAFT");

        epiDeliveryFormService.confirmWithCode(FORM_ID, "222222", USER_ID);

        assertNotNull(itemLuvas.getConfirmedAt());
        assertEquals(EPIDeliveryFormStatus.COMPLETED, form.getStatus(),
                "Ao confirmar o último item a ficha deve ser concluída");
        assertNotNull(form.getSignedAt());
        assertEquals("ADMIN_CODE", form.getSignatureOrigin());
        assertEquals("WHATSAPP_CONFIRM", form.getSignatureType());
        verify(epiDeliveryFormRepository, times(2)).save(any(EPIDeliveryForm.class));
    }

    @Test
    void confirmWithCode_codigoInvalido_lancaBusinessException() {
        EPIDeliveryForm form = buildPerItemForm();
        armazenarCodigosNosItens();
        form.getItems().add(itemCapacete);
        when(epiDeliveryFormRepository.findByIdWithDetails(FORM_ID)).thenReturn(Optional.of(form));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> epiDeliveryFormService.confirmWithCode(FORM_ID, "999999", USER_ID));
        assertEquals("Código de confirmação inválido.", ex.getMessage());
        assertNull(itemCapacete.getConfirmedAt());
        verify(epiDeliveryFormRepository, never()).save(any());
    }

    @Test
    void confirmWithCode_itemJaConfirmado_lancaBusinessException() {
        EPIDeliveryForm form = buildPerItemForm();
        armazenarCodigosNosItens();
        itemCapacete.setConfirmedAt(LocalDateTime.now());
        form.getItems().add(itemCapacete);
        when(epiDeliveryFormRepository.findByIdWithDetails(FORM_ID)).thenReturn(Optional.of(form));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> epiDeliveryFormService.confirmWithCode(FORM_ID, "111111", USER_ID));
        assertEquals("Este item já foi confirmado.", ex.getMessage());
    }

    @Test
    void confirmWithCode_codigoExpirado_lancaBusinessException() {
        EPIDeliveryForm form = buildPerItemForm();
        armazenarCodigosNosItens();
        itemCapacete.setConfirmationExpiresAt(LocalDateTime.now().minusHours(1));
        form.getItems().add(itemCapacete);
        when(epiDeliveryFormRepository.findByIdWithDetails(FORM_ID)).thenReturn(Optional.of(form));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> epiDeliveryFormService.confirmWithCode(FORM_ID, "111111", USER_ID));
        assertTrue(ex.getMessage().contains("expirou"));
        assertNull(itemCapacete.getConfirmedAt());
    }

    // ------------------------------------------------------------------
    // applyItemConfirmation — via confirmPublicReceipt (link + assinatura)
    // ------------------------------------------------------------------

    @Test
    void confirmPublicReceipt_itemUnico_armazenaAssinaturaEConcluiFicha() {
        UUID token = UUID.randomUUID();
        EPIDeliveryForm form = buildPerItemForm();
        itemCapacete.setConfirmationToken(token);
        itemCapacete.setConfirmationCode("111111");
        itemCapacete.setConfirmationExpiresAt(LocalDateTime.now().plusHours(48));
        form.getItems().add(itemCapacete);
        vincularRequisicaoNaoEpi(form);

        when(epiDeliveryFormRepository.findByConfirmationTokenWithDetails(any()))
                .thenReturn(Optional.empty());
        when(epiDeliveryFormRepository.findByItemsConfirmationTokenWithDetails(any()))
                .thenReturn(Optional.of(form));
        when(epiDeliveryFormRepository.save(any(EPIDeliveryForm.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        PublicEpiConfirmationDTO dto = epiDeliveryFormService.confirmPublicReceipt(
                token, "111111", "SIG-BASE64", "127.0.0.1", "Mozilla/5.0");

        assertNotNull(itemCapacete.getConfirmedAt());
        assertEquals("SIG-BASE64", itemCapacete.getSignatureBase64());
        assertEquals("127.0.0.1", form.getAuditIp());
        assertEquals("Mozilla/5.0", form.getAuditUserAgent());
        assertEquals(EPIDeliveryFormStatus.COMPLETED, form.getStatus());
        assertNotNull(form.getSignedAt());

        assertTrue(dto.isPerItem());
        assertEquals(itemCapacete.getId(), dto.getItemId());
        assertTrue(dto.isAlreadyConfirmed());
    }
}
