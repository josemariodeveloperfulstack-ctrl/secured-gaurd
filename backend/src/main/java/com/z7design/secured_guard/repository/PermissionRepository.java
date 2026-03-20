package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.Permission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, UUID> {
    
    Optional<Permission> findByName(String name);

    /** Retorna todas as permissões com o nome dado (evita NonUniqueResultException quando há duplicados). */
    List<Permission> findAllByName(String name);
    
    boolean existsByName(String name);
    
    @Query("SELECT p FROM Permission p WHERE p.name IN :permissionNames")
    List<Permission> findByNames(@Param("permissionNames") List<String> permissionNames);
    
    @Query("SELECT p FROM Permission p ORDER BY p.name")
    List<Permission> findAllOrderByName();
} 