-- Layout alinhado ao cartão digital oficial (hero + segmentos 2x2 + CTAs amarelo/verde + rodapé).
-- Cores = tokens seguranca do front: black #000000, graphite #333333, lightgray #CCCCCC, darkred #990000, red #DD0000, yellow #FFCC00.
-- Imagens: {{brandLogoUrl}}, {{brandBannerUrl}}; WhatsApp: {{whatsappUrl}} (ver application.properties).

UPDATE email_templates SET
  subject = 'Olá {{nomeContato}} — Promover Vigilância Patrimonial',
  html_body = $html_welcome$
<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Promover</title><link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&display=swap" rel="stylesheet"></head>
<body style="margin:0;padding:0;background-color:#000000;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#000000;"><tr><td align="center" style="padding:16px 8px 32px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;background-color:#000000;font-family:Montserrat,'Segoe UI',Tahoma,Geneva,sans-serif;">
<tr><td align="center" style="padding:20px 16px 12px;background-color:#000000;"><img src="{{brandLogoUrl}}" alt="Promover Vigilância Patrimonial LTDA" width="280" style="display:block;max-width:92%;height:auto;border:0;"></td></tr>
<tr><td style="padding:0;line-height:0;font-size:0;background-color:#000000;"><img src="{{brandBannerUrl}}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>
<tr><td align="center" style="padding:24px 20px 8px;background-color:#000000;"><h1 style="margin:0;font-size:22px;line-height:1.25;font-weight:800;color:#ffffff;text-transform:none;">Segurança Patrimonial de <span style="color:#FFCC00;">Alta Performance</span></h1></td></tr>
<tr><td align="center" style="padding:0 20px 20px;background-color:#000000;"><p style="margin:12px 0 0;font-size:14px;line-height:1.55;color:#CCCCCC;">Olá {{nomeContato}} — mensagem para <strong style="color:#ffffff;">{{nomeEmpresa}}</strong>. Atendimento especializado com agilidade e máxima proteção para a sua operação.</p></td></tr>
<tr><td style="padding:0 20px 24px;background-color:#000000;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td align="center" style="border-radius:10px;background-color:#DD0000;"><a href="{{ctaUrl}}" style="display:block;padding:16px 20px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;text-align:center;">&#128172; Falar com Especialista</a></td></tr></table></td></tr>
<tr><td align="center" style="padding:8px 20px 6px;background-color:#000000;"><p style="margin:0;font-size:17px;font-weight:700;color:#ffffff;">Nossos Segmentos</p><table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin-top:10px;"><tr><td style="width:56px;height:4px;background-color:#DD0000;font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>
<tr><td style="padding:8px 16px 8px;background-color:#000000;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr>
<td width="50%" style="padding:6px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="border:1px solid #555555;background-color:#333333;padding:18px 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;color:#ffffff;">VIGILÂNCIA</td></tr></table></td>
<td width="50%" style="padding:6px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="border:1px solid #555555;background-color:#333333;padding:18px 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;color:#ffffff;">PORTARIA</td></tr></table></td>
</tr><tr>
<td width="50%" style="padding:6px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="border:1px solid #555555;background-color:#333333;padding:18px 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;color:#ffffff;">ACESSO</td></tr></table></td>
<td width="50%" style="padding:6px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="border:1px solid #555555;background-color:#333333;padding:18px 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;color:#ffffff;">FACILITIES</td></tr></table></td>
</tr></table></td></tr>
<tr><td style="padding:8px 20px 20px;background-color:#000000;"><p style="margin:0;font-size:15px;line-height:1.55;color:#e5e5e5;text-align:center;">É um prazer apresentar a <strong style="color:#ffffff;">Promover Vigilância Patrimonial</strong> com soluções sob medida para o segmento da <strong style="color:#FFCC00;">{{nomeEmpresa}}</strong>.</p><p style="margin:14px 0 0;font-size:14px;line-height:1.55;color:#CCCCCC;text-align:center;">Posso partilhar mais detalhes ou agendar um contacto breve quando for conveniente.</p></td></tr>
<tr><td style="padding:0 20px 10px;background-color:#000000;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td align="center" style="border-radius:10px;background-color:#FFCC00;"><a href="{{ctaUrl}}" style="display:block;padding:16px 20px;font-size:14px;font-weight:800;color:#000000;text-decoration:none;text-align:center;letter-spacing:0.04em;">&#128196; SOLICITAR APRESENTAÇÃO</a></td></tr></table></td></tr>
<tr><td style="padding:0 20px 24px;background-color:#000000;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td align="center" style="border-radius:10px;background-color:#25D366;"><a href="{{whatsappUrl}}" style="display:block;padding:16px 20px;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;text-align:center;letter-spacing:0.04em;">&#128172; FALAR NO WHATSAPP</a></td></tr></table></td></tr>
<tr><td align="center" style="padding:20px 20px 8px;background-color:#000000;border-top:1px solid #333333;"><p style="margin:0 0 8px;font-size:15px;color:#ffffff;"><span style="color:#DD0000;">&#128222;</span> (31) 2559-1245</p><p style="margin:0;font-size:15px;color:#ffffff;"><span style="color:#DD0000;">&#9993;</span> comercial@promovervigilancia.com.br</p></td></tr>
<tr><td align="center" style="padding:8px 16px 16px;background-color:#000000;"><p style="margin:0;font-size:11px;line-height:1.6;color:#CCCCCC;">© 2026 Promover Vigilância. Todos os direitos reservados.</p><p style="margin:12px 0 0;font-size:11px;"><a href="{{unsubscribeUrl}}" style="color:#FFCC00;font-weight:700;">Cancelar inscrição</a></p></td></tr>
</table></td></tr></table>
</body></html>
$html_welcome$,
  description = 'Boas-vindas — layout cartão oficial Promover (cores seguranca), hero, grelha de segmentos e CTAs.',
  updated_at = now()
