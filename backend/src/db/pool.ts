import mysql from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2'
import { env } from '../config/env.js'

export const pool = mysql.createPool({
  host: env.dbHost,
  port: env.dbPort,
  user: env.dbUser,
  password: env.dbPassword,
  database: env.dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

interface CountRow extends RowDataPacket {
  total: number
}

const productsBootstrap = [
  [
    'Mesa industrial de roble',
    'Mesa de comedor con tapa de roble macizo y estructura metalica negra.',
    385000,
    'Mesas',
    'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?auto=format&fit=crop&w=1200&q=80',
    null,
  ],
  [
    'Silla escandinava madera',
    'Silla ergonomica con asiento tapizado y patas de madera natural.',
    98000,
    'Sillas',
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
    null,
  ],
  [
    'Placard corredizo premium',
    'Placard de tres puertas con interiores modulares y sistema soft-close.',
    720000,
    'Placares',
    'https://images.unsplash.com/photo-1615874959474-d609969a20ed?auto=format&fit=crop&w=1200&q=80',
    null,
  ],
  [
    'Mueble de cocina lineal',
    'Cocina moderna en melamina texturada, con herrajes de cierre suave.',
    1250000,
    'Cocinas',
    'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=80',
    null,
  ],
]

export const initializeDatabase = async () => {
  const safeDbName = env.dbName.replace(/`/g, '``')
  const bootstrapConnection = await mysql.createConnection({
    host: env.dbHost,
    port: env.dbPort,
    user: env.dbUser,
    password: env.dbPassword,
  })

  try {
    await bootstrapConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${safeDbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    )
  } finally {
    await bootstrapConnection.end()
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(180) NOT NULL,
      description TEXT NOT NULL,
      price DECIMAL(12,2) NOT NULL,
      category VARCHAR(80) NOT NULL,
      image_url VARCHAR(500) NOT NULL,
      video_url VARCHAR(500) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  if (!env.dbAutoSeed) {
    return
  }

  const [rows] = await pool.query<CountRow[]>('SELECT COUNT(*) AS total FROM products')

  if ((rows[0]?.total ?? 0) > 0) {
    return
  }

  await pool.query(
    `INSERT INTO products (name, description, price, category, image_url, video_url)
     VALUES ?`,
    [productsBootstrap],
  )
}
