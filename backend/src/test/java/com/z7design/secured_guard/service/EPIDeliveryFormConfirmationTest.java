package com.z7design.secured_guard.service;

import com.z7design.secured_guard.dto.EpiConfirmationSendResponseDTO;
import com.z7design.secured_guard.dto.PublicEpiConfirmationDTO;
import com.z7design.secured_guard.exception.BusinessException;
import com.z7design.secured_guard.model.EPIDeliveryForm;
import com.z7design.secured_guard.model.enums.EPIDeliveryFormStatus;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Testes da confirmação POR FICHA (modo por ficha) da entrega de EPI via WhatsApp:
 *  - sendWhatsAppConfirmation em PRIMEIRA_ENTREGA (AUTO e MANUAL) — token/código na ficha;
 *  - confirmWithCode validando o código da ficha e concluindo a ficha;
 *  - confirmPublicReceipt validando token + código pelo link público.
 */
class EPIDeliveryFormConfirmationTest extends AbstractEPIDeliveryFormConfirmationTest {

    // ------------------------------------------------------------------
    // sendWhatsAppConfirmation — modo por ficha (PRIMEIRA_ENTREGA)
    // ------------------------------------------------------------------

    @Test
    void sendWhatsAppConfirmation_primeiraEntrega_auto_geraTokenECodigoNaFicha() {
        EPIDeliveryForm form = buildPrimeiraEntregaForm();
        form.getItems().add(itemCapacete);
        when(epiDeliveryFormRepository.findByIdWithDetails(FORM_ID)).thenReturn(Optional.of(form));
        when(whatsAppAgentService.sendTextMessage(anyString(), anyString())).thenReturn(true);

        EpiConfirmationSendResponseDTO response =
                epiDeliveryFormService.sendWhatsAppConfirmation(FORM_ID, "AUTO", BASE_URL);

        assertNotNull(response);
        assertEquals("AUTO", response.getMode());
        assertTrue(response.isSent());
        assertEquals(FORM_ID, response.getFormId());
        assertEquals("***1747", response.getPhoneMasked());
        assertNull(response.getItems());

        // Token e código ficam NA FICHA (não por item)
        assertNotNull(form.getConfirmationToken());
        assertNotNull(form.getConfirmationCode());
        assertTrue(form.getConfirmationCode().matches("\\d{6}"));
        assertNotNull(form.getConfirmationExpiresAt());
        assertNotNull(form.getConfirmationSentAt());
        assertEquals("WHATSAPP_CONFIRM", form.getSignatureType());
        assertEquals(EPIDeliveryFormStatus.DRAFT, form.getStatus());
        assertNull(form.getSignedAt());

        assertEquals(form.getConfirmationToken(), response.getConfirmationToken());
        assertEquals(form.getConfirmationCode(), response.getConfirmationCode());
        assertEquals(BASE_URL + "/epi-confirm/" + form.getConfirmationToken(), response.getConfirmUrl());
        assertTrue(response.getWhatsappUrl().contains("wa.me/" + NORMALIZED_PHONE));
        assertEquals(response.getExpiresAt(), form.getConfirmationExpiresAt());

        verify(epiDeliveryFormRepository).save(any(EPIDeliveryForm.class));
        verify(whatsAppAgentService).sendTextMessage(eq(NORMALIZED_PHONE), contains("Seu código"));
    }

    @Test
    void sendWhatsAppConfirmation_primeiraEntrega_manual_naoEnviaAutomatico() {
        EPIDeliveryForm form = buildPrimeiraEntregaForm();
        form.getItems().add(itemCapacete);
        when(epiDeliveryFormRepository.findByIdWithDetails(FORM_ID)).thenReturn(Optional.of(form));

        EpiConfirmationSendResponseDTO response =
                epiDeliveryFormService.sendWhatsAppConfirmation(FORM_ID, "MANUAL", BASE_URL);

        assertNotNull(response);
        assertEquals("MANUAL", response.getMode());
        assertFalse(response.isSent());
        assertTrue(response.getWhatsappUrl().contains("wa.me/" + NORMALIZED_PHONE));
        assertNotNull(form.getConfirmationToken());
        assertNotNull(form.getConfirmationCode());

        verify(whatsAppAgentService, never()).sendTextMessage(anyString(), anyString());
        verify(epiDeliveryFormRepository).save(any(EPIDeliveryForm.class));
    }

