const express = require('express')
const path = require('path')
const routes = require('./routes')


const app = express()
const PORT = 5000

app.use(express.json())
app.use(express.static(path.join(__dirname, '..', 'public'))) 
app.use(express.static(
  path.join(__dirname, 'public')
))

app.get('/', (req, res) => {res.sendFile(
    path.join(__dirname, 'public', 'index.html')) 
  });
app.use(routes)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando em http://0.0.0.0:${PORT}`)
  console.log('Rotas disponíveis:')
  console.log('  POST /acesso       — ESP32 verifica cartão')
  console.log('  GET  /registros    — histórico de acessos')
  console.log('  GET  /cartoes      — lista cartões')
  console.log('  POST /cartoes      — cadastra cartão')
  console.log('  PATCH /cartoes/:uid — bloqueia/desbloqueia')
})