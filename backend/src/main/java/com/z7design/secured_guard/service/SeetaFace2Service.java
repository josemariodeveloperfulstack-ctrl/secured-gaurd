package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.EmployeeFace;
import com.z7design.secured_guard.model.FacialRecognitionLog;
import com.z7design.secured_guard.model.Supervisor;
import com.z7design.secured_guard.repository.EmployeeFaceRepository;
import com.z7design.secured_guard.repository.FacialRecognitionConfigRepository;
import com.z7design.secured_guard.repository.FacialRecognitionLogRepository;
import com.z7design.secured_guard.repository.SupervisorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class SeetaFace2Service {
    
    private final EmployeeFaceRepository employeeFaceRepository;
    private final FacialRecognitionLogRepository facialRecognitionLogRepository;
    private final FacialRecognitionConfigRepository configRepository;
    private final SupervisorRepository supervisorRepository;
    
    @Value("${seetaface2.model.path:}")
    private String modelPath;
    
    @Value("${seetaface2.enabled:false}")
    private boolean seetaFace2Enabled;
    
    // Configurações padrão
    private static final double DEFAULT_MIN_CONFIDENCE = 75.0;
    private static final double DEFAULT_MIN_FACE_QUALITY = 60.0;
    private static final int DEFAULT_MAX_FACES_PER_EMPLOYEE = 3;
    
    /**
     * Registra uma face para um funcionário
     */
    public EmployeeFace registerFace(UUID employeeId, String cpf, MultipartFile imageFile) throws Exception {
        log.info("Registrando face para funcionário: {} (CPF: {})", employeeId, cpf);
        
        // Verificar se já existe face registrada
        Optional<EmployeeFace> existingFace = employeeFaceRepository.findByCpf(cpf);
        if (existingFace.isPresent()) {
            throw new IllegalArgumentException("Face já registrada para este CPF: " + cpf);
        }
        
        // Verificar limite de faces por funcionário
        long faceCount = employeeFaceRepository.countActiveByEmployeeId(employeeId);
        int maxFaces = getConfigValue("max_faces_per_employee", DEFAULT_MAX_FACES_PER_EMPLOYEE);
        if (faceCount >= maxFaces) {
            throw new IllegalArgumentException("Limite máximo de faces por funcionário atingido: " + maxFaces);
        }
        
        try {
            // Processar imagem e extrair template facial
            byte[] faceTemplate = extractFaceTemplate(imageFile);
            double qualityScore = calculateFaceQuality(imageFile);
            
            // Verificar qualidade mínima
            double minQuality = getConfigValue("min_face_quality", DEFAULT_MIN_FACE_QUALITY);
            if (qualityScore < minQuality) {
                throw new IllegalArgumentException("Qualidade da face insuficiente: " + qualityScore + " (mínimo: " + minQuality + ")");
            }
            
            // Criar e salvar face
            EmployeeFace employeeFace = new EmployeeFace();
            employeeFace.setEmployeeId(employeeId);
            employeeFace.setCpf(cpf);
            employeeFace.setFaceTemplate(faceTemplate);
            employeeFace.setFaceEncoding(Base64.getEncoder().encodeToString(faceTemplate));
            employeeFace.setFaceQualityScore(qualityScore);
            employeeFace.setIsActive(true);
            
            EmployeeFace savedFace = employeeFaceRepository.save(employeeFace);
            
            // Log de registro
            logFacialRecognition(employeeId, cpf, FacialRecognitionLog.RecognitionType.REGISTRATION, 
                BigDecimal.valueOf(100.0), BigDecimal.valueOf(qualityScore), 
                FacialRecognitionLog.RecognitionStatus.SUCCESS, null);
            
            log.info("Face registrada com sucesso para funcionário: {} (CPF: {})", employeeId, cpf);
            return savedFace;
            
        } catch (Exception e) {
            log.error("Erro ao registrar face para funcionário: {} (CPF: {})", employeeId, cpf, e);
            
            // Log de erro
            logFacialRecognition(employeeId, cpf, FacialRecognitionLog.RecognitionType.REGISTRATION, 
                null, null, FacialRecognitionLog.RecognitionStatus.FAILED, e.getMessage());
            
            throw e;
        }
    }
    
    /**
     * Reconhece uma face e retorna o CPF correspondente
     */
    public FacialRecognitionResult recognizeFace(MultipartFile imageFile, String ipAddress, String userAgent) throws Exception {
        log.info("Iniciando reconhecimento facial");
        
        try {
            // Extrair template da face capturada
            byte[] capturedTemplate = extractFaceTemplate(imageFile);
            double qualityScore = calculateFaceQuality(imageFile);
            
            // Verificar qualidade mínima
            double minQuality = getConfigValue("min_face_quality", DEFAULT_MIN_FACE_QUALITY);
            if (qualityScore < minQuality) {
                log.warn("Qualidade da face insuficiente: {} (mínimo: {})", qualityScore, minQuality);
                
                logFacialRecognition(null, null, FacialRecognitionLog.RecognitionType.LOGIN, 
                    null, BigDecimal.valueOf(qualityScore), 
                    FacialRecognitionLog.RecognitionStatus.POOR_QUALITY, "Qualidade da face insuficiente");
                
                return FacialRecognitionResult.failed("Qualidade da face insuficiente", qualityScore);
            }
            
            // Buscar todas as faces ativas
            List<EmployeeFace> activeFaces = employeeFaceRepository.findByIsActiveTrue();
            
            if (activeFaces.isEmpty()) {
                log.warn("Nenhuma face registrada no sistema");
                
                logFacialRecognition(null, null, FacialRecognitionLog.RecognitionType.LOGIN, 
                    null, BigDecimal.valueOf(qualityScore), 
                    FacialRecognitionLog.RecognitionStatus.FACE_NOT_FOUND, "Nenhuma face registrada");
                
                return FacialRecognitionResult.failed("Nenhuma face registrada no sistema", qualityScore);
            }
            
            // Comparar com todas as faces registradas
            double bestMatch = 0.0;
            EmployeeFace bestMatchFace = null;
            
            for (EmployeeFace face : activeFaces) {
                double similarity = calculateSimilarity(capturedTemplate, face.getFaceTemplate());
                
                if (similarity > bestMatch) {
                    bestMatch = similarity;
                    bestMatchFace = face;
                }
            }
            
            // Verificar threshold de confiança
            double minConfidence = getConfigValue("min_confidence_threshold", DEFAULT_MIN_CONFIDENCE);
            
            if (bestMatch >= minConfidence && bestMatchFace != null) {
                log.info("Face reconhecida com sucesso: CPF {} (confiança: {})", bestMatchFace.getCpf(), bestMatch);
                
                // Log de sucesso
                logFacialRecognition(bestMatchFace.getEmployeeId(), bestMatchFace.getCpf(), 
                    FacialRecognitionLog.RecognitionType.LOGIN, 
                    BigDecimal.valueOf(bestMatch), BigDecimal.valueOf(qualityScore), 
                    FacialRecognitionLog.RecognitionStatus.SUCCESS, null);
                
                return FacialRecognitionResult.success(bestMatchFace.getCpf(), bestMatchFace.getEmployeeId(), bestMatch, qualityScore);
            } else {
                log.warn("Face não reconhecida (melhor match: {}, threshold: {})", bestMatch, minConfidence);
                
                // Log de falha
                logFacialRecognition(null, null, FacialRecognitionLog.RecognitionType.LOGIN, 
                    BigDecimal.valueOf(bestMatch), BigDecimal.valueOf(qualityScore), 
                    FacialRecognitionLog.RecognitionStatus.LOW_CONFIDENCE, "Confiança insuficiente");
                
                return FacialRecognitionResult.failed("Face não reconhecida", qualityScore);
            }
            
        } catch (Exception e) {
            log.error("Erro durante reconhecimento facial", e);
            
            // Log de erro
            logFacialRecognition(null, null, FacialRecognitionLog.RecognitionType.LOGIN, 
                null, null, FacialRecognitionLog.RecognitionStatus.FAILED, e.getMessage());
            
            throw e;
        }
    }
    
    /**
     * Remove uma face registrada
     */
    public void removeFace(String cpf) {
        log.info("Removendo face para CPF: {}", cpf);
        
        Optional<EmployeeFace> face = employeeFaceRepository.findByCpf(cpf);
        if (face.isPresent()) {
            face.get().setIsActive(false);
            employeeFaceRepository.save(face.get());
            log.info("Face removida com sucesso para CPF: {}", cpf);
        } else {
            log.warn("Face não encontrada para CPF: {}", cpf);
        }
    }
    
    /**
     * Lista todas as faces registradas
     */
    public List<EmployeeFace> getAllFaces() {
        return employeeFaceRepository.findByIsActiveTrue();
    }
    
    /**
     * Obtém face por CPF
     */
    public Optional<EmployeeFace> getFaceByCpf(String cpf) {
        return employeeFaceRepository.findActiveByCpf(cpf);
    }
    
    /**
     * Obtém faces por ID do funcionário
     */
    public List<EmployeeFace> getFacesByEmployeeId(UUID employeeId) {
        return employeeFaceRepository.findActiveByEmployeeId(employeeId);
    }
    
    // Métodos auxiliares
    
    private byte[] extractFaceTemplate(MultipartFile imageFile) throws IOException {
        log.debug("Extraindo template facial da imagem: {}", imageFile.getOriginalFilename());
        
        if (seetaFace2Enabled && !modelPath.isEmpty()) {
            // TODO: Implementar extração real usando SeetaFace2
            // 1. Carregar imagem
            // 2. Detectar face
            // 3. Extrair landmarks
            // 4. Gerar template
            // 5. Retornar template binário
            log.debug("Usando SeetaFace2 para extração de template");
        } else {
            log.debug("SeetaFace2 não disponível, usando implementação simulada");
        }
        
        // Por enquanto, retorna os bytes da imagem como placeholder
        return imageFile.getBytes();
    }
    
    private double calculateFaceQuality(MultipartFile imageFile) throws IOException {
        log.debug("Calculando qualidade da face da imagem: {}", imageFile.getOriginalFilename());
        
        if (seetaFace2Enabled && !modelPath.isEmpty()) {
            // TODO: Implementar cálculo real de qualidade
            // 1. Carregar imagem
            // 2. Detectar face
            // 3. Calcular qualidade baseada em:
            //    - Resolução
            //    - Iluminação
            //    - Ângulo da face
            //    - Nitidez
            log.debug("Usando SeetaFace2 para cálculo de qualidade");
        } else {
            log.debug("SeetaFace2 não disponível, usando implementação simulada");
        }
        
        // Por enquanto, retorna um valor aleatório entre 60-95
        return 60.0 + Math.random() * 35.0;
    }
    
    private double calculateSimilarity(byte[] template1, byte[] template2) {
        log.debug("Calculando similaridade entre templates");
        
        if (seetaFace2Enabled && !modelPath.isEmpty()) {
            // TODO: Implementar cálculo real de similaridade
            // 1. Carregar templates
            // 2. Calcular distância euclidiana
            // 3. Converter para score de similaridade (0-100)
            log.debug("Usando SeetaFace2 para cálculo de similaridade");
        } else {
            log.debug("SeetaFace2 não disponível, usando implementação simulada");
        }
        
        // Por enquanto, retorna um valor aleatório entre 0-100
        return Math.random() * 100.0;
    }
    
    private double getConfigValue(String key, double defaultValue) {
        return configRepository.findByConfigKey(key)
            .map(config -> Double.parseDouble(config.getConfigValue()))
            .orElse(defaultValue);
    }
    
    private int getConfigValue(String key, int defaultValue) {
        return configRepository.findByConfigKey(key)
            .map(config -> Integer.parseInt(config.getConfigValue()))
            .orElse(defaultValue);
    }
    
    private void logFacialRecognition(UUID employeeId, String cpf, FacialRecognitionLog.RecognitionType type,
                                    BigDecimal confidenceScore, BigDecimal qualityScore,
                                    FacialRecognitionLog.RecognitionStatus status, String errorMessage) {
        try {
            FacialRecognitionLog log = new FacialRecognitionLog();
            log.setEmployeeId(employeeId);
            log.setCpf(cpf);
            log.setRecognitionType(type);
            log.setConfidenceScore(confidenceScore);
            log.setFaceQualityScore(qualityScore);
            log.setRecognitionStatus(status);
            log.setErrorMessage(errorMessage);
            log.setCreatedAt(LocalDateTime.now());
            
            facialRecognitionLogRepository.save(log);
        } catch (Exception e) {
            log.error("Erro ao salvar log de reconhecimento facial", e);
        }
    }
    
    /**
     * Reconhece uma face de supervisor e retorna o CPF correspondente
     */
    public FacialRecognitionResult recognizeSupervisorFace(MultipartFile imageFile, String ipAddress, String userAgent) throws Exception {
        log.info("Iniciando reconhecimento facial de supervisor");
        
        try {
            // Extrair template da face capturada
            byte[] capturedTemplate = extractFaceTemplate(imageFile);
            double qualityScore = calculateFaceQuality(imageFile);
            
            // Verificar qualidade mínima
            double minQuality = getConfigValue("min_face_quality", DEFAULT_MIN_FACE_QUALITY);
            if (qualityScore < minQuality) {
                log.warn("Qualidade da face insuficiente: {} (mínimo: {})", qualityScore, minQuality);
                
                logFacialRecognition(null, null, FacialRecognitionLog.RecognitionType.LOGIN, 
                    null, BigDecimal.valueOf(qualityScore), 
                    FacialRecognitionLog.RecognitionStatus.POOR_QUALITY, "Qualidade da face insuficiente");
                
                return FacialRecognitionResult.failed("Qualidade da face insuficiente", qualityScore);
            }
            
            // Buscar todas as faces de supervisores ativos
            List<Supervisor> activeSupervisors = supervisorRepository.findByIsActiveTrue();
            
            if (activeSupervisors.isEmpty()) {
                log.warn("Nenhum supervisor ativo com face registrada no sistema");
                
                logFacialRecognition(null, null, FacialRecognitionLog.RecognitionType.LOGIN, 
                    null, BigDecimal.valueOf(qualityScore), 
                    FacialRecognitionLog.RecognitionStatus.FACE_NOT_FOUND, "Nenhum supervisor ativo registrado");
                
                return FacialRecognitionResult.failed("Nenhum supervisor ativo registrado no sistema", qualityScore);
            }
            
            // Comparar com todas as faces de supervisores registradas
            double bestMatch = 0.0;
            Supervisor bestMatchSupervisor = null;
            
            for (Supervisor supervisor : activeSupervisors) {
                if (supervisor.getFaceTemplate() != null && supervisor.getFaceTemplate().length > 0) {
                    double similarity = calculateSimilarity(capturedTemplate, supervisor.getFaceTemplate());
                    
                    if (similarity > bestMatch) {
                        bestMatch = similarity;
                        bestMatchSupervisor = supervisor;
                    }
                }
            }
            
            // Verificar threshold de confiança
            double minConfidence = getConfigValue("min_confidence_threshold", DEFAULT_MIN_CONFIDENCE);
            
            if (bestMatch >= minConfidence && bestMatchSupervisor != null) {
                log.info("Face de supervisor reconhecida com sucesso: CPF {} (confiança: {})", bestMatchSupervisor.getCpf(), bestMatch);
                
                // Log de sucesso
                logFacialRecognition(bestMatchSupervisor.getId(), bestMatchSupervisor.getCpf(), 
                    FacialRecognitionLog.RecognitionType.LOGIN, 
                    BigDecimal.valueOf(bestMatch), BigDecimal.valueOf(qualityScore), 
                    FacialRecognitionLog.RecognitionStatus.SUCCESS, null);
                
                return FacialRecognitionResult.success(bestMatchSupervisor.getCpf(), bestMatchSupervisor.getId(), bestMatch, qualityScore);
            } else {
                log.warn("Face de supervisor não reconhecida (melhor match: {}, threshold: {})", bestMatch, minConfidence);
                
                // Log de falha
                logFacialRecognition(null, null, FacialRecognitionLog.RecognitionType.LOGIN, 
                    BigDecimal.valueOf(bestMatch), BigDecimal.valueOf(qualityScore), 
                    FacialRecognitionLog.RecognitionStatus.LOW_CONFIDENCE, "Confiança insuficiente para supervisor");
                
                return FacialRecognitionResult.failed("Face de supervisor não reconhecida", qualityScore);
            }
            
        } catch (Exception e) {
            log.error("Erro durante reconhecimento facial de supervisor", e);
            
            logFacialRecognition(null, null, FacialRecognitionLog.RecognitionType.LOGIN, 
                null, BigDecimal.valueOf(0.0), 
                FacialRecognitionLog.RecognitionStatus.ERROR, "Erro interno: " + e.getMessage());
            
            throw e;
        }
    }
    
    // Classe de resultado
    public static class FacialRecognitionResult {
        private final boolean success;
        private final String cpf;
        private final UUID employeeId;
        private final double confidence;
        private final double quality;
        private final String errorMessage;
        
        private FacialRecognitionResult(boolean success, String cpf, UUID employeeId, 
                                      double confidence, double quality, String errorMessage) {
            this.success = success;
            this.cpf = cpf;
            this.employeeId = employeeId;
            this.confidence = confidence;
            this.quality = quality;
            this.errorMessage = errorMessage;
        }
        
        public static FacialRecognitionResult success(String cpf, UUID employeeId, double confidence, double quality) {
            return new FacialRecognitionResult(true, cpf, employeeId, confidence, quality, null);
        }
        
        public static FacialRecognitionResult failed(String errorMessage, double quality) {
            return new FacialRecognitionResult(false, null, null, 0.0, quality, errorMessage);
        }
        
        // Getters
        public boolean isSuccess() { return success; }
        public String getCpf() { return cpf; }
        public UUID getEmployeeId() { return employeeId; }
        public double getConfidence() { return confidence; }
        public double getQuality() { return quality; }
        public String getErrorMessage() { return errorMessage; }
    }
}
