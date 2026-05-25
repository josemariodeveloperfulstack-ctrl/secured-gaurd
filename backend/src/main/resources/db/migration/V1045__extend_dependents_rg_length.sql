-- RG com órgão/UF (ex.: "14116028622 - SSP - MG") excede VARCHAR(20) da criação inicial
ALTER TABLE dependents ALTER COLUMN rg TYPE VARCHAR(50);
