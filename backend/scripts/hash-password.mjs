import bcrypt from 'bcryptjs'

const plain = process.argv[2]
if (!plain) {
  console.error('Uso: npm run hash-password -- "tu_contraseña"')
  process.exit(1)
}

const hash = await bcrypt.hash(plain, 10)
if (hash.length !== 60) {
  console.error('Advertencia: bcrypt debería ser 60 caracteres, len=', hash.length)
}
console.log(hash)
console.log('Longitud:', hash.length, hash.length === 60 ? '(ok bcrypt)' : '(revisar)')

const emailPlaceholder = 'tu@email.com'
console.log(
  '\nMySQL (Railway → Query), con comillas simples:\nUPDATE admin_users SET password_hash = \'' +
    hash +
    '\' WHERE email = \'' +
    emailPlaceholder +
    '\';\n'
)

// Railway a veces corrompe los $ al pegar en "Edit row"; CHAR(36) es '$'.
const tail = hash.slice(7)
console.log(
  '\nMySQL (Railway → Query), sin pegar caracteres $ (recomendado si el panel rompe el hash):\nUPDATE admin_users SET password_hash = CONCAT(CHAR(36), \'2b\', CHAR(36), \'10\', CHAR(36), \'' +
    tail +
    '\') WHERE email = \'' +
    emailPlaceholder +
    '\';\n'
)
