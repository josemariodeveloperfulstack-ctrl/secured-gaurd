package com.z7design.secured_guard.exception;

public class EquipmentExpiredException extends RuntimeException {
    public EquipmentExpiredException(String message) {
        super(message);
    }
    
    public EquipmentExpiredException(String message, Throwable cause) {
        super(message, cause);
    }
}