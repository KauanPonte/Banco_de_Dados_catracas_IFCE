const Database = require('better-sqlite3')

const db = new Database('./catraca.db')

// Garante integridade nas operações
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS cartao (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    uid        TEXT    NOT NULL UNIQUE,
    nome       TEXT    NOT NULL,
    matricula  TEXT    NOT NULL,
    status     TEXT    NOT NULL CHECK(status IN ('aprovado', 'bloqueado')),
    criado_em  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS registro_acesso (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    uid       TEXT NOT NULL,
    resultado TEXT NOT NULL CHECK(resultado IN ('entrada', 'bloqueado','teste')),
    data_hora TEXT DEFAULT (datetime('now'))
  );
`)

// Cartões de teste
const inserir = db.prepare(`
  INSERT OR IGNORE INTO cartao (uid, nome, matricula, status)
  VALUES (@uid, @nome, @matricula, @status)
`)

const cartoesTeste = [
  { uid: '042E8122257980', nome: 'Larissa Maria',  matricula: '2024001', status: 'aprovado'  },
  { uid: 'E5F6G7H8', nome: 'Maria Souza', matricula: '2024002', status: 'aprovado'  },
  { uid: 'X9Y0Z1W2', nome: 'Pedro Lima',  matricula: '2024003', status: 'bloqueado' },
]

for (const cartao of cartoesTeste) {
  inserir.run(cartao)
}

module.exports = db