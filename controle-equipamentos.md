# Plano de Implementação - Controle de Equipamentos por Tipo e Guia de Transporte

## Goal
Implementar o controle de equipamentos diferenciado por Tipo (Arma, Colete, Munição), com persistência dos dados específicos, contadores do cofre da empresa e emissão da Guia de Transporte em PDF no CNPJ 43.576.260/0001-12.

## Tasks
- [ ] Task 1: Criar migration Flyway `V471__enrich_equipments_and_movements_for_type_control.sql` → Verify: Verificar se a tabela equipments agora contém colunas `type`, `shots_quantity`, `weapon_registration`, `quantity`, `caliber` e `work_post_id`.
- [ ] Task 2: Criar Enum `EquipmentType` (ARMA, COLETE, MUNICAO) no pacote `com.z7design.secured_guard.model.enums` → Verify: Compilar o backend com sucesso.
- [ ] Task 3: Atualizar a entidade `Equipment.java`, o DTO `EquipmentDTO.java` e a classe `CreateEquipmentRequest.java` para refletir os novos campos e a relação ManyToOne com `WorkPost` → Verify: Compilação das entidades e DTOs sem erros.
- [ ] Task 4: Atualizar `EquipmentService.java` para salvar os novos campos no método de criar/atualizar e mapear no `toDTO` → Verify: Executar mvn clean compile sem erros.
- [ ] Task 5: Ajustar as consultas e estatísticas no `EquipmentService.getSummary()` para calcular quantidades no cofre (`work_post_id IS NULL` ou `status = 'EM_ESTOQUE'`) por tipo de equipamento → Verify: O endpoint `/api/equipments/summary` retorna contadores corretos.
- [ ] Task 6: Atualizar as tipagens do frontend em `src/types/equipment.ts` para mapear os novos campos e o enum de tipo → Verify: Sem erros de lint nos types de equipment.
- [ ] Task 7: Atualizar o modal do formulário `EquipmentFormModal.tsx` para permitir escolher o Tipo e alternar dinamicamente os campos obrigatórios exibidos → Verify: O formulário de cadastro esconde/mostra campos com base no Tipo selecionado.
- [ ] Task 8: Ajustar `EquipamentosTableHybrid.tsx` para exibir as colunas específicas de acordo com o Tipo de Equipamento cadastrado → Verify: Visualizar as colunas apropriadas nas linhas correspondentes.
- [ ] Task 9: Ajustar o painel do dashboard de Equipamentos no frontend para exibir as quantidades de Armas, Coletes e Munições no cofre da empresa → Verify: Contadores de estoque corretos na tela.
- [ ] Task 10: Integrar a geração e o download em PDF da Guia de Transporte com dados dinâmicos do equipamento no backend e frontend → Verify: Clicar em baixar guia e obter o arquivo PDF com CNPJ 43.576.260/0001-12.

## Done When
- O controle de equipamentos diferencia os tipos (Arma, Colete, Munição) no cadastro e na listagem.
- Os contadores de Armas, Coletes e Munições no Cofre estão precisos no dashboard.
- A Guia de Transporte é gerada e baixada com os dados persistidos e o CNPJ configurado.
