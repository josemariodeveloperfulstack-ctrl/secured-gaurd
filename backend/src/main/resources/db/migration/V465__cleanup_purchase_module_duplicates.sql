-- V465__cleanup_purchase_module_duplicates.sql
-- Objetivo: Remover duplicatas físicas (mesmo ID) no módulo de compras e garantir constraints de Primary Key.
-- Tabelas afetadas: purchase_requests, purchase_request_items, purchase_quotations, products.

-- 1. Limpeza de Duplicatas (Mantém apenas a linha física mais antiga/primeira inserida para cada ID)

-- Purchase Requests
DELETE FROM public.purchase_requests WHERE ctid NOT IN (
    SELECT MIN(ctid) FROM public.purchase_requests GROUP BY id
);

-- Purchase Request Items
DELETE FROM public.purchase_request_items WHERE ctid NOT IN (
    SELECT MIN(ctid) FROM public.purchase_request_items GROUP BY id
);

-- Purchase Quotations
DELETE FROM public.purchase_quotations WHERE ctid NOT IN (
    SELECT MIN(ctid) FROM public.purchase_quotations GROUP BY id
);

-- Products (Importante pois é referenciado por itens)
DELETE FROM public.products WHERE ctid NOT IN (
    SELECT MIN(ctid) FROM public.products GROUP BY id
);

-- Suppliers
DELETE FROM public.suppliers WHERE ctid NOT IN (
    SELECT MIN(ctid) FROM public.suppliers GROUP BY id
);

-- 2. Garantir Restauración de Constraints de PRIMARY KEY

DO $$
BEGIN
    -- Suppliers
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.suppliers'::regclass AND contype = 'p') THEN
        ALTER TABLE public.suppliers ADD PRIMARY KEY (id);
    END IF;

    -- Purchase Requests
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.purchase_requests'::regclass AND contype = 'p') THEN
        ALTER TABLE public.purchase_requests ADD PRIMARY KEY (id);
    END IF;

    -- Purchase Request Items
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.purchase_request_items'::regclass AND contype = 'p') THEN
        ALTER TABLE public.purchase_request_items ADD PRIMARY KEY (id);
    END IF;

    -- Purchase Quotations
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.purchase_quotations'::regclass AND contype = 'p') THEN
        ALTER TABLE public.purchase_quotations ADD PRIMARY KEY (id);
    END IF;

    -- Products
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.products'::regclass AND contype = 'p') THEN
        ALTER TABLE public.products ADD PRIMARY KEY (id);
    END IF;

END $$;
