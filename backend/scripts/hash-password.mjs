import bcrypt from 'bcryptjs'

const plain = process.argv[2]
if (!plain) {
  console.error('Uso: npm run hash-password -- "tu_contraseña"')
  process.exit(1)
}

const hash = await bcrypt.hash(plain, 10)
console.log(hash)
console.log('\nMySQL (Railway → Query), ejemplo:\nUPDATE admin_users SET password_hash = \'' + hash + '\' WHERE email = \'tu@email.com\';\n')
