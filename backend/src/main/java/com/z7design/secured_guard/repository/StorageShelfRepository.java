package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.StorageShelf;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StorageShelfRepository extends JpaRepository<StorageShelf, UUID> {
    
    List<StorageShelf> findByActiveTrue();
    
    Optional<StorageShelf> findByIdentification(String identification);

    Optional<StorageShelf> findByIdentificationIgnoreCase(String identification);
    
    boolean existsByIdentification(String identification);
    
    boolean existsByIdentificationAndIdNot(String identification, UUID id);
}
