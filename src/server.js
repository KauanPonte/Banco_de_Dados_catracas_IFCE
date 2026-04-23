const express = require('express')
const routes = require('./routes')

const app = express()
const PORT = 5000

app.use(express.json())
app.get('/', (req, res) => { res.send('API da catraca funcionando 🚀'); });
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