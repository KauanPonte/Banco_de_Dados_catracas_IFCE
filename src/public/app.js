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
    const aprovado = cartao.status === 'aprovado'

    const linha = `
      <tr>
        <td>${cartao.uid}</td>
        <td>${cartao.nome}</td>
        <td>${cartao.matricula}</td>
        <td>
          <button
            class="btn-status ${aprovado ? 'aprovado' : 'bloqueado'}"
            onclick="alterarStatus('${cartao.uid}', '${cartao.status}')">
            ${aprovado ? 'Aprovado' : 'Bloqueado'}
          </button>
        </td>
        <td>
          <button
            class="btn-apagar"
            onclick="excluirCartao('${cartao.uid}')">
            Apagar
          </button>
        </td>
      </tr>
    `

    tabelaTodos.innerHTML += linha
    tabelaCartoes.innerHTML += linha

    if (!aprovado) {
      tabelaBloqueados.innerHTML += `
        <tr>
          <td>${cartao.uid}</td>
          <td>${cartao.nome}</td>
          <td>${cartao.matricula}</td>
          <td>
            <button
              class="btn-status bloqueado"
              onclick="alterarStatus('${cartao.uid}', '${cartao.status}')">
              Bloqueado
            </button>
          </td>
          <td>
            <button
              class="btn-apagar"
              onclick="excluirCartao('${cartao.uid}')">
              Apagar
            </button>
          </td>
        </tr>
      `
    }
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

carregarCartoes()