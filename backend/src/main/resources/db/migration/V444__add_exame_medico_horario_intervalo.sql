-- Migration para adicionar o campo de horário do intervalo do exame médico ASO
ALTER TABLE employees ADD COLUMN exame_medico_horario_intervalo VARCHAR(100);
