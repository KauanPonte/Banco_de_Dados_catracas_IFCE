const express = require('express');
const router  = express.Router();
const db      = require('./database');

const buscarCartao  = db.prepare(`SELECT nome, matricula, status FROM cartao WHERE uid = ?`);
const salvarAcesso  = db.prepare(`INSERT INTO registro_acesso (uid, resultado) VALUES (?, ?)`);

let ultimoUidLido = null
let ultimoAcessoInfo = null
let modoLeitura = false

function hexParaUID(hex){
const bytes = hex.match(/.{2}/g)
 const invertido = bytes.reverse().join('')
 return BigInt ('0x' + invertido).toString()
}

const listarAcessos = db.prepare(`
  SELECT
    r.uid,
    c.nome,
    c.matricula,
    r.resultado,
    MAX(r.data_hora) as data_hora
  FROM registro_acesso r
  INNER JOIN cartao c ON c.uid = r.uid
  GROUP BY r.uid
  ORDER BY data_hora DESC
`);

const listarCartoes = db.prepare(`
  SELECT id, uid, nome, matricula, status, criado_em
  FROM cartao
`);

const cadastrarCartao = db.prepare(`
  INSERT INTO cartao (uid, nome, matricula, status)
  VALUES (@uid, @nome, @matricula, @status)
`);

const atualizarStatus = db.prepare(`
  UPDATE cartao SET status = ? WHERE uid = ?
`);

const excluirCartao = db.prepare(`
  DELETE FROM cartao WHERE uid = ?
`);

const atualizarDados = db.prepare(`
  UPDATE cartao SET uid = @novoUid, nome = @nome, matricula = @matricula, status = @status
  WHERE uid = @uidAtual
`);


//  POST /acesso — chamado pelo ESP32
router.post('/acesso', (req, res) => {
  const uidHex = (req.body.uid || '')
    .toUpperCase()
    .replace(/[^A-F0-9]/g, '')
    .trim();

  // UID inválido
  if (!uidHex) {
    return res.json({
      resultado: 'bloqueado',
      motivo: 'UID inválido',
      liberar: false
    });
  }

  const uid = hexParaUID(uidHex)
  ultimoUidLido = uid

  // Em modo leitura (cadastro), só captura o UID — sem histórico, sem painel
  if (modoLeitura) {
    return res.json({ resultado: 'leitura', liberar: false })
  }

  const cartao = buscarCartao.get(uid)
  const todos = db.prepare('SELECT uid, length(uid) as tam FROM cartao').all()
  console.log('Cartões no banco:', todos)
  console.log('Cartão encontrado:', cartao)

  //  Não cadastrado
  if (!cartao) {
    ultimoAcessoInfo = {
      nome: 'Cartão não cadastrado',
      matricula: null,
      uid: uid,
      resultado: 'bloqueado',
      data_hora: new Date().toLocaleString('pt-BR')
    }
    salvarAcesso.run(uid, 'bloqueado')
    return res.json({
      resultado: 'bloqueado',
      motivo: 'Cartão não cadastrado',
      liberar: false
    })
  }

  //  Bloqueado pelo sistema
  if (cartao.status !== 'aprovado') {
    ultimoAcessoInfo = {
      nome: cartao.nome,
      matricula: cartao.matricula,
      uid: uid,
      resultado: 'bloqueado',
      data_hora: new Date().toLocaleString('pt-BR')
    }
    salvarAcesso.run(uid, 'bloqueado');
    return res.json({
      resultado: 'bloqueado',
      motivo: 'Acesso bloqueado',
      liberar: false
    });
  }

  //  Busca último acesso
  const ultimoAcesso = db.prepare(`
    SELECT resultado, data_hora
    FROM registro_acesso
    WHERE uid = ?
    ORDER BY id DESC
    LIMIT 1
  `).get(uid);

  //  Proteção anti-repetição
  if (ultimoAcesso) {
    const agora = Date.now();
    const ultimo = new Date(
      ultimoAcesso.data_hora.replace(' ', 'T') + 'Z'
    ).getTime();

    const diff = agora - ultimo;
    console.log('Diferença ms:', diff);

    if (diff < 5000) {
      return res.json({
        resultado: 'bloqueado',
        motivo: 'Aguarde alguns segundos',
        liberar: false
      });
    }
  }

  salvarAcesso.run(uid, 'entrada');

  ultimoAcessoInfo ={
    nome: cartao.nome,
    matricula: cartao.matricula,
    uid: uid,
    resultado: 'entrada',
    data_hora:new Date().toLocaleString('pt-BR')
  }

  return res.json({
    resultado: 'entrada',
    nome: cartao.nome,
    liberar: true
  });
});


//  GET /registros
router.get('/registros', (req, res) => {
  res.json(listarAcessos.all());
});


//  GET /cartoes
router.get('/cartoes', (req, res) => {
  res.json(listarCartoes.all());
});


//  POST /cartoes
router.post('/cartoes', (req, res) => {
  console.log('Cadastrando cartão:', req.body)
  const { uid, nome, matricula, status } = req.body;

  if (!uid || !nome || !matricula || !status) {
    return res.status(400).json({
      erro: 'Campos obrigatórios: uid, nome, matricula, status'
    });
  }

  try {
    cadastrarCartao.run({
      uid: uid.toUpperCase(),
      nome,
      matricula,
      status
    });

    res.status(201).json({
      mensagem: 'Cartão cadastrado com sucesso'
    });
  } catch (e) {
    res.status(409).json({
      erro: 'UID já cadastrado'
    });
  }
});


//  PATCH /cartoes/:uid/status
router.patch('/cartoes/:uid/status', (req, res) => {
  const uid    = req.params.uid.toUpperCase();
  const status = req.body.status;

  if (!['aprovado', 'bloqueado'].includes(status)) {
    return res.status(400).json({
      erro: 'Status deve ser aprovado ou bloqueado'
    });
  }

  const resultado = atualizarStatus.run(status, uid);

  if (resultado.changes === 0) {
    return res.status(404).json({
      erro: 'Cartão não encontrado'
    });
  }

  res.json({
    mensagem: `Cartão ${uid} agora está ${status}`
  });
});
// DELETE /cartoes/:uid
router.delete('/cartoes/:uid', (req, res) => {

  const uid = req.params.uid.toUpperCase()

  const remover = db.prepare(`
    DELETE FROM cartao WHERE uid = ?
  `)

  const resultado = remover.run(uid)

  if (resultado.changes === 0) {

    return res.status(404).json({
      erro: 'Cartão não encontrado'
    })
  }

  res.json({
    mensagem: 'Cartão removido'
  })
})


// DELETE vários
router.delete('/cartoes', (req, res) => {

  const { uids } = req.body

  if (!uids || !Array.isArray(uids)) {

    return res.status(400).json({
      erro:'Lista inválida'
    })
  }

  const remover = db.prepare(`
    DELETE FROM cartao WHERE uid = ?
  `)

  const removerVarios = db.transaction((lista) => {

    for (const uid of lista) {
      remover.run(uid)
    }
  })

  removerVarios(uids)

  res.json({
    mensagem:'Cartões removidos'
  })
})

// DELETE /cartoes/:uid
router.delete('/cartoes/:uid', (req, res) => {
  const uid = req.params.uid.toUpperCase();
  const resultado = excluirCartao.run(uid);

  if (resultado.changes === 0) {
    return res.status(404).json({ erro: 'Cartão não encontrado' });
  }

  res.json({ mensagem: `Cartão ${uid} removido` });
});

router.put('/cartoes/:uid', (req, res) => {
  const uidAtual = req.params.uid
  const { novoUid, nome, matricula, status } = req.body

  if (!novoUid || !nome || !matricula || !status) {
    return res.status(400).json({ erro: 'Todos os campos são obrigatórios' })
  }

  try {
    atualizarDados.run({ uidAtual, novoUid: novoUid.toUpperCase(), nome, matricula, status })
    res.json({ mensagem: 'Dados atualizados com sucesso' })
  } catch (e) {
    res.status(409).json({ erro: 'UID já existe' })
  }
})

router.get('/ultimo-uid', (req,res) => {
  res.json({uid: ultimoUidLido})
  ultimoUidLido = null
})

router.post('/modo-leitura', (req, res) => {
  modoLeitura = true
  ultimoUidLido = null
  res.json({ ok: true })
})

router.delete('/modo-leitura', (req, res) => {
  modoLeitura = false
  res.json({ ok: true })
})

router.get('/ultimo-acesso', (req, res) => {
  res.json({ acesso: ultimoAcessoInfo})
  ultimoAcessoInfo = null
})


module.exports = router;