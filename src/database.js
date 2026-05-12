const Database = require('better-sqlite3')

const path = require('path')
const db = new Database(path.join(__dirname, '..', 'catraca.db'))

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
    resultado TEXT NOT NULL CHECK(resultado IN ('entrada', 'saida', 'bloqueado','teste')),
    data_hora TEXT DEFAULT (datetime('now'))
  );
`)

// Cartões de teste
const inserir = db.prepare(`
  INSERT OR IGNORE INTO cartao (uid, nome, matricula, status)
  VALUES (@uid, @nome, @matricula, @status)
`)

module.exports = db
