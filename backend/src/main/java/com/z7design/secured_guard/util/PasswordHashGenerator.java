package com.z7design.secured_guard.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * Utilitário para gerar hashes BCrypt de senhas
 * 
 * USO: Execute este arquivo como aplicação Java standalone
 *      para gerar hashes de senhas para inserção manual no banco
 */
public class PasswordHashGenerator {

    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        
        System.out.println("=".repeat(60));
        System.out.println("🔐 GERADOR DE HASH BCRYPT");
        System.out.println("=".repeat(60));
        System.out.println();
        
        // Senhas comuns para gerar hashes
        String[] senhas = {
            "Admin123!",
            "SuperAdmin@2025",
            "RH@2025",
            "Financeiro@2025",
            "Supervisor@2025",
            "12345678901@2025" // Exemplo de CPF@2025
        };
        
        for (String senha : senhas) {
            String hash = encoder.encode(senha);
            
            System.out.println("📝 Senha: " + senha);
            System.out.println("🔒 Hash:  " + hash);
            System.out.println("📏 Tamanho: " + hash.length() + " caracteres");
            System.out.println();
            
            // SQL para inserir no banco
            System.out.println("💾 SQL para atualizar no banco:");
            System.out.println("   UPDATE users SET password = '" + hash + "' WHERE username = 'SEU_USERNAME';");
            System.out.println("-".repeat(60));
            System.out.println();
        }
        
        // Teste de validação
        System.out.println("=".repeat(60));
        System.out.println("🧪 TESTE DE VALIDAÇÃO");
        System.out.println("=".repeat(60));
        
        String senhaOriginal = "Admin123!";
        String hash = encoder.encode(senhaOriginal);
        boolean matches = encoder.matches(senhaOriginal, hash);
        
        System.out.println("Senha original: " + senhaOriginal);
        System.out.println("Hash gerado: " + hash);
        System.out.println("Validação: " + (matches ? "✅ PASSOU" : "❌ FALHOU"));
        System.out.println();
        
        // Teste com senha diferente
        boolean matchesWrong = encoder.matches("SenhaErrada123!", hash);
        System.out.println("Teste com senha errada: " + (matchesWrong ? "❌ FALHOU (não deveria passar)" : "✅ PASSOU (bloqueou corretamente)"));
        System.out.println();
        
        System.out.println("=".repeat(60));
        System.out.println("✅ GERAÇÃO COMPLETA!");
        System.out.println("=".repeat(60));
    }
}

