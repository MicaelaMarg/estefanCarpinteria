-- Todo en uno: envío (006) + datos de contacto (007).
-- Usalo si todavía NO corriste la 006 (error "Unknown column shipping_cost" al ejecutar solo la 007).
-- Si ya corriste la 006, usá solo 007_order_shipping_contact.sql (o las columnas de contacto sin AFTER).

ALTER TABLE orders
  ADD COLUMN shipping_method VARCHAR(32) NOT NULL DEFAULT 'pickup' COMMENT 'pickup | delivery' AFTER currency_id,
  ADD COLUMN shipping_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER shipping_method,
  ADD COLUMN shipping_contact_name VARCHAR(180) NULL AFTER shipping_cost,
  ADD COLUMN shipping_phone VARCHAR(40) NULL AFTER shipping_contact_name,
  ADD COLUMN shipping_address TEXT NULL AFTER shipping_phone,
  ADD COLUMN shipping_notes VARCHAR(500) NULL AFTER shipping_address;
