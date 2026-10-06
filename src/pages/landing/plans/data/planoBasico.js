
/* ==========================================================
   SISTEMA CHEGOU!
   SCC-LANDING-BASICO-01

   Catálogo comercial para apresentação pública.

   IMPORTANTE:
   - Um único plano: BASICO.
   - B1 a B10 são faixas comerciais do mesmo plano.
   - Estes dados NÃO autorizam acessos operacionais.
   - Estes dados NÃO representam uma assinatura ativa.
   - A origem oficial poderá ser integrada ao backend
     após auditoria e homologação.
========================================================== */

export const PLANO_BASICO = Object.freeze({
  id: "basico",
  nome: "Plano Básico",
  statusComercial: "disponivel",

  titulo: "A gestão das suas encomendas começa aqui.",

  descricao:
    "Mais organização para a portaria. Mais praticidade para os moradores. Mais tranquilidade para a administração.",

  apresentacao:
    "O Plano Básico do Sistema Chegou! reúne as principais etapas da operação de encomendas em uma plataforma simples, organizada e segura.",

  moeda: "BRL",
  periodicidade: "mensal",

  precoInicial: 89,
  capacidadeInicial: 100,
});

export const FAIXAS_PLANO_BASICO = Object.freeze([
  {
    id: "B1",
    minimo: 1,
    maximo: 100,
    descricao: "Até 100",
    valorMensal: 89,
  },
  {
    id: "B2",
    minimo: 101,
    maximo: 150,
    descricao: "De 101 a 150",
    valorMensal: 109,
  },
  {
    id: "B3",
    minimo: 151,
    maximo: 200,
    descricao: "De 151 a 200",
    valorMensal: 129,
  },
  {
    id: "B4",
    minimo: 201,
    maximo: 250,
    descricao: "De 201 a 250",
    valorMensal: 149,
  },
  {
    id: "B5",
    minimo: 251,
    maximo: 300,
    descricao: "De 251 a 300",
    valorMensal: 169,
  },
  {
    id: "B6",
    minimo: 301,
    maximo: 400,
    descricao: "De 301 a 400",
    valorMensal: 199,
  },
  {
    id: "B7",
    minimo: 401,
    maximo: 500,
    descricao: "De 401 a 500",
    valorMensal: 229,
  },
  {
    id: "B8",
    minimo: 501,
    maximo: 750,
    descricao: "De 501 a 750",
    valorMensal: 279,
  },
  {
    id: "B9",
    minimo: 751,
    maximo: 1000,
    descricao: "De 751 a 1.000",
    valorMensal: 349,
  },
  {
    id: "B10",
    minimo: 1001,
    maximo: null,
    descricao: "Acima de 1.000",
    valorMensal: null,
  },
]);

export const RECURSOS_PLANO_BASICO = Object.freeze([
  {
    id: "recebimento",
    titulo: "Recebimento e registro",
    descricao:
      "Registro digital das encomendas recebidas pela portaria, com identificação e organização da operação.",
    icone: "Package",
  },
  {
    id: "identificacao",
    titulo: "Identificação e armazenamento",
    descricao:
      "Associação das encomendas às unidades e aos destinatários, com controle da situação de cada item.",
    icone: "Building2",
  },
  {
    id: "notificacoes",
    titulo: "Notificações",
    descricao:
      "Avisos dentro do Sistema Chegou! e comunicação pelo WhatsApp da portaria, conforme os meios disponíveis e o fluxo operacional habilitado.",
    icone: "Bell",
  },
  {
    id: "retirada",
    titulo: "Retirada por token",
    descricao:
      "Controle digital da retirada, com validação do token e registro do responsável pela operação.",
    icone: "KeyRound",
  },
  {
    id: "historico",
    titulo: "Histórico de movimentação",
    descricao:
      "Acompanhamento resumido dos principais registros da encomenda, desde o recebimento na portaria até a retirada.",
    icone: "FileText",
  },
  {
    id: "analise-macro",
    titulo: "Análise Macro",
    descricao:
      "Visão consolidada da operação para apoiar o acompanhamento administrativo, conforme os indicadores disponíveis e homologados.",
    icone: "ChartColumn",
  },
]);

export const CONDICOES_PLANO_BASICO = Object.freeze([
  "A faixa contratada define a capacidade máxima de unidades cadastráveis no sistema.",
  "A quantidade de unidades físicas do condomínio não precisa corresponder à capacidade contratada.",
  "A quantidade de torres não determina isoladamente a mensalidade.",
  "Os valores poderão ser atualizados conforme as condições comerciais e contratuais aplicáveis.",
  "Módulos adicionais e serviços contratados separadamente não estão incluídos na mensalidade apresentada.",
]);

export function formatarValorMensal(valor) {
  if (valor === null || valor === undefined) {
    return "Sob consulta";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export function obterFaixaBasicoPorId(id) {
  return (
    FAIXAS_PLANO_BASICO.find((faixa) => faixa.id === id) ??
    null
  );
}