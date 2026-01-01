package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.ModeloDocumento;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.repository.ModeloDocumentoRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@Transactional
public class ModeloDocumentoService {
    
    private final ModeloDocumentoRepository modeloDocumentoRepository;
    private final DocumentProcessingService documentProcessingService;
    
    public ModeloDocumentoService(ModeloDocumentoRepository modeloDocumentoRepository,
                                 DocumentProcessingService documentProcessingService) {
        this.modeloDocumentoRepository = modeloDocumentoRepository;
        this.documentProcessingService = documentProcessingService;
    }
    
    /**
     * Cria um novo modelo de documento
     */
    public ModeloDocumento criar(ModeloDocumento modelo, User criadoPor) {
        modelo.setCriadoPor(criadoPor);
        modelo.setDataCriacao(LocalDateTime.now());
        modelo.setAtivo(true);
        
        // Extrair placeholders do conteúdo
        List<String> placeholders = extrairPlaceholders(modelo.getConteudoTemplate());
        modelo.setPlaceholdersFromList(placeholders);
        
        return modeloDocumentoRepository.save(modelo);
    }
    
    /**
     * Cria um modelo a partir de upload de arquivo DOCX ou PDF
     */
    public ModeloDocumento criarDeArquivo(MultipartFile arquivo, String nomeModelo, String categoria, 
                                         String descricao, User criadoPor) throws IOException {
        
        try {
            log.info("🔍 Iniciando criação de modelo de documento: nomeModelo={}, arquivo={}", 
                nomeModelo, arquivo.getOriginalFilename());
            
            // Validar arquivo
            log.debug("📋 Validando arquivo...");
            validarArquivo(arquivo);
            log.debug("✅ Arquivo validado com sucesso");
            
            // Processar arquivo
            log.debug("⚙️ Processando arquivo...");
            DocumentProcessingService.ProcessamentoResultado resultado = 
                documentProcessingService.processarArquivo(arquivo.getBytes(), arquivo.getOriginalFilename());
            log.info("✅ Arquivo processado: tipo={}, extraivel={}, placeholders={}", 
                resultado.getTipoArquivo(), resultado.isExtraivel(), resultado.getPlaceholders().size());
            
            // Validar campos obrigatórios
            if (nomeModelo == null || nomeModelo.trim().isEmpty()) {
                throw new IllegalArgumentException("Nome do modelo é obrigatório");
            }
            
            if (resultado.getTipoArquivo() == null) {
                throw new IllegalArgumentException("Tipo de arquivo não pôde ser determinado");
            }
            
            String nomeArquivoOriginal = arquivo.getOriginalFilename();
            if (nomeArquivoOriginal == null || nomeArquivoOriginal.trim().isEmpty()) {
                throw new IllegalArgumentException("Nome do arquivo original é obrigatório");
            }
            
            // Criar modelo
            log.debug("📝 Criando modelo de documento...");
            String conteudoTemplate = resultado.getConteudoExtraido();
            if (conteudoTemplate == null) {
                conteudoTemplate = "";
            }
            
            byte[] arquivoBytes = arquivo.getBytes();
            log.debug("📦 Tamanho do arquivo em bytes: {} bytes", arquivoBytes.length);
            log.debug("📦 Tamanho do arquivo (getSize): {} bytes", arquivo.getSize());
            
            // Criar modelo usando new e setters para garantir ordem correta
            ModeloDocumento modelo = new ModeloDocumento();
            modelo.setNomeModelo(nomeModelo.trim());
            modelo.setTipoArquivo(resultado.getTipoArquivo());
            modelo.setConteudoTemplate(conteudoTemplate);
            modelo.setArquivoOriginal(arquivoBytes);
            modelo.setNomeArquivoOriginal(nomeArquivoOriginal);
            modelo.setTamanhoArquivo(arquivo.getSize());
            modelo.setCategoria(categoria != null && !categoria.trim().isEmpty() ? categoria.trim() : "GERAL");
            modelo.setDescricao(descricao != null ? descricao.trim() : null);
            modelo.setCriadoPor(criadoPor);
            modelo.setAtivo(true);
            modelo.setVersao("1.0");
            modelo.setExtraivel(resultado.isExtraivel());
            
            // Definir placeholders
            if (resultado.getPlaceholders() != null) {
                modelo.setPlaceholdersFromList(resultado.getPlaceholders());
            } else {
                modelo.setPlaceholdersFromList(List.of());
            }
            
            // Data de criação será preenchida automaticamente pelo @CreationTimestamp
            
            log.debug("💾 Salvando modelo no banco de dados...");
            ModeloDocumento modeloSalvo = modeloDocumentoRepository.save(modelo);
            log.info("✅ Modelo de documento salvo com sucesso: id={}", modeloSalvo.getId());
            
            return modeloSalvo;
        } catch (Exception e) {
            log.error("❌ Erro ao criar modelo de documento: {}", e.getMessage(), e);
            throw e;
        }
    }
    
