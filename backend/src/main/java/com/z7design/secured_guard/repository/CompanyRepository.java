package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.Company;
import com.z7design.secured_guard.model.Company.CompanyStatus;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CompanyRepository extends JpaRepository<Company, UUID> {
    
    /**
     * Busca empresa por sigla
     */
    Optional<Company> findBySigla(String sigla);

    Optional<Company> findFirstBySiglaIgnoreCase(String sigla);
    
    /**
     * Verifica se existe empresa com a sigla
     */
    boolean existsBySigla(String sigla);
    
    /**
     * Busca empresa por CNPJ
     */
    Optional<Company> findByCnpj(String cnpj);
    
    /**
     * Busca empresa por CNPJ normalizado (apenas dígitos)
     */
    @Query("SELECT c FROM Company c " +
           "WHERE REPLACE(REPLACE(REPLACE(c.cnpj, '.', ''), '-', ''), '/', '') = :cnpj")
    Optional<Company> findByNormalizedCnpj(@Param("cnpj") String cnpj);

    @Query("SELECT c FROM Company c " +
           "WHERE LOWER(REPLACE(REPLACE(REPLACE(c.name, ' ', ''), '.', ''), '-', '')) = " +
           "LOWER(REPLACE(REPLACE(REPLACE(:normalizedName, ' ', ''), '.', ''), '-', ''))")
    Optional<Company> findByNormalizedName(@Param("normalizedName") String normalizedName);
    
    /**
     * Verifica se existe empresa com o CNPJ
     */
    boolean existsByCnpj(String cnpj);
    
    /**
     * Busca empresas por status
     */
    List<Company> findByStatus(CompanyStatus status);
    
    /**
     * Busca empresas ativas
     */
    List<Company> findByStatusOrderByNameAsc(CompanyStatus status);
    
    /**
     * Busca empresas por nome
     */
    @Query("SELECT c FROM Company c " +
           "WHERE LOWER(c.name) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "ORDER BY c.name ASC")
    List<Company> searchCompanies(@Param("query") String query);
    
    /**
     * Busca empresas por sigla
     */
    @Query("SELECT c FROM Company c " +
           "WHERE LOWER(c.sigla) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "ORDER BY c.sigla ASC")
    List<Company> searchCompaniesBySigla(@Param("query") String query);
    
    /**
     * Busca todas as empresas ordenadas por nome
     */
    List<Company> findAllByOrderByNameAsc();
}