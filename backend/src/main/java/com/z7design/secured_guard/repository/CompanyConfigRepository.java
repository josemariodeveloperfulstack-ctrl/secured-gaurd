package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.CompanyConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CompanyConfigRepository extends JpaRepository<CompanyConfig, UUID> {

    /**
     * Carrega por id com no máximo uma linha (ORDER BY + LIMIT 1).
     * Evita falha do Hibernate 6 "Duplicate row was found and ASSERT was specified" quando
     * existem linhas físicas duplicadas com o mesmo id (dados legados sem PK).
     */
    Optional<CompanyConfig> findFirstByIdOrderByCreatedAtDesc(UUID id);

    /**
     * Configuração ativa mais recente (uma linha).
     */
    Optional<CompanyConfig> findFirstByActiveTrueOrderByCreatedAtDesc();

    /**
     * Verifica se existe uma configuração ativa
     */
    @Query("SELECT COUNT(cc) > 0 FROM CompanyConfig cc WHERE cc.active = true")
    boolean existsActiveConfig();

    /**
     * Busca por CNPJ
     */
    Optional<CompanyConfig> findByCnpjAndActiveTrue(String cnpj);

    /**
     * Verifica se CNPJ já existe para outra empresa
     */
    @Query("SELECT COUNT(cc) > 0 FROM CompanyConfig cc WHERE cc.cnpj = :cnpj AND cc.id != :id AND cc.active = true")
    boolean existsByCnpjAndIdNotAndActiveTrue(String cnpj, UUID id);
}
