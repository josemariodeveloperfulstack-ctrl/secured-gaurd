package com.z7design.secured_guard.controller;

import com.z7design.secured_guard.service.sendgrid.EmailUnsubscribeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Endpoints públicos (sem autenticação) usados em links enviados nos e-mails:
 * descadastro one-click e callbacks futuros.
 */
@RestController
@RequestMapping("/api/v1/public/email")
@RequiredArgsConstructor
public class PublicEmailController {

    private final EmailUnsubscribeService unsubscribeService;

    @GetMapping(value = "/unsubscribe", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> unsubscribe(
            @RequestParam("token") String token,
            @RequestParam(value = "reason", required = false) String reason) {
        boolean ok = unsubscribeService.confirmByToken(token, reason);
        String body = ok
                ? buildHtml("Descadastro confirmado",
                "Você foi removido da nossa lista de e-mails de marketing. Não receberá novas campanhas neste endereço. "
                        + "A nossa equipa comercial pode consultar esta exclusão na área Marketing → Descadastrados.")
                : buildHtml("Link inválido",
                "Não foi possível confirmar o descadastro. Verifique o link ou entre em contato.");
        return ResponseEntity.ok(body);
    }

    /**
     * Variante JSON para formulários que coletam o motivo do descadastro
     * via POST (ex.: página HTML com textarea após o clique no link).
     */
    @PostMapping(value = "/unsubscribe", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> unsubscribePost(@RequestBody Map<String, String> body) {
        String token = body.getOrDefault("token", "");
        String reason = body.get("reason");
        boolean ok = unsubscribeService.confirmByToken(token, reason);
        return ResponseEntity.ok(Map.of("ok", ok));
    }

    private String buildHtml(String title, String message) {
        return """
                <!doctype html>
                <html lang=\"pt-BR\"><head><meta charset=\"utf-8\">
                <title>%s</title>
                <style>
                  body{font-family:Arial,sans-serif;background:#0f172a;color:#f8fafc;
                       display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}
                  .card{background:#1e293b;padding:32px 40px;border-radius:12px;max-width:480px;
                        box-shadow:0 20px 40px rgba(0,0,0,.4);text-align:center;}
                  h1{margin:0 0 12px;font-size:22px;color:#fbbf24;}
                  p{margin:0;color:#e2e8f0;font-size:15px;line-height:1.5;}
                </style></head><body>
                  <div class=\"card\"><h1>%s</h1><p>%s</p></div>
                </body></html>
                """.formatted(title, title, message);
    }
}
