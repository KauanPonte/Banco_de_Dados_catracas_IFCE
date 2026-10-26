const Database = require('better-sqlite3')

const path = require('path')
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'catraca.db')
const db = new Database(dbPath)

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


const inserir = db.prepare(`
  INSERT OR IGNORE INTO cartao (uid, nome, matricula, status)
  VALUES (@uid, @nome, @matricula, @status)
`)

try { db.exec(`ALTER TABLE cartao ADD COLUMN foto TEXT`) } catch (e) {}

// Migration: tornar uid opcional em cartao
const uidCol = db.prepare("PRAGMA table_info(cartao)").all().find(c => c.name === 'uid')
if (uidCol && uidCol.notnull === 1) {
  db.exec(`
    CREATE TABLE cartao_v2 (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      uid       TEXT    UNIQUE,
      nome      TEXT    NOT NULL,
      matricula TEXT    NOT NULL,
      status    TEXT    NOT NULL CHECK(status IN ('aprovado', 'bloqueado')),
      foto      TEXT,
      criado_em TEXT    DEFAULT (datetime('now'))
    );
    INSERT INTO cartao_v2 (id, uid, nome, matricula, status, foto, criado_em)
      SELECT id, uid, nome, matricula, status, foto, criado_em FROM cartao;
    DROP TABLE cartao;
    ALTER TABLE cartao_v2 RENAME TO cartao;
  `)
}

// Correção: a migration antiga usava SELECT * e trocou foto com criado_em
db.exec(`
  UPDATE cartao SET foto = criado_em, criado_em = foto
  WHERE foto GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9] *'
`)

// Migration: tornar uid opcional e adicionar nome/matricula em registro_acesso
const raUidCol = db.prepare("PRAGMA table_info(registro_acesso)").all().find(c => c.name === 'uid')
if (raUidCol && raUidCol.notnull === 1) {
  db.exec(`
    CREATE TABLE registro_acesso_v2 (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      uid       TEXT,
      nome      TEXT,
      matricula TEXT,
      resultado TEXT NOT NULL CHECK(resultado IN ('entrada', 'saida', 'bloqueado', 'teste')),
      data_hora TEXT DEFAULT (datetime('now'))
    );
    INSERT INTO registro_acesso_v2 (id, uid, resultado, data_hora)
      SELECT id, uid, resultado, data_hora FROM registro_acesso;
    DROP TABLE registro_acesso;
    ALTER TABLE registro_acesso_v2 RENAME TO registro_acesso;
  `)
} else {
  try { db.exec(`ALTER TABLE registro_acesso ADD COLUMN nome TEXT`) } catch(e) {}
  try { db.exec(`ALTER TABLE registro_acesso ADD COLUMN matricula TEXT`) } catch(e) {}
}

// Índices: sem eles cada leitura de cartão varria o histórico inteiro
// (que só cresce) e a busca por matrícula varria todos os alunos do SUAP
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_registro_uid       ON registro_acesso(uid, id);
  CREATE INDEX IF NOT EXISTS idx_registro_matricula ON registro_acesso(matricula, id);
  CREATE INDEX IF NOT EXISTS idx_cartao_matricula   ON cartao(matricula);
`)

module.exports = db
