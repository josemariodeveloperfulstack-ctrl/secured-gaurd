package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.Subcategoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface SubcategoriaRepository extends JpaRepository<Subcategoria, UUID> {
    List<Subcategoria> findByCategoriaPaiIdOrderByCodigoAsc(UUID categoriaPaiId);
    List<Subcategoria> findAllByOrderByCategoriaPaiCodigoAscCodigoAsc();
    boolean existsByCodigo(String codigo);
}
