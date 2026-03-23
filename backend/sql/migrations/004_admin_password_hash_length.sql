-- Si LENGTH(password_hash) da ~47, el valor se pegó truncado en MySQL.
-- Mismo hash bcrypt completo (60 caracteres) que en 003_admin_users.sql / seed.sql.
ALTER TABLE admin_users MODIFY COLUMN password_hash VARCHAR(255) NOT NULL;

UPDATE admin_users
SET password_hash = '$2b$10$zTt5c33B/VyJfrNbdUUniO0nG6D0pTmyaZoR2VHuUIVRx3CXJIAge'
WHERE LOWER(email) = LOWER('mattiuccimicaelammm@gmail.com');
