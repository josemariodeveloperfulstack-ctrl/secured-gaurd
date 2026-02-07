-- Atualizar foro de São Paulo/SP para Contagem/MG nas configurações de empresa
-- Necessário para que a modal Configurações da Empresa exiba o foro correto

UPDATE company_configs
SET 
  footer_text = REPLACE(footer_text, 'São Paulo/SP', 'Contagem/MG'),
  contract_terms = REPLACE(contract_terms, 'São Paulo/SP', 'Contagem/MG')
WHERE footer_text LIKE '%São Paulo%' 
   OR contract_terms LIKE '%São Paulo%';

-- Atualizar cidade e estado apenas nos registros que tinham São Paulo/SP
UPDATE company_configs
SET city = 'Contagem', state = 'MG'
WHERE city = 'São Paulo' AND state = 'SP';
