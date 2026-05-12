-- Atualiza os HTMLs padrão de marketing para identidade Promover (cores amarelo/vermelho/preto).
-- Imagens servidas pelo front: /email-marketing/promover-logomarca.png e promover-autorizacao-pf.png
-- (substitua os ficheiros em frontend/public/email-marketing/ pelas artes finais da logomarca e do banner PF).
-- URLs absolutas são injetadas em runtime (app.email.marketing.assets-base-url) como {{brandLogoUrl}} e {{brandBannerUrl}}.

UPDATE email_templates SET
  subject = 'Olá {{nomeContato}} — Promover Vigilância Patrimonial',
  html_body = $welcome$
<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Promover</title></head>
<body style="margin:0;padding:0;background-color:#0b0b0b;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#0b0b0b;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;border-radius:14px;overflow:hidden;border:1px solid #333;font-family:Arial,Helvetica,sans-serif;">
<tr><td style="background:linear-gradient(135deg,#1a1a1a 0%,#2d0a0f 50%,#1a1a1a 100%);padding:22px 24px;text-align:left;border-bottom:3px solid #d4a017;">
<img src="{{brandLogoUrl}}" alt="Promover Vigilância Patrimonial LTDA" width="240" style="display:block;max-width:100%;height:auto;border:0;">
</td></tr>
<tr><td style="padding:0;line-height:0;font-size:0;">
<img src="{{brandBannerUrl}}" alt="Promover — vigilância patrimonial" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;">
</td></tr>
<tr><td style="background:#fafafa;padding:32px 28px;color:#1f2937;">
<p style="margin:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#8b1538;font-weight:700;">Mensagem comercial</p>
<h1 style="margin:0 0 18px;font-size:22px;line-height:1.25;color:#111;">Olá {{nomeContato}}, prazer em falar contigo</h1>
<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">É um prazer apresentar a <strong style="color:#111;">Promover Vigilância Patrimonial</strong> à <strong>{{nomeEmpresa}}</strong>.</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">Oferecemos soluções de segurança patrimonial para o seu segmento. Posso partilhar mais detalhes ou agendar um contacto breve quando for conveniente.</p>
<p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#111;">Com os melhores cumprimentos,<br><strong style="color:#8b1538;">Equipa comercial Promover</strong></p>
</td></tr>
<tr><td style="background:#111;padding:20px 24px;text-align:center;font-size:11px;line-height:1.6;color:#a3a3a3;">
<p style="margin:0 0 12px;">Promover Vigilância Patrimonial LTDA — envio alinhado à LGPD.</p>
<p style="margin:0;"><a href="{{unsubscribeUrl}}" style="color:#d4a017;text-decoration:underline;font-weight:600;">Cancelar inscrição</a></p>
</td></tr>
</table>
</td></tr></table>
</body></html>
$welcome$,
  description = 'Primeiro contacto com cabeçalho Promover, banner institucional e corpo em destaque.',
  updated_at = now()
WHERE code = 'welcome';

UPDATE email_templates SET
  subject = 'Condições especiais Promover para {{nomeEmpresa}}',
  html_body = $promo$
