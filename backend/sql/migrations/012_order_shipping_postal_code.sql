ALTER TABLE orders
  ADD COLUMN shipping_postal_code VARCHAR(20) NULL AFTER shipping_notes;
