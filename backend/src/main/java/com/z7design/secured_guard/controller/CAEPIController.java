package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.dto.CAEPIResponseDTO;
import com.z7design.secured_guard.service.CAEPIService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller para consultas de CA (Certificado de Aprovação) de EPIs
 */
@RestController
@RequestMapping("/api/caepi")
@RequiredArgsConstructor
@Slf4j
public class CAEPIController {

    private final CAEPIService caepiService;

    /**
     * Busca informações de um CA específico pelo número
     * @param numero Número do CA
     * @return Informações do CA
     */
    @GetMapping("/{numero}")
    public ResponseEntity<CAEPIResponseDTO> buscarCA(@PathVariable String numero) {
        try {
            CAEPIResponseDTO ca = caepiService.buscarCA(numero);
            
            if (ca != null) {
                return ResponseEntity.ok(ca);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("Erro ao buscar CA {}: {}", numero, e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Busca múltiplos CAs por termo de busca
     * @param searchTerm Termo de busca (nome ou número)
     * @return Lista de CAs encontrados
     */
    @GetMapping("/search")
    public ResponseEntity<List<CAEPIResponseDTO>> buscarCAs(@RequestParam String searchTerm) {
        try {
            List<CAEPIResponseDTO> resultados = caepiService.buscarCAs(searchTerm);
            return ResponseEntity.ok(resultados);
        } catch (Exception e) {
            log.error("Erro ao buscar CAs com termo {}: {}", searchTerm, e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
}

