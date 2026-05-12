async function cadastrarCartao() {

  const uid = document.getElementById('uid').value
  const nome = document.getElementById('nome').value
  const matricula = document.getElementById('matricula').value
  const status = document.getElementById('status').value

  const resposta = await fetch('/cartoes', {

    method: 'POST',

    headers: {
      'Content-Type': 'application/json'
    },

    body: JSON.stringify({
      uid,
      nome,
      matricula,
      status
    })
  })

  const dados = await resposta.json()

  if (dados.erro) {
    alert(dados.erro)
    return
  }

  alert('Cartão cadastrado!')

  carregarCartoes()
}

function mostrarAba(...ids) {
  if (!ids.includes('historico')) pararHistorico()

  const abas = document.querySelectorAll('.aba')

  abas.forEach(aba => {
    aba.classList.add('hidden')
  })

  ids.forEach(id => {

    document
      .getElementById(id)
      .classList.remove('hidden')
  })
}
async function carregarCartoes() {

  const resposta = await fetch('/cartoes')

  const cartoes = await resposta.json()

  const tabelaTodos =
    document.getElementById('tabelaTodos')

  const tabelaCartoes =
    document.getElementById('tabelaCartoes')

  const tabelaBloqueados =
    document.getElementById('tabelaBloqueados')

  tabelaTodos.innerHTML = ''
  tabelaCartoes.innerHTML = ''
  tabelaBloqueados.innerHTML = ''

  cartoes.forEach(cartao => {

    const linha = `
      <tr>
        <td>${cartao.uid}</td>
        <td>${cartao.nome}</td>
        <td>${cartao.matricula}</td>
        <td>${cartao.status}</td>
      </tr>
    `
  })
}

async function excluirCartao(uid) {
  if (!confirm(`Deseja apagar o cartão ${uid}?`)) return

  await fetch(`/cartoes/${uid}`, { method: 'DELETE' })
  carregarCartoes()
}

async function alterarStatus(uid, statusAtual) {
  const novoStatus = statusAtual === 'aprovado' ? 'bloqueado' : 'aprovado'

  await fetch(`/cartoes/${uid}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: novoStatus })
  })

  carregarCartoes()
}

async function carregarCartoesAprovados() {
  const resposta = await fetch('/cartoes')
  const cartoes = await resposta.json()
  const tabela = document.getElementById('tabelaCartoes')
  tabela.innerHTML = ''

  cartoes
    .filter(c => c.status === 'aprovado')
    .forEach(cartao => {
      tabela.innerHTML += `
        <tr>
          <td>${cartao.uid}</td>
          <td>${cartao.nome}</td>
          <td>${cartao.matricula}</td>
          <td>${cartao.status}</td>
        </tr>
      `
    })
}

async function carregarCartoesBloqueados() {
  const resposta = await fetch('/cartoes')
  const cartoes = await resposta.json()
  const tabela = document.getElementById('tabelaBloqueados')
  tabela.innerHTML = ''

  cartoes
    .filter(c => c.status === 'bloqueado')
    .forEach(cartao => {
      tabela.innerHTML += `
        <tr>
          <td>${cartao.uid}</td>
          <td>${cartao.nome}</td>
          <td>${cartao.matricula}</td>
          <td>${cartao.status}</td>
        </tr>
      `
    })
}

carregarCartoes()

async function alterarStatus(uid, statusAtual) {

  const novoStatus =
    statusAtual === 'aprovado'
      ? 'bloqueado'
      : 'aprovado'

  await fetch(`/cartoes/${uid}/status`, {

    method:'PATCH',

    headers:{
      'Content-Type':'application/json'
    },

    body: JSON.stringify({
      status: novoStatus
    })
  })

  carregarCartoes()
}


async function excluirAluno(uid) {

  if (!confirm('Excluir aluno?')) return

  await fetch(`/cartoes/${uid}`, {
    method:'DELETE'
  })

  carregarCartoes()
}


let _historicoTimer = null
let _registrosHistorico = [] // guarda os dados para filtrar

async function carregarHistorico() {
  const resposta = await fetch('/registros')
  _registrosHistorico = await resposta.json()
  filtrarHistorico() // renderiza já com filtro aplicado
}

function filtrarHistorico() {
  const texto = document.getElementById('filtroTexto').value.toLowerCase()
  const resultado = document.getElementById('filtroResultado').value

  const filtrados = _registrosHistorico.filter(r => {
    const bateTexto =
      (r.nome || '').toLowerCase().includes(texto) ||
      (r.matricula || '').toLowerCase().includes(texto)

    const bateResultado = resultado === '' || r.resultado === resultado

    return bateTexto && bateResultado
  })

  const tabela = document.getElementById('tabelaHistorico')
  tabela.innerHTML = ''

  filtrados.forEach(r => {
    const classeResultado = r.resultado === 'entrada' ? 'btn-aprovado' : 'btn-bloqueado'
    const dataFormatada = r.data_hora
      ? new Date(r.data_hora + 'Z').toLocaleString('pt-BR')
      : '—'

    tabela.innerHTML += `
      <tr>
        <td>${r.nome || '—'}</td>
        <td>${r.matricula || '—'}</td>
        <td>${r.uid}</td>
        <td><span class="${classeResultado}">${r.resultado}</span></td>
        <td>${dataFormatada}</td>
      </tr>
    `
  })
}

function iniciarHistorico() {
  clearInterval(_historicoTimer)
  carregarHistorico()
  _historicoTimer = setInterval(carregarHistorico, 5000)
}

function pararHistorico() {
  clearInterval(_historicoTimer)
  _historicoTimer = null
}

let _leituraTimer = null 

function aguardarCartao(){
  const btn = document.querySelector('[onclick="aguardarCartao()"]')

  if (_leituraTimer) {
    clearInterval(_leituraTimer)
    _leituraTimer = null
    btn.textContent = 'Ler cartão'
    return
  }

  btn.textContent = 'Aguardando...'
  clearInterval(_leituraTimer)

  _leituraTimer = setInterval(async () => {
    const resposta = await fetch('/ultimo-uid')
    const dados = await resposta.json()

    if(dados.uid){
      document.getElementById('uid').value = dados.uid
      clearInterval(_leituraTimer)
      _leituraTimer = null
      btn.textContent = 'Ler cartão'
    }
  }, 1000)
}

async function excluirSelecionados() {

  const checks =
    document.querySelectorAll(
      '.check-aluno:checked'
    )

  const uids = [...checks]
    .map(c => c.value)

  if (uids.length === 0) {

    alert('Nenhum aluno selecionado')
    return
  }

  if (!confirm('Excluir selecionados?')) return

  await fetch('/cartoes', {

    method:'DELETE',

    headers:{
      'Content-Type':'application/json'
    },

    body: JSON.stringify({
      uids
    })
  })

  carregarCartoes()
}