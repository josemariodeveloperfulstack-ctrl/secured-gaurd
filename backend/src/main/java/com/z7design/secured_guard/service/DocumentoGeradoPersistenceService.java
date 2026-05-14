package com.z7design.secured_guard.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.z7design.secured_guard.model.DocumentoGerado;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.model.enums.TipoDocumentoGerado;
import com.z7design.secured_guard.repository.DocumentoGeradoRepository;
import com.z7design.secured_guard.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Helper compartilhado para persistir documentos PDF gerados pelos diversos
 * controllers do sistema (Contrato de Trabalho, Termos, Ordens de Serviço,
 * Declaração, etc.) na tabela {@code documentos_gerados}, de forma que fiquem
 * disponíveis para download posterior pelo RH (aba "Documentos" do Editar
 * Funcionário) e pelo próprio colaborador (Dashboard do Colaborador).
 *
 * <p>Diferentemente de {@link DocumentoGeradoService}, este service NÃO depende
 * de um {@link com.z7design.secured_guard.model.ModeloDocumento}: persiste o
 * PDF já gerado a partir de templates fixos, categorizado por
 * {@link TipoDocumentoGerado}.
 *
 * <p>Falhas durante a persistência (ex: funcionário não encontrado) são
 * tratadas como warning e NÃO interrompem o fluxo de geração — o usuário
 * continua recebendo o PDF como resposta da API.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentoGeradoPersistenceService {

    private final DocumentoGeradoRepository documentoGeradoRepository;
    private final EmployeeRepository employeeRepository;
    private final AuthenticationService authenticationService;
    private final ObjectMapper objectMapper;

    /**
     * Persiste o PDF gerado e retorna o registro salvo. Em caso de erro, loga
     * e devolve {@link Optional#empty()} — quem chama deve continuar o fluxo.
     *
     * @param funcionarioId    funcionário ao qual o documento se refere (obrigatório)
     * @param tipo             categoria do documento gerado (obrigatório)
     * @param pdfBytes         conteúdo binário do PDF (obrigatório, não vazio)
     * @param nomeArquivo      nome de arquivo sugerido para download
     * @param dadosPreenchidos dados utilizados na geração (serializados como JSON; pode ser null)
     */
    @Transactional
    public Optional<DocumentoGerado> persistir(UUID funcionarioId,
                                               TipoDocumentoGerado tipo,
                                               byte[] pdfBytes,
                                               String nomeArquivo,
                                               Map<String, Object> dadosPreenchidos) {
        try {
            if (funcionarioId == null) {
                log.debug("Persistência ignorada: funcionarioId nulo (tipo={})", tipo);
                return Optional.empty();
            }
            if (tipo == null) {
                log.warn("Persistência ignorada: tipo nulo (funcionarioId={})", funcionarioId);
                return Optional.empty();
            }
            if (pdfBytes == null || pdfBytes.length == 0) {
                log.warn("Persistência ignorada: PDF vazio (funcionarioId={}, tipo={})", funcionarioId, tipo);
                return Optional.empty();
            }

            Employee funcionario = employeeRepository.findById(funcionarioId).orElse(null);
            if (funcionario == null) {
                log.warn("Persistência ignorada: funcionário {} não encontrado (tipo={})", funcionarioId, tipo);
                return Optional.empty();
            }

            User criadoPor = resolveCurrentUser();

            DocumentoGerado documento = new DocumentoGerado();
            documento.setFuncionario(funcionario);
            documento.setTipo(tipo);
            documento.setArquivoGerado(pdfBytes);
            documento.setNomeArquivoGerado(
                    nomeArquivo != null && !nomeArquivo.isBlank()
                            ? nomeArquivo
                            : tipo.name().toLowerCase() + ".pdf");
            documento.setTamanhoArquivoGerado((long) pdfBytes.length);
            documento.setStatus(DocumentoGerado.StatusDocumento.PENDENTE);
            documento.setDadosPreenchidos(serializeDados(dadosPreenchidos));
            documento.setDataCriacao(LocalDateTime.now());
            if (criadoPor != null) {
                documento.setCriadoPor(criadoPor);
            }

            DocumentoGerado salvo = documentoGeradoRepository.save(documento);
            log.info("📥 Documento gerado persistido: tipo={}, funcionarioId={}, id={}, bytes={}",
                    tipo, funcionarioId, salvo.getId(), pdfBytes.length);
            return Optional.of(salvo);
        } catch (Exception e) {
            // Persistência é melhor-esforço — não pode quebrar o fluxo principal de geração
            log.error("Falha ao persistir documento gerado (tipo={}, funcionarioId={}): {}",
                    tipo, funcionarioId, e.getMessage(), e);
            return Optional.empty();
        }
    }

    private User resolveCurrentUser() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) {
                return null;
            }
            return authenticationService.getCurrentUser(auth);
        } catch (Exception e) {
            log.debug("Não foi possível resolver usuário atual: {}", e.getMessage());
            return null;
        }
    }

    private String serializeDados(Map<String, Object> dadosPreenchidos) {
        if (dadosPreenchidos == null || dadosPreenchidos.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(dadosPreenchidos);
        } catch (JsonProcessingException e) {
            log.warn("Falha ao serializar dadosPreenchidos: {}", e.getMessage());
            return null;
        }
    }
}
