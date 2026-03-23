import bcrypt from 'bcryptjs'

/** Escape comillas simples para literales SQL en MySQL */
function sqlString(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "''")
}

const email = process.argv[2]
const plain = process.argv[3]

if (!email?.includes('@') || !plain) {
  console.error('Uso: npm run admin-bootstrap-sql -- "tu@email.com" "tu_contraseña"')
  console.error('Genera SQL para Railway (Query): borra admin_users e inserta un admin desde cero.')
  process.exit(1)
}

const hash = await bcrypt.hash(plain, 10)
const tail = hash.slice(7)
if (hash.length !== 60) {
  console.error('Advertencia: bcrypt debería ser 60 caracteres, len=', hash.length)
}

const emailSql = sqlString(email.trim())
const tailSql = sqlString(tail)

console.log(
  [
    '-- Pegar en Railway → MySQL → Query (ejecutar en orden).',
    '-- Luego iniciá sesión con ese email y la contraseña que pasaste al script.',
    '',
    'DELETE FROM admin_users;',
    '',
    `INSERT INTO admin_users (email, password_hash) VALUES ('${emailSql}', CONCAT(CHAR(36), '2b', CHAR(36), '10', CHAR(36), '${tailSql}'));`,
    '',
    'SELECT email, LENGTH(password_hash) AS len, LEFT(password_hash, 4) AS prefijo FROM admin_users;',
    '',
  ].join('\n'),
)
