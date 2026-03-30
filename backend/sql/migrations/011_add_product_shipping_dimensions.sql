ALTER TABLE products
  ADD COLUMN shipping_weight_g INT NOT NULL DEFAULT 1000 AFTER stock_disponible,
  ADD COLUMN shipping_length_cm INT NOT NULL DEFAULT 30 AFTER shipping_weight_g,
  ADD COLUMN shipping_width_cm INT NOT NULL DEFAULT 20 AFTER shipping_length_cm,
  ADD COLUMN shipping_height_cm INT NOT NULL DEFAULT 10 AFTER shipping_width_cm;
