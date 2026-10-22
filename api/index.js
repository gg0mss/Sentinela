
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();

// CONFIGURAÇÕES
app.use(express.json());
app.use(cors());

// ARQUIVOS DO SITE
app.use(express.static(path.join(__dirname, "../frontend")));

// BANCO DE DADOS
const DB_FILE = path.join(__dirname, "db.json");

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    return {
      usuarios: [],
      pacientes: [],
      triagens: [],
      consultas: [],
      tv_chamada: null,
      tv_historico: []
    };
  }

  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));

  // Garantir que todas as listas existam
  db.usuarios = db.usuarios || [];
  db.pacientes = db.pacientes || [];
  db.triagens = db.triagens || [];
  db.consultas = db.consultas || [];
  db.tv_historico = db.tv_historico || [];

  if (db.tv_chamada === undefined) {
    db.tv_chamada = null;
  }

  return db;
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ROTA INICIAL
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// LOGIN
app.post("/login", (req, res) => {
  const db = readDB();

  const user = db.usuarios.find(
    u =>
      u.usuario === req.body.usuario &&
      u.senha === req.body.senha
  );

  if (!user) {
    return res.status(401).json({
      erro: "Login inválido"
    });
  }

  res.json(user);
});

// CADASTRAR PACIENTE / ATENDIMENTO
app.post("/atendimento", (req, res) => {
  const db = readDB();

  const paciente = {
    id: Date.now(),
    nome: req.body.nome,
    cpf: req.body.cpf,
    tipo: req.body.tipo,
    status: "triagem",
    createdAt: new Date()
  };

  db.pacientes.push(paciente);
  writeDB(db);

  res.json(paciente);
});

// LISTAR PACIENTES
app.get("/pacientes", (req, res) => {
  const db = readDB();
  res.json(db.pacientes);
});

// TRIAGEM
app.post("/triagem", (req, res) => {
  const db = readDB();

  const temperatura = Number(req.body.temperatura);
  let risco = req.body.risco;

  if (temperatura >= 39) {
    risco = "vermelho";
  } else if (temperatura >= 38) {
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
    createdAt: new Date()
  };

  db.triagens.push(triagem);
  writeDB(db);

  res.json(triagem);
});

// LISTAR TRIAGENS
app.get("/triagens", (req, res) => {
  const db = readDB();
  res.json(db.triagens);
});

// LISTA DE MEDICAÇÕES
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

// REGISTRAR CONSULTA
app.post("/consulta", (req, res) => {
  const db = readDB();

  const consulta = {
    id: Date.now(),
    paciente: req.body.paciente,
    diagnostico: req.body.diagnostico,
    medicacao: req.body.medicacao,
    obs: req.body.obs,
    createdAt: new Date()
  };

  db.consultas.push(consulta);
  writeDB(db);

  res.json(consulta);
});

// LISTAR MEDICAÇÕES / CONSULTAS REGISTRADAS
app.get("/medicacoes", (req, res) => {
  const db = readDB();
  res.json(db.consultas);
});

// CHAMADA DA TV
app.post("/tv/chamar", (req, res) => {
  const db = readDB();

  const chamada = {
    id: String(Date.now()),
    localTipo: req.body.localTipo,
    localNumero: req.body.localNumero,
    paciente: req.body.paciente,
    hora: new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo"
    })
  };

  db.tv_chamada = chamada;
  db.tv_historico.unshift(chamada);
  db.tv_historico = db.tv_historico.slice(0, 5);

  writeDB(db);

  res.json(chamada);
});

// CONSULTAR CHAMADA ATUAL DA TV
app.get("/tv/chamada", (req, res) => {
  const db = readDB();
  res.json(db.tv_chamada);
});

// HISTÓRICO DE CHAMADAS DA TV
app.get("/tv/historico", (req, res) => {
  const db = readDB();
  res.json(db.tv_historico);
});

// TRATAMENTO DE ERROS
app.use((err, req, res, next) => {
  console.error("Erro no servidor:", err);

  res.status(500).json({
    erro: "Erro interno do servidor"
  });
});

// INICIAR SERVIDOR NO RENDER
const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `🏥 Hospital Sentinela rodando na porta ${PORT}`
    );
  });
}

module.exports = app;
