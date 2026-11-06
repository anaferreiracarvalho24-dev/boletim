// Configuração fixa do aluno
const CONFIG_ALUNO = {
  turma: "9B",
  numeroChamada: 39,
  apiUrl: "https://boletim-api.profbt.com.br"
};

// Sessão atual em memória (não persistida no navegador)
let pinSessao = "";
let dadosAtuais = [];

// Instâncias dos Gráficos Chart.js
let graficoMedias = null;
let graficoEvolucao = null;
let graficoFaltas = null;

// Dados brutos fictícios padronizados para fallback local
const dadosBoletimPadrao = [
  { disciplina: "Língua Portuguesa", tri1: 78, tri2: "8,2", tri3: 8.6, faltas: [2, 2, 1] },
  { disciplina: "Matemática", tri1: 55, tri2: "5,4", tri3: null, faltas: [3, 2, 2] },
  { disciplina: "Ciências", tri1: 84, tri2: 7.9, tri3: "8,3", faltas: [1, 1, 1] },
  { disciplina: "História", tri1: "7,1", tri2: 82, tri3: null, faltas: [1, 2, 1] },
  { disciplina: "Geografia", tri1: 69, tri2: "7,5", tri3: 7.8, faltas: [0, 1, 1] },
  { disciplina: "Língua Inglesa", tri1: 88, tri2: 8.4, tri3: null, faltas: [1, 0, 1] },
  { disciplina: "Arte", tri1: "9,2", tri2: 87, tri3: 9.0, faltas: [1, 1, 0] },
  { disciplina: "Educação Física", tri1: 96, tri2: "9,3", tri3: null, faltas: [0, 1, 0] },
  { disciplina: "Educação Digital", tri1: 91, tri2: 8.9, tri3: "9,4", faltas: [1, 1, 0] },
  { disciplina: "Educação Financeira", tri1: 76, tri2: "7,2", tri3: null, faltas: [1, 1, 1] },
  { disciplina: "Rec. Aprend. Matemática", tri1: 58, tri2: "5,9", tri3: 6.2, faltas: [2, 2, 1] },
  { disciplina: "Leitura Rec. Aprend. Lingua Portuguesa", tri1: 72, tri2: "7,6", tri3: null, faltas: [2, 1, 1] },
  { disciplina: "Pensamento Lógico", tri1: 49, tri2: 5.5, tri3: "5,8", faltas: [2, 2, 2] },
  { disciplina: "Literatura Arte e Movimento", tri1: "8,0", tri2: 84, tri3: null, faltas: [1, 1, 0] },
  { disciplina: "Práticas Experimentais", tri1: 64, tri2: "6,6", tri3: 7.0, faltas: [1, 1, 1] }
];

/**
 * Função para normalizar dados antigos do projeto
 */
function normalizarNota(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }
  let notaString = String(valor).replace(',', '.').trim();
  let notaNum = parseFloat(notaString);
  if (isNaN(notaNum)) {
    return null;
  }
  if (notaNum > 10 && notaNum <= 100) {
    notaNum = notaNum / 10;
  }
  if (notaNum >= 0 && notaNum <= 10) {
    return notaNum;
  }
  return null;
}

/**
 * Validação rigorosa para digitação no modo edição (0 a 10 ou vazio)
 */
function validarNotaDigitada(valor) {
  if (valor === null || valor === undefined) return { valida: true, valor: null };
  const str = String(valor).trim().replace(',', '.');
  if (str === "") return { valida: true, valor: null };
  const num = Number(str);
  if (!isNaN(num) && num >= 0 && num <= 10) {
    return { valida: true, valor: num };
  }
  return { valida: false, valor: null };
}

/**
 * Validação para faltas digitadas (inteiro >= 0)
 */
function validarFaltaDigitada(valor) {
  if (valor === null || valor === undefined) return { valida: false, valor: null };
  const str = String(valor).trim();
  if (str === "") return { valida: false, valor: null };
  const num = Number(str);
  if (Number.isInteger(num) && num >= 0) {
    return { valida: true, valor: num };
  }
  return { valida: false, valor: null };
}

