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

  document.getElementById('uid').value = ''
  document.getElementById('nome').value = ''
  document.getElementById('matricula').value = ''

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
let _todosAlunos = []

async function carregarCartoes() {

  const resposta = await fetch('/cartoes')
  _todosAlunos = await resposta.json()
  filtrarAlunos()
}

function filtrarAlunos() {
  const texto = document.getElementById('filtroAlunosTexto')?.value.toLowerCase() || ''
  const status = document.getElementById('filtroAlunosStatus')?.value || ''

  const filtrados = _todosAlunos.filter(c => {
    const bateTexto =
      c.nome.toLowerCase().includes(texto) ||
      c.matricula.toLowerCase().includes(texto)
    const bateStatus = status === '' || c.status === status
    return bateTexto && bateStatus
  })

  const tabela = document.getElementById('tabelaTodos')
  tabela.innerHTML = ''

  filtrados.forEach(cartao => {
    tabela.innerHTML += `
      <tr>
        <td><input type="checkbox" class="check-aluno" value="${cartao.uid}"></td>
        <td>${cartao.uid}</td>
        <td>${cartao.nome}</td>
        <td>${cartao.matricula}</td>
        <td>
          <button class="${cartao.status === 'aprovado' ? 'btn-aprovado' : 'btn-bloqueado'}"
            onclick="alterarStatus('${cartao.uid}', '${cartao.status}')">
            ${cartao.status}
          </button>
        </td>
        <td style="display:flex; gap:6px">
          <button class="btn-remover" style="background:#0d6efd"
            onclick="abrirEditar('${cartao.uid}', '${cartao.nome}', '${cartao.matricula}', '${cartao.status}')">
            Editar
          </button>
          <button class="btn-remover" onclick="excluirAluno('${cartao.uid}')">
            Excluir
          </button>
        </td>
      </tr>
    `
  })
}

function abrirEditar(uid, nome, matricula, status) {
  document.getElementById('editUidOriginal').value = uid
  document.getElementById('editUid').value = uid
  document.getElementById('editNome').value = nome
  document.getElementById('editMatricula').value = matricula
  document.getElementById('editStatus').value = status
  document.getElementById('modalEdicao').classList.remove('hidden')
}

function fecharModal() {
  document.getElementById('modalEdicao').classList.add('hidden')
  pararLeituraEdicao()
}

async function salvarEdicao() {
  const uidOriginal = document.getElementById('editUidOriginal').value
  const novoUid = document.getElementById('editUid').value
  const nome = document.getElementById('editNome').value
  const matricula = document.getElementById('editMatricula').value
  const status = document.getElementById('editStatus').value

  const resposta = await fetch(`/cartoes/${uidOriginal}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ novoUid, nome, matricula, status })
  })

  const dados = await resposta.json()

  if (dados.erro) {
    alert(dados.erro)
    return
  }

  fecharModal()
  carregarCartoes()
}

let _leituraEdicaoTimer = null

async function aguardarCartaoEdicao() {
  const btn = document.querySelector('[onclick="aguardarCartaoEdicao()"]')

  if (_leituraEdicaoTimer) {
    clearInterval(_leituraEdicaoTimer)
    _leituraEdicaoTimer = null
    btn.textContent = 'Ler cartão'
    await fetch('/modo-leitura', { method: 'DELETE' })
    return
  }

  btn.textContent = 'Aguardando...'

  await fetch('/modo-leitura', { method: 'POST' })

  _leituraEdicaoTimer = setInterval(async () => {
    const resposta = await fetch('/ultimo-uid')
    const dados = await resposta.json()

    if (dados.uid) {
      document.getElementById('editUid').value = dados.uid
      clearInterval(_leituraEdicaoTimer)
      _leituraEdicaoTimer = null
      btn.textContent = 'Ler cartão'
      await fetch('/modo-leitura', { method: 'DELETE' })
    }
  }, 1000)
}

function pararLeituraEdicao() {
  if (_leituraEdicaoTimer) {
    clearInterval(_leituraEdicaoTimer)
    _leituraEdicaoTimer = null
    fetch('/modo-leitura', { method: 'DELETE' })
  }
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

let _painelTimer = null
let _painelSumirTimer = null

async function verificarUltimoAcesso() {
  const resposta = await fetch('/ultimo-acesso')
  const dados = await resposta.json()

  if(!dados.acesso) return

  const a = dados.acesso

  document.getElementById('painelNome').textContent = a.nome || 'Não cadastros'
  document.getElementById('painelMatricula').textContent = 'Matrícula: ' + (a.matricula || '-')
  document.getElementById('painelUID').textContent = 'UID: ' + a.uid
  document.getElementById('painelHora').textContent =  a.data_hora

  const badge = document.getElementById('painelResultado')
  badge.textContent = a.resultado === 'entrada' ? 'ACESSO LIBERADO' : 'ACESSO NEGADO'
  badge.className = 'painel-badge ' + (a.resultado === 'entrada' ? 'btn-aprovado' : 'btn-bloqueado')

  const painel = document.getElementById('painelAcesso')
  painel.classList.remove('hidden', 'liberado', 'negado')
  painel.classList.add(a.resultado === 'entrada' ? 'liberado' : 'negado')

  clearTimeout(_painelSumirTimer)
  _painelSumirTimer = setTimeout(() => {
    painel.classList.add('hidden')
  }, 6000)
  }

  function iniciarPainelAcesso(){
    clearInterval(_painelTimer)
    _painelTimer = setInterval(verificarUltimoAcesso, 2000)
  }

  function pararPainelAcesso(){
    clearInterval(_painelTimer)
    clearTimeout(_painelSumirTimer)
    _painelTimer = null 
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
  _historicoTimer = setInterval(carregarHistorico, 2000)
  iniciarPainelAcesso()
}

function pararHistorico() {
  clearInterval(_historicoTimer)
  _historicoTimer = null
  pararPainelAcesso()
}

let _leituraTimer = null 

async function aguardarCartao(){
  const btn = document.querySelector('[onclick="aguardarCartao()"]')

  if (_leituraTimer) {
    clearInterval(_leituraTimer)
    _leituraTimer = null
    btn.textContent = 'Ler cartão'
    await fetch('/modo-leitura', { method: 'DELETE' })
    return
  }

  btn.textContent = 'Aguardando...'

  // Ativa modo leitura no servidor (limpa UID antigo e bloqueia painel de acesso)
  await fetch('/modo-leitura', { method: 'POST' })

  _leituraTimer = setInterval(async () => {
    const resposta = await fetch('/ultimo-uid')
    const dados = await resposta.json()

    if(dados.uid){
      document.getElementById('uid').value = dados.uid
      clearInterval(_leituraTimer)
      _leituraTimer = null
      btn.textContent = 'Ler cartão'
      await fetch('/modo-leitura', { method: 'DELETE' })
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