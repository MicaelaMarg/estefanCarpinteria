-- Estado operativo manual (independiente del pago MP: pending/paid/failed)
ALTER TABLE orders
  ADD COLUMN fulfillment_status ENUM('pendiente', 'listo', 'enviado', 'entregado') NOT NULL DEFAULT 'pendiente';
