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

    tabelaTodos.innerHTML += linha
    tabelaCartoes.innerHTML += linha

    if (cartao.status === 'bloqueado') {

      tabelaBloqueados.innerHTML += `
        <tr>
          <td>${cartao.uid}</td>
          <td>${cartao.nome}</td>
          <td>${cartao.matricula}</td>
        </tr>
      `
    }
  })
}

carregarCartoes()