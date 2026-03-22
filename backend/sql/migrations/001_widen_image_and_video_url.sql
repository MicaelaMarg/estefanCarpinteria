-- Ejecutar en MySQL existente (p. ej. Railway → Query / cliente mysql) antes o después del primer deploy con admin.
ALTER TABLE products MODIFY image_url VARCHAR(2048) NOT NULL;
ALTER TABLE products MODIFY video_url VARCHAR(2048) NULL;
