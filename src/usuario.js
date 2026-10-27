// Cria um usuário ou troca a senha de um existente
// Uso: node src/usuario.js <usuario> <senha>
const db = require('./database');
const { hashSenha } = require('./auth');

const [usuario, senha] = process.argv.slice(2);

if (!usuario || !senha) {
  console.log('Uso: node src/usuario.js <usuario> <senha>');
  process.exit(1);
}

if (senha.length < 6) {
  console.log('A senha deve ter pelo menos 6 caracteres.');
  process.exit(1);
}

db.prepare(`
  INSERT INTO usuario (usuario, senha_hash) VALUES (?, ?)
  ON CONFLICT(usuario) DO UPDATE SET senha_hash = excluded.senha_hash
`).run(usuario, hashSenha(senha));

console.log(`Usuário "${usuario}" salvo.`);
