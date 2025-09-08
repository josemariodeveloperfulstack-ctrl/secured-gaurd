package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.ShiftChangeForm;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ShiftChangeFormRepository extends JpaRepository<ShiftChangeForm, Long> {
}
