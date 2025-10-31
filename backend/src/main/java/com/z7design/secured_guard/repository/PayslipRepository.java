package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.Payslip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
 
@Repository
public interface PayslipRepository extends JpaRepository<Payslip, java.util.UUID> {
    
    // Método padrão do Spring Data JPA (deprecated - usar o método com CNPJ)
    @Deprecated
    boolean existsByCpfAndMonthAndYear(String cpf, Integer month, Integer year);
    
    // Consulta personalizada mais robusta (deprecated - usar o método com CNPJ)
    @Deprecated
    @Query("SELECT COUNT(p) > 0 FROM Payslip p WHERE p.cpf = :cpf AND p.month = :month AND p.year = :year")
    boolean existsByCpfAndMonthAndYearCustom(@Param("cpf") String cpf, @Param("month") Integer month, @Param("year") Integer year);
    
    // NOVO: Verificação de duplicidade com CNPJ da empresa
    @Query("SELECT COUNT(p) > 0 FROM Payslip p WHERE " +
           "(:companyCnpj IS NULL OR p.companyCnpj = :companyCnpj) AND " +
           "p.cpf = :cpf AND p.month = :month AND p.year = :year")
    boolean existsByCompanyCnpjAndCpfAndMonthAndYear(
        @Param("companyCnpj") String companyCnpj, 
        @Param("cpf") String cpf, 
        @Param("month") Integer month, 
        @Param("year") Integer year
    );
    
    List<Payslip> findAllByCpf(String cpf);
    Payslip findByFileName(String fileName);
    
    @Query("SELECT p FROM Payslip p WHERE p.month = :month AND p.year = :year")
    List<Payslip> findByMonthAndYear(@Param("month") Integer month, @Param("year") Integer year);

    @Query("SELECT p FROM Payslip p WHERE p.cpf = :cpf AND p.month = :month AND p.year = :year ORDER BY p.processedAt DESC")
    Payslip findFirstByCpfAndMonthAndYear(@Param("cpf") String cpf, @Param("month") Integer month, @Param("year") Integer year);
} 