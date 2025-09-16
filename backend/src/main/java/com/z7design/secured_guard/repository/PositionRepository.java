package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.Position;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PositionRepository extends JpaRepository<Position, UUID> {
    Optional<Position> findByName(String name);
    boolean existsByName(String name);
} 