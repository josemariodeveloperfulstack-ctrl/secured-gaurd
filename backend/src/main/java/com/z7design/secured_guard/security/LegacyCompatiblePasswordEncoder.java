package com.z7design.secured_guard.security;

import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Aceita hashes legados BCrypt ({@code $2a$...}) e novos Argon2 ({@code $argon2...}).
 * Novas senhas são sempre gravadas em Argon2.
 */
public class LegacyCompatiblePasswordEncoder implements PasswordEncoder {

    private final Argon2PasswordEncoder argon2 = new Argon2PasswordEncoder(16, 32, 1, 1 << 16, 3);
    private final BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();

    @Override
    public String encode(CharSequence rawPassword) {
        return argon2.encode(rawPassword);
    }

    @Override
    public boolean matches(CharSequence rawPassword, String encodedPassword) {
        if (encodedPassword == null || rawPassword == null) {
            return false;
        }
        if (isBcryptHash(encodedPassword)) {
            return bcrypt.matches(rawPassword, encodedPassword);
        }
        return argon2.matches(rawPassword, encodedPassword);
    }

    private static boolean isBcryptHash(String encodedPassword) {
        return encodedPassword.startsWith("$2a$")
                || encodedPassword.startsWith("$2b$")
                || encodedPassword.startsWith("$2y$");
    }
}
