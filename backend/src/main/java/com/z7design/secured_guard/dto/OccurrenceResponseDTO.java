package com.z7design.secured_guard.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OccurrenceResponseDTO {
    
    private UUID id;
    
    private String type;
    
    private String title;
    
    private String description;
    
    private String employeeId;
    
    private String employeeName;
    
    private String location;
    
    private String status;
    
    private String priority;
    
    private LocalDateTime date;
    
    private String responsible;
    
    private Integer warningNumber;
    
    private LocalDateTime createdAt;
    
    private LocalDateTime updatedAt;
    
    private UUID substituteId;
    
    private String substituteName;
    
    private String originalStartTime;
    
    private String originalEndTime;
    
    private String substituteStartTime;
    
    private String substituteEndTime;
    
    private Double totalHours;
    
    private String category;
}

