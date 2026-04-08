-- V1007: Add missing columns to stock_movements and create storage_shelves/stock_item_locations tables

-- 1. Add missing columns to stock_movements
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS item_location_id UUID;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS digital_signature TEXT;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS signature_date TIMESTAMP;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS signature_type VARCHAR(20);
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS requisition_url VARCHAR(500);
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS requisition_sent_type VARCHAR(20);

-- 2. Create storage_shelves table (matches StorageShelf.java entity)
CREATE TABLE IF NOT EXISTS storage_shelves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identification VARCHAR(100) NOT NULL UNIQUE,
    block VARCHAR(100),
    section VARCHAR(100),
    aisle VARCHAR(100),
    room VARCHAR(100),
    compartment_info VARCHAR(255),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create stock_item_locations table (matches StockItemLocation.java entity)
CREATE TABLE IF NOT EXISTS stock_item_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_item_id UUID NOT NULL,
    shelf_id UUID NOT NULL REFERENCES storage_shelves(id),
    floor VARCHAR(100),
    quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Add FK from stock_movements to stock_item_locations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_stock_movements_item_location'
    ) THEN
        ALTER TABLE stock_movements 
            ADD CONSTRAINT fk_stock_movements_item_location 
            FOREIGN KEY (item_location_id) REFERENCES stock_item_locations(id);
    END IF;
END $$;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_storage_shelves_active ON storage_shelves(active);
CREATE INDEX IF NOT EXISTS idx_storage_shelves_identification ON storage_shelves(identification);
CREATE INDEX IF NOT EXISTS idx_stock_item_locations_shelf ON stock_item_locations(shelf_id);
CREATE INDEX IF NOT EXISTS idx_stock_item_locations_item ON stock_item_locations(stock_item_id);
