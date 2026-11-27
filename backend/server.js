const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

const DB_FILE = path.join(__dirname, "db.json");

function readDB() {
    if (!fs.existsSync(DB_FILE)) {
        const inicial = {
            usuarios: [],
            pacientes: [],
            triagens: [],
            consultas: []
        };

        fs.writeFileSync(DB_FILE, JSON.stringify(inicial, null, 2));
        return inicial;
    }

    const db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));

    db.usuarios ||= [];
    db.pacientes ||= [];
    db.triagens ||= [];
    db.consultas ||= [];

    return db;
}

function writeDB(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ================================
// CADASTRAR USUÁRIO
// ================================
app.post("/usuarios", (req, res) => {
    const { usuario, senha, tipo } = req.body;

    if (!usuario || !senha || !tipo) {
        return res.status(400).json({
            erro: "Preencha todos os campos."
        });
    }

    const db = readDB();
    const tipos = [
        "admin",
        "triagem",
        "medico",
        "enfermeiro",
        "atendimento"
    ];

    if (!tipos.includes(tipo)) {
        return res.status(400).json({
            erro: "Setor inválido."
        });
    }

    if (db.usuarios.some(u =>
        u.usuario.toLowerCase() === usuario.trim().toLowerCase()
    )) {
        return res.status(409).json({
            erro: "Esse usuário já está cadastrado."
        });
    }

    db.usuarios.push({
        usuario: usuario.trim(),
        senha,
        tipo
    });

    writeDB(db);

    res.status(201).json({
        mensagem: "Usuário cadastrado!"
    });
});

// ================================
// LISTAR USUÁRIOS
// ================================
app.get("/usuarios", (req, res) => {
    const db = readDB();

    res.json(db.usuarios.map(({ usuario, tipo }) => ({
        usuario,
        tipo
    })));
});

// ================================
// LOGIN
// ================================
app.post("/login", (req, res) => {
    const db = readDB();
    const { usuario, senha } = req.body;

    const user = db.usuarios.find(u =>
        u.usuario.toLowerCase() ===
            (usuario || "").trim().toLowerCase() &&
        u.senha === senha
    );

    if (!user) {
        return res.status(401).json({
            erro: "Usuário ou senha inválidos."
        });
    }

    res.json({
        usuario: user.usuario,
        tipo: user.tipo
    });
});

// ================================
// CADASTRAR PACIENTE
// ================================
app.post("/atendimento", (req, res) => {
    const { nome, cpf, tipo } = req.body;

    if (!nome || !cpf || !tipo) {
        return res.status(400).json({
            erro: "Preencha nome, CPF e tipo de atendimento."
        });
    }

    const db = readDB();

    const paciente = {
        id: Date.now(),
        nome: nome.trim(),
        cpf: cpf.trim(),
        tipo,
        status: "triagem",
        createdAt: new Date().toISOString()
    };

    db.pacientes.push(paciente);
    writeDB(db);

    res.status(201).json(paciente);
});

// ================================
// LISTAR PACIENTES CADASTRADOS
// ================================
app.get("/pacientes", (req, res) => {
    res.json(readDB().pacientes);
});

// ================================
// SALVAR TRIAGEM
// ================================
app.post("/triagem", (req, res) => {
    const {
        nome,
        sintoma,
        temperatura,
        alergia,
        observacao,
        risco,
        pacienteId
    } = req.body;

    if (!nome || !sintoma) {
        return res.status(400).json({
            erro: "Informe o nome e o sintoma."
        });
    }

    const db = readDB();
    const temp = Number(temperatura);
    let classificacao = risco || "verde";

    if (Number.isFinite(temp) && temp >= 39) {
        classificacao = "vermelho";
    } else if (
        Number.isFinite(temp) &&
        temp >= 38 &&
        classificacao !== "vermelho"
    ) {
        classificacao = "amarelo";
    }

    const triagem = {
        id: Date.now(),
        pacienteId: pacienteId ? Number(pacienteId) : null,
        nome: nome.trim(),
        sintoma,
        temperatura: Number.isFinite(temp) ? temp : null,
        alergia: alergia || "",
        observacao: observacao || "",
        risco: classificacao,
        status: "aguardando_medico",
        createdAt: new Date().toISOString()
    };

    db.triagens.push(triagem);

    if (pacienteId) {
        const paciente = db.pacientes.find(
            p => p.id === Number(pacienteId)
        );

        if (paciente) {
            paciente.status = "aguardando_medico";
        }
    }

    writeDB(db);

    res.status(201).json(triagem);
});

// ================================
// LISTAR TRIAGENS PENDENTES
// ================================
app.get("/triagens", (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json(readDB().triagens);
});

// ================================
// MEDICAÇÕES DISPONÍVEIS
// ================================
app.get("/lista-medicacoes", (req, res) => {
    res.json([
        "Dipirona",
        "Paracetamol",
        "Ibuprofeno",
        "Amoxicilina",
        "Azitromicina",
        "Loratadina",
        "Omeprazol",
        "Buscopan",
        "Dramin",
        "Soro fisiológico"
    ]);
});

// ================================
// SALVAR CONSULTA E REMOVER TRIAGEM
// ================================
app.post("/consulta", (req, res) => {
    const {
        triagemId,
        paciente,
        diagnostico,
        medicacao,
        obs
    } = req.body;

    if (
        triagemId === undefined ||
        triagemId === null ||
        !paciente ||
        !medicacao
    ) {
        return res.status(400).json({
            erro: "Selecione um paciente e informe a medicação."
        });
    }

    let db;

    try {
        db = readDB();
    } catch (erro) {
        console.error("Erro ao ler o banco:", erro);

        return res.status(500).json({
            erro: "Não foi possível acessar o banco de dados."
        });
    }

    const indiceTriagem = db.triagens.findIndex(
        t => t.id === Number(triagemId)
    );

    if (indiceTriagem === -1) {
        return res.status(404).json({
            erro: "Esta triagem não está mais na lista. Atualize a página."
        });
    }

    const triagem = db.triagens[indiceTriagem];

    if (triagem.nome !== paciente) {
        return res.status(400).json({
            erro: "O paciente não corresponde à triagem selecionada."
        });
    }

    const consulta = {
        id: Date.now(),
        triagemId: triagem.id,
        pacienteId: triagem.pacienteId || null,
        paciente: triagem.nome,
        diagnostico: diagnostico || "",
        medicacao,
        obs: obs || "",
        createdAt: new Date().toISOString()
    };

    // Guarda o banco anterior caso ocorra erro ao gravar
    const bancoAnterior = JSON.stringify(db);

    // Remove apenas a triagem atendida
    db.triagens.splice(indiceTriagem, 1);

    // Atualiza o status do cadastro original, se houver vínculo
    if (triagem.pacienteId) {
        const pacienteCadastrado = db.pacientes.find(
            p => p.id === triagem.pacienteId
        );

        if (pacienteCadastrado) {
            pacienteCadastrado.status = "atendido";
        }
    }

    // Mantém a consulta no histórico
    db.consultas.push(consulta);

    try {
        writeDB(db);

        return res.status(201).json({
            mensagem: "Consulta salva e triagem removida da lista!",
            consulta
        });
    } catch (erro) {
        console.error("Erro ao salvar consulta:", erro);

        // Tenta restaurar o arquivo anterior se a gravação falhar
        try {
            fs.writeFileSync(DB_FILE, bancoAnterior);
        } catch (erroRestauracao) {
            console.error(
                "Não foi possível restaurar o banco:",
                erroRestauracao
            );
        }

        return res.status(500).json({
            erro: "Não foi possível salvar a consulta."
        });
    }
});

// ================================
// LISTAR HISTÓRICO DE CONSULTAS
// Mantém a rota original do projeto
// ================================
app.get("/medicacoes", (req, res) => {
    res.json(readDB().consultas);
});

// ================================
// CHAMADAS DA TV
// ================================
let chamadaAtual = null;
let historicoChamadas = [];

app.post("/tv/chamar", (req, res) => {
    const { localTipo, localNumero, paciente } = req.body;

    if (!paciente || !String(paciente).trim()) {
        return res.status(400).json({
            erro: "Informe o nome do paciente."
        });
    }

    const chamada = {
        id: Date.now(),
        localTipo: localTipo || "GUICHÊ",
        localNumero: localNumero || "01",
        paciente: String(paciente).trim(),
        horario: new Date().toISOString()
    };

    chamadaAtual = chamada;
    historicoChamadas.unshift(chamada);
    historicoChamadas = historicoChamadas.slice(0, 10);

    console.log(
        "CHAMADA NA TV:",
        chamada.paciente,
        "-",
        chamada.localTipo,
        chamada.localNumero
    );

    res.status(200).json({
        mensagem: "Paciente chamado com sucesso!",
        chamada,
        historico: historicoChamadas
    });
});

app.get("/tv/chamada", (req, res) => {
    res.set("Cache-Control", "no-store");

    res.json({
        chamada: chamadaAtual,
        historico: historicoChamadas
    });
});

// ================================
// INICIAR SERVIDOR
// ================================
app.listen(PORT, () => {
    console.log(
        `Hospital Pro rodando em http://localhost:${PORT}`
    );
});