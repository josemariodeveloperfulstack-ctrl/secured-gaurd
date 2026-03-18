-- V459__cleanup_users_and_groups_duplicates.sql
-- Objetivo: Remover duplicatas físicas (mesmo ID) na tabela de usuários e tabelas de segurança/infra.

-- 1. Limpeza de Duplicatas (Mantém apenas a linha física mais antiga/primeira inserida para cada ID)

-- Users
DELETE FROM public.users WHERE ctid NOT IN (
    SELECT MIN(ctid) FROM public.users GROUP BY id
);

-- Roles
DELETE FROM public.roles WHERE ctid NOT IN (
    SELECT MIN(ctid) FROM public.roles GROUP BY id
);

-- User Roles (Muitos-para-Muitos) - Aqui usamos composite key se existir, mas se for corrompido, melhor limpar por ID se houver
-- Se não houver ID único, podemos usar a combinação user_id e role_id
DELETE FROM public.users_roles WHERE ctid NOT IN (
    SELECT MIN(ctid) FROM public.users_roles GROUP BY user_id, role_id
);

-- Groups
DELETE FROM public.user_group WHERE ctid NOT IN (
    SELECT MIN(ctid) FROM public.user_group GROUP BY id
);

-- Group Members (User Groups)
DELETE FROM public.user_groups WHERE ctid NOT IN (
    SELECT MIN(ctid) FROM public.user_groups GROUP BY user_id, group_id
);

-- 2. Garantir Restauración de Constraints de PRIMARY KEY

DO $$
BEGIN
    -- Users
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.users'::regclass AND contype = 'p') THEN
        ALTER TABLE public.users ADD PRIMARY KEY (id);
    END IF;

    -- Roles
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.roles'::regclass AND contype = 'p') THEN
        ALTER TABLE public.roles ADD PRIMARY KEY (id);
    END IF;

    -- Groups
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.user_group'::regclass AND contype = 'p') THEN
        ALTER TABLE public.user_group ADD PRIMARY KEY (id);
    END IF;

END $$;
