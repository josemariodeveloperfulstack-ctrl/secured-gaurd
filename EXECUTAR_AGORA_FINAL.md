# 🚨 SOLUÇÃO DEFINITIVA - RECRIAR TABELA EMPLOYEES

## ❌ Problema Real Identificado

Você deletou apenas a tabela `employees`, mas **todas as outras tabelas da migration V2 ainda existem**:
- ✅ `units` - existe
- ✅ `positions` - existe  
- ✅ `documents` - existe
- ✅ `benefits` - existe
- ❌ `employees` - foi deletada

Por isso o Flyway está tentando recriar todas as tabelas e falhando porque `units` já existe.

## ✅ Solução Completa

### PASSO 1: Executar o Script Completo no DBeaver/PgAdmin

Copie e execute TODO o conteúdo do arquivo `LIMPAR_E_RECRIAR_COMPLETO.sql`:

```sql
-- 1. Remover registros do Flyway
DELETE FROM flyway_schema_history WHERE version IN ('2', '263');

-- 2. Dropar TODAS as tabelas da V2
DROP TABLE IF EXISTS payroll_items CASCADE;
DROP TABLE IF EXISTS epis CASCADE;
DROP TABLE IF EXISTS payrolls CASCADE;
DROP TABLE IF EXISTS occurrences CASCADE;
DROP TABLE IF EXISTS scale_histories CASCADE;
DROP TABLE IF EXISTS benefits CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS positions CASCADE;
DROP TABLE IF EXISTS units CASCADE;

-- 3. Remover triggers
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
DROP TRIGGER IF EXISTS update_benefits_updated_at ON benefits;
DROP TRIGGER IF EXISTS update_scale_histories_updated_at ON scale_histories;
DROP TRIGGER IF EXISTS update_occurrences_updated_at ON occurrences;
DROP TRIGGER IF EXISTS update_payrolls_updated_at ON payrolls;
DROP TRIGGER IF EXISTS update_epis_updated_at ON epis;
DROP TRIGGER IF EXISTS update_positions_updated_at ON positions;
DROP TRIGGER IF EXISTS update_units_updated_at ON units;

-- 4. Remover função
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

### PASSO 2: Verificar se Tudo Foi Removido

Execute esta consulta para confirmar:

```sql
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('units', 'positions', 'employees', 'documents', 'benefits', 
                  'scale_histories', 'occurrences', 'payrolls', 'epis', 'payroll_items');
```

**Resultado esperado**: Nenhuma linha retornada (todas as tabelas foram removidas)

### PASSO 3: Iniciar o Backend

O backend já está compilado, basta iniciá-lo:

```powershell
java -jar backend/target/secured-guard-1.0.0.jar --spring.profiles.active=test
```

## 📋 O Que Vai Acontecer

1. ✅ Flyway não encontrará o registro da V2
2. ✅ Flyway executará a migration V2 COMPLETA
3. ✅ Todas as tabelas serão criadas do zero:
   - `units`
   - `positions`
   - `employees` (com TODAS as 70+ colunas + `company_id`)
   - `documents`
   - `benefits`
   - `scale_histories`
   - `occurrences`
   - `payrolls`
   - `epis`
   - `payroll_items`
4. ✅ Todos os índices serão criados
5. ✅ Todos os triggers serão criados
6. ✅ Backend iniciará normalmente

## 🎯 Resultado Final

A tabela `employees` será criada **COMPLETA** com:
- ✅ 70+ colunas incluindo todos os campos do Model Java
- ✅ Coluna `company_id` com foreign key para `companies(id)`
- ✅ Índices: `idx_employees_company_id`, `idx_employees_cpf`, etc.
- ✅ Trigger `update_employees_updated_at`

## ⚠️ Por Que Isso Aconteceu?

Quando você deletou apenas a tabela `employees`, as outras tabelas da V2 permaneceram. O Flyway ainda tinha o registro de que a V2 foi executada, mas ao tentar executá-la novamente (modo "out of order"), ela falhou porque tentou recriar tabelas que já existiam.

A solução é **remover TUDO** da V2 e deixar o Flyway executá-la do zero.