<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Promover</title></head>
<body style="margin:0;padding:0;background-color:#0b0b0b;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#0b0b0b;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;border-radius:14px;overflow:hidden;border:1px solid #333;font-family:Arial,Helvetica,sans-serif;">
<tr><td style="background:linear-gradient(135deg,#1a1a1a 0%,#2d0a0f 50%,#1a1a1a 100%);padding:22px 24px;text-align:left;border-bottom:3px solid #d4a017;">
<img src="{{brandLogoUrl}}" alt="Promover Vigilância Patrimonial LTDA" width="240" style="display:block;max-width:100%;height:auto;border:0;">
</td></tr>
<tr><td style="padding:0;line-height:0;font-size:0;">
<img src="{{brandBannerUrl}}" alt="Promover — excelência em vigilância" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;">
</td></tr>
<tr><td style="background:linear-gradient(180deg,#8b1538 0%,#6b0f2a 100%);padding:36px 28px;text-align:center;">
<p style="margin:0 0 8px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#fde68a;font-weight:700;">Oferta comercial</p>
<h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;color:#fff;">{{nomeContato}}, temos vantagens para a {{nomeEmpresa}}</h1>
<p style="margin:0;font-size:15px;line-height:1.55;color:#fde68a;">Seleção de condições especiais em serviços de vigilância e segurança patrimonial.</p>
</td></tr>
<tr><td style="background:#fafafa;padding:32px 28px;color:#1f2937;text-align:center;">
<p style="margin:0 0 20px;font-size:15px;line-height:1.6;">Clique no botão para ver a página indicada ou responda a este e-mail.</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center"><tr><td style="border-radius:8px;background:#d4a017;">
<a href="{{ctaUrl}}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#111;text-decoration:none;">Ver detalhes da oferta</a>
</td></tr></table>
</td></tr>
<tr><td style="background:#111;padding:20px 24px;text-align:center;font-size:11px;line-height:1.6;color:#a3a3a3;">
<p style="margin:0 0 12px;">Promover Vigilância Patrimonial LTDA — envio alinhado à LGPD.</p>
<p style="margin:0;"><a href="{{unsubscribeUrl}}" style="color:#d4a017;text-decoration:underline;font-weight:600;">Cancelar inscrição</a></p>
</td></tr>
</table>
</td></tr></table>
</body></html>
$promo$,
  description = 'Campanha promocional com hero Promover e CTA destacado.',
  updated_at = now()
WHERE code = 'promotion';

UPDATE email_templates SET
  subject = '{{nomeContato}}, podemos ajudar hoje? — Promover',
  html_body = $follow$
<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Promover</title></head>
<body style="margin:0;padding:0;background-color:#0b0b0b;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#0b0b0b;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;border-radius:14px;overflow:hidden;border:1px solid #333;font-family:Arial,Helvetica,sans-serif;">
<tr><td style="background:linear-gradient(135deg,#1a1a1a 0%,#2d0a0f 50%,#1a1a1a 100%);padding:22px 24px;text-align:left;border-bottom:3px solid #d4a017;">
<img src="{{brandLogoUrl}}" alt="Promover Vigilância Patrimonial LTDA" width="240" style="display:block;max-width:100%;height:auto;border:0;">
</td></tr>
<tr><td style="padding:0;line-height:0;font-size:0;">
<img src="{{brandBannerUrl}}" alt="Promover — vigilância patrimonial" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;">
</td></tr>
<tr><td style="background:#fafafa;padding:32px 28px;color:#1f2937;">
<p style="margin:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#8b1538;font-weight:700;">Follow-up</p>
<h1 style="margin:0 0 18px;font-size:22px;line-height:1.25;color:#111;">Olá {{nomeContato}},</h1>
<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">Retomamos o contacto relativamente à conversa com a <strong>{{nomeEmpresa}}</strong>.</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">Se precisar de esclarecimentos ou quiser agendar uma chamada breve, estamos disponíveis.</p>
<p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:#111;">Atenciosamente,<br><strong style="color:#8b1538;">Equipa comercial Promover</strong></p>
</td></tr>
<tr><td style="background:#111;padding:20px 24px;text-align:center;font-size:11px;line-height:1.6;color:#a3a3a3;">
<p style="margin:0 0 12px;">Promover Vigilância Patrimonial LTDA — envio alinhado à LGPD.</p>
<p style="margin:0;"><a href="{{unsubscribeUrl}}" style="color:#d4a017;text-decoration:underline;font-weight:600;">Cancelar inscrição</a></p>
</td></tr>
</table>
</td></tr></table>
</body></html>
$follow$,
  description = 'Follow-up com layout Promover e banner institucional.',
  updated_at = now()
WHERE code = 'follow_up';
