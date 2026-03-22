CREATE TABLE IF NOT EXISTS admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_admin_users_email (email)
);

-- Contraseña por defecto: admin1234 (cambiala en producción)
INSERT INTO admin_users (email, password_hash) VALUES
  ('admin@carpinteria.com', '$2b$10$dSHKvF4fYYyRmqd1zAbSJOG1.uIa0sMaXLTmdKHLT/MwGEB9uL7Ii')
ON DUPLICATE KEY UPDATE email = email;