// Acesso via API
async function fazerLogin() {
  const campoPin = document.getElementById("campo-pin");
  const mensagem = document.getElementById("mensagem-login");
  const pinDigitado = campoPin.value.trim();

  if (!pinDigitado) {
    mensagem.style.color = "#f85149";
    mensagem.innerText = "Por favor, digite o PIN.";
    return;
  }

  mensagem.style.color = "#8b949e";
  mensagem.innerText = "Conectando...";

  try {
    const resposta = await fetch(`${CONFIG_ALUNO.apiUrl}/api/v1/boletins/abrir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        turma: CONFIG_ALUNO.turma,
        numero_chamada: CONFIG_ALUNO.numeroChamada,
        pin: pinDigitado
      })
    });

    if (resposta.status === 401) {
      mensagem.style.color = "#f85149";
      mensagem.innerText = "Turma, chamada ou PIN inválidos.";
      return;
    }

    if (resposta.status === 429) {
      mensagem.style.color = "#f85149";
      mensagem.innerText = "Muitas tentativas. Aguarde um minuto e tente novamente.";
      return;
    }

    if (!resposta.ok) {
      mensagem.style.color = "#f85149";
      mensagem.innerText = "Não foi possível conectar ao servidor. Tente novamente.";
      return;
    }

    const resultado = await resposta.json();
    pinSessao = pinDigitado;
    campoPin.value = ""; // Limpa a senha por segurança

    if (resultado.dados && Array.isArray(resultado.dados.disciplinas) && resultado.dados.disciplinas.length > 0) {
      dadosAtuais = resultado.dados.disciplinas;
    } else {
      dadosAtuais = JSON.parse(JSON.stringify(dadosBoletimPadrao));
    }

    document.getElementById("area-login").style.display = "none";
    document.getElementById("conteudo-boletim").style.display = "block";
    renderizarBoletim();
    atualizarGraficos();

  } catch (erro) {
    mensagem.style.color = "#f85149";
    mensagem.innerText = "Não foi possível conectar ao servidor. Tente novamente.";
  }
}

// Renderiza Cards e Tabela
function renderizarBoletim() {
  const corpoTabela = document.getElementById("corpo-tabela");
  corpoTabela.innerHTML = "";

  let somaMediasGerais = 0;
  let disciplinasComMedia = 0;
  let totalFaltasGeral = 0;
  let contBomDesempenho = 0;
  let contAtencao = 0;

  dadosAtuais.forEach(item => {
    const n1 = normalizarNota(item.tri1);
    const n2 = normalizarNota(item.tri2);
    const n3 = normalizarNota(item.tri3);

    const faltasArray = Array.isArray(item.faltas) ? item.faltas : [0, 0, 0];
    const totalFaltasMateria = faltasArray.reduce((a, b) => a + Number(b), 0);
    totalFaltasGeral += totalFaltasMateria;

    let somaNotas = 0;
    let qtdNotas = 0;

    if (n1 !== null) { somaNotas += n1; qtdNotas++; }
    if (n2 !== null) { somaNotas += n2; qtdNotas++; }
    if (n3 !== null) { somaNotas += n3; qtdNotas++; }

    let mediaFinal = null;
    let situacaoTexto = "Nota ainda não disponível";
    let situacaoClasse = "situacao-indisponivel";

    if (qtdNotas > 0) {
      mediaFinal = somaNotas / qtdNotas;
      somaMediasGerais += mediaFinal;
      disciplinasComMedia++;

      if (mediaFinal >= 6.0) {
        situacaoTexto = "Bom desempenho";
        situacaoClasse = "situacao-bom";
        contBomDesempenho++;
      } else {
        situacaoTexto = "Atenção";
        situacaoClasse = "situacao-atencao";
        contAtencao++;
      }
    }

    const txt1 = n1 !== null ? n1.toFixed(1).replace('.', ',') : "—";
    const txt2 = n2 !== null ? n2.toFixed(1).replace('.', ',') : "—";
    const txt3 = n3 !== null ? n3.toFixed(1).replace('.', ',') : "—";
    const txtMedia = mediaFinal !== null ? mediaFinal.toFixed(1).replace('.', ',') : "—";

    const tr = document.createElement("tr");

    const tdNome = document.createElement("td");
    const strong = document.createElement("strong");
    strong.textContent = item.disciplina;
    tdNome.appendChild(strong);
    tr.appendChild(tdNome);

    const tdTri1 = document.createElement("td");
    tdTri1.textContent = txt1;
    tr.appendChild(tdTri1);

    const tdTri2 = document.createElement("td");
    tdTri2.textContent = txt2;
    tr.appendChild(tdTri2);

    const tdTri3 = document.createElement("td");
    tdTri3.textContent = txt3;
    tr.appendChild(tdTri3);

    const tdMedia = document.createElement("td");
    const strongMedia = document.createElement("strong");
    strongMedia.textContent = txtMedia;
    tdMedia.appendChild(strongMedia);
    tr.appendChild(tdMedia);

    const tdFaltas = document.createElement("td");
    tdFaltas.textContent = totalFaltasMateria;
    tr.appendChild(tdFaltas);

    const tdSit = document.createElement("td");
    tdSit.className = situacaoClasse;
    tdSit.textContent = situacaoTexto;
    tr.appendChild(tdSit);

    corpoTabela.appendChild(tr);
  });

  const mediaGeralCalculada = disciplinasComMedia > 0 ? (somaMediasGerais / disciplinasComMedia).toFixed(1).replace('.', ',') : "—";
  
  document.getElementById("media-geral").textContent = mediaGeralCalculada;
  document.getElementById("total-faltas").textContent = totalFaltasGeral;
  document.getElementById("bom-desempenho").textContent = contBomDesempenho;
  document.getElementById("precisa-atencao").textContent = contAtencao;

  // NOTA: A frequência de 92% exibida no HTML é APENAS DEMONSTRATIVA/FICTÍCIA nesta versão.
}

// Controle do Painel de Edição
function alternarModoEdicao() {
  const areaEdicao = document.getElementById("area-edicao");
  if (areaEdicao.style.display === "none") {
    montarFormularioEdicao();
    areaEdicao.style.display = "block";
    areaEdicao.scrollIntoView({ behavior: 'smooth' });
  } else {
    areaEdicao.style.display = "none";
  }
}

function cancelarEdicao() {
  document.getElementById("area-edicao").style.display = "none";
  document.getElementById("mensagem-salvar").textContent = "";
}

function montarFormularioEdicao() {
  const container = document.getElementById("container-formulario-edicao");
  container.innerHTML = "";

  dadosAtuais.forEach((item, index) => {
    const divMat = document.createElement("div");
    divMat.className = "item-edicao-materia";

    const title = document.createElement("h4");
    title.textContent = item.disciplina;
    divMat.appendChild(title);

    const n1 = normalizarNota(item.tri1);
    const n2 = normalizarNota(item.tri2);
    const n3 = normalizarNota(item.tri3);

    const faltasArray = Array.isArray(item.faltas) ? item.faltas : [0, 0, 0];

    const gridNotas = document.createElement("div");
    gridNotas.className = "campos-notas-grid";
    gridNotas.innerHTML = `
      <div class="campo-pequeno">
        <label>1º Tri (Nota)</label>
        <input type="text" id="edit-n1-${index}" value="${n1 !== null ? n1 : ''}" placeholder="Ex: 7.5">
      </div>
      <div class="campo-pequeno">
        <label>2º Tri (Nota)</label>
        <input type="text" id="edit-n2-${index}" value="${n2 !== null ? n2 : ''}" placeholder="Ex: 8.0">
      </div>
      <div class="campo-pequeno">
        <label>3º Tri (Nota)</label>
        <input type="text" id="edit-n3-${index}" value="${n3 !== null ? n3 : ''}" placeholder="Ex: 9.2">
      </div>
    `;
    divMat.appendChild(gridNotas);

    const gridFaltas = document.createElement("div");
    gridFaltas.className = "campos-faltas-grid";
    gridFaltas.innerHTML = `
      <div class="campo-pequeno">
        <label>1º Tri (Faltas)</label>
        <input type="number" id="edit-f1-${index}" value="${faltasArray[0] !== undefined ? faltasArray[0] : 0}">
      </div>
      <div class="campo-pequeno">
        <label>2º Tri (Faltas)</label>
        <input type="number" id="edit-f2-${index}" value="${faltasArray[1] !== undefined ? faltasArray[1] : 0}">
      </div>
      <div class="campo-pequeno">
        <label>3º Tri (Faltas)</label>
        <input type="number" id="edit-f3-${index}" value="${faltasArray[2] !== undefined ? faltasArray[2] : 0}">
      </div>
    `;
    divMat.appendChild(gridFaltas);

    container.appendChild(divMat);
  });
}

// Salvar via PUT API
async function salvarAlteracoes() {
  const mensagem = document.getElementById("mensagem-salvar");
  mensagem.textContent = "";

  // Remove marcações de erro prévias
  document.querySelectorAll(".campo-invalido").forEach(el => el.classList.remove("campo-invalido"));

  let possuiErro = false;
  const novasDisciplinas = [];

  for (let i = 0; i < dadosAtuais.length; i++) {
    const inputN1 = document.getElementById(`edit-n1-${i}`);
    const inputN2 = document.getElementById(`edit-n2-${i}`);
    const inputN3 = document.getElementById(`edit-n3-${i}`);

    const inputF1 = document.getElementById(`edit-f1-${i}`);
    const inputF2 = document.getElementById(`edit-f2-${i}`);
    const inputF3 = document.getElementById(`edit-f3-${i}`);

    const vN1 = validarNotaDigitada(inputN1.value);
    const vN2 = validarNotaDigitada(inputN2.value);
    const vN3 = validarNotaDigitada(inputN3.value);

    const vF1 = validarFaltaDigitada(inputF1.value);
    const vF2 = validarFaltaDigitada(inputF2.value);
    const vF3 = validarFaltaDigitada(inputF3.value);

    if (!vN1.valida) { inputN1.classList.add("campo-invalido"); possuiErro = true; }
    if (!vN2.valida) { inputN2.classList.add("campo-invalido"); possuiErro = true; }
    if (!vN3.valida) { inputN3.classList.add("campo-invalido"); possuiErro = true; }

    if (!vF1.valida) { inputF1.classList.add("campo-invalido"); possuiErro = true; }
    if (!vF2.valida) { inputF2.classList.add("campo-invalido"); possuiErro = true; }
    if (!vF3.valida) { inputF3.classList.add("campo-invalido"); possuiErro = true; }

    novasDisciplinas.push({
      disciplina: dadosAtuais[i].disciplina,
      tri1: vN1.valor,
      tri2: vN2.valor,
      tri3: vN3.valor,
      faltas: [vF1.valor, vF2.valor, vF3.valor]
    });
  }

  if (possuiErro) {
    mensagem.style.color = "#f85149";
    mensagem.textContent = "Existem campos com valores inválidos (notas de 0 a 10 e faltas números inteiros).";
    return;
  }

  mensagem.style.color = "#8b949e";
  mensagem.textContent = "Salvando...";

  try {
    const resposta = await fetch(`${CONFIG_ALUNO.apiUrl}/api/v1/boletins/salvar`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        turma: CONFIG_ALUNO.turma,
        numero_chamada: CONFIG_ALUNO.numeroChamada,
        pin: pinSessao,
        dados: {
          disciplinas: novasDisciplinas
        }
      })
    });

    if (!resposta.ok) {
      mensagem.style.color = "#f85149";
      mensagem.textContent = "Não foi possível salvar os dados no servidor.";
      return;
    }

    dadosAtuais = novasDisciplinas;
    renderizarBoletim();
    atualizarGraficos();

    mensagem.style.color = "#3fb950";
    mensagem.textContent = "Dados salvos com sucesso!";

    setTimeout(() => {
      document.getElementById("area-edicao").style.display = "none";
      mensagem.textContent = "";
    }, 1500);

  } catch (erro) {
    mensagem.style.color = "#f85149";
    mensagem.textContent = "Falha ao conectar com o servidor. Tente novamente.";
  }
}

// -------------------------------------------------------------
// FUNÇÕES EXCLUSIVAS DOS GRÁFICOS (SOMENTE LEITURA DO ESTADO)
// -------------------------------------------------------------

function atualizarGraficoMedias() {
  const ctx = document.getElementById("graficoMediasDisciplinas");
  if (!ctx) return;

  const labels = [];
  const valores = [];

  dadosAtuais.forEach(item => {
    labels.push(item.disciplina);

    const n1 = normalizarNota(item.tri1);
    const n2 = normalizarNota(item.tri2);
    const n3 = normalizarNota(item.tri3);

    let soma = 0;
    let qtd = 0;

    if (n1 !== null) { soma += n1; qtd++; }
    if (n2 !== null) { soma += n2; qtd++; }
    if (n3 !== null) { soma += n3; qtd++; }

    if (qtd > 0) {
      valores.push(Number((soma / qtd).toFixed(1)));
    } else {
      valores.push(null);
    }
  });

  if (graficoMedias) {
    graficoMedias.destroy();
  }

  graficoMedias = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Média',
        data: valores,
        backgroundColor: '#1f6feb',
        borderColor: '#58a6ff',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.raw;
              if (val === null || val === undefined) return ' Média: —';
              return ' Média: ' + String(val).replace('.', ',');
            }
          }
        }
      },
      scales: {
        x: {
          min: 0,
          max: 10,
          grid: { color: '#21262d' },
          ticks: { color: '#8b949e' }
        },
        y: {
          grid: { display: false },
          ticks: { color: '#e6edf3', font: { size: 10 } }
        }
      }
    }
  });
}

function atualizarGraficoEvolucao() {
  const ctx = document.getElementById("graficoEvolucaoTrimestres");
  if (!ctx) return;

  let soma1 = 0, count1 = 0;
  let soma2 = 0, count2 = 0;
  let soma3 = 0, count3 = 0;

  dadosAtuais.forEach(item => {
    const n1 = normalizarNota(item.tri1);
    const n2 = normalizarNota(item.tri2);
    const n3 = normalizarNota(item.tri3);

    if (n1 !== null) { soma1 += n1; count1++; }
    if (n2 !== null) { soma2 += n2; count2++; }
    if (n3 !== null) { soma3 += n3; count3++; }
  });

  const mediaTri1 = count1 > 0 ? Number((soma1 / count1).toFixed(1)) : null;
  const mediaTri2 = count2 > 0 ? Number((soma2 / count2).toFixed(1)) : null;
  const mediaTri3 = count3 > 0 ? Number((soma3 / count3).toFixed(1)) : null;

  if (graficoEvolucao) {
    graficoEvolucao.destroy();
  }

  graficoEvolucao = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['1º Tri', '2º Tri', '3º Tri'],
      datasets: [{
        label: 'Média Geral',
        data: [mediaTri1, mediaTri2, mediaTri3],
        borderColor: '#58a6ff',
        backgroundColor: 'rgba(88, 166, 255, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 5,
        pointBackgroundColor: '#1f6feb'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.raw;
              if (val === null || val === undefined) return ' Média Geral: —';
              return ' Média Geral: ' + String(val).replace('.', ',');
            }
          }
        }
      },
      scales: {
        y: {
          min: 0,
          max: 10,
          grid: { color: '#21262d' },
          ticks: { color: '#8b949e' }
        },
        x: {
          grid: { color: '#21262d' },
          ticks: { color: '#e6edf3' }
        }
      }
    }
  });
}

function atualizarGraficoFaltas() {
  const ctx = document.getElementById("graficoFaltasTrimestres");
  if (!ctx) return;

  let f1 = 0;
  let f2 = 0;
  let f3 = 0;

  dadosAtuais.forEach(item => {
    const faltasArray = Array.isArray(item.faltas) ? item.faltas : [0, 0, 0];
    f1 += Number(faltasArray[0] || 0);
    f2 += Number(faltasArray[1] || 0);
    f3 += Number(faltasArray[2] || 0);
  });

  const totalFaltasAcumuladas = f1 + f2 + f3;
  const cardFaltas = document.getElementById("cardFaltas");
  const badgePerigo = document.getElementById("badgePerigo");

  if (cardFaltas && badgePerigo) {
    if (totalFaltasAcumuladas >= 350) {
      cardFaltas.classList.add("card-perigo");
      badgePerigo.style.display = "inline-block";
    } else {
      cardFaltas.classList.remove("card-perigo");
      badgePerigo.style.display = "none";
    }
  }

  if (graficoFaltas) {
    graficoFaltas.destroy();
  }

  graficoFaltas = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['1º Tri', '2º Tri', '3º Tri'],
      datasets: [{
        label: 'Faltas',
        data: [f1, f2, f3],
        backgroundColor: '#f85149',
        borderColor: '#f85149',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return ' ' + context.raw + ' faltas';
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: '#21262d' },
          ticks: { color: '#8b949e', stepSize: 1 }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#e6edf3' }
        }
      }
    }
  });
}

function atualizarGraficos() {
  atualizarGraficoMedias();
  atualizarGraficoEvolucao();
  atualizarGraficoFaltas();
}