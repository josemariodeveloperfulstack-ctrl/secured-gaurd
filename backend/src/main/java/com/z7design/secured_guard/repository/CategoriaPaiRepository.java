package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.CategoriaPai;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface CategoriaPaiRepository extends JpaRepository<CategoriaPai, UUID> {
    List<CategoriaPai> findAllByOrderByCodigoAsc();
    boolean existsByCodigo(String codigo);
}
