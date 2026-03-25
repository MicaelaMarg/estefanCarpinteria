-- Pedidos Checkout Pro + ítems (precios snapshot desde DB al momento de la compra)
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  status ENUM('pending', 'paid', 'failed') NOT NULL DEFAULT 'pending',
  preference_id VARCHAR(64) NULL,
  payment_id VARCHAR(64) NULL,
  total_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  currency_id VARCHAR(3) NOT NULL DEFAULT 'ARS',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_orders_status (status),
  INDEX idx_orders_preference_id (preference_id),
  INDEX idx_orders_payment_id (payment_id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  title VARCHAR(180) NOT NULL,
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products (id),
  INDEX idx_order_items_order_id (order_id)
);
