-- Aumentando o tamanho de colunas que podem receber dados textuais maiores durante a importação (ex: Planilha Promover)
ALTER TABLE employees ALTER COLUMN endereco_numero TYPE VARCHAR(50);
ALTER TABLE employees ALTER COLUMN titulo_eleitor TYPE VARCHAR(50);
ALTER TABLE employees ALTER COLUMN cbo TYPE VARCHAR(50);
ALTER TABLE employees ALTER COLUMN pis TYPE VARCHAR(50);
ALTER TABLE employees ALTER COLUMN sexo TYPE VARCHAR(50);