    @Test
    void sendWhatsAppConfirmation_falhaNoEnvioAuto_retornaSentFalse() {
        EPIDeliveryForm form = buildPrimeiraEntregaForm();
        form.getItems().add(itemCapacete);
        when(epiDeliveryFormRepository.findByIdWithDetails(FORM_ID)).thenReturn(Optional.of(form));
        when(whatsAppAgentService.sendTextMessage(anyString(), anyString())).thenReturn(false);

        EpiConfirmationSendResponseDTO response =
                epiDeliveryFormService.sendWhatsAppConfirmation(FORM_ID, "AUTO", BASE_URL);

        assertFalse(response.isSent());
        assertTrue(response.getMessage().contains("Não foi possível enviar automaticamente"));
    }

    // ------------------------------------------------------------------
    // confirmWithCode — validação do código da FICHA
    // ------------------------------------------------------------------

    @Test
    void confirmWithCode_codigoDaFichaCorreto_concluiFicha() {
        EPIDeliveryForm form = buildPrimeiraEntregaForm();
        form.setConfirmationCode("123456");
        form.setConfirmationExpiresAt(LocalDateTime.now().plusHours(48));
        form.getItems().add(itemCapacete);
        vincularRequisicaoNaoEpi(form);
        when(epiDeliveryFormRepository.findByIdWithDetails(FORM_ID)).thenReturn(Optional.of(form));
        when(epiDeliveryFormRepository.save(any(EPIDeliveryForm.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        epiDeliveryFormService.confirmWithCode(FORM_ID, "123456", USER_ID);

        assertEquals(EPIDeliveryFormStatus.COMPLETED, form.getStatus());
        assertNotNull(form.getSignedAt());
        assertEquals("ADMIN_CODE", form.getSignatureOrigin());
        assertEquals("WHATSAPP_CONFIRM", form.getSignatureType());
        assertNull(itemCapacete.getConfirmedAt(), "Modo por ficha não confirma itens individualmente");
        verify(epiDeliveryFormRepository).save(any(EPIDeliveryForm.class));
    }

    @Test
    void confirmWithCode_codigoDaFichaInvalido_lancaBusinessException() {
        EPIDeliveryForm form = buildPrimeiraEntregaForm();
        form.setConfirmationCode("123456");
        form.setConfirmationExpiresAt(LocalDateTime.now().plusHours(48));
        form.getItems().add(itemCapacete);
        when(epiDeliveryFormRepository.findByIdWithDetails(FORM_ID)).thenReturn(Optional.of(form));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> epiDeliveryFormService.confirmWithCode(FORM_ID, "000000", USER_ID));
        assertEquals("Código de confirmação inválido.", ex.getMessage());
        assertEquals(EPIDeliveryFormStatus.DRAFT, form.getStatus());
        verify(epiDeliveryFormRepository, never()).save(any());
    }

    @Test
    void confirmWithCode_codigoDaFichaExpirado_lancaBusinessException() {
        EPIDeliveryForm form = buildPrimeiraEntregaForm();
        form.setConfirmationCode("123456");
        form.setConfirmationExpiresAt(LocalDateTime.now().minusHours(1));
        form.getItems().add(itemCapacete);
        when(epiDeliveryFormRepository.findByIdWithDetails(FORM_ID)).thenReturn(Optional.of(form));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> epiDeliveryFormService.confirmWithCode(FORM_ID, "123456", USER_ID));
        assertTrue(ex.getMessage().contains("expirou"));
        assertEquals(EPIDeliveryFormStatus.DRAFT, form.getStatus());
    }

    @Test
    void confirmWithCode_fichaJaConfirmada_lancaBusinessException() {
        EPIDeliveryForm form = buildPrimeiraEntregaForm();
        form.setConfirmationCode("123456");
        form.setConfirmationExpiresAt(LocalDateTime.now().plusHours(48));
        form.setStatus(EPIDeliveryFormStatus.COMPLETED);
        form.setSignedAt(LocalDateTime.now());
        form.getItems().add(itemCapacete);
        when(epiDeliveryFormRepository.findByIdWithDetails(FORM_ID)).thenReturn(Optional.of(form));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> epiDeliveryFormService.confirmWithCode(FORM_ID, "123456", USER_ID));
        assertEquals("Recebimento já confirmado.", ex.getMessage());
    }

