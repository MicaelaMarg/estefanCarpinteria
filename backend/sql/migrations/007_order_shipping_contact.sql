-- Datos de contacto / dirección para envío a domicilio.
-- Usá ESTE archivo si ya corriste la 006 (tenés shipping_method y shipping_cost).
-- No usa AFTER: evita errores si el orden de columnas en tu tabla es distinto.
-- Si falta la 006, el checkout igual necesita esas columnas: corré 006_order_shipping.sql primero.
--
-- NO corras 006_and_007_orders_shipping_combined.sql si la 006 ya está aplicada (error duplicado).

ALTER TABLE orders
  ADD COLUMN shipping_contact_name VARCHAR(180) NULL,
  ADD COLUMN shipping_phone VARCHAR(40) NULL,
  ADD COLUMN shipping_address TEXT NULL,
  ADD COLUMN shipping_notes VARCHAR(500) NULL;
