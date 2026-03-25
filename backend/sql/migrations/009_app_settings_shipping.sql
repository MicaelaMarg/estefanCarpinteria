-- Precio de envío a domicilio editable desde el panel admin (fallback: SHIPPING_DELIVERY_PRICE_ARS si falla la tabla)
CREATE TABLE IF NOT EXISTS app_settings (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY DEFAULT 1,
  shipping_delivery_price_ars DECIMAL(12,2) NOT NULL DEFAULT 8000.00,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO app_settings (id, shipping_delivery_price_ars) VALUES (1, 8000.00);