WHERE code = 'welcome';

UPDATE email_templates SET
  subject = 'Condições especiais Promover para {{nomeEmpresa}}',
  html_body = $html_promo$
<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Promover</title><link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&display=swap" rel="stylesheet"></head>
<body style="margin:0;padding:0;background-color:#000000;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#000000;"><tr><td align="center" style="padding:16px 8px 32px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;background-color:#000000;font-family:Montserrat,'Segoe UI',Tahoma,Geneva,sans-serif;">
<tr><td align="center" style="padding:20px 16px 12px;background-color:#000000;"><img src="{{brandLogoUrl}}" alt="Promover Vigilância Patrimonial LTDA" width="280" style="display:block;max-width:92%;height:auto;border:0;"></td></tr>
<tr><td style="padding:0;line-height:0;font-size:0;background-color:#000000;"><img src="{{brandBannerUrl}}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>
<tr><td align="center" style="padding:24px 20px 8px;background-color:#000000;"><h1 style="margin:0;font-size:22px;line-height:1.25;font-weight:800;color:#ffffff;">Segurança Patrimonial de <span style="color:#FFCC00;">Alta Performance</span></h1></td></tr>
<tr><td align="center" style="padding:0 20px 20px;background-color:#000000;"><p style="margin:12px 0 0;font-size:14px;line-height:1.55;color:#CCCCCC;"><strong style="color:#FFCC00;">{{nomeContato}}</strong>, condições especiais para <strong style="color:#ffffff;">{{nomeEmpresa}}</strong>. Vigilância, portaria e acesso com agilidade e máxima proteção.</p></td></tr>
<tr><td style="padding:0 20px 24px;background-color:#000000;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td align="center" style="border-radius:10px;background-color:#DD0000;"><a href="{{ctaUrl}}" style="display:block;padding:16px 20px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;text-align:center;">&#128172; Ver oferta / Falar com Especialista</a></td></tr></table></td></tr>
<tr><td align="center" style="padding:8px 20px 6px;background-color:#000000;"><p style="margin:0;font-size:17px;font-weight:700;color:#ffffff;">Nossos Segmentos</p><table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin-top:10px;"><tr><td style="width:56px;height:4px;background-color:#DD0000;font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>
<tr><td style="padding:8px 16px 8px;background-color:#000000;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr>
<td width="50%" style="padding:6px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="border:1px solid #555555;background-color:#333333;padding:18px 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;color:#ffffff;">VIGILÂNCIA</td></tr></table></td>
<td width="50%" style="padding:6px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="border:1px solid #555555;background-color:#333333;padding:18px 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;color:#ffffff;">PORTARIA</td></tr></table></td>
</tr><tr>
<td width="50%" style="padding:6px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="border:1px solid #555555;background-color:#333333;padding:18px 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;color:#ffffff;">ACESSO</td></tr></table></td>
<td width="50%" style="padding:6px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="border:1px solid #555555;background-color:#333333;padding:18px 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;color:#ffffff;">FACILITIES</td></tr></table></td>
</tr></table></td></tr>
<tr><td style="padding:8px 20px 20px;background-color:#000000;"><p style="margin:0;font-size:15px;line-height:1.55;color:#e5e5e5;text-align:center;">Clique no botão vermelho para abrir a página da oferta ou utilize os atalhos abaixo.</p></td></tr>
<tr><td style="padding:0 20px 10px;background-color:#000000;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td align="center" style="border-radius:10px;background-color:#FFCC00;"><a href="{{ctaUrl}}" style="display:block;padding:16px 20px;font-size:14px;font-weight:800;color:#000000;text-decoration:none;text-align:center;letter-spacing:0.04em;">&#128196; SOLICITAR APRESENTAÇÃO</a></td></tr></table></td></tr>
<tr><td style="padding:0 20px 24px;background-color:#000000;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td align="center" style="border-radius:10px;background-color:#25D366;"><a href="{{whatsappUrl}}" style="display:block;padding:16px 20px;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;text-align:center;letter-spacing:0.04em;">&#128172; FALAR NO WHATSAPP</a></td></tr></table></td></tr>
<tr><td align="center" style="padding:20px 20px 8px;background-color:#000000;border-top:1px solid #333333;"><p style="margin:0 0 8px;font-size:15px;color:#ffffff;"><span style="color:#DD0000;">&#128222;</span> (31) 2559-1245</p><p style="margin:0;font-size:15px;color:#ffffff;"><span style="color:#DD0000;">&#9993;</span> comercial@promovervigilancia.com.br</p></td></tr>
<tr><td align="center" style="padding:8px 16px 16px;background-color:#000000;"><p style="margin:0;font-size:11px;line-height:1.6;color:#CCCCCC;">© 2026 Promover Vigilância. Todos os direitos reservados.</p><p style="margin:12px 0 0;font-size:11px;"><a href="{{unsubscribeUrl}}" style="color:#FFCC00;font-weight:700;">Cancelar inscrição</a></p></td></tr>
</table></td></tr></table>
</body></html>
$html_promo$,
  description = 'Promoção — mesmo cartão oficial com texto de oferta e CTA principal.',
  updated_at = now()
