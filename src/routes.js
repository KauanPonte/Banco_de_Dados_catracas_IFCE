const express = require('express')
const router  = express.Router()
const db      = require('./database')

const buscarCartao  = db.prepare(`SELECT nome, status FROM cartao WHERE uid = ?`)
const salvarAcesso  = db.prepare(`INSERT INTO registro_acesso (uid, resultado) VALUES (?, ?)`)
const listarAcessos = db.prepare(`
  SELECT uid, resultado, data_hora
  FROM registro_acesso
  ORDER BY id DESC
  LIMIT 50
`)
const listarCartoes = db.prepare(`SELECT id, uid, nome, matricula, status, criado_em FROM cartao`)
const cadastrarCartao = db.prepare(`
  INSERT INTO cartao (uid, nome, matricula, status)
  VALUES (@uid, @nome, @matricula, @status)
`)
const atualizarStatus = db.prepare(`UPDATE cartao SET status = ? WHERE uid = ?`)

// POST /acesso — chamado pelo ESP32
router.post('/acesso', (req, res) => {
  const uid = (req.body.uid || '').toUpperCase().trim()

  if (!uid) {
    return res.json({ resultado: 'bloqueado', motivo: 'UID inválido' })
  }

  const cartao = buscarCartao.get(uid)

  if (!cartao) {
    salvarAcesso.run(uid, 'bloqueado')
    return res.json({ resultado: 'bloqueado', motivo: 'Cartão não cadastrado' })
  }

  if (cartao.status === 'aprovado') {
    salvarAcesso.run(uid, 'entrada')
    return res.json({ resultado: 'entrada', nome: cartao.nome })
  }

  salvarAcesso.run(uid, 'bloqueado')
  return res.json({ resultado: 'bloqueado', motivo: 'Acesso bloqueado pelo administrador' })
})

// GET /registros — histórico de acessos
router.get('/registros', (req, res) => {
  res.json(listarAcessos.all())
})

// GET /cartoes — lista todos os cartões
router.get('/cartoes', (req, res) => {
  res.json(listarCartoes.all())
})

// POST /cartoes — cadastra novo cartão
router.post('/cartoes', (req, res) => {
  const { uid, nome, matricula, status } = req.body

  if (!uid || !nome || !matricula || !status) {
    return res.status(400).json({ erro: 'Campos obrigatórios: uid, nome, matricula, status' })
  }

  try {
    cadastrarCartao.run({ uid: uid.toUpperCase(), nome, matricula, status })
    res.status(201).json({ mensagem: 'Cartão cadastrado com sucesso' })
  } catch (e) {
    res.status(409).json({ erro: 'UID já cadastrado' })
  }
})

// PATCH /cartoes/:uid/status — bloqueia ou aprova um cartão
router.patch('/cartoes/:uid/status', (req, res) => {
  const uid    = req.params.uid.toUpperCase()
  const status = req.body.status

  if (!['aprovado', 'bloqueado'].includes(status)) {
    return res.status(400).json({ erro: 'Status deve ser aprovado ou bloqueado' })
  }

  const resultado = atualizarStatus.run(status, uid)

  if (resultado.changes === 0) {
    return res.status(404).json({ erro: 'Cartão não encontrado' })
  }

  res.json({ mensagem: `Cartão ${uid} agora está ${status}` })
})

module.exports = router