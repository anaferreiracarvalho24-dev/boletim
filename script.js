// Dados brutos fictícios das disciplinas do 9º Ano
const dadosBoletim = [
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
 * Função para normalizar qualquer formato de nota para a escala de 0 a 10.
 */
function normalizarNota(valor) {
  // Trata valores ausentes, nulos ou indefinidos
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  // Converte texto com vírgula para número com ponto
  let notaString = String(valor).replace(',', '.').trim();
  let notaNum = parseFloat(notaString);

  // Se não for um número válido, descarta
  if (isNaN(notaNum)) {
    return null;
  }

  // Ajusta notas acima de 10 (ex: 85 vira 8.5, 100 vira 10.0)
  if (notaNum > 10 && notaNum <= 100) {
    notaNum = notaNum / 10;
  }

  // Garante que a nota final esteja no intervalo permitido (0 a 10)
  if (notaNum >= 0 && notaNum <= 10) {
    return notaNum;
  }

  return null;
}

// Função principal que carrega os dados e atualiza a tela
function carregarBoletim() {
  const corpoTabela = document.getElementById("corpo-tabela");
  
  let somaMediasGerais = 0;
  let disciplinasComMedia = 0;
  let totalFaltasGeral = 0;
  let contBomDesempenho = 0;
  let contAtencao = 0;

  // Processa cada disciplina da lista
  dadosBoletim.forEach(item => {
    // Normalização das notas dos trimestres
    const n1 = normalizarNota(item.tri1);
    const n2 = normalizarNota(item.tri2);
    const n3 = normalizarNota(item.tri3);

    // Soma das faltas do ano na matéria
    const totalFaltasMateria = item.faltas.reduce((a, b) => a + b, 0);
    totalFaltasGeral += totalFaltasMateria;

    // Cálculo da média individual considerando apenas notas existentes
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

    // Formatação dos textos das notas para a tabela
    const txt1 = n1 !== null ? n1.toFixed(1).replace('.', ',') : "—";
    const txt2 = n2 !== null ? n2.toFixed(1).replace('.', ',') : "—";
    const txt3 = n3 !== null ? n3.toFixed(1).replace('.', ',') : "—";
    const txtMedia = mediaFinal !== null ? mediaFinal.toFixed(1).replace('.', ',') : "—";

    // Criação da linha na tabela via DOM
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${item.disciplina}</strong></td>
      <td>${txt1}</td>
      <td>${txt2}</td>
      <td>${txt3}</td>
      <td><strong>${txtMedia}</strong></td>
      <td>${totalFaltasMateria}</td>
      <td class="${situacaoClasse}">${situacaoTexto}</td>
    `;
    corpoTabela.appendChild(tr);
  });

  // Atualização dos Cards de Resumo
  const mediaGeralCalculada = disciplinasComMedia > 0 ? (somaMediasGerais / disciplinasComMedia).toFixed(1).replace('.', ',') : "—";
  
  document.getElementById("media-geral").innerText = mediaGeralCalculada;
  document.getElementById("total-faltas").innerText = totalFaltasGeral;
  document.getElementById("bom-desempenho").innerText = contBomDesempenho;
  document.getElementById("precisa-atencao").innerText = contAtencao;

  // NOTA: A frequência de 92% exibida no HTML é APENAS DEMONSTRATIVA/FICTÍCIA nesta versão e será tratada via cálculo dinâmico futuramente.
}

// Executa o carregamento assim que a página estiver pronta
document.addEventListener("DOMContentLoaded", carregarBoletim);