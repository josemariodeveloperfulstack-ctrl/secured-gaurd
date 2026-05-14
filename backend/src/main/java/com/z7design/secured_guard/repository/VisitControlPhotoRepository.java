package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.VisitControlPhoto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface VisitControlPhotoRepository extends JpaRepository<VisitControlPhoto, UUID> {
    List<VisitControlPhoto> findByVisitControlIdOrderByTakenAtAsc(UUID visitControlId);
    long countByVisitControlId(UUID visitControlId);
}
