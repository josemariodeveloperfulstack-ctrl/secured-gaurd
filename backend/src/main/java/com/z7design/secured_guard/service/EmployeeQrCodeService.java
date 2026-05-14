package com.z7design.secured_guard.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.z7design.secured_guard.dto.EmployeeIdentificationDTO;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.repository.EmployeeRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Gera e valida o token opaco do QR Code do funcionário.
 *
 * <p>Fluxo da Onda 1:
 * <ul>
 *   <li>{@link #ensureToken(UUID)} → gera (ou retorna) o token do funcionário. Idempotente.</li>
 *   <li>{@link #regenerateToken(UUID)} → invalida o token anterior e cria novo (uso: crachá perdido).</li>
 *   <li>{@link #identify(String)} → identifica o funcionário durante a visita do supervisor.
 *       Tenta na ordem: token QR → CPF (apenas dígitos) → matrícula.</li>
 * </ul>
 *
 * <p>O token é uma string Base64-URL-safe de 32 bytes (256 bits) — colisão estatisticamente
 * impossível para o porte da empresa, e impossível de adivinhar.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmployeeQrCodeService {

    private static final int TOKEN_BYTES = 32;
    private static final int QR_IMAGE_SIZE_PX = 360;
    private static final Pattern DIGITS_ONLY = Pattern.compile("\\D+");
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final ObjectMapper JSON = new ObjectMapper();

    private final EmployeeRepository employeeRepository;

    /**
     * Retorna o token existente do funcionário, gerando um novo se ainda não tiver.
     * Idempotente — chamar várias vezes é seguro.
     */
    @Transactional
    public String ensureToken(UUID employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
            .orElseThrow(() -> new EntityNotFoundException("Funcionário não encontrado: " + employeeId));

        if (employee.getQrCodeToken() == null || employee.getQrCodeToken().isBlank()) {
            String token = newToken();
            employee.setQrCodeToken(token);
            employeeRepository.save(employee);
            log.info("QR Code gerado para funcionário {} ({})", employee.getName(), employee.getId());
        }
        return employee.getQrCodeToken();
    }

    /**
     * Invalida o token atual e cria um novo. Usar quando o crachá foi perdido/roubado.
     */
    @Transactional
    public String regenerateToken(UUID employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
            .orElseThrow(() -> new EntityNotFoundException("Funcionário não encontrado: " + employeeId));

        String token = newToken();
        employee.setQrCodeToken(token);
        employeeRepository.save(employee);
        log.warn("QR Code REGENERADO para funcionário {} ({}) — token anterior invalidado",
            employee.getName(), employee.getId());
        return token;
    }

    /**
     * Identifica um funcionário a partir de um valor lido pelo Supervisor.
     * Tenta nesta ordem:
     *  1. Token opaco do QR Code (caminho feliz);
     *  2. CPF (apenas dígitos);
     *  3. Matrícula ({@code registrationNumber}).
     *
     * @param rawValue valor lido do QR Code OU digitado manualmente pelo supervisor.
     * @return funcionário identificado, ou {@link Optional#empty()} se nada bateu.
     */
    @Transactional(readOnly = true)
    public Optional<EmployeeIdentificationDTO> identify(String rawValue) {
        if (rawValue == null) {
            return Optional.empty();
        }
        String trimmed = rawValue.trim();
        if (trimmed.isEmpty()) {
            return Optional.empty();
        }

        // 0) Se vier um JSON do QR Code (payload completo), extrai o token e ignora o resto.
        //    Backend NUNCA confia em dados auto-reportados pelo QR — só usa o `t`.
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            try {
                Map<?, ?> json = JSON.readValue(trimmed, Map.class);
                Object token = json.get("t");
                if (token != null) {
                    trimmed = token.toString().trim();
                }
            } catch (IOException ignored) {
                log.debug("Valor parecia JSON mas não decodificou; segue lógica padrão.");
            }
        }

        // 1) Token QR (Base64 url-safe, ~43 chars). Tenta sempre primeiro porque é o caminho
        //    privilegiado e não tem ambiguidade com CPF/matrícula.
        Optional<Employee> byToken = employeeRepository.findByQrCodeToken(trimmed);
        if (byToken.isPresent()) {
            return byToken.map(e -> EmployeeIdentificationDTO.from(e, "QR_TOKEN"));
        }

        // 2) CPF — só dígitos
        String digits = DIGITS_ONLY.matcher(trimmed).replaceAll("");
        if (digits.length() == 11) {
            Optional<Employee> byCpf = employeeRepository.findByCpf(digits);
            if (byCpf.isPresent()) {
                return byCpf.map(e -> EmployeeIdentificationDTO.from(e, "CPF"));
            }
        }

        // 3) Matrícula (case-insensitive trim)
        Optional<Employee> byMatricula = employeeRepository.findByRegistrationNumber(trimmed);
        if (byMatricula.isPresent()) {
            return byMatricula.map(e -> EmployeeIdentificationDTO.from(e, "MATRICULA"));
        }

        log.debug("Identificação falhou para valor de entrada (mascarado): len={}", trimmed.length());
        return Optional.empty();
    }

    /**
     * Retorna o DTO do funcionário com os dados do crachá (para tela de geração/impressão).
     * NÃO gera token — usa {@link #ensureToken(UUID)} antes se necessário.
     */
    @Transactional(readOnly = true)
    public EmployeeIdentificationDTO getCardData(UUID employeeId) {
        Employee employee = employeeRepository.findWithOrgContextById(employeeId)
            .orElseThrow(() -> new EntityNotFoundException("Funcionário não encontrado: " + employeeId));
        return EmployeeIdentificationDTO.from(employee, null);
    }

    /**
     * Monta o payload textual que será codificado dentro do QR.
     * Formato: JSON compacto com {@code t} (token) + dados visuais (n, cpf, c, p, m).
     * O backend SEMPRE valida pelo campo {@code t} — os demais existem só para o supervisor
     * poder ver no app offline o que está lendo.
     */
    @Transactional(readOnly = true)
    public String buildQrPayload(UUID employeeId) {
        Employee employee = employeeRepository.findWithOrgContextById(employeeId)
            .orElseThrow(() -> new EntityNotFoundException("Funcionário não encontrado: " + employeeId));
        if (employee.getQrCodeToken() == null || employee.getQrCodeToken().isBlank()) {
            throw new IllegalStateException(
                "Funcionário ainda não tem QR Code gerado. Gere antes de imprimir.");
        }

        Map<String, String> payload = new LinkedHashMap<>();
        payload.put("v", "1");
        payload.put("t", employee.getQrCodeToken());
        payload.put("n", safe(employee.getName()));
        payload.put("cpf", safe(employee.getCpf()));
        payload.put("c", employee.getPosition() != null ? safe(employee.getPosition().getName()) : "");
        payload.put("p", employee.getWorkPost() != null ? safe(employee.getWorkPost().getName()) : "");
        payload.put("m", safe(employee.getRegistrationNumber()));

        try {
            return JSON.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Falha ao montar payload do QR Code", e);
        }
    }

    /**
     * Renderiza o QR Code como imagem PNG.
     * @return bytes do PNG (Content-Type: image/png).
     */
    @Transactional(readOnly = true)
    public byte[] renderQrImage(UUID employeeId) {
        String payload = buildQrPayload(employeeId);
        try {
            BitMatrix bitMatrix = new MultiFormatWriter()
                .encode(payload, BarcodeFormat.QR_CODE, QR_IMAGE_SIZE_PX, QR_IMAGE_SIZE_PX);
            BufferedImage image = MatrixToImageWriter.toBufferedImage(bitMatrix);
            try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                ImageIO.write(image, "png", out);
                return out.toByteArray();
            }
        } catch (WriterException | IOException e) {
            throw new IllegalStateException("Falha ao renderizar imagem do QR Code", e);
        }
    }

    private static String safe(String value) {
        return value == null ? "" : value.trim();
    }

    private static String newToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