WHERE code = 'promotion';

UPDATE email_templates SET
  subject = '{{nomeContato}}, podemos ajudar hoje? — Promover',
  html_body = $html_follow$
<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Promover</title><link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&display=swap" rel="stylesheet"></head>
<body style="margin:0;padding:0;background-color:#000000;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#000000;"><tr><td align="center" style="padding:16px 8px 32px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;background-color:#000000;font-family:Montserrat,'Segoe UI',Tahoma,Geneva,sans-serif;">
<tr><td align="center" style="padding:20px 16px 12px;background-color:#000000;"><img src="{{brandLogoUrl}}" alt="Promover Vigilância Patrimonial LTDA" width="280" style="display:block;max-width:92%;height:auto;border:0;"></td></tr>
<tr><td style="padding:0;line-height:0;font-size:0;background-color:#000000;"><img src="{{brandBannerUrl}}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>
<tr><td align="center" style="padding:24px 20px 8px;background-color:#000000;"><h1 style="margin:0;font-size:22px;line-height:1.25;font-weight:800;color:#ffffff;">Segurança Patrimonial de <span style="color:#FFCC00;">Alta Performance</span></h1></td></tr>
<tr><td align="center" style="padding:0 20px 20px;background-color:#000000;"><p style="margin:12px 0 0;font-size:14px;line-height:1.55;color:#CCCCCC;">Olá <strong style="color:#ffffff;">{{nomeContato}}</strong> — retomamos o contacto com a <strong style="color:#FFCC00;">{{nomeEmpresa}}</strong>. Atendimento especializado com agilidade e máxima proteção.</p></td></tr>
<tr><td style="padding:0 20px 24px;background-color:#000000;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td align="center" style="border-radius:10px;background-color:#DD0000;"><a href="{{ctaUrl}}" style="display:block;padding:16px 20px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;text-align:center;">&#128172; Falar com Especialista</a></td></tr></table></td></tr>
<tr><td align="center" style="padding:8px 20px 6px;background-color:#000000;"><p style="margin:0;font-size:17px;font-weight:700;color:#ffffff;">Nossos Segmentos</p><table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin-top:10px;"><tr><td style="width:56px;height:4px;background-color:#DD0000;font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>
<tr><td style="padding:8px 16px 8px;background-color:#000000;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr>
<td width="50%" style="padding:6px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="border:1px solid #555555;background-color:#333333;padding:18px 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;color:#ffffff;">VIGILÂNCIA</td></tr></table></td>
<td width="50%" style="padding:6px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="border:1px solid #555555;background-color:#333333;padding:18px 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;color:#ffffff;">PORTARIA</td></tr></table></td>
</tr><tr>
<td width="50%" style="padding:6px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="border:1px solid #555555;background-color:#333333;padding:18px 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;color:#ffffff;">ACESSO</td></tr></table></td>
<td width="50%" style="padding:6px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="border:1px solid #555555;background-color:#333333;padding:18px 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;color:#ffffff;">FACILITIES</td></tr></table></td>
</tr></table></td></tr>
<tr><td style="padding:8px 20px 20px;background-color:#000000;"><p style="margin:0;font-size:15px;line-height:1.55;color:#e5e5e5;text-align:center;">Se precisar de esclarecimentos ou quiser agendar uma chamada breve, estamos disponíveis para a <strong style="color:#ffffff;">{{nomeEmpresa}}</strong>.</p></td></tr>
<tr><td style="padding:0 20px 10px;background-color:#000000;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td align="center" style="border-radius:10px;background-color:#FFCC00;"><a href="{{ctaUrl}}" style="display:block;padding:16px 20px;font-size:14px;font-weight:800;color:#000000;text-decoration:none;text-align:center;letter-spacing:0.04em;">&#128196; SOLICITAR APRESENTAÇÃO</a></td></tr></table></td></tr>
<tr><td style="padding:0 20px 24px;background-color:#000000;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr><td align="center" style="border-radius:10px;background-color:#25D366;"><a href="{{whatsappUrl}}" style="display:block;padding:16px 20px;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;text-align:center;letter-spacing:0.04em;">&#128172; FALAR NO WHATSAPP</a></td></tr></table></td></tr>
<tr><td align="center" style="padding:20px 20px 8px;background-color:#000000;border-top:1px solid #333333;"><p style="margin:0 0 8px;font-size:15px;color:#ffffff;"><span style="color:#DD0000;">&#128222;</span> (31) 2559-1245</p><p style="margin:0;font-size:15px;color:#ffffff;"><span style="color:#DD0000;">&#9993;</span> comercial@promovervigilancia.com.br</p></td></tr>
<tr><td align="center" style="padding:8px 16px 16px;background-color:#000000;"><p style="margin:0;font-size:11px;line-height:1.6;color:#CCCCCC;">© 2026 Promover Vigilância. Todos os direitos reservados.</p><p style="margin:12px 0 0;font-size:11px;"><a href="{{unsubscribeUrl}}" style="color:#FFCC00;font-weight:700;">Cancelar inscrição</a></p></td></tr>
</table></td></tr></table>
</body></html>
$html_follow$,
  description = 'Follow-up — cartão oficial com mensagem de retomada de contacto.',
  updated_at = now()
WHERE code = 'follow_up';
