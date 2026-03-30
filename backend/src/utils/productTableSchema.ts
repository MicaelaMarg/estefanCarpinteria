import type { RowDataPacket } from 'mysql2'
import { pool } from '../db/pool.js'

interface ColumnRow extends RowDataPacket {
  Field: string
}

export interface ProductTableSchema {
  columns: Set<string>
  hasCreatedAt: boolean
}

let schemaPromise: Promise<ProductTableSchema> | null = null
let loggedMissingOptionalColumns = false

export async function getProductTableSchema(): Promise<ProductTableSchema> {
  if (!schemaPromise) {
    schemaPromise = pool
      .query<ColumnRow[]>('SHOW COLUMNS FROM products')
      .then(([rows]) => {
        const columns = new Set(rows.map((row) => String(row.Field)))
        const missingOptionalColumns = ['video_url', 'stock_cargado', 'stock_disponible', 'created_at'].filter(
          (column) => !columns.has(column),
        )
        const missingShippingColumns = [
          'shipping_weight_g',
          'shipping_length_cm',
          'shipping_width_cm',
          'shipping_height_cm',
        ].filter((column) => !columns.has(column))

        if (!loggedMissingOptionalColumns && (missingOptionalColumns.length > 0 || missingShippingColumns.length > 0)) {
          loggedMissingOptionalColumns = true
          console.warn('[products] products table is missing optional columns:', [
            ...missingOptionalColumns,
            ...missingShippingColumns,
          ])
        }

        return {
          columns,
          hasCreatedAt: columns.has('created_at'),
        }
      })
      .catch((error) => {
        schemaPromise = null
        throw error
      })
  }

  return schemaPromise
}

export function buildProductSelectColumns(columns: Set<string>): string {
  const selectColumns = [
    'id',
    'name',
    'description',
    'price',
    'category',
    'image_url',
    columns.has('video_url') ? 'video_url' : 'NULL AS video_url',
    columns.has('stock_cargado') ? 'stock_cargado' : '0 AS stock_cargado',
    columns.has('stock_disponible') ? 'stock_disponible' : '0 AS stock_disponible',
    columns.has('shipping_weight_g') ? 'shipping_weight_g' : '1000 AS shipping_weight_g',
    columns.has('shipping_length_cm') ? 'shipping_length_cm' : '30 AS shipping_length_cm',
    columns.has('shipping_width_cm') ? 'shipping_width_cm' : '20 AS shipping_width_cm',
    columns.has('shipping_height_cm') ? 'shipping_height_cm' : '10 AS shipping_height_cm',
    columns.has('created_at') ? 'created_at' : 'NULL AS created_at',
  ]

  return selectColumns.join(', ')
}
