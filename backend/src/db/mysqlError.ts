/** Log estructurado para errores mysql2 (pool / queries). */
export function logMysqlError(context: string, error: unknown): void {
  const e = error as {
    code?: string
    errno?: number
    sqlState?: string
    sqlMessage?: string
    message?: string
  }
  console.error(`[mysql] ${context}`, {
    code: e.code,
    errno: e.errno,
    sqlState: e.sqlState,
    sqlMessage: e.sqlMessage ?? e.message,
  })
}
