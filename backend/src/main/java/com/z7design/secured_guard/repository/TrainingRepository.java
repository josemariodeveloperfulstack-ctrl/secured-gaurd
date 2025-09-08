package com.z7design.secured_guard.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.z7design.secured_guard.model.Training;

@Repository
public interface TrainingRepository extends JpaRepository<Training, java.util.UUID> {
    List<Training> findByNameContainingIgnoreCase(String name);
    List<Training> findByProviderContainingIgnoreCase(String provider);
} 