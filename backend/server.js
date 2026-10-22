
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());

// Disponibiliza os arquivos do frontend
app.use(express.static(path.join(__dirname, "../frontend")));

const DB_FILE = path.join(__dirname, "db.json");

// ================================
// BANCO DE DADOS JSON
// ================================

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    return {
      usuarios: [],
      pacientes: [],
      triagens: [],
      consultas: []
    };
  }

  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));

  db.usuarios = Array.isArray(db.usuarios) ? db.usuarios : [];
  db.pacientes = Array.isArray(db.pacientes) ? db.pacientes : [];
  db.triagens = Array.isArray(db.triagens) ? db.triagens : [];
  db.consultas = Array.isArray(db.consultas) ? db.consultas : [];

  return db;
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ================================
// CADASTRAR USUÁRIO
// ================================

app.post("/usuarios", (req, res) => {
  try {
    const { usuario, senha, tipo } = req.body;

    if (!usuario || !senha || !tipo) {
      return res.status(400).json({
        erro: "Preencha todos os campos."
      });
    }

    if (!["atendimento", "triagem", "medico"].includes(tipo)) {
      return res.status(400).json({
        erro: "Setor inválido."
      });
    }

    const db = readDB();

    const existe = db.usuarios.some(
      u => u.usuario.toLowerCase() === usuario.trim().toLowerCase()
    );

    if (existe) {
      return res.status(409).json({
        erro: "Esse usuário já está cadastrado."
      });
    }

    const novoUsuario = {
      id: Date.now(),
      usuario: usuario.trim(),
      senha,
      tipo
    };

    db.usuarios.push(novoUsuario);
    writeDB(db);

    return res.status(201).json({
      mensagem: "Usuário cadastrado com sucesso!",
      usuario: {
        id: novoUsuario.id,
        usuario: novoUsuario.usuario,
        tipo: novoUsuario.tipo
      }
    });
  } catch (erro) {
    console.error("Erro ao cadastrar usuário:", erro);

    return res.status(500).json({
      erro: "Erro interno ao salvar o usuário."
    });
  }
});

// ================================
// LISTAR USUÁRIOS
// ================================

app.get("/usuarios", (req, res) => {
  try {
    const db = readDB();

    const listaSegura = db.usuarios.map(u => ({
      id: u.id,
      usuario: u.usuario,
      tipo: u.tipo
    }));

    return res.json(listaSegura);
  } catch (erro) {
    console.error("Erro ao listar usuários:", erro);

    return res.status(500).json({
      erro: "Erro ao carregar os usuários."
    });
  }
});

// ================================
// LOGIN
// ================================

app.post("/login", (req, res) => {
  try {
    const db = readDB();
    const { usuario, senha } = req.body;

    const user = db.usuarios.find(u =>
      u.usuario === usuario &&
      u.senha === senha
    );

    if (!user) {
      return res.status(401).json({
        erro: "Login inválido"
      });
    }

    // Não enviar a senha para o navegador
    return res.json({
      id: user.id,
      usuario: user.usuario,
      tipo: user.tipo
    });
  } catch (erro) {
    console.error("Erro no login:", erro);

    return res.status(500).json({
      erro: "Erro interno no login."
    });
  }
});

// ================================
// ATENDIMENTO
// ================================

app.post("/atendimento", (req, res) => {
  try {
    const db = readDB();

    const paciente = {
      id: Date.now(),
      nome: req.body.nome,
      cpf: req.body.cpf,
      tipo: req.body.tipo,
      status: "triagem",
      createdAt: new Date().toISOString()
    };

    db.pacientes.push(paciente);
    writeDB(db);

    return res.json(paciente);
  } catch (erro) {
    console.error("Erro no atendimento:", erro);

    return res.status(500).json({
      erro: "Erro ao cadastrar paciente."
    });
  }
});

// ================================
// TRIAGEM
// ================================

app.post("/triagem", (req, res) => {
  try {
    const db = readDB();

    let risco = req.body.risco;
    const temperatura = Number(req.body.temperatura);

    if (
      req.body.temperatura !== "" &&
      req.body.temperatura != null &&
      Number.isFinite(temperatura) &&
      temperatura >= 39
    ) {
      risco = "vermelho";
    } else if (
      req.body.temperatura !== "" &&
      req.body.temperatura != null &&
      Number.isFinite(temperatura) &&
      temperatura >= 38
    ) {
      risco = "amarelo";
    } else if (!risco) {
      risco = "verde";
    }

    const triagem = {
      id: Date.now(),
      nome: req.body.nome,
      sintoma: req.body.sintoma,
      temperatura: req.body.temperatura,
      alergia: req.body.alergia,
      observacao: req.body.observacao,
      risco,
      status: "aguardando_medico",
      createdAt: new Date().toISOString()
    };

    db.triagens.push(triagem);
    writeDB(db);

    return res.json(triagem);
  } catch (erro) {
    console.error("Erro na triagem:", erro);

    return res.status(500).json({
      erro: "Erro ao registrar triagem."
    });
  }
});

// ================================
// LISTAR TRIAGENS
// ================================

app.get("/triagens", (req, res) => {
  try {
    const db = readDB();
    return res.json(db.triagens);
  } catch (erro) {
    console.error("Erro ao listar triagens:", erro);

    return res.status(500).json({
      erro: "Erro ao carregar triagens."
    });
  }
});

// ================================
// LISTA DE MEDICAÇÕES
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
// CONSULTA MÉDICA
// ================================

app.post("/consulta", (req, res) => {
  try {
    const db = readDB();

    const consulta = {
      id: Date.now(),
      paciente: req.body.paciente,
      diagnostico: req.body.diagnostico,
      medicacao: req.body.medicacao,
      obs: req.body.obs,
      createdAt: new Date().toISOString()
    };

    db.consultas.push(consulta);
    writeDB(db);

    return res.json(consulta);
  } catch (erro) {
    console.error("Erro ao salvar consulta:", erro);

    return res.status(500).json({
      erro: "Erro ao salvar consulta."
    });
  }
});

// ================================
// HISTÓRICO DE CONSULTAS
// ================================

app.get("/medicacoes", (req, res) => {
  try {
    const db = readDB();
    return res.json(db.consultas);
  } catch (erro) {
    console.error("Erro ao carregar consultas:", erro);

    return res.status(500).json({
      erro: "Erro ao carregar consultas."
    });
  }
});

// ================================================
// CHAMADAS NA TV - CORREÇÃO PRINCIPAL
// ================================================

// A chamada atual e o histórico ficam compartilhados
// entre o painel médico e a tela da TV.

let chamadaAtualTV = null;
let historicoTV = [];

// Receber uma chamada do painel médico
app.post("/tv/chamar", (req, res) => {
  try {
    const {
      localTipo,
      localNumero,
      paciente
    } = req.body;

    if (!paciente || !String(paciente).trim()) {
      return res.status(400).json({
        erro: "O nome do paciente é obrigatório."
      });
    }

    const chamada = {
      id: Date.now(),
      localTipo: localTipo || "CONSULTÓRIO",
      localNumero: localNumero || "01",
      paciente: String(paciente).trim(),
      data: new Date().toISOString()
    };

    // Atualizar paciente exibido na TV
    chamadaAtualTV = chamada;

    // Adicionar ao histórico
    historicoTV.unshift(chamada);

    // Manter somente as últimas quatro chamadas
    historicoTV = historicoTV.slice(0, 4);

    console.log(
      `📺 Paciente ${chamada.paciente} chamado para ` +
      `${chamada.localTipo} ${chamada.localNumero}`
    );

    return res.status(200).json({
      sucesso: true,
      mensagem: "Paciente chamado na TV!",
      chamada
    });
  } catch (erro) {
    console.error("Erro ao chamar paciente na TV:", erro);

    return res.status(500).json({
      erro: "Não foi possível chamar o paciente."
    });
  }
});

// A TV consulta esta rota a cada dois segundos
app.get("/tv/chamada", (req, res) => {
  return res.json({
    chamada: chamadaAtualTV,
    historico: historicoTV
  });
});

// ================================
// INICIAR SERVIDOR
// ================================

app.listen(3000, () => {
  console.log("🏥 Hospital Pro rodando em http://localhost:3000");
});
