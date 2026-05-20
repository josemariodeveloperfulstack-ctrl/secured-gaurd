-- V1020: Papel GESTAO_SUPERVISAO (Gestor de Supervisão) — módulo operacional completo; authority Spring: ROLE_GESTAO_SUPERVISAO
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'GESTAO_SUPERVISAO') THEN
        INSERT INTO roles (id, name, description)
        VALUES (
            gen_random_uuid(),
            'GESTAO_SUPERVISAO',
            'Gestor de Supervisão — acesso ao módulo operacional (visitas, postos, relatórios de atividade, equipes)'
        );
    END IF;
END $$;
