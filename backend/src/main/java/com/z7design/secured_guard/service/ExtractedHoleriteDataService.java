package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.ExtractedHoleriteData;
import com.z7design.secured_guard.repository.ExtractedHoleriteDataRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ExtractedHoleriteDataService {
    @Autowired
    private ExtractedHoleriteDataRepository repository;

    public ExtractedHoleriteData save(ExtractedHoleriteData data) {
        return repository.save(data);
    }
} 