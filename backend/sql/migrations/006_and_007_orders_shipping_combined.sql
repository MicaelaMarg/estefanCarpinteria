-- ⚠️ SOLO si NUNCA corriste la 006 (no tenés shipping_method / shipping_cost en orders).
-- Si la 006 YA la ejecutaste antes, NO uses este archivo → error "Duplicate column".
-- En ese caso ejecutá únicamente: 007_order_shipping_contact.sql

ALTER TABLE orders
  ADD COLUMN shipping_method VARCHAR(32) NOT NULL DEFAULT 'pickup' COMMENT 'pickup | delivery' AFTER currency_id,
  ADD COLUMN shipping_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER shipping_method,
  ADD COLUMN shipping_contact_name VARCHAR(180) NULL AFTER shipping_cost,
  ADD COLUMN shipping_phone VARCHAR(40) NULL AFTER shipping_contact_name,
  ADD COLUMN shipping_address TEXT NULL AFTER shipping_phone,
  ADD COLUMN shipping_notes VARCHAR(500) NULL AFTER shipping_address;