    /**
     * Atualiza um modelo existente
     */
    public ModeloDocumento atualizar(UUID id, ModeloDocumento modeloAtualizado) {
        ModeloDocumento modeloExistente = buscarPorId(id);
        
        modeloExistente.setNomeModelo(modeloAtualizado.getNomeModelo());
        modeloExistente.setConteudoTemplate(modeloAtualizado.getConteudoTemplate());
        modeloExistente.setCategoria(modeloAtualizado.getCategoria());
        modeloExistente.setDescricao(modeloAtualizado.getDescricao());
        modeloExistente.setVersao(modeloAtualizado.getVersao());
        modeloExistente.setDataAtualizacao(LocalDateTime.now());
        
        // Re-extrair placeholders
        List<String> placeholders = extrairPlaceholders(modeloExistente.getConteudoTemplate());
        modeloExistente.setPlaceholdersFromList(placeholders);
        
        return modeloDocumentoRepository.save(modeloExistente);
    }
    
    /**
     * Busca modelo por ID
     */
    @Transactional(readOnly = true)
    public ModeloDocumento buscarPorId(UUID id) {
        return modeloDocumentoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Modelo de documento não encontrado"));
    }
    
    /**
     * Lista todos os modelos ativos
     */
    @Transactional(readOnly = true)
    public List<ModeloDocumento> listarAtivos() {
        return modeloDocumentoRepository.findByAtivoTrueOrderByDataCriacaoDesc();
    }
    
    /**
     * Lista modelos com paginação
     */
    @Transactional(readOnly = true)
    public Page<ModeloDocumento> listarComPaginacao(Pageable pageable) {
        return modeloDocumentoRepository.findByAtivoTrueOrderByDataCriacaoDesc(pageable);
    }
    
    /**
     * Lista modelos por categoria
     */
    @Transactional(readOnly = true)
    public List<ModeloDocumento> listarPorCategoria(String categoria) {
        return modeloDocumentoRepository.findByCategoriaAndAtivoTrue(categoria);
    }
    
    /**
     * Busca modelos por nome
     */
    @Transactional(readOnly = true)
    public List<ModeloDocumento> buscarPorNome(String nome) {
        return modeloDocumentoRepository.findByNomeModeloContainingIgnoreCaseAndAtivoTrue(nome);
    }
    
    /**
     * Desativa um modelo (soft delete)
     */
    public void desativar(UUID id) {
        ModeloDocumento modelo = buscarPorId(id);
        modelo.setAtivo(false);
        modeloDocumentoRepository.save(modelo);
    }
    
    /**
     * Remove um modelo permanentemente
     */
    public void remover(UUID id) {
        ModeloDocumento modelo = buscarPorId(id);
        modeloDocumentoRepository.delete(modelo);
    }
    
    /**
     * Verifica se existe modelo com o mesmo nome
     */
    @Transactional(readOnly = true)
    public boolean existePorNome(String nomeModelo) {
        return modeloDocumentoRepository.existsByNomeModeloAndAtivoTrue(nomeModelo);
    }
    
    /**
     * Lista categorias disponíveis
     */
    @Transactional(readOnly = true)
    public List<String> listarCategorias() {
        return modeloDocumentoRepository.countByCategoria()
                .stream()
                .map(obj -> (String) obj[0])
                .toList();
    }
    
    /**
     * Extrai placeholders do conteúdo do template
     */
    private List<String> extrairPlaceholders(String conteudo) {
        if (conteudo == null || conteudo.trim().isEmpty()) {
            return List.of();
        }
        
        List<String> placeholders = new java.util.ArrayList<>();
        Pattern pattern = Pattern.compile("\\{\\{([^}]+)\\}\\}");
        Matcher matcher = pattern.matcher(conteudo);
        
        while (matcher.find()) {
            String placeholder = matcher.group(1).trim();
            if (!placeholders.contains(placeholder)) {
                placeholders.add(placeholder);
            }
        }
        
        return placeholders;
    }
    
    /**
     * Valida arquivo de upload
     */
    private void validarArquivo(MultipartFile arquivo) {
        if (arquivo == null || arquivo.isEmpty()) {
            throw new IllegalArgumentException("Arquivo não pode ser vazio");
        }
        
        String nomeArquivo = arquivo.getOriginalFilename();
        if (nomeArquivo == null) {
            throw new IllegalArgumentException("Nome do arquivo é obrigatório");
        }
        
        String extensao = nomeArquivo.toLowerCase();
        if (!extensao.endsWith(".docx") && !extensao.endsWith(".pdf")) {
            throw new IllegalArgumentException("Arquivo deve ser um documento .docx ou .pdf");
        }
        
        // Limite de tamanho (10MB)
        if (arquivo.getSize() > 10 * 1024 * 1024) {
            throw new IllegalArgumentException("Arquivo não pode exceder 10MB");
        }
    }
    
    
    /**
     * Busca modelos não utilizados recentemente
     */
    @Transactional(readOnly = true)
    public List<ModeloDocumento> buscarNaoUtilizados(int diasLimite) {
        LocalDateTime dataLimite = LocalDateTime.now().minusDays(diasLimite);
        return modeloDocumentoRepository.findUnusedModels(dataLimite);
    }
    
    /**
     * Busca modelos por versão
     */
    @Transactional(readOnly = true)
    public List<ModeloDocumento> buscarPorVersao(String versao) {
        return modeloDocumentoRepository.findByVersaoAndAtivoTrue(versao);
    }
}
