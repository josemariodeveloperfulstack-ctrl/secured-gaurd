package com.z7design.secured_guard.security;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class LegacyCompatiblePasswordEncoderTest {

    private final LegacyCompatiblePasswordEncoder encoder = new LegacyCompatiblePasswordEncoder();

    @Test
    void matchesLegacyBcryptHash() {
        BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();
        String hash = bcrypt.encode("Password123!");
        assertTrue(encoder.matches("Password123!", hash));
        assertFalse(encoder.matches("SenhaErrada123!", hash));
    }

    @Test
    void matchesKnownSeedBcryptHash() {
        // Hash usado em insert_test_users_groups.sql — senha: Password123!
        String hash = "$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iAt6Z5EHsM8lE9lBOsl7iKTVEFDa";
        assertTrue(encoder.matches("Password123!", hash));
    }
}
