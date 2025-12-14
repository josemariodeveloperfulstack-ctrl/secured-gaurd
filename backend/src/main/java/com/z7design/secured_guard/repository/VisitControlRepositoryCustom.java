package com.z7design.secured_guard.repository;

import com.z7design.secured_guard.model.VisitControl;
import com.z7design.secured_guard.model.enums.VisitControlStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface VisitControlRepositoryCustom {
    List<VisitControl> findByFiltersWithFetch(UUID workPostId, VisitControlStatus status, 
                                             LocalDate startDate, LocalDate endDate);
}




