-- V458__cleanup_duplicates_and_restore_constraints.sql
-- Objetivo: Remover duplicatas físicas (mesmo ID) introduzidas por falhas de integridade e restaurar Primary Keys.
-- Esta migração foca nas tabelas de RH e Cadastro Base.

-- 1. Limpeza de Duplicatas (Mantém apenas a linha física mais antiga/primeira inserida para cada ID)

-- Employees
DELETE FROM public.employees WHERE ctid NOT IN (
    SELECT MIN(ctid) FROM public.employees GROUP BY id
);

-- Companies
DELETE FROM public.companies WHERE ctid NOT IN (
    SELECT MIN(ctid) FROM public.companies GROUP BY id
);

-- Work Posts (Postos de Trabalho)
DELETE FROM public.work_posts WHERE ctid NOT IN (
    SELECT MIN(ctid) FROM public.work_posts GROUP BY id
);

-- Positions (Cargos)
DELETE FROM public.positions WHERE ctid NOT IN (
    SELECT MIN(ctid) FROM public.positions GROUP BY id
);

-- Units (Unidades)
DELETE FROM public.units WHERE ctid NOT IN (
    SELECT MIN(ctid) FROM public.units GROUP BY id
);

-- Departments (Departamentos)
DELETE FROM public.departments WHERE ctid NOT IN (
    SELECT MIN(ctid) FROM public.departments GROUP BY id
);

-- Clients
DELETE FROM public.clients WHERE ctid NOT IN (
    SELECT MIN(ctid) FROM public.clients GROUP BY id
);

-- 2. Garantir Restauración de Constraints de PRIMARY KEY
-- (V142 removeu todas as FKs e PKs, algumas podem não ter sido restauradas corretamente no CI)

DO $$
BEGIN
    -- Employees
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.employees'::regclass AND contype = 'p') THEN
        ALTER TABLE public.employees ADD PRIMARY KEY (id);
    END IF;

    -- Companies
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.companies'::regclass AND contype = 'p') THEN
        ALTER TABLE public.companies ADD PRIMARY KEY (id);
    END IF;

    -- Work Posts
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.work_posts'::regclass AND contype = 'p') THEN
        ALTER TABLE public.work_posts ADD PRIMARY KEY (id);
    END IF;

    -- Positions
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.positions'::regclass AND contype = 'p') THEN
        ALTER TABLE public.positions ADD PRIMARY KEY (id);
    END IF;

    -- Units
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.units'::regclass AND contype = 'p') THEN
        ALTER TABLE public.units ADD PRIMARY KEY (id);
    END IF;

    -- Departments
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.departments'::regclass AND contype = 'p') THEN
        ALTER TABLE public.departments ADD PRIMARY KEY (id);
    END IF;

    -- Clients
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.clients'::regclass AND contype = 'p') THEN
        ALTER TABLE public.clients ADD PRIMARY KEY (id);
    END IF;

END $$;
