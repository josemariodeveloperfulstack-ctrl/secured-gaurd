package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.DocumentoGerado;
import com.z7design.secured_guard.model.Employee;
import com.z7design.secured_guard.model.ModeloDocumento;
import com.z7design.secured_guard.model.enums.TipoDocumentoGerado;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface DocumentoGeradoRepository extends JpaRepository<DocumentoGerado, UUID> {
    
    /**
     * Busca documentos por funcionário para listagem (sem DISTINCT — PostgreSQL
     * não suporta igualdade em colunas JSON usadas no SELECT DISTINCT).
     * Carrega apenas modelo; demais campos vêm da entidade principal.
     */
    @Query("""
            SELECT dg FROM DocumentoGerado dg
            LEFT JOIN FETCH dg.modelo
            WHERE dg.funcionario.id = :funcionarioId
            ORDER BY dg.dataCriacao DESC
            """)
    List<DocumentoGerado> findByFuncionarioIdWithDetails(@Param("funcionarioId") UUID funcionarioId);

    /**
     * Busca documentos por funcionário
     */
    List<DocumentoGerado> findByFuncionarioOrderByDataCriacaoDesc(Employee funcionario);
    
    /**
     * Busca documentos por modelo
     */
    List<DocumentoGerado> findByModeloOrderByDataCriacaoDesc(ModeloDocumento modelo);
    
    /**
     * Busca documentos por status
     */
    List<DocumentoGerado> findByStatusOrderByDataCriacaoDesc(DocumentoGerado.StatusDocumento status);
    
    /**
     * Busca documentos por funcionário e status
     */
    List<DocumentoGerado> findByFuncionarioAndStatusOrderByDataCriacaoDesc(Employee funcionario, DocumentoGerado.StatusDocumento status);
    
    /**
     * Busca documentos por modelo e status
     */
    List<DocumentoGerado> findByModeloAndStatusOrderByDataCriacaoDesc(ModeloDocumento modelo, DocumentoGerado.StatusDocumento status);
    
    
    /**
     * Busca documentos vencidos
     */
    @Query("SELECT dg FROM DocumentoGerado dg WHERE dg.dataVencimento < :dataAtual AND dg.status = 'PENDENTE'")
    List<DocumentoGerado> findExpiredDocuments(@Param("dataAtual") LocalDateTime dataAtual);
    
    /**
     * Busca documentos que vencem em breve
     */
    @Query("SELECT dg FROM DocumentoGerado dg WHERE dg.dataVencimento BETWEEN :dataInicio AND :dataFim AND dg.status = 'PENDENTE'")
    List<DocumentoGerado> findDocumentsExpiringSoon(@Param("dataInicio") LocalDateTime dataInicio, 
                                                    @Param("dataFim") LocalDateTime dataFim);
    
    /**
     * Busca documentos criados por um usuário
     */
    List<DocumentoGerado> findByCriadoPorIdOrderByDataCriacaoDesc(UUID criadoPorId);
    
    /**
     * Busca documentos assinados por um usuário
     */
    List<DocumentoGerado> findByAssinadoPorIdOrderByDataAssinaturaDesc(UUID assinadoPorId);
    
    /**
     * Busca documentos com paginação
     */
    Page<DocumentoGerado> findAllByOrderByDataCriacaoDesc(Pageable pageable);
    
    /**
     * Busca documentos por funcionário com paginação
     */
    Page<DocumentoGerado> findByFuncionarioOrderByDataCriacaoDesc(Employee funcionario, Pageable pageable);
    
    /**
     * Busca documentos por modelo com paginação
     */
    Page<DocumentoGerado> findByModeloOrderByDataCriacaoDesc(ModeloDocumento modelo, Pageable pageable);
    
    /**
     * Busca documentos por status com paginação
     */
    Page<DocumentoGerado> findByStatusOrderByDataCriacaoDesc(DocumentoGerado.StatusDocumento status, Pageable pageable);
    
    /**
     * Conta documentos por status
     */
    @Query("SELECT dg.status, COUNT(dg) FROM DocumentoGerado dg GROUP BY dg.status")
    List<Object[]> countByStatus();
    
    /**
     * Conta documentos por modelo
     */
    @Query("SELECT dg.modelo.nomeModelo, COUNT(dg) FROM DocumentoGerado dg GROUP BY dg.modelo.nomeModelo")
    List<Object[]> countByModelo();
    
    /**
     * Busca documentos criados em um período específico
     */
    @Query("SELECT dg FROM DocumentoGerado dg WHERE dg.dataCriacao BETWEEN :dataInicio AND :dataFim ORDER BY dg.dataCriacao DESC")
    List<DocumentoGerado> findByDataCriacaoBetween(@Param("dataInicio") LocalDateTime dataInicio, 
                                                  @Param("dataFim") LocalDateTime dataFim);
    
    /**
     * Busca documentos assinados em um período específico
     */
    @Query("SELECT dg FROM DocumentoGerado dg WHERE dg.dataAssinatura BETWEEN :dataInicio AND :dataFim ORDER BY dg.dataAssinatura DESC")
    List<DocumentoGerado> findByDataAssinaturaBetween(@Param("dataInicio") LocalDateTime dataInicio, 
                                                      @Param("dataFim") LocalDateTime dataFim);
    
    /**
     * Busca documentos por funcionário e modelo
     */
    List<DocumentoGerado> findByFuncionarioAndModeloOrderByDataCriacaoDesc(Employee funcionario, ModeloDocumento modelo);
    
    /**
     * Verifica se existe documento gerado para um funcionário e modelo específicos
     */
    boolean existsByFuncionarioAndModelo(Employee funcionario, ModeloDocumento modelo);
    
    /**
     * Busca documentos que precisam ser atualizados (vencidos)
     */
    @Query("SELECT dg FROM DocumentoGerado dg WHERE dg.dataVencimento < :dataAtual AND dg.status = 'PENDENTE'")
    List<DocumentoGerado> findDocumentsToUpdateStatus(@Param("dataAtual") LocalDateTime dataAtual);

    @Modifying
    @Query("DELETE FROM DocumentoGerado dg WHERE dg.funcionario.id = :funcionarioId")
    int deleteByFuncionarioId(@Param("funcionarioId") UUID funcionarioId);

    /**
     * Busca documentos por funcionário e categoria/tipo do documento gerado.
     */
    List<DocumentoGerado> findByFuncionarioAndTipoOrderByDataCriacaoDesc(Employee funcionario, TipoDocumentoGerado tipo);

    /**
     * Busca documentos de um funcionário a partir do User vinculado.
     * Usado pelo endpoint /meus para o Dashboard do Colaborador.
     */
    @Query("SELECT dg FROM DocumentoGerado dg WHERE dg.funcionario.user.id = :userId ORDER BY dg.dataCriacao DESC")
    List<DocumentoGerado> findByFuncionarioUserIdOrderByDataCriacaoDesc(@Param("userId") UUID userId);
}
