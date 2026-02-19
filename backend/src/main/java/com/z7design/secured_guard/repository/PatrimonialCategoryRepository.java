package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.PatrimonialCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface PatrimonialCategoryRepository extends JpaRepository<PatrimonialCategory, UUID> {
}
