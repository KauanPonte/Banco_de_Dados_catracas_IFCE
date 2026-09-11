const XLSX = require("xlsx");
const path = require("path");

function sincronizarSUAP() {

    // Localização do arquivo exportado do SUAP
    const caminhoInformado = process.argv[2];

if (!caminhoInformado) {
    console.log("Informe o caminho do arquivo do SUAP.");
    console.log("Exemplo: node src/sync.js arquivo.xls");
    process.exit(1);
}

const caminhoArquivo = path.resolve(caminhoInformado);
const db = require("./database");

    // Abre o arquivo Excel
    const arquivo = XLSX.readFile(caminhoArquivo);

    // Pega a primeira planilha do arquivo
    const nomePlanilha = arquivo.SheetNames[0];
    const planilha = arquivo.Sheets[nomePlanilha];

    // Converte as linhas da planilha para objetos JavaScript
    const dados = XLSX.utils.sheet_to_json(planilha);
    
    // Mostra uma prévia dos 5 primeiros alunos reconhecidos
const previaAlunos = dados.slice(0, 5).map((linha) => ({
    nome: linha["Nome"],
    matricula: linha["Matrícula"],
    situacao: linha["Situação"]
}));

console.log("Prévia dos alunos reconhecidos:");
console.log(previaAlunos);
console.log("-----------------------------");

    // Procura um aluno pela matrícula
    const procurarAluno = db.prepare(`
        SELECT id
        FROM cartao
        WHERE matricula = ?
    `);

    // Insere um aluno que ainda não existe
    const inserirAluno = db.prepare(`
        INSERT INTO cartao (uid, nome, matricula, status)
        VALUES (NULL, ?, ?, ?)
    `);

    // Atualiza um aluno que já existe
    const atualizarAluno = db.prepare(`
        UPDATE cartao
        SET nome = ?, status = ?
        WHERE matricula = ?
    `);

    let inseridos = 0;
    let atualizados = 0;
    let ignorados = 0;

    for (const linha of dados) {

        const nome = String(linha["Nome"] || "").trim();
        const matricula = String(linha["Matrícula"] || "").trim();
        const situacao = String(linha["Situação"] || "").trim();

        // Ignora linhas incompletas
        if (!nome || !matricula || !situacao) {
            ignorados++;
            continue;
        }

        // Por enquanto, somente alunos Matriculados serão importados
        if (situacao !== "Matriculado") {
            ignorados++;
            continue;
        }

        // O banco da catraca usa "aprovado"
        const status = "aprovado";

        const alunoExistente = procurarAluno.get(matricula);

        if (alunoExistente) {

            atualizarAluno.run(
                nome,
                status,
                matricula
            );

            atualizados++;

        } else {

            inserirAluno.run(
                nome,
                matricula,
                status
            );

            inseridos++;
        }
    }

    console.log("Importação concluída!");
    console.log("Alunos inseridos:", inseridos);
    console.log("Alunos atualizados:", atualizados);
    console.log("Linhas ignoradas:", ignorados);
}

sincronizarSUAP();
