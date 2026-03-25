ALTER TABLE orders
  ADD COLUMN shipping_method VARCHAR(32) NOT NULL DEFAULT 'pickup' COMMENT 'pickup | delivery' AFTER currency_id,
  ADD COLUMN shipping_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER shipping_method;
