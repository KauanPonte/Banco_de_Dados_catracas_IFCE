const express = require('express');
const router  = express.Router();
const db      = require('./database');

const buscarCartao  = db.prepare(`SELECT nome, matricula, status, foto FROM cartao WHERE uid = ?`);
const salvarAcesso  = db.prepare(`INSERT INTO registro_acesso (uid, nome, matricula, resultado) VALUES (@uid, @nome, @matricula, @resultado)`);

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
    uid,
    nome,
    matricula,
    resultado,
    MAX(data_hora) as data_hora
  FROM registro_acesso
  GROUP BY COALESCE(uid, matricula)
  ORDER BY data_hora DESC
`);

const listarCartoes = db.prepare(`
  SELECT id, uid, nome, matricula, status, foto, criado_em
  FROM cartao
`);

const cadastrarCartao = db.prepare(`
  INSERT INTO cartao (uid, nome, matricula, status, foto)
  VALUES (@uid, @nome, @matricula, @status, @foto)
`);

const atualizarStatus = db.prepare(`
  UPDATE cartao SET status = ? WHERE id = ?
`);

const excluirCartao = db.prepare(`
  DELETE FROM cartao WHERE id = ?
`);

const atualizarDados = db.prepare(`
  UPDATE cartao SET uid = @novoUid, nome = @nome, matricula = @matricula, status = @status, foto = @foto
  WHERE id = @id
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
    salvarAcesso.run({ uid, nome: null, matricula: null, resultado: 'bloqueado' })
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
      foto: cartao.foto || null,
      data_hora: new Date().toLocaleString('pt-BR')
    }
    salvarAcesso.run({ uid, nome: cartao.nome, matricula: cartao.matricula, resultado: 'bloqueado' });
    return res.json({
      resultado: 'bloqueado',
      motivo: 'Acesso bloqueado',
      nome: cartao.nome,
      matricula: cartao.matricula,
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

  salvarAcesso.run({ uid, nome: cartao.nome, matricula: cartao.matricula, resultado: 'entrada' });

  ultimoAcessoInfo = {
    nome: cartao.nome,
    matricula: cartao.matricula,
    uid: uid,
    resultado: 'entrada',
    foto: cartao.foto || null,
    data_hora: new Date().toLocaleString('pt-BR')
  }

  return res.json({
    resultado: 'entrada',
    nome: cartao.nome,
    matricula: cartao.matricula,
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
  const { uid, nome, matricula, status, foto } = req.body;

  if (!nome || !matricula || !status) {
    return res.status(400).json({
      erro: 'Campos obrigatórios: nome, matricula, status'
    });
  }

  try {
    cadastrarCartao.run({
      uid: uid ? uid.toUpperCase() : null,
      nome,
      matricula,
      status,
      foto: foto || null
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


//  PATCH /cartoes/:id/status
router.patch('/cartoes/:id/status', (req, res) => {
  const id     = Number(req.params.id);
  const status = req.body.status;

  if (!['aprovado', 'bloqueado'].includes(status)) {
    return res.status(400).json({
      erro: 'Status deve ser aprovado ou bloqueado'
    });
  }

  const resultado = atualizarStatus.run(status, id);

  if (resultado.changes === 0) {
    return res.status(404).json({
      erro: 'Cartão não encontrado'
    });
  }

  res.json({
    mensagem: `Cartão ${id} agora está ${status}`
  });
});
// DELETE /cartoes/:id
router.delete('/cartoes/:id', (req, res) => {
  const id = Number(req.params.id)
  const resultado = excluirCartao.run(id)

  if (resultado.changes === 0) {
    return res.status(404).json({ erro: 'Cartão não encontrado' })
  }

  res.json({ mensagem: 'Cartão removido' })
})


// DELETE vários
router.delete('/cartoes', (req, res) => {
  const { ids } = req.body

  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ erro: 'Lista inválida' })
  }

  const remover = db.prepare(`DELETE FROM cartao WHERE id = ?`)
  const removerVarios = db.transaction((lista) => {
    for (const id of lista) remover.run(Number(id))
  })

  removerVarios(ids)
  res.json({ mensagem: 'Cartões removidos' })
})

router.put('/cartoes/:id', (req, res) => {
  const id = Number(req.params.id)
  const { novoUid, nome, matricula, status, foto } = req.body

  if (!nome || !matricula || !status) {
    return res.status(400).json({ erro: 'Campos obrigatórios: nome, matricula, status' })
  }

  try {
    atualizarDados.run({
      id,
      novoUid: novoUid ? novoUid.toUpperCase() : null,
      nome,
      matricula,
      status,
      foto: foto || null
    })
    res.json({ mensagem: 'Dados atualizados com sucesso' })
  } catch (e) {
    res.status(409).json({ erro: 'UID já cadastrado' })
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

// POST /matricula — chamado pelo ESP32 via teclado
const buscarPorMatricula = db.prepare(`
  SELECT uid, nome, matricula, status, foto FROM cartao WHERE matricula = ?
`);

router.post('/matricula', (req, res) => {
  const matricula = (req.body.matricula || '').trim();

  if (!matricula) {
    return res.json({ resultado: 'bloqueado', motivo: 'Matrícula inválida', liberar: false });
  }

  const cartao = buscarPorMatricula.get(matricula);

  if (!cartao) {
    ultimoAcessoInfo = {
      nome: 'Matrícula não cadastrada',
      matricula: matricula,
      uid: null,
      resultado: 'bloqueado',
      data_hora: new Date().toLocaleString('pt-BR')
    };
    return res.json({
      resultado: 'bloqueado',
      motivo: 'Matrícula não cadastrada',
      liberar: false
    });
  }

  if (cartao.status !== 'aprovado') {
    ultimoAcessoInfo = {
      nome: cartao.nome,
      matricula: cartao.matricula,
      uid: cartao.uid,
      resultado: 'bloqueado',
      foto: cartao.foto || null,
      data_hora: new Date().toLocaleString('pt-BR')
    };
    salvarAcesso.run({ uid: cartao.uid || null, nome: cartao.nome, matricula: cartao.matricula, resultado: 'bloqueado' });
    return res.json({
      resultado: 'bloqueado',
      motivo: 'Acesso bloqueado',
      nome: cartao.nome,
      matricula: cartao.matricula,
      liberar: false
    });
  }

  // Proteção anti-repetição
  const ultimoAcesso = db.prepare(`
    SELECT resultado, data_hora FROM registro_acesso
    WHERE ${cartao.uid ? 'uid = ?' : 'matricula = ?'} ORDER BY id DESC LIMIT 1
  `).get(cartao.uid || cartao.matricula);

  if (ultimoAcesso) {
    const diff = Date.now() - new Date(
      ultimoAcesso.data_hora.replace(' ', 'T') + 'Z'
    ).getTime();

    if (diff < 5000) {
      return res.json({
        resultado: 'bloqueado',
        motivo: 'Aguarde alguns segundos',
        nome: cartao.nome,
        matricula: cartao.matricula,
        liberar: false
      });
    }
  }

  salvarAcesso.run({ uid: cartao.uid || null, nome: cartao.nome, matricula: cartao.matricula, resultado: 'entrada' });

  ultimoAcessoInfo = {
    nome: cartao.nome,
    matricula: cartao.matricula,
    uid: cartao.uid,
    resultado: 'entrada',
    foto: cartao.foto || null,
    data_hora: new Date().toLocaleString('pt-BR')
  };

  return res.json({
    resultado: 'entrada',
    nome: cartao.nome,
    matricula: cartao.matricula,
    liberar: true
  });
});


module.exports = router;