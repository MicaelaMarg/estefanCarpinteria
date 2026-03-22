ALTER TABLE products
  ADD COLUMN stock_cargado INT NOT NULL DEFAULT 0 AFTER video_url,
  ADD COLUMN stock_disponible INT NOT NULL DEFAULT 0 AFTER stock_cargado;