    // ------------------------------------------------------------------
    // confirmPublicReceipt — link público por ficha
    // ------------------------------------------------------------------

    @Test
    void confirmPublicReceipt_tokenDaFichaCorreto_concluiEArquivaAssinatura() {
        UUID token = UUID.randomUUID();
        EPIDeliveryForm form = buildPrimeiraEntregaForm();
        form.setConfirmationToken(token);
        form.setConfirmationCode("123456");
        form.setConfirmationExpiresAt(LocalDateTime.now().plusHours(48));
        form.getItems().add(itemCapacete);
        vincularRequisicaoNaoEpi(form);
        when(epiDeliveryFormRepository.findByConfirmationTokenWithDetails(any()))
                .thenReturn(Optional.of(form));
        when(epiDeliveryFormRepository.save(any(EPIDeliveryForm.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        PublicEpiConfirmationDTO dto = epiDeliveryFormService.confirmPublicReceipt(
                token, "123456", "SIG-FICHA", "10.0.0.1", "WhatsApp-Client");

        assertEquals(EPIDeliveryFormStatus.COMPLETED, form.getStatus());
        assertNotNull(form.getSignedAt());
        assertEquals("WHATSAPP_LINK", form.getSignatureOrigin());
        assertEquals("SIG-FICHA", form.getSignatureBase64());
        assertEquals("10.0.0.1", form.getAuditIp());
        assertEquals("WhatsApp-Client", form.getAuditUserAgent());

        assertTrue(dto.isAlreadyConfirmed());
        assertFalse(dto.isPerItem(), "Modo por ficha: response não é por item");
    }

    @Test
    void confirmPublicReceipt_assinaturaEmBranco_naoSobrescreveAssinaturaExistente() {
        UUID token = UUID.randomUUID();
        EPIDeliveryForm form = buildPrimeiraEntregaForm();
        form.setConfirmationToken(token);
        form.setConfirmationCode("123456");
        form.setConfirmationExpiresAt(LocalDateTime.now().plusHours(48));
        form.setSignatureBase64("SIG-ANTIGA");
        form.getItems().add(itemCapacete);
        vincularRequisicaoNaoEpi(form);
        when(epiDeliveryFormRepository.findByConfirmationTokenWithDetails(any()))
                .thenReturn(Optional.of(form));
        when(epiDeliveryFormRepository.save(any(EPIDeliveryForm.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        epiDeliveryFormService.confirmPublicReceipt(token, "123456", "", "10.0.0.1", "Client");

        assertEquals("SIG-ANTIGA", form.getSignatureBase64(),
                "Assinatura em branco não deve sobrescrever a assinatura já registrada");
        assertEquals(EPIDeliveryFormStatus.COMPLETED, form.getStatus());
    }

    @Test
    void confirmPublicReceipt_tokenDaFichaSemCodigo_lancaBusinessException() {
        UUID token = UUID.randomUUID();
        EPIDeliveryForm form = buildPrimeiraEntregaForm();
        form.setConfirmationToken(token); // token existe, mas nenhum código foi gerado
        form.getItems().add(itemCapacete);
        when(epiDeliveryFormRepository.findByConfirmationTokenWithDetails(any()))
                .thenReturn(Optional.of(form));

        BusinessException ex = assertThrows(BusinessException.class,
                () -> epiDeliveryFormService.confirmPublicReceipt(token, "123456", null, null, null));
        assertEquals("Nenhuma confirmação WhatsApp foi gerada para esta ficha.", ex.getMessage());
    }
}
