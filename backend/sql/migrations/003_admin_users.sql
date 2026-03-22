CREATE TABLE IF NOT EXISTS admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_admin_users_email (email)
);

-- Usuario inicial (email del administrador; contraseña = la usada al generar este hash con npm run hash-password)
INSERT INTO admin_users (email, password_hash) VALUES
  ('mattiuccimicaelammm@gmail.com', '$2b$10$zTt5c33B/VyJfrNbdUUniO0nG6D0pTmyaZoR2VHuUIVRx3CXJIAge')
ON DUPLICATE KEY UPDATE email = VALUES(email), password_hash = VALUES(password_hash);
