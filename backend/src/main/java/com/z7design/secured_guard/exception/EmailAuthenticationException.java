package com.z7design.secured_guard.exception;

/**
 * Credenciais IMAP/SMTP inválidas ou conta de e-mail inacessível.
 */
public class EmailAuthenticationException extends RuntimeException {

    public EmailAuthenticationException(String message) {
        super(message);
    }

    public EmailAuthenticationException(String message, Throwable cause) {
        super(message, cause);
    }
}
