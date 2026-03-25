CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  category VARCHAR(80) NOT NULL,
  image_url VARCHAR(2048) NOT NULL,
  video_url VARCHAR(2048) NULL,
  stock_cargado INT NOT NULL DEFAULT 0,
  stock_disponible INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_admin_users_email (email)
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  status ENUM('pending', 'paid', 'failed') NOT NULL DEFAULT 'pending',
  preference_id VARCHAR(64) NULL,
  payment_id VARCHAR(64) NULL,
  total_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  currency_id VARCHAR(3) NOT NULL DEFAULT 'ARS',
  shipping_method VARCHAR(32) NOT NULL DEFAULT 'pickup',
  shipping_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  shipping_contact_name VARCHAR(180) NULL,
  shipping_phone VARCHAR(40) NULL,
  shipping_address TEXT NULL,
  shipping_notes VARCHAR(500) NULL,
  fulfillment_status ENUM('pendiente', 'listo', 'enviado', 'entregado') NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_orders_status (status),
  INDEX idx_orders_preference_id (preference_id),
  INDEX idx_orders_payment_id (payment_id)
);

CREATE TABLE IF NOT EXISTS app_settings (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY DEFAULT 1,
  shipping_delivery_price_ars DECIMAL(12,2) NOT NULL DEFAULT 8000.00,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO app_settings (id, shipping_delivery_price_ars) VALUES (1, 8000.00);

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
