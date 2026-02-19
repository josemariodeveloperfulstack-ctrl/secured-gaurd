package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.PatrimonialLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PatrimonialLocationRepository extends JpaRepository<PatrimonialLocation, UUID> {

    Optional<PatrimonialLocation> findByCode(String code);
}
