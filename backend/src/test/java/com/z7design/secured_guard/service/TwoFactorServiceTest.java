package com.z7design.secured_guard.service;

import com.z7design.secured_guard.model.TwoFactorCode;
import com.z7design.secured_guard.model.User;
import com.z7design.secured_guard.repository.TwoFactorCodeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TwoFactorServiceTest {

    @Mock
    private TwoFactorCodeRepository twoFactorCodeRepository;

    @InjectMocks
    private TwoFactorService twoFactorService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(UUID.randomUUID());
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
    }

    @Test
    void testGenerateCode_ShouldReturn6Digits() {
        // When
        String code = twoFactorService.generateCode();

        // Then
        assertNotNull(code);
        assertEquals(6, code.length());
        assertTrue(code.matches("\\d{6}"));
        int codeInt = Integer.parseInt(code);
        assertTrue(codeInt >= 100000 && codeInt <= 999999);
    }

    @Test
    void testCreateCode_Success() {
        // Given
        when(twoFactorCodeRepository.findByUserAndPurpose(testUser, "ACTIVATION"))
                .thenReturn(new ArrayList<>());
        when(twoFactorCodeRepository.save(any(TwoFactorCode.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // When
        TwoFactorCode result = twoFactorService.createCode(testUser, "ACTIVATION");

        // Then
        assertNotNull(result);
        assertEquals(testUser, result.getUser());
        assertEquals("ACTIVATION", result.getPurpose());
        assertEquals(6, result.getCode().length());
        assertFalse(result.isUsed());
        assertNotNull(result.getExpiryDate());
        
        verify(twoFactorCodeRepository).findByUserAndPurpose(testUser, "ACTIVATION");
        verify(twoFactorCodeRepository).save(any(TwoFactorCode.class));
    }

    @Test
    void testCreateCode_InvalidatesOldCodes() {
        // Given
        TwoFactorCode oldCode = TwoFactorCode.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .code("123456")
                .purpose("ACTIVATION")
                .expiryDate(LocalDateTime.now().plusMinutes(5))
                .used(false)
                .build();

        when(twoFactorCodeRepository.findByUserAndPurpose(testUser, "ACTIVATION"))
                .thenReturn(java.util.List.of(oldCode));
        when(twoFactorCodeRepository.save(any(TwoFactorCode.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // When
        twoFactorService.createCode(testUser, "ACTIVATION");

        // Then
        verify(twoFactorCodeRepository, times(2)).save(any(TwoFactorCode.class)); // old + new
        assertTrue(oldCode.isUsed()); // Código antigo marcado como usado
    }

    @Test
    void testValidateCode_ValidCode() {
        // Given
        TwoFactorCode validCode = TwoFactorCode.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .code("123456")
                .purpose("ACTIVATION")
                .expiryDate(LocalDateTime.now().plusMinutes(5))
                .used(false)
                .build();

        when(twoFactorCodeRepository.findByUserAndCodeAndPurposeAndUsedFalseAndExpiryDateAfter(
                eq(testUser), eq("123456"), eq("ACTIVATION"), any(LocalDateTime.class)))
                .thenReturn(Optional.of(validCode));
        when(twoFactorCodeRepository.save(any(TwoFactorCode.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // When
        boolean result = twoFactorService.validateCode(testUser, "123456", "ACTIVATION");

        // Then
        assertTrue(result);
        assertTrue(validCode.isUsed());
        verify(twoFactorCodeRepository).save(validCode);
    }

    @Test
    void testValidateCode_InvalidCode() {
        // Given
        when(twoFactorCodeRepository.findByUserAndCodeAndPurposeAndUsedFalseAndExpiryDateAfter(
                eq(testUser), eq("wrong-code"), eq("ACTIVATION"), any(LocalDateTime.class)))
                .thenReturn(Optional.empty());

        // When
        boolean result = twoFactorService.validateCode(testUser, "wrong-code", "ACTIVATION");

        // Then
        assertFalse(result);
        verify(twoFactorCodeRepository, never()).save(any());
    }

    @Test
    void testValidateCode_ExpiredCode() {
        // Given
        TwoFactorCode expiredCode = TwoFactorCode.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .code("123456")
                .purpose("ACTIVATION")
                .expiryDate(LocalDateTime.now().minusMinutes(1)) // Expirado
                .used(false)
                .build();

        // Como o código está expirado, o repository não retorna nada (query filtra por expiryDateAfter)
        when(twoFactorCodeRepository.findByUserAndCodeAndPurposeAndUsedFalseAndExpiryDateAfter(
                eq(testUser), eq("123456"), eq("ACTIVATION"), any(LocalDateTime.class)))
                .thenReturn(Optional.empty());

        // When
        boolean result = twoFactorService.validateCode(testUser, "123456", "ACTIVATION");

        // Then
        assertFalse(result);
    }

    @Test
    void testValidateCode_AlreadyUsed() {
        // Given
        TwoFactorCode usedCode = TwoFactorCode.builder()
                .id(UUID.randomUUID())
                .user(testUser)
                .code("123456")
                .purpose("ACTIVATION")
                .expiryDate(LocalDateTime.now().plusMinutes(5))
                .used(true) // Já usado
                .build();

        // Como o código está usado, o repository não retorna (query filtra por usedFalse)
        when(twoFactorCodeRepository.findByUserAndCodeAndPurposeAndUsedFalseAndExpiryDateAfter(
                eq(testUser), eq("123456"), eq("ACTIVATION"), any(LocalDateTime.class)))
                .thenReturn(Optional.empty());

        // When
        boolean result = twoFactorService.validateCode(testUser, "123456", "ACTIVATION");

        // Then
        assertFalse(result);
    }

    @Test
    void testCleanupExpiredCodes() {
        // When
        twoFactorService.cleanupExpiredCodes();

        // Then
        verify(twoFactorCodeRepository).deleteByExpiryDateBefore(any(LocalDateTime.class));
    }
}

