-- Precio envío por Correo Argentino (editable en admin /admin/ajustes)
ALTER TABLE app_settings
  ADD COLUMN shipping_correo_argentino_price_ars DECIMAL(12,2) NOT NULL DEFAULT 10000.00
  AFTER shipping_delivery_price_ars;
