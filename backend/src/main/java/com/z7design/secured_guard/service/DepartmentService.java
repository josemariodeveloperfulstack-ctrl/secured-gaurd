package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.Department;
import com.z7design.secured_guard.repository.DepartmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DepartmentService {

    private final DepartmentRepository departmentRepository;

    @Cacheable(value = "departments", key = "'all'")
    public List<Department> findAll() {
        return departmentRepository.findAll();
    }

    @Cacheable(value = "departments", key = "'active'")
    public List<Department> findActive() {
        return departmentRepository.findByIsActiveTrue();
    }

    @Cacheable(value = "departments", key = "#id")
    public Department getById(UUID id) {
        return departmentRepository.findById(id).orElseThrow();
    }

    @CacheEvict(value = "departments", allEntries = true)
    public Department create(Department department) {
        return departmentRepository.save(department);
    }

    @CacheEvict(value = "departments", allEntries = true)
    public Department update(UUID id, Department updated) {
        Department existing = getById(id);
        existing.setName(updated.getName());
        existing.setDescription(updated.getDescription());
        existing.setEmailDomain(updated.getEmailDomain());
        existing.setManagerId(updated.getManagerId());
        existing.setIsActive(updated.getIsActive());
        return departmentRepository.save(existing);
    }

    @CacheEvict(value = "departments", allEntries = true)
    public void delete(UUID id) {
        departmentRepository.deleteById(id);
    }
}


