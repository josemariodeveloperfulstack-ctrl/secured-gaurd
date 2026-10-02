-- V1095: Seed de Categorias e Subcategorias do Plano de Contas para Receitas / Recebimentos de Clientes
-- Em conformidade com a Lei 6.404/76 e Normas Brasileiras de Contabilidade (NBC TG / CPCs)

INSERT INTO categoria_pai (id, nome, codigo, created_at, updated_at)
VALUES
  ('a1000001-0000-4000-8000-000000000005', 'Receitas Operacionais / Prestação de Serviços', '05', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('a1000001-0000-4000-8000-000000000006', 'Outras Receitas Operacionais', '06', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO subcategoria (id, categoria_pai_id, nome, codigo, requer_vinculo_funcionario, created_at, updated_at)
SELECT
  v.id,
  cp.id,
  v.nome,
  v.codigo,
  v.requer,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  VALUES
    ('b2000001-0000-4000-8000-000000000011'::uuid, '05', 'Receita de Serviços de Vigilância Patrimonial e Armada', '05.01', FALSE),
    ('b2000001-0000-4000-8000-000000000012'::uuid, '05', 'Receita de Serviços de Portaria, Recepção e Controle de Acesso', '05.02', FALSE),
    ('b2000001-0000-4000-8000-000000000013'::uuid, '05', 'Receita de Serviços de Facilities, Limpeza e Conservação', '05.03', FALSE),
    ('b2000001-0000-4000-8000-000000000014'::uuid, '05', 'Receita de Monitoramento Eletrônico, CFTV e Alarmes', '05.04', FALSE),
    ('b2000001-0000-4000-8000-000000000015'::uuid, '05', 'Receita de Serviços de Escolta Armada e Segurança Pessoal (VSPP)', '05.05', FALSE),
    ('b2000001-0000-4000-8000-000000000016'::uuid, '05', 'Faturamento Mensal de Contratos de Clientes (Locação de Postos)', '05.06', FALSE),
    ('b2000001-0000-4000-8000-000000000017'::uuid, '05', 'Receita de Eventos, Feiras e Plantões Operacionais', '05.07', FALSE),
    ('b2000001-0000-4000-8000-000000000018'::uuid, '05', 'Receita de Consultoria, Treinamento e Auditoria em Segurança', '05.08', FALSE),
    ('b2000001-0000-4000-8000-000000000019'::uuid, '06', 'Receitas Financeiras (Juros e Multas Recebidas)', '06.01', FALSE),
    ('b2000001-0000-4000-8000-000000000020'::uuid, '06', 'Reembolsos e Recuperações de Custos Operacionais', '06.02', FALSE),
    ('b2000001-0000-4000-8000-000000000021'::uuid, '06', 'Outras Receitas e Entradas Eventuais', '06.03', FALSE)
) AS v(id, cat_codigo, nome, codigo, requer)
JOIN categoria_pai cp ON cp.codigo = v.cat_codigo
ON CONFLICT (codigo) DO NOTHING;
