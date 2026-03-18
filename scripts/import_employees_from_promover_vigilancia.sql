-- =============================================================================
-- IMPORTAR FUNCIONÁRIOS DOS FICHEIROS PROMOVER VIGILÂNCIA PARA A TABELA employees
-- =============================================================================
-- Execute na base de dados do secured-guard (psql ou DBeaver).
-- Pré-requisito: tabela companies com pelo menos um registo (company_id).
--
-- PASSO 1: Criar tabela de staging (formato unificado)
-- PASSO 2: Carregar os dados dos seus 5 ficheiros para esta staging
--          (alterando em cada ficheiro o nome da tabela e colunas - ver docs)
--          Para import_terceirizacao.sql (Terceirização): inclua origem = 'TERC'
--          para que os funcionários fiquem associados à empresa TERC.
-- PASSO 3: Executar o INSERT final para employees (este script)
-- =============================================================================

-- Opcional: limpar staging de uma execução anterior
-- DROP TABLE IF EXISTS staging_employees_import;

-- PASSO 1: Criar tabela de staging (e garantir coluna origem se já existir) (colunas que cobrem os 5 formatos)
CREATE TABLE IF NOT EXISTS staging_employees_import (
    nome VARCHAR(255),
    cpf VARCHAR(14),
    rg VARCHAR(50),
    pis VARCHAR(50),
    sexo VARCHAR(20),
    data_nascimento TEXT,
    data_admissao TEXT,
    data_demissao TEXT,
    mae VARCHAR(255),
    pai VARCHAR(255),
    salario NUMERIC(10,2),
    tipo_salario VARCHAR(50),
    horario TEXT,
    grau_instrucao VARCHAR(100),
    raca_cor VARCHAR(50),
    estado_civil VARCHAR(50),
    endereco VARCHAR(255),
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cep VARCHAR(20),
    cidade VARCHAR(100),
    uf VARCHAR(5),
    cargo VARCHAR(100),
    posto_trabalho VARCHAR(255),
    cbo VARCHAR(20),
    nacionalidade VARCHAR(50),
    municipio_nascimento VARCHAR(100),
    uf_nascimento VARCHAR(5),
    -- Origem/empresa: use 'TERC' para import_terceirizacao.sql (Terceirização)
    origem VARCHAR(20)
);

-- Garantir coluna origem se a tabela já existia (ex.: execução anterior)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staging_employees_import' AND column_name = 'origem') THEN
        NULL;
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'staging_employees_import') THEN
        ALTER TABLE staging_employees_import ADD COLUMN IF NOT EXISTS origem VARCHAR(20);
    END IF;
END $$;

-- =============================================================================
-- PASSO 3: Inserir na tabela employees a partir da staging
-- (Execute depois de ter dados em staging_employees_import)
-- =============================================================================
-- Converte: sexo Feminino/Masculino -> F/M; datas em texto ou número serial Excel
-- company_id: primeira empresa por nome (ajuste o SELECT se usar outra regra)
-- Evita duplicar por CPF (só insere se ainda não existir o CPF em employees)
-- =============================================================================

INSERT INTO employees (
    id,
    name,
    cpf,
    rg,
    birth_date,
    gender,
    marital_status,
    nome_mae,
    nome_pai,
    hire_date,
    termination_date,
    salario,
    tipo_salario_contratual,
    horario_trabalho,
    grau_instrucao,
    raca_cor,
    address,
    local_nascimento,
    nationality,
    registration_number,
    status,
    cbo,
    pis,
    company_id,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    NULLIF(TRIM(s.nome), ''),
    NULLIF(REGEXP_REPLACE(TRIM(s.cpf), '[^0-9]', '', 'g'), ''),
    NULLIF(TRIM(s.rg), ''),
    CASE
        WHEN s.data_nascimento ~ '^[0-9]+$' THEN ('1899-12-30'::date + (s.data_nascimento::integer)::int)::date
        WHEN s.data_nascimento IS NOT NULL AND s.data_nascimento <> '' THEN (s.data_nascimento::date)
        ELSE NULL
    END,
    CASE
        WHEN UPPER(TRIM(s.sexo)) LIKE 'F%' OR TRIM(s.sexo) = 'Feminino' THEN 'F'
        WHEN UPPER(TRIM(s.sexo)) LIKE 'M%' OR TRIM(s.sexo) = 'Masculino' THEN 'M'
        ELSE NULL
    END,
    NULLIF(TRIM(s.estado_civil), ''),
    NULLIF(TRIM(s.mae), ''),
    NULLIF(TRIM(s.pai), ''),
    CASE
        WHEN s.data_admissao ~ '^[0-9]+$' THEN ('1899-12-30'::date + (s.data_admissao::integer)::int)::date
        WHEN s.data_admissao IS NOT NULL AND s.data_admissao <> '' THEN (s.data_admissao::date)
        ELSE CURRENT_DATE
    END,
    CASE
        WHEN s.data_demissao IS NULL OR TRIM(s.data_demissao) = '' THEN NULL
        WHEN s.data_demissao ~ '^[0-9]+$' THEN ('1899-12-30'::date + (s.data_demissao::integer)::int)::date
        ELSE (s.data_demissao::date)
    END,
    s.salario,
    NULLIF(TRIM(s.tipo_salario), ''),
    NULLIF(TRIM(s.horario), ''),
    NULLIF(TRIM(s.grau_instrucao), ''),
    NULLIF(TRIM(s.raca_cor), ''),
    TRIM(
        CONCAT_WS(', ',
            NULLIF(TRIM(s.endereco), ''),
            NULLIF(TRIM(s.numero), ''),
            NULLIF(TRIM(s.complemento), ''),
            NULLIF(TRIM(s.bairro), ''),
            NULLIF(TRIM(s.cidade), ''),
            NULLIF(TRIM(s.uf), ''),
            NULLIF(TRIM(s.cep), '')
        )
    ),
    CASE WHEN s.municipio_nascimento IS NOT NULL OR s.uf_nascimento IS NOT NULL
        THEN TRIM(CONCAT_WS(' - ', NULLIF(TRIM(s.municipio_nascimento), ''), NULLIF(TRIM(s.uf_nascimento), '')))
        ELSE NULL
    END,
    NULLIF(TRIM(s.nacionalidade), ''),
    'IMP-' || (ROW_NUMBER() OVER (ORDER BY s.nome, s.cpf))::text,
    'ACTIVE',
    NULLIF(TRIM(s.cbo), ''),
    NULLIF(REGEXP_REPLACE(TRIM(s.pis), '[^0-9]', '', 'g'), ''),
    COALESCE(
        (SELECT c.id FROM companies c
         WHERE s.origem IS NOT NULL AND TRIM(s.origem) <> ''
           AND (c.name ILIKE '%' || TRIM(s.origem) || '%' OR NULLIF(c.trade_name, '') ILIKE '%' || TRIM(s.origem) || '%')
         LIMIT 1),
        (SELECT id FROM companies ORDER BY name LIMIT 1)
    ),
    NOW(),
    NOW()
FROM staging_employees_import s
WHERE NULLIF(REGEXP_REPLACE(TRIM(s.cpf), '[^0-9]', '', 'g'), '') IS NOT NULL
  AND NULLIF(TRIM(s.nome), '') IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM employees e
      WHERE REGEXP_REPLACE(TRIM(e.cpf), '[^0-9]', '', 'g') = REGEXP_REPLACE(TRIM(s.cpf), '[^0-9]', '', 'g')
  );

-- Limpar staging após importação (opcional)
-- DROP TABLE IF EXISTS staging_employees_import;
