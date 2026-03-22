INSERT INTO products (name, description, price, category, image_url, video_url, stock_cargado, stock_disponible)
VALUES
('Mesa industrial de roble', 'Mesa de comedor con tapa de roble macizo y estructura metálica negra.', 385000, 'Mesas', 'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?auto=format&fit=crop&w=1200&q=80', NULL, 10, 7),
('Silla escandinava madera', 'Silla ergonómica con asiento tapizado y patas de madera natural.', 98000, 'Sillas', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80', NULL, 24, 18),
('Placard corredizo premium', 'Placard de tres puertas con interiores modulares y sistema soft-close.', 720000, 'Placares', 'https://images.unsplash.com/photo-1615874959474-d609969a20ed?auto=format&fit=crop&w=1200&q=80', NULL, 3, 2),
('Mueble de cocina lineal', 'Cocina moderna en melamina texturada, con herrajes de cierre suave.', 1250000, 'Cocinas', 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=80', NULL, 2, 1),
('Biblioteca modular a medida', 'Biblioteca de piso a techo configurable según espacio disponible.', 560000, 'A medida', 'https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?auto=format&fit=crop&w=1200&q=80', NULL, 5, 5),
('Mesa ratona minimal', 'Mesa ratona de madera para living con terminación laqueada mate.', 155000, 'Mesas', 'https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=1200&q=80', NULL, 15, 9),
('Rack TV flotante', 'Rack de TV flotante con pasacables ocultos y combinación madera-negro.', 275000, 'A medida', 'https://images.unsplash.com/photo-1616593969747-4797dc75033e?auto=format&fit=crop&w=1200&q=80', NULL, 8, 6),
('Banqueta de barra', 'Banqueta alta de madera con estructura reforzada y apoyapiés.', 86000, 'Sillas', 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=1200&q=80', NULL, 20, 12),
('Isla central de cocina', 'Isla funcional con almacenamiento interno y cubierta de madera maciza.', 910000, 'Cocinas', 'https://images.unsplash.com/photo-1600489000022-c2086d79f9d4?auto=format&fit=crop&w=1200&q=80', NULL, 1, 1),
('Mesa de trabajo taller', 'Banco robusto para taller con superficie resistente y estantes inferiores.', 420000, 'Mesas', 'https://images.unsplash.com/photo-1519710884006-7b2f7d1824c2?auto=format&fit=crop&w=1200&q=80', NULL, 4, 3),
('Vestidor abierto moderno', 'Sistema de vestidor abierto con módulos personalizables y luces LED.', 840000, 'Placares', 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80', NULL, 2, 0),
('Proyecto integral living', 'Set completo de living con mueble TV, biblioteca y mesa central.', 1480000, 'A medida', 'https://images.unsplash.com/photo-1615529162924-f860538846bc?auto=format&fit=crop&w=1200&q=80', NULL, 1, 1);

-- Admin panel (mismo usuario que migración 003).
INSERT INTO admin_users (email, password_hash) VALUES
  ('mattiuccimicaelammm@gmail.com', '$2b$10$zTt5c33B/VyJfrNbdUUniO0nG6D0pTmyaZoR2VHuUIVRx3CXJIAge')
ON DUPLICATE KEY UPDATE email = email;
