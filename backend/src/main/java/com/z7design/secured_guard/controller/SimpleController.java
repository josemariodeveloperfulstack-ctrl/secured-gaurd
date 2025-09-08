package com.z7design.secured_guard.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/simple")
public class SimpleController {

    @GetMapping("/test")
    public ResponseEntity<String> test() {
        return ResponseEntity.ok("SimpleController funcionando!");
    }
} 