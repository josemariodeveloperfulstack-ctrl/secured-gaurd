# Análise de Viabilidade – Histórico de Mudanças do Funcionário

**PRD:** Aba de Histórico de Mudanças do Funcionário  
**Data:** 2026  
**Status:** Viável – recomendado implementar

---

## 1. Conclusão executiva

**A funcionalidade é viável** e se encaixa bem no sistema atual. Já existem padrões parecidos (histórico de remanejamento, tabela `audit_logs`) e o ponto central de alteração de funcionário (`EmployeeService.update`) é único e bem delimitado. Abaixo: alinhamento com o PRD, opções de desenho, estrutura de banco sugerida e fases de implementação.

---

## 2. Alinhamento com o código atual

| PRD | Situação no projeto |
|-----|----------------------|
| **RF01 – Captura de eventos** | `EmployeeService.update()` é o único lugar que persiste alterações de funcionário (cadastro). Outros módulos (férias, ocorrências, escalas, exames) alteram entidades relacionadas e podem chamar um serviço de histórico central. |
| **RF02 – Dados do registro** | A tabela `audit_logs` já existe (migração V4) com `old_values` e `new_values` em JSONB, `user_id`, `created_at`. O modelo Java está comentado por conflito de tipo de ID (Long vs UUID); a migração usa UUID. |
| **RF03 – Aba na interface** | O perfil do funcionário é o `FuncionarioEditModal`, com abas **Cadastro**, **Dependentes** e **Relatórios**. Incluir uma 4ª aba **Histórico de Mudanças** é direto. |
| **RF04 – Filtros** | Backend pode expor `GET /api/employees/{id}/change-history` com parâmetros `dateFrom`, `dateTo`, `category`, `changedByUserId` e ordenação por data. |
| **RF05 – Exportação** | Padrão do sistema: relatórios em PDF/Excel já existem em outros módulos; dá para reutilizar abordagem para exportar o histórico. |
| **RNF01 – Imutabilidade** | Tabela de histórico append-only: sem UPDATE/DELETE na aplicação; apenas INSERT. |
| **RNF02 – Desempenho** | Gravação em lote (uma transação com vários INSERTs ou um JSON com várias mudanças) após o `save()` do funcionário; impacto < 200 ms é factível. |
| **RNF03 – Permissão** | Enum `Permission` já tem `EMPLOYEES_READ`, `AUDIT_READ`, etc. Basta criar `EMPLOYEE_HISTORY_READ` (ou `VER_HISTORICO_FUNCIONARIO`) e atribuir a RH/Admin/DP. |
| **RNF04 – Volume** | Tabela dedicada com índice em `(employee_id, changed_at)` e eventual particionamento por ano se o volume crescer. |

**Padrão existente útil:** `RemanejamentoHistorico` já implementa “quem / quando / valor antigo / valor novo” para remanejamentos. O histórico do funcionário pode seguir a mesma ideia, com uma tabela específica para facilitar filtros por categoria e por employee.

---

## 3. Opções de desenho

### Opção A – Reaproveitar `audit_logs`

- **Prós:** Tabela já existe; modelo genérico (table_name, record_id, old_values, new_values).
- **Contras:** Modelo Java comentado (conflito UUID); consultas “por funcionário” e “por categoria” ficam menos claras; teria que padronizar estrutura do JSON (ex.: categoria no payload).

### Opção B – Nova tabela `employee_change_history` (recomendada)

- **Prós:** Específica para funcionário; colunas explícitas (categoria, campo, valor_antigo, valor_novo, usuario_id, data); consultas e índices simples; fácil de estender (ex.: motivo, IP).
- **Contras:** Mais uma tabela e uma migração.

**Recomendação:** Opção B – tabela dedicada `employee_change_history`, e um serviço `EmployeeChangeHistoryService` que pode ser chamado de `EmployeeService`, e no futuro de Férias, Ocorrências, Exames, Escalas, etc.

---

## 4. Estrutura sugerida do banco de dados

```sql
-- Migração: V4XX__create_employee_change_history.sql

CREATE TABLE IF NOT EXISTS employee_change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo'),
    changed_by_user_id UUID,
    category VARCHAR(50) NOT NULL,  -- CARGO, SETOR, SALARIO, HORARIO, ESCALA, BENEFICIOS, EXAME_ASO, OCORRENCIA, FERIAS, OUTROS
    field_name VARCHAR(100) NOT NULL,
    field_label VARCHAR(200),       -- Nome amigável para exibição (ex: "Cargo", "Salário")
    old_value TEXT,
    new_value TEXT,
    reason TEXT,                    -- Opcional: motivo da alteração
    CONSTRAINT fk_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    CONSTRAINT fk_user FOREIGN KEY (changed_by_user_id) REFERENCES users(id)
);

CREATE INDEX idx_employee_change_history_employee_id ON employee_change_history(employee_id);
CREATE INDEX idx_employee_change_history_changed_at ON employee_change_history(changed_at DESC);
CREATE INDEX idx_employee_change_history_category ON employee_change_history(employee_id, category);
CREATE INDEX idx_employee_change_history_changed_by ON employee_change_history(changed_by_user_id);

COMMENT ON TABLE employee_change_history IS 'Histórico de alterações de dados do funcionário para auditoria e conformidade (LGPD/PRD). Append-only.';
```

**Categorias sugeridas (enum ou domínio):**  
CARGO, SETOR, REMANEJAMENTO, SALARIO, HORARIO, ESCALA, BENEFICIOS, EXAME_ASO, OCORRENCIA, FERIAS, STATUS, DADOS_CADASTRAIS, OUTROS.

---

## 5. Onde registrar mudanças (escopo do PRD)

| Módulo / Campo | Onde gravar no backend |
|----------------|-------------------------|
| Cargo, Setor, Departamento, Unidade, Empresa, Posto | `EmployeeService.update()` – comparar DTO com entidade antes do `save()` e, para cada campo alterado, chamar `EmployeeChangeHistoryService.record(employeeId, category, fieldName, oldVal, newVal, userId)`. |
| Salário, benefícios (dados no employee) | Idem em `EmployeeService.update()`. |
| Horário / escala | Ao salvar/alterar `Schedule` ou entidade de escala vinculada ao funcionário, chamar o mesmo serviço de histórico. |
| Exames ASO / validade | Ao criar/atualizar exame médico do funcionário (módulo SST), registrar categoria EXAME_ASO. |
| Ocorrências | Ao criar/alterar ocorrência do funcionário, registrar categoria OCORRENCIA (resumo ou link para o registro). |
| Férias | Ao criar/alterar férias, registrar categoria FERIAS. |
| Remanejamentos | Já existe `RemanejamentoHistorico`; pode manter como está ou também inserir uma linha em `employee_change_history` com categoria REMANEJAMENTO para unificar a visão na aba. |

---

## 6. Backend – pontos principais

1. **Migração**  
   - Criar `V4XX__create_employee_change_history.sql` com a tabela e índices acima.

2. **Entidade e repositório**  
   - `EmployeeChangeHistory` (JPA) e `EmployeeChangeHistoryRepository` com métodos por `employeeId`, com filtros de data, categoria e `changedByUserId`, ordenação por `changed_at DESC`, e suporte a paginação (ex.: `Page<EmployeeChangeHistory>`).

3. **Serviço**  
   - `EmployeeChangeHistoryService`:  
     - `record(employeeId, category, fieldName, fieldLabel, oldValue, newValue, userId)` (e opcionalmente reason).  
     - `findByEmployee(employeeId, pageable, dateFrom, dateTo, category, changedByUserId)` para a API.

4. **Integração em `EmployeeService.update()`**  
   - Obter o usuário atual (SecurityContext).  
   - Antes do `employeeRepository.save(existingEmployee)`, comparar `existingEmployee` com os valores do DTO (nome, CPF, cargo, setor, salário, unidade, empresa, departamento, exame médico, etc.).  
   - Para cada campo alterado, chamar `employeeChangeHistoryService.record(...)` na mesma transação (ou logo após o save, em mesma transação), com categoria adequada.

5. **API**  
   - `GET /api/employees/{id}/change-history`  
     - Parâmetros: `page`, `size`, `dateFrom`, `dateTo`, `category`, `changedByUserId`.  
     - Resposta paginada (ex.: 20 itens por página).  
     - Permissão: `EMPLOYEE_HISTORY_READ` (ou `VER_HISTORICO_FUNCIONARIO`).

6. **Permissão**  
   - Adicionar `EMPLOYEE_HISTORY_READ` em `Permission.java`.  
   - Atribuir a RH, Admin, DP (e quem mais fizer sentido) em `UserGroupService` / `PermissionService`.  
   - No controller do histórico, usar `@PreAuthorize("hasAuthority('EMPLOYEE_HISTORY_READ')")` (ou equivalente).

7. **Exportação**  
   - Endpoint `GET /api/employees/{id}/change-history/export?format=csv|pdf&dateFrom=...&dateTo=...` usando os mesmos filtros da listagem.

---

## 7. Frontend – pontos principais

1. **Aba no perfil do funcionário**  
   - Em `FuncionarioEditModal.tsx`, alterar de 3 para 4 abas: Cadastro, Dependentes, **Histórico de Mudanças**, Relatórios.  
   - A aba “Histórico de Mudanças” só é renderizada se o usuário tiver `EMPLOYEE_HISTORY_READ` (ou a permissão que você nomear).

2. **Conteúdo da aba**  
   - Tabela ou timeline com: Data/Hora, Categoria, Campo, Valor antigo, Valor novo, Alterado por.  
   - Filtros: período (data início/fim), categoria, usuário responsável.  
   - Ordenação: mais recente primeiro.  
   - Paginação (ex.: 20 por página) ou “carregar mais”.

3. **Exportação**  
   - Botão “Exportar” que chama o endpoint de export (CSV ou PDF) com os filtros atuais.

---

## 8. Tarefas sugeridas (backlog / Jira)

- **Fase 1 – Fundação**  
  - [ ] Criar migração `employee_change_history`.  
  - [ ] Criar entidade `EmployeeChangeHistory`, repositório e `EmployeeChangeHistoryService.record()`.  
  - [ ] Adicionar permissão `EMPLOYEE_HISTORY_READ` e atribuir a RH/Admin/DP.

- **Fase 2 – Cadastro do funcionário**  
  - [ ] Integrar gravação de histórico em `EmployeeService.update()` para os campos do escopo (cargo, setor, salário, empresa, unidade, departamento, dados de exame, etc.).  
  - [ ] Implementar `GET /api/employees/{id}/change-history` com filtros e paginação.

- **Fase 3 – UI**  
  - [ ] Adicionar aba “Histórico de Mudanças” no `FuncionarioEditModal` (condicionada à permissão).  
  - [ ] Listagem com filtros e paginação.  
  - [ ] Botão de exportar (CSV/PDF).

- **Fase 4 – Outros módulos (opcional)**  
  - [ ] Registrar mudanças em Férias, Ocorrências, Exames (ASO), Escalas ao alterar dados do funcionário ou entidades ligadas a ele.

---

## 9. Riscos e mitigações

| Risco | Mitigação |
|-------|------------|
| Atraso na transação de update | Gravar histórico na mesma transação, em batch (uma chamada que insere N linhas), e manter lógica de comparação enxuta. |
| Volume alto de linhas | Índices em `(employee_id, changed_at)`; no futuro, particionar por ano se necessário. |
| Dados sensíveis (ex.: saúde) na tela de histórico | RNF03: controlar por perfil (ex.: mascarar ou mostrar apenas para quem tem permissão de saúde ocupacional). |

---

## 10. Próximos passos

1. Validar esta análise com o time (produto/tech).  
2. Definir se usa `EMPLOYEE_HISTORY_READ` ou nome `VER_HISTORICO_FUNCIONARIO` e manter consistente no backend e frontend.  
3. Priorizar Fases 1–3 para entrega da aba e auditoria do cadastro; Fase 4 pode ser incremental por módulo.

Se quiser, o próximo passo pode ser: (a) desenhar a estrutura exata do banco (incluindo enums de categoria) ou (b) quebrar as fases em tarefas de Jira/Trello com critérios de aceite por história.
