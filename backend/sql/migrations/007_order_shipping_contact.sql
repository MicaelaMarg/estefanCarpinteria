-- Datos de contacto / dirección para envío a domicilio.
-- Requiere que existan shipping_method y shipping_cost (migración 006).
-- Si MySQL dice "Unknown column shipping_cost": ejecutá primero 006_order_shipping.sql
--    O usá de una sola vez: 006_and_007_orders_shipping_combined.sql

ALTER TABLE orders
  ADD COLUMN shipping_contact_name VARCHAR(180) NULL AFTER shipping_cost,
  ADD COLUMN shipping_phone VARCHAR(40) NULL AFTER shipping_contact_name,
  ADD COLUMN shipping_address TEXT NULL AFTER shipping_phone,
  ADD COLUMN shipping_notes VARCHAR(500) NULL AFTER shipping_address;
