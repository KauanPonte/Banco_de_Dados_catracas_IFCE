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

  const tabela =
    document.getElementById('tabelaTodos')

  tabela.innerHTML = ''

  cartoes.forEach(cartao => {

    tabela.innerHTML += `

      <tr>

        <td>
          <input
            type="checkbox"
            class="check-aluno"
            value="${cartao.uid}">
        </td>

        <td>${cartao.uid}</td>

        <td>${cartao.nome}</td>

        <td>${cartao.matricula}</td>

        <td>

          <button
            class="${
              cartao.status === 'aprovado'
                ? 'btn-aprovado'
                : 'btn-bloqueado'
            }"

            onclick="alterarStatus(
              '${cartao.uid}',
              '${cartao.status}'
            )">

            ${cartao.status}

          </button>

        </td>

        <td>

          <button
            class="btn-remover"
            onclick="excluirAluno('${cartao.uid}')">

            Excluir

          </button>

        </td>

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