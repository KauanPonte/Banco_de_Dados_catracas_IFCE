const express = require('express');
const crypto  = require('crypto');
const db      = require('./database');

const router = express.Router();

const DURACAO_SESSAO = 12 * 60 * 60 * 1000; // 12 horas
const MAX_TENTATIVAS = 5;
const BLOQUEIO_MS    = 5 * 60 * 1000;       // 5 minutos após errar demais

// Sessões ficam em memória: se o servidor reiniciar, é só logar de novo
const sessoes    = new Map(); // token -> { usuario, expira }
const tentativas = new Map(); // ip -> { erros, bloqueadoAte }

const buscarUsuario = db.prepare(`SELECT usuario, senha_hash FROM usuario WHERE usuario = ?`);

function hashSenha(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(senha, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verificarSenha(senha, senhaHash) {
  const [salt, hash] = senhaHash.split(':');
  const calculado = crypto.scryptSync(senha, salt, 64);
  return crypto.timingSafeEqual(calculado, Buffer.from(hash, 'hex'));
}

function lerCookie(req, nome) {
  const cookies = req.headers.cookie || '';
  for (const parte of cookies.split(';')) {
    const [chave, ...valor] = parte.trim().split('=');
    if (chave === nome) return decodeURIComponent(valor.join('='));
  }
  return null;
}

function sessaoAtual(req) {
  const token = lerCookie(req, 'sessao');
  if (!token) return null;

  const sessao = sessoes.get(token);
  if (!sessao) return null;

  if (sessao.expira < Date.now()) {
    sessoes.delete(token);
    return null;
  }
  return sessao;
}

// Para rotas da API: responde 401 se não estiver logado
function exigirLogin(req, res, next) {
  if (!sessaoAtual(req)) {
    return res.status(401).json({ erro: 'Faça login para continuar' });
  }
  next();
}

// Para páginas HTML: manda para a tela de login
function exigirLoginPagina(req, res, next) {
  if (!sessaoAtual(req)) return res.redirect('/login.html');
  next();
}

//  POST /login
router.post('/login', (req, res) => {
  const ip = req.ip;
  const registro = tentativas.get(ip);

  if (registro && registro.bloqueadoAte > Date.now()) {
    return res.status(429).json({ erro: 'Muitas tentativas. Aguarde alguns minutos.' });
  }

  const { usuario, senha } = req.body || {};
  const encontrado = usuario && senha ? buscarUsuario.get(usuario) : null;

  if (!encontrado || !verificarSenha(senha, encontrado.senha_hash)) {
    // se já cumpriu um bloqueio anterior, recomeça a contagem
    const errosAnteriores = registro && !registro.bloqueadoAte ? registro.erros : 0;
    const erros = errosAnteriores + 1;
    tentativas.set(ip, {
      erros,
      bloqueadoAte: erros >= MAX_TENTATIVAS ? Date.now() + BLOQUEIO_MS : 0
    });
    return res.status(401).json({ erro: 'Usuário ou senha inválidos' });
  }

  tentativas.delete(ip);

  const token = crypto.randomBytes(32).toString('hex');
  sessoes.set(token, { usuario: encontrado.usuario, expira: Date.now() + DURACAO_SESSAO });

  res.cookie('sessao', token, {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: DURACAO_SESSAO
  });
  res.json({ mensagem: 'Login realizado' });
});

//  POST /logout
router.post('/logout', (req, res) => {
  const token = lerCookie(req, 'sessao');
  if (token) sessoes.delete(token);
  res.clearCookie('sessao');
  res.json({ mensagem: 'Logout realizado' });
});

module.exports = { router, exigirLogin, exigirLoginPagina, hashSenha };
