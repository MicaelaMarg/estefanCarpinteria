-- Datos de contacto / dirección para envío a domicilio (ejecutar después de 006 si aplica)
ALTER TABLE orders
  ADD COLUMN shipping_contact_name VARCHAR(180) NULL AFTER shipping_cost,
  ADD COLUMN shipping_phone VARCHAR(40) NULL AFTER shipping_contact_name,
  ADD COLUMN shipping_address TEXT NULL AFTER shipping_phone,
  ADD COLUMN shipping_notes VARCHAR(500) NULL AFTER shipping_address;
