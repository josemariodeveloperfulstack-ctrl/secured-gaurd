# Análise: documentação e execução dos INSERTs de funcionários (3 arquivos SQL)

## Resumo

Na documentação do projeto, os INSERTs de funcionários aparecem em **três contextos** principais, ligados a **três arquivos (ou conjuntos) SQL** e a documentação que explica como executá-los.

---

## 1. Os 3 arquivos SQL envolvidos

| # | Arquivo | Função |
|---|--------|--------|
| 1 | `backend/src/main/resources/db/update_users_whatsapp_temp.sql` | Lista dos **120 funcionários** (nome, cpf, telefone, email). Cria tabela temporária `temp_funcionarios`, faz os INSERTs nela e depois **atualiza o campo `whatsapp` na tabela `users`** (não insere em `employees`). |
| 2 | `backend/src/main/resources/db/migration/export_employees_simple.sql` | **Gera** os INSERTs para a tabela `employees` a partir do que já existe no banco. Deve ser **executado no PostgreSQL**; a saída (os INSERTs) é copiada para o arquivo de seed. |
| 3 | `backend/src/main/resources/db/migration/V371__seed_all_employees.sql` | **Recebe** os INSERTs de funcionários (colados manualmente ou gerados pelo passo anterior). É uma migration Flyway: quando o Flyway roda, **executa** esses INSERTs no banco (com `ON CONFLICT (id) DO NOTHING`). |

Ou seja:

- **Arquivo 1**: fonte dos dados dos 120 funcionários (temp) + script que atualiza `users`.
- **Arquivo 2**: script que você **executa** no banco para **gerar** os INSERTs de `employees`.
- **Arquivo 3**: arquivo onde os INSERTs são **colados** e que o Flyway **executa** no deploy/ migrate.

---

## 2. Onde a documentação diz para “executar” os inserts

### 2.1 README_SEED_EMPLOYEES.md

**Local:** `backend/src/main/resources/db/migration/README_SEED_EMPLOYEES.md`

**O que diz:**

- Objetivo: atualizar a seed de **todos os funcionários** (para usar no Flyway).
- **Passo 1 – Exportar:** executar no PostgreSQL um dos scripts:
  - **Opção A:** `psql ... -f export_employees_simple.sql > employees_inserts.sql` (usa o **arquivo 2**).
  - **Opção B:** no `psql`, `\i export_employees_simple.sql` e copiar o resultado.
  - **Opção C:** `pg_dump ... -t employees --inserts` e depois editar o SQL.
- **Passo 2 – Atualizar a migration:** colar os INSERTs gerados no **V371__seed_all_employees.sql** (arquivo 3), com `ON CONFLICT (id) DO NOTHING`.
- **Passo 3 – Executar a migration:**  
  `./mvnw flyway:migrate`  
  Assim, os INSERTs são **executados** pelo Flyway quando a migration V371 roda.

Resumo: a **execução** dos inserts de funcionários, segundo essa doc, acontece **quando o Flyway aplica a V371** (arquivo 3), depois de você ter **gerado** os INSERTs com o **export_employees_simple.sql** (arquivo 2).

### 2.2 COMO_GERAR_INSERTS.md (CI)

**Local:** `backend/src/main/resources/db/migration-ci/COMO_GERAR_INSERTS.md`

**O que diz:**

- Há um script Python que conecta ao banco, **exporta** usuários, user_roles e **funcionários** e **atualiza** a migration `V999__seed_ci_essential_data.sql`.
- Ou seja, os INSERTs de funcionários para o **ambiente CI** ficam dentro do **V999** (não no V371).
- A **execução** desses inserts ocorre quando o Flyway roda no deploy CI e aplica o V999.

Aqui, o “insert” é gerado/atualizado por script e **executado** pelo Flyway via V999 (ambiente CI).

### 2.3 SEED-CI-DEPLOY.md

**Local:** `SEED-CI-DEPLOY.md` (raiz do projeto)

**O que diz:**

- O seed do CI é o arquivo **V999__seed_ci_essential_data.sql**.
- Esse arquivo é **executado automaticamente** pelo Flyway quando o backend sobe com perfil `ci`.
- Inclui dados essenciais (usuário admin, unidade, turnos, cargos, departamento, cliente, e também usuários/roles/funcionários se estiverem na V999).

Ou seja: no CI, a **execução** dos inserts (incluindo funcionários que estejam na V999) é **automática** no deploy, via Flyway.

---

## 3. Tabela resumo: onde os inserts são executados

| O quê | Onde está a instrução | Onde os INSERTs são realmente executados |
|-------|------------------------|------------------------------------------|
| Seed de funcionários (dev/geral) | README_SEED_EMPLOYEES.md | Flyway ao rodar **V371__seed_all_employees.sql** (após gerar INSERTs com export_employees_simple.sql). |
| Seed CI (usuários, roles, funcionários) | COMO_GERAR_INSERTS.md + SEED-CI-DEPLOY.md | Flyway ao rodar **V999__seed_ci_essential_data.sql** no deploy com perfil `ci`. |
| Lista dos 120 funcionários (temp + update users) | update_users_whatsapp_temp.sql | Execução **manual** (psql/DBeaver): cria `temp_funcionarios`, faz INSERTs na temp e atualiza `users`; **não** insere em `employees`. |

---

## 4. Observação sobre “3 empresas”

- A documentação acima **não** descreve um script que distribui funcionários por **três empresas** (`company_id`).
- O **update_users_whatsapp_temp.sql** (arquivo 1) só trata de `temp_funcionarios` e `users`.
- O **export_employees_simple.sql** e o **V371** trabalham com o que já existe no banco (incluindo `company_id` se existir).
- Para inserir os 120 funcionários na tabela `employees` **distribuídos pelas 3 empresas**, seria necessário um script adicional (por exemplo em `scripts/`) que:
  - use a lista do arquivo 1 (ou equivalente),
  - faça INSERT em `employees` com `company_id` definido a partir da tabela `companies` (por exemplo, as 3 primeiras empresas).

---

## 5. Conclusão

- **Os “3 arquivos SQL”** mais relacionados aos inserts de funcionários na documentação são:  
  **(1)** `update_users_whatsapp_temp.sql`, **(2)** `export_employees_simple.sql`, **(3)** `V371__seed_all_employees.sql`.
- **Onde a documentação diz que os inserts são executados:**
  - **Dev/geral:** ao rodar `./mvnw flyway:migrate` (Flyway executa o **V371**).
  - **CI:** automaticamente no deploy, quando o Flyway executa o **V999**.
  - **WhatsApp/users:** ao rodar manualmente o **update_users_whatsapp_temp.sql** (que não insere em `employees`).

Se você tiver enviado outros 3 arquivos SQL específicos, podemos analisar esses em cima dos nomes/caminhos que você indicar.
