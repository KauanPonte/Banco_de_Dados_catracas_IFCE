const express = require('express')
const path = require('path')
const routes = require('./routes')
const auth = require('./auth')


const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

// A página de cadastro só abre para quem está logado
app.get(['/', '/index.html'], auth.exigirLoginPagina, (req, res) => {res.sendFile(
    path.join(__dirname, 'public', 'index.html'))
  });

app.use(express.static(path.join(__dirname, '..', 'public'), { index: false }))
app.use(express.static(
  path.join(__dirname, 'public'), { index: false }
))

app.use(auth.router)
app.use(routes)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando em http://0.0.0.0:${PORT}`)
  console.log('Rotas disponíveis:')
  console.log('  POST /acesso       — ESP32 verifica cartão')
  console.log('  GET  /registros    — histórico de acessos')
  console.log('  GET  /cartoes      — lista cartões')
  console.log('  POST /cartoes      — cadastra cartão')
  console.log('  PATCH /cartoes/:uid — bloqueia/desbloqueia')
  console.log('  (todas as rotas, exceto /acesso e /matricula, exigem login)')
})