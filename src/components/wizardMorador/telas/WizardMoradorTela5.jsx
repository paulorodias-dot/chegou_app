import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Car,
  Check,
  Edit3,
  HelpCircle,
  Home,
  Info,
  ParkingCircle,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

import "../../../styles/wizardMorador/WizardMoradorTela5.css";

import veiculoUnidadeImg from "../../../assets/veiculo_de_unidade.png";
import vagasGaragemImg from "../../../assets/vagas_de_garagem.png";

const estruturaInicial = {
  possuiVeiculo: false,
  veiculos: [],
  possuiVaga: false,
  vagas: [],
  garagemSituacao: "",
  garagemModalidade: "",
  garagemUsos: [],
};

const veiculoInicial = {
  id: null,
  placa: "",
  tipo: "",
  marca: "",
  modelo: "",
  cor: "",
  ano: "",
  combustivel: "",
  portas: "",
};

const vagaInicial = {
  id: null,
  origemVaga: "",
  identificacao: "",
  local: "",
  situacao: "",
  modalidadeUso: "",
  observacoes: "",
  idVeiculo: "",
  unidadeUsoConhecida: null,
};

const OPCOES_USO_GARAGEM = [
  {
    valor: "unidade_possui_vagas",
    titulo: "Minha unidade possui uma ou mais vagas",
    texto:
      "Inclua vagas da unidade que estejam em uso, alugadas, emprestadas, sem uso ou em outra situação.",
    icon: Home,
    exclusiva: false,
  },
  {
    valor: "usa_vaga_outra_unidade",
    titulo: "Uso vaga de outra unidade",
    texto:
      "Inclua vagas de outra unidade que você utiliza por aluguel, empréstimo ou outra autorização.",
    icon: ParkingCircle,
    exclusiva: false,
  },
  {
    valor: "rotativa",
    titulo: "Uso vagas rotativas",
    texto: "Utilizo vagas sem número fixo definido para a minha unidade.",
    icon: RotateCcw,
    exclusiva: false,
  },
  {
    valor: "nao_possui",
    titulo: "Não utilizo vaga de garagem",
    texto: "No momento, não utilizo vaga de garagem.",
    icon: X,
    exclusiva: true,
  },
  {
    valor: "nao_sei",
    titulo: "Não sei informar",
    texto: "Posso completar esta informação posteriormente.",
    icon: HelpCircle,
    exclusiva: true,
  },
];

const OPCOES_ORIGEM_VAGA = [
  {
    valor: "minha_unidade",
    titulo: "Vaga da minha unidade",
    texto: "A vaga pertence ou está vinculada à unidade deste cadastro.",
  },
  {
    valor: "outra_unidade",
    titulo: "Vaga que utilizo de outra unidade",
    texto: "A vaga pertence a outra unidade e é utilizada por você.",
  },
];

const SITUACOES_MINHA_UNIDADE = [
  {
    valor: "propria_em_uso",
    situacao: "propria_em_uso",
    modalidadeUso: "propria",
    titulo: "Uso esta vaga",
    texto: "A vaga pertence à unidade e está sendo utilizada por você.",
    permiteVeiculo: true,
  },
  {
    valor: "propria_alugada_terceiro",
    situacao: "propria_alugada_terceiro",
    modalidadeUso: "propria_alugada_terceiro",
    titulo: "Esta vaga está alugada para outra unidade",
    texto: "A vaga pertence à unidade, mas outra unidade a utiliza por aluguel.",
    permiteVeiculo: false,
  },
  {
    valor: "propria_emprestada_terceiro",
    situacao: "propria_emprestada_terceiro",
    modalidadeUso: "propria_emprestada_terceiro",
    titulo: "Esta vaga está emprestada para outra unidade",
    texto: "A vaga pertence à unidade, mas foi cedida para uso de outra pessoa ou unidade.",
    permiteVeiculo: false,
  },
  {
    valor: "sem_uso",
    situacao: "sem_uso",
    modalidadeUso: "propria_sem_uso",
    titulo: "Esta vaga está sem uso",
    texto: "A vaga pertence à unidade, mas não está sendo utilizada agora.",
    permiteVeiculo: false,
  },
  {
    valor: "outro_minhas_vagas",
    situacao: "outro",
    modalidadeUso: "outro",
    titulo: "Outra situação",
    texto: "Informe os detalhes para que a administração compreenda como esta vaga é utilizada.",
    permiteVeiculo: true,
  },
];

const SITUACOES_OUTRA_UNIDADE = [
  {
    valor: "vaga_alugada_de_terceiro",
    situacao: "uso_vaga_terceiro",
    modalidadeUso: "alugada",
    titulo: "Uso uma vaga alugada",
    texto: "A vaga pertence a outra unidade e você paga pelo uso.",
    permiteVeiculo: true,
  },
  {
    valor: "vaga_emprestada_de_terceiro",
    situacao: "uso_vaga_terceiro",
    modalidadeUso: "emprestada",
    titulo: "Uso uma vaga emprestada",
    texto: "A vaga pertence a outra unidade e foi cedida para o seu uso.",
    permiteVeiculo: true,
  },
  {
    valor: "outro_outra_unidade",
    situacao: "uso_vaga_terceiro",
    modalidadeUso: "outro",
    titulo: "Outra situação",
    texto: "Informe os detalhes sobre a autorização de uso desta vaga.",
    permiteVeiculo: true,
  },
];

const LOCAIS_VAGA = [
  "Térreo",
  "1º Subsolo",
  "2º Subsolo",
  "3º Subsolo",
  "Garagem externa",
  "Cobertura",
  "Outro",
];

const TIPOS_VEICULO = ["Automóvel", "Moto", "SUV", "Caminhonete", "Van", "Outro"];
const COMBUSTIVEIS = ["Flex", "Gasolina", "Etanol", "Diesel", "Híbrido", "Elétrico", "Outro"];
const PORTAS = ["2 portas", "3 portas", "4 portas", "5 portas"];

function somenteNumeros(valor = "") {
  return String(valor).replace(/\D/g, "");
}

function capitalizarTexto(valor = "") {
  return String(valor)
    .trimStart()
    .toLowerCase()
    .replace(/(^|\s|-|')([\p{L}0-9]+)/gu, (_, sep, palavra) =>
      `${sep}${palavra.charAt(0).toUpperCase()}${palavra.slice(1)}`
    );
}

function gerarId(prefixo = "tmp") {
  return `${prefixo}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizarPlaca(valor = "") {
  return String(valor).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
}

function formatarPlaca(valor = "") {
  const limpa = normalizarPlaca(valor);
  if (!limpa) return "";
  if (/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(limpa)) return limpa;
  if (/^[A-Z]{3}[0-9]{1,4}$/.test(limpa)) {
    return limpa.length > 3 ? `${limpa.slice(0, 3)}-${limpa.slice(3)}` : limpa;
  }
  return limpa;
}

function validarPlaca(valor = "") {
  const limpa = normalizarPlaca(valor);
  return /^[A-Z]{3}[0-9]{4}$/.test(limpa) || /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(limpa);
}

function validarAno(valor = "") {
  if (!valor) return true;
  const ano = Number(valor);
  const anoAtual = new Date().getFullYear();
  return Number.isInteger(ano) && ano >= 1900 && ano <= anoAtual + 1;
}

function traduzirPerfil(perfil = "") {
  const mapa = {
    proprietario_residente: "Proprietário residente",
    proprietario_morador: "Proprietário residente",
    proprietario_nao_residente: "Proprietário não residente",
    proprietario_unidade_alugada: "Proprietário não residente",
    inquilino: "Morador inquilino",
    responsavel_unidade_corporativa: "Responsável por unidade corporativa",
    unidade_vazia: "Responsável por unidade vazia",
  };
  return mapa[perfil] || "Não informado";
}

function obterResumo(dadosWizard, formTela1, formMorador) {
  const pre = dadosWizard?.preCadastro || dadosWizard?.pre_cadastro || {};
  const perfil =
    formTela1?.perfilUnidade ||
    formTela1?.perfil_unidade ||
    formTela1?.relacaoUnidade ||
    pre.perfil_unidade ||
    pre.relacao_unidade ||
    dadosWizard?.perfil_unidade ||
    "";

  return {
    torre:
      pre.torre_nome || pre.torre || pre.bloco_nome || pre.bloco ||
      dadosWizard?.torre_nome || dadosWizard?.torre || dadosWizard?.bloco ||
      "Torre / bloco não informado",
    unidade:
      pre.unidade_nome || pre.unidade || dadosWizard?.unidade_nome ||
      dadosWizard?.unidade || "Unidade não informada",
    perfil: traduzirPerfil(perfil),
    morador:
      formMorador?.nomeSocial || formMorador?.nomeCompleto || pre.nome || "Não informado",
  };
}

function veiculoDescricao(veiculo = {}) {
  return [veiculo.marca, veiculo.modelo, veiculo.cor, veiculo.ano].filter(Boolean).join(" • ");
}

function origemVagaCompativel(vaga = {}) {
  if (vaga?.origemVaga) return vaga.origemVaga;
  if (["propria", "propria_alugada_terceiro", "propria_emprestada_terceiro", "propria_sem_uso"].includes(vaga?.modalidadeUso)) {
    return "minha_unidade";
  }
  if (["alugada", "emprestada"].includes(vaga?.modalidadeUso)) return "outra_unidade";
  return "";
}

function origemVagaLabel(vaga = {}) {
  return origemVagaCompativel(vaga) === "minha_unidade"
    ? "Vaga da minha unidade"
    : origemVagaCompativel(vaga) === "outra_unidade"
      ? "Vaga de outra unidade"
      : "Vaga";
}

function situacaoVagaLabel(vaga = {}) {
  const todas = [...SITUACOES_MINHA_UNIDADE, ...SITUACOES_OUTRA_UNIDADE];
  const encontrada = todas.find(
    (item) => item.situacao === vaga?.situacao && item.modalidadeUso === vaga?.modalidadeUso
  );
  return encontrada?.titulo || "Situação informada";
}

function situacaoPermiteVeiculo(vaga = {}) {
  const origem = origemVagaCompativel(vaga);
  if (origem === "outra_unidade") return true;
  if (origem === "minha_unidade") return ["propria_em_uso", "outro"].includes(vaga?.situacao);
  return false;
}

function normalizarUsosGaragem(estrutura = {}) {
  if (Array.isArray(estrutura?.garagemUsos) && estrutura.garagemUsos.length > 0) {
    return [...new Set(estrutura.garagemUsos.filter(Boolean))];
  }

  const usos = [];
  if (estrutura?.garagemSituacao === "rotativa") usos.push("rotativa");
  else if (estrutura?.garagemSituacao === "nao_possui") usos.push("nao_possui");
  else if (estrutura?.garagemSituacao === "nao_sei") usos.push("nao_sei");
  else if (estrutura?.garagemSituacao === "possui_vaga") {
    const vagas = Array.isArray(estrutura?.vagas) ? estrutura.vagas : [];
    const possuiMinha = vagas.some((vaga) => origemVagaCompativel(vaga) === "minha_unidade");
    const possuiOutra = vagas.some((vaga) => origemVagaCompativel(vaga) === "outra_unidade");
    if (possuiMinha) usos.push("unidade_possui_vagas");
    if (possuiOutra) usos.push("usa_vaga_outra_unidade");
    if (!possuiMinha && !possuiOutra) {
      if (estrutura?.garagemModalidade === "propria") usos.push("unidade_possui_vagas");
      else if (["alugada", "emprestada"].includes(estrutura?.garagemModalidade)) usos.push("usa_vaga_outra_unidade");
      else usos.push("unidade_possui_vagas");
    }
  }
  return usos;
}

function calcularResumoGaragem(usos = [], vagas = []) {
  if (usos.includes("nao_possui")) {
    return { garagemSituacao: "nao_possui", garagemModalidade: "nao_utiliza", possuiVaga: false };
  }
  if (usos.includes("nao_sei")) {
    return { garagemSituacao: "nao_sei", garagemModalidade: "nao_sei", possuiVaga: false };
  }

  const possuiVagaFixa = usos.includes("unidade_possui_vagas") || usos.includes("usa_vaga_outra_unidade");
  if (!possuiVagaFixa && usos.includes("rotativa")) {
    return { garagemSituacao: "rotativa", garagemModalidade: "rotativa", possuiVaga: false };
  }
  if (possuiVagaFixa) {
    const modalidades = new Set(vagas.map((vaga) => vaga?.modalidadeUso).filter(Boolean));
    let garagemModalidade = "mista";
    if (modalidades.size === 1) garagemModalidade = Array.from(modalidades)[0];
    else if (modalidades.size === 0 && usos.length === 1 && usos[0] === "unidade_possui_vagas") {
      garagemModalidade = "propria";
    }
    return { garagemSituacao: "possui_vaga", garagemModalidade, possuiVaga: vagas.length > 0 };
  }
  return { garagemSituacao: "", garagemModalidade: "", possuiVaga: false };
}

function montarPayloadTela5({ estrutura }) {
  const veiculos = Array.isArray(estrutura?.veiculos) ? estrutura.veiculos : [];
  const vagas = Array.isArray(estrutura?.vagas) ? estrutura.vagas : [];
  const garagemUsos = normalizarUsosGaragem(estrutura);
  const resumoGaragem = calcularResumoGaragem(garagemUsos, vagas);

  return {
    tela5: {
      garagem_usos: garagemUsos,
      garagem_situacao: resumoGaragem.garagemSituacao,
      garagem_modalidade: resumoGaragem.garagemModalidade,
      possui_veiculo: veiculos.length > 0,
      possui_vaga: vagas.length > 0,
      veiculos: veiculos.map((veiculo) => ({
        id: veiculo.id,
        placa: veiculo.placa,
        placa_normalizada: normalizarPlaca(veiculo.placa),
        tipo: veiculo.tipo,
        marca: veiculo.marca,
        modelo: veiculo.modelo,
        cor: veiculo.cor,
        ano: veiculo.ano || null,
        combustivel: veiculo.combustivel || "",
        portas: veiculo.portas || "",
      })),
      vagas: vagas.map((vaga) => ({
        id: vaga.id,
        origem_vaga: origemVagaCompativel(vaga),
        identificacao: vaga.identificacao,
        local: vaga.local,
        situacao: vaga.situacao,
        modalidade_uso: vaga.modalidadeUso || null,
        propriedade_vaga:
          origemVagaCompativel(vaga) === "minha_unidade"
            ? "propria"
            : origemVagaCompativel(vaga) === "outra_unidade"
              ? "terceiro"
              : null,
        observacoes: vaga.observacoes || "",
        id_veiculo: situacaoPermiteVeiculo(vaga) ? vaga.idVeiculo || null : null,
        unidade_uso_conhecida: vaga.unidadeUsoConhecida || null,
      })),
    },
  };
}

function faqTela5() {
  return [
    {
      pergunta: "Posso ter mais de um tipo de uso de garagem?",
      resposta: "Sim. Por exemplo, sua unidade pode possuir uma vaga e você também pode utilizar uma vaga de outra unidade.",
    },
    {
      pergunta: "E se eu usar vagas rotativas?",
      resposta: "Selecione “Uso vagas rotativas”. Se essa for sua única situação, não será necessário cadastrar um número fixo de vaga.",
    },
    {
      pergunta: "Posso cadastrar mais de um veículo?",
      resposta: "Sim. Cadastre os veículos que você utiliza. Cada veículo pode ficar vinculado a somente uma vaga em uso por vez.",
    },
    {
      pergunta: "E se uma vaga da minha unidade estiver alugada?",
      resposta: "Cadastre a vaga e marque que ela está alugada para outra unidade. Nesse caso, não será necessário vincular um dos seus veículos.",
    },
  ];
}

export default function WizardMoradorTela5({
  dadosWizard,
  formTela1,
  formMorador,
  estrutura = estruturaInicial,
  setEstrutura,
  onBack,
  onNext,
  onSaveDraft,
}) {
  const estruturaSegura = {
    ...estruturaInicial,
    ...(estrutura || {}),
    veiculos: Array.isArray(estrutura?.veiculos) ? estrutura.veiculos : [],
    vagas: Array.isArray(estrutura?.vagas) ? estrutura.vagas : [],
    garagemUsos: normalizarUsosGaragem(estrutura),
  };

  const veiculos = estruturaSegura.veiculos;
  const vagas = estruturaSegura.vagas;
  const garagemUsos = estruturaSegura.garagemUsos;

  const [modalVeiculoAberto, setModalVeiculoAberto] = useState(false);
  const [modalVagaAberto, setModalVagaAberto] = useState(false);
  const [veiculoAtual, setVeiculoAtual] = useState(null);
  const [vagaAtual, setVagaAtual] = useState(null);
  const [camposInvalidos, setCamposInvalidos] = useState({});
  const [modalExcluirVeiculo, setModalExcluirVeiculo] = useState(null);
  const [modalExcluirVaga, setModalExcluirVaga] = useState(null);
  const [processando, setProcessando] = useState(false);
  const [salvandoRascunho, setSalvandoRascunho] = useState(false);

  const resumo = useMemo(
    () => obterResumo(dadosWizard, formTela1, formMorador),
    [dadosWizard, formTela1, formMorador]
  );

  const possuiCategoriaVagaFixa =
    garagemUsos.includes("unidade_possui_vagas") ||
    garagemUsos.includes("usa_vaga_outra_unidade");

  const algumModalAberto = Boolean(
    modalVeiculoAberto || modalVagaAberto || modalExcluirVeiculo || modalExcluirVaga
  );

  useEffect(() => {
    if (!algumModalAberto) return undefined;

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function fecharComEsc(event) {
      if (event.key !== "Escape") return;
      if (modalExcluirVeiculo) return setModalExcluirVeiculo(null);
      if (modalExcluirVaga) return setModalExcluirVaga(null);
      if (modalVeiculoAberto) return fecharModalVeiculo();
      if (modalVagaAberto) return fecharModalVaga();
    }

    window.addEventListener("keydown", fecharComEsc);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", fecharComEsc);
    };
  }, [algumModalAberto, modalVeiculoAberto, modalVagaAberto, modalExcluirVeiculo, modalExcluirVaga]);

  function atualizarEstrutura(dados) {
    setEstrutura({ ...estruturaSegura, ...dados });
  }

  function atualizarUsosGaragem(novosUsos, novasVagas = vagas) {
    const resumoAtualizado = calcularResumoGaragem(novosUsos, novasVagas);
    atualizarEstrutura({
      garagemUsos: novosUsos,
      garagemSituacao: resumoAtualizado.garagemSituacao,
      garagemModalidade: resumoAtualizado.garagemModalidade,
      possuiVaga: resumoAtualizado.possuiVaga,
      vagas: novasVagas,
    });
  }

  function alternarUsoGaragem(opcao) {
    const ativo = garagemUsos.includes(opcao.valor);

    if (opcao.exclusiva) {
      if (ativo) return atualizarUsosGaragem([]);
      if (vagas.length > 0) {
        const confirmar = window.confirm(
          "Existem vagas cadastradas. Ao escolher esta opção, os dados das vagas serão removidos desta etapa. Deseja continuar?"
        );
        if (!confirmar) return;
      }
      return atualizarUsosGaragem([opcao.valor], []);
    }

    let novosUsos = garagemUsos.filter((valor) => !["nao_possui", "nao_sei"].includes(valor));

    if (ativo) {
      novosUsos = novosUsos.filter((valor) => valor !== opcao.valor);

      if (opcao.valor === "unidade_possui_vagas") {
        const relacionadas = vagas.filter((vaga) => origemVagaCompativel(vaga) === "minha_unidade");
        if (relacionadas.length > 0) {
          const confirmar = window.confirm(
            "Existem vagas da sua unidade cadastradas. Ao desmarcar esta opção, essas vagas serão removidas desta etapa. Deseja continuar?"
          );
          if (!confirmar) return;
          return atualizarUsosGaragem(
            novosUsos,
            vagas.filter((vaga) => origemVagaCompativel(vaga) !== "minha_unidade")
          );
        }
      }

      if (opcao.valor === "usa_vaga_outra_unidade") {
        const relacionadas = vagas.filter((vaga) => origemVagaCompativel(vaga) === "outra_unidade");
        if (relacionadas.length > 0) {
          const confirmar = window.confirm(
            "Existem vagas de outra unidade cadastradas. Ao desmarcar esta opção, essas vagas serão removidas desta etapa. Deseja continuar?"
          );
          if (!confirmar) return;
          return atualizarUsosGaragem(
            novosUsos,
            vagas.filter((vaga) => origemVagaCompativel(vaga) !== "outra_unidade")
          );
        }
      }

      return atualizarUsosGaragem(novosUsos);
    }

    atualizarUsosGaragem([...novosUsos, opcao.valor]);
  }

  function abrirNovoVeiculo() {
    setVeiculoAtual({ ...veiculoInicial, id: gerarId("vei") });
    setCamposInvalidos({});
    setModalVeiculoAberto(true);
  }

  function editarVeiculo(veiculo) {
    setVeiculoAtual({ ...veiculoInicial, ...veiculo });
    setCamposInvalidos({});
    setModalVeiculoAberto(true);
  }

  function fecharModalVeiculo() {
    setVeiculoAtual(null);
    setCamposInvalidos({});
    setModalVeiculoAberto(false);
  }

  function abrirNovaVaga() {
    if (!possuiCategoriaVagaFixa) return;

    let origemVaga = "";
    if (garagemUsos.includes("unidade_possui_vagas") && !garagemUsos.includes("usa_vaga_outra_unidade")) origemVaga = "minha_unidade";
    if (garagemUsos.includes("usa_vaga_outra_unidade") && !garagemUsos.includes("unidade_possui_vagas")) origemVaga = "outra_unidade";

    setVagaAtual({ ...vagaInicial, id: gerarId("vaga"), origemVaga });
    setCamposInvalidos({});
    setModalVagaAberto(true);
  }

  function editarVaga(vaga) {
    setVagaAtual({ ...vagaInicial, ...vaga, origemVaga: origemVagaCompativel(vaga) });
    setCamposInvalidos({});
    setModalVagaAberto(true);
  }

  function fecharModalVaga() {
    setVagaAtual(null);
    setCamposInvalidos({});
    setModalVagaAberto(false);
  }

  function validarVeiculo(veiculo) {
    const invalidos = {};
    if (!validarPlaca(veiculo?.placa || "")) invalidos.placa = true;
    if (!veiculo?.tipo) invalidos.tipo = true;
    if (!veiculo?.marca?.trim()) invalidos.marca = true;
    if (!veiculo?.modelo?.trim()) invalidos.modelo = true;
    if (!veiculo?.cor?.trim()) invalidos.cor = true;

    if (veiculo?.ano && !validarAno(veiculo.ano)) {
      invalidos.ano = true;
      toast.error("Informe um ano válido.");
    }

    const placaNormalizada = normalizarPlaca(veiculo?.placa || "");
    if (veiculos.some((item) => item.id !== veiculo.id && normalizarPlaca(item.placa) === placaNormalizada)) {
      invalidos.placa = true;
      toast.error("Esta placa já foi cadastrada.");
    }

    setCamposInvalidos(invalidos);
    if (Object.keys(invalidos).length > 0) {
      toast.error("Confira os dados obrigatórios do veículo.");
      return false;
    }
    return true;
  }

  function salvarVeiculo() {
    if (!validarVeiculo(veiculoAtual)) return;
    const veiculoFinal = {
      ...veiculoAtual,
      placa: formatarPlaca(veiculoAtual.placa),
      marca: capitalizarTexto(veiculoAtual.marca || ""),
      modelo: capitalizarTexto(veiculoAtual.modelo || ""),
      cor: capitalizarTexto(veiculoAtual.cor || ""),
    };
    const novaLista = veiculos.some((item) => item.id === veiculoFinal.id)
      ? veiculos.map((item) => (item.id === veiculoFinal.id ? veiculoFinal : item))
      : [...veiculos, veiculoFinal];
    atualizarEstrutura({ veiculos: novaLista, possuiVeiculo: novaLista.length > 0 });
    toast.success("Veículo salvo.");
    fecharModalVeiculo();
  }

  function excluirVeiculo(id) {
    const novaLista = veiculos.filter((item) => item.id !== id);
    const novasVagas = vagas.map((vaga) => vaga.idVeiculo === id ? { ...vaga, idVeiculo: "" } : vaga);
    atualizarEstrutura({ veiculos: novaLista, possuiVeiculo: novaLista.length > 0, vagas: novasVagas });
    setModalExcluirVeiculo(null);
    toast.success("Veículo removido.");
  }

  function validarVaga(vaga) {
    const invalidos = {};
    if (!vaga?.origemVaga) invalidos.origemVaga = true;
    if (!vaga?.situacao || !vaga?.modalidadeUso) invalidos.situacao = true;
    if (!vaga?.identificacao?.trim()) invalidos.identificacao = true;
    if (!vaga?.local) invalidos.local = true;

    const vagaDuplicada = vagas.some(
      (item) => item.id !== vaga.id &&
        item.identificacao?.trim().toUpperCase() === vaga.identificacao?.trim().toUpperCase() &&
        item.local === vaga.local
    );
    if (vagaDuplicada) {
      invalidos.identificacao = true;
      toast.error("Esta vaga já foi cadastrada neste local.");
    }

    setCamposInvalidos(invalidos);
    if (Object.keys(invalidos).length > 0) {
      toast.error("Confira os dados obrigatórios da vaga.");
      return false;
    }
    return true;
  }

  function novaVagaMesmoTipo(vagaBase) {
    return {
      ...vagaInicial,
      id: gerarId("vaga"),
      origemVaga: vagaBase.origemVaga,
      situacao: vagaBase.situacao,
      modalidadeUso: vagaBase.modalidadeUso,
    };
  }

  function salvarVaga({ adicionarOutraMesmoTipo = false } = {}) {
    if (!validarVaga(vagaAtual)) return;

    const vagaFinal = {
      ...vagaAtual,
      identificacao: String(vagaAtual.identificacao || "").trim().toUpperCase(),
      observacoes: String(vagaAtual.observacoes || "").trim(),
      idVeiculo: situacaoPermiteVeiculo(vagaAtual) ? vagaAtual.idVeiculo || "" : "",
    };

    const novaLista = vagas.some((item) => item.id === vagaFinal.id)
      ? vagas.map((item) => (item.id === vagaFinal.id ? vagaFinal : item))
      : [...vagas, vagaFinal];

    const resumoGaragem = calcularResumoGaragem(garagemUsos, novaLista);
    atualizarEstrutura({
      garagemUsos,
      garagemSituacao: resumoGaragem.garagemSituacao,
      garagemModalidade: resumoGaragem.garagemModalidade,
      possuiVaga: novaLista.length > 0,
      vagas: novaLista,
    });

    toast.success("Vaga salva.");

    if (adicionarOutraMesmoTipo) {
      setVagaAtual(novaVagaMesmoTipo(vagaFinal));
      setCamposInvalidos({});
      return;
    }
    fecharModalVaga();
  }

  function excluirVaga(id) {
    const novaLista = vagas.filter((item) => item.id !== id);
    const resumoGaragem = calcularResumoGaragem(garagemUsos, novaLista);
    atualizarEstrutura({
      garagemSituacao: resumoGaragem.garagemSituacao,
      garagemModalidade: resumoGaragem.garagemModalidade,
      possuiVaga: novaLista.length > 0,
      vagas: novaLista,
    });
    setModalExcluirVaga(null);
    toast.success("Vaga removida.");
  }

  function veiculosDisponiveisParaVaga(idVagaAtual) {
    return veiculos.filter((veiculo) => {
      const vinculadoEmOutraVaga = vagas.some(
        (vaga) => vaga.id !== idVagaAtual && situacaoPermiteVeiculo(vaga) && vaga.idVeiculo === veiculo.id
      );
      return !vinculadoEmOutraVaga;
    });
  }

  async function salvarRascunho() {
    if (salvandoRascunho || processando) return;
    try {
      setSalvandoRascunho(true);
      const salvou = await onSaveDraft(montarPayloadTela5({ estrutura: estruturaSegura }));
      if (salvou !== false) toast.success("Suas informações foram salvas.");
    } finally {
      setSalvandoRascunho(false);
    }
  }

  async function avancar() {
    if (processando || salvandoRascunho) return;
    if (garagemUsos.length === 0) {
      toast.error("Informe como você utiliza a garagem.");
      return;
    }
    if (possuiCategoriaVagaFixa && vagas.length === 0) {
      toast.error("Cadastre pelo menos uma vaga para a opção selecionada.");
      return;
    }

    try {
      setProcessando(true);
      await onNext(montarPayloadTela5({ estrutura: estruturaSegura }));
    } finally {
      setProcessando(false);
    }
  }

  return (
    <>
      <div className="wm-t5-page">
        <section className="wm-t5-card">
          <header className="wm-t5-title-row">
            <div className="wm-t5-title">
              <span className="wm-t5-step">5</span>
              <div>
                <h1>Veículos e garagem</h1>
                <p>Primeiro cadastre os veículos que você utiliza. Depois informe como utiliza as vagas de garagem.</p>
              </div>
            </div>

            <div className="wm-t5-safe-card">
              <ShieldCheck size={30} />
              <strong>Você poderá atualizar estas informações posteriormente na sua área do Chegou!.</strong>
            </div>
          </header>

          <div className="wm-t5-divider" />

          <section className="wm-t5-summary">
            <div><span>Torre / Bloco</span><strong>{resumo.torre}</strong></div>
            <div><span>Unidade</span><strong>{resumo.unidade}</strong></div>
            <div><span>Relação com a unidade</span><strong>{resumo.perfil}</strong></div>
            <div><span>Nome</span><strong>{resumo.morador}</strong></div>
          </section>

          <div className="wm-t5-flow">
            <article className="wm-t5-content-card">
              <div className="wm-t5-card-head">
                <div>
                  <span className="wm-t5-order">1</span>
                  <h2>Seus veículos</h2>
                  <p>Cadastre os veículos que você utiliza atualmente.</p>
                </div>
                <button type="button" className="wm-t5-add-btn" onClick={abrirNovoVeiculo}>
                  <Plus size={16} /> Adicionar veículo
                </button>
              </div>

              {veiculos.length === 0 ? (
                <>
                  <div className="wm-t5-hero"><img src={veiculoUnidadeImg} alt="" aria-hidden="true" /></div>
                  <div className="wm-t5-empty">
                    <Car size={34} />
                    <strong>Nenhum veículo cadastrado</strong>
                    <p>Você pode cadastrar agora ou continuar sem informar veículo.</p>
                  </div>
                </>
              ) : (
                <div className="wm-t5-items-grid vehicles">
                  {veiculos.map((veiculo) => {
                    const vinculado = vagas.find((vaga) => situacaoPermiteVeiculo(vaga) && vaga.idVeiculo === veiculo.id);
                    return (
                      <article key={veiculo.id} className="wm-t5-item-card">
                        <div className="wm-t5-item-top">
                          <div>
                            <strong>{veiculo.placa}</strong>
                            <span>{[veiculo.tipo, veiculoDescricao(veiculo)].filter(Boolean).join(" • ")}</span>
                          </div>
                          <Car size={27} />
                        </div>
                        <div className="wm-t5-item-tags">
                          {vinculado ? <small className="linked">Vinculado à vaga {vinculado.identificacao}</small> : <small className="free">Sem vaga vinculada</small>}
                        </div>
                        <div className="wm-t5-item-actions">
                          <button type="button" onClick={() => editarVeiculo(veiculo)}><Edit3 size={14} />Editar</button>
                          <button type="button" className="danger" onClick={() => setModalExcluirVeiculo(veiculo)}><Trash2 size={14} />Excluir</button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </article>

            <section className="wm-t5-garage-question">
              <div className="wm-t5-section-head">
                <span className="wm-t5-order">2</span>
                <div>
                  <h2>Como você utiliza a garagem atualmente?</h2>
                  <p>Você pode marcar mais de uma opção quando utilizar vagas em situações diferentes.</p>
                </div>
              </div>

              <div className="wm-t5-option-grid">
                {OPCOES_USO_GARAGEM.map((opcao) => {
                  const Icon = opcao.icon;
                  const ativo = garagemUsos.includes(opcao.valor);
                  return (
                    <button key={opcao.valor} type="button" className={`wm-t5-garage-option ${ativo ? "active" : ""}`} onClick={() => alternarUsoGaragem(opcao)} aria-pressed={ativo}>
                      <span className="wm-t5-option-check">{ativo ? <Check size={15} /> : null}</span>
                      <i><Icon size={31} /></i>
                      <strong>{opcao.titulo}</strong>
                      <small>{opcao.texto}</small>
                    </button>
                  );
                })}
              </div>

              {garagemUsos.includes("rotativa") ? <NoteCard icon={<RotateCcw size={20} />} title="Vagas rotativas selecionadas" text="Não é necessário informar um número fixo para as vagas rotativas." blue /> : null}
              {garagemUsos.includes("nao_possui") ? <NoteCard icon={<ParkingCircle size={20} />} title="Sem uso de vaga" text="Nenhuma vaga fixa precisa ser cadastrada nesta etapa." /> : null}
              {garagemUsos.includes("nao_sei") ? <NoteCard icon={<HelpCircle size={20} />} title="Você poderá completar depois" text="Continue normalmente e atualize essa informação quando souber." /> : null}
            </section>

            <article className="wm-t5-content-card">
              <div className="wm-t5-card-head">
                <div>
                  <span className="wm-t5-order">3</span>
                  <h2>Vagas de garagem</h2>
                  <p>Cadastre somente as vagas fixas da sua unidade ou de outra unidade que você utiliza.</p>
                </div>
                {possuiCategoriaVagaFixa ? (
                  <button type="button" className="wm-t5-add-btn" onClick={abrirNovaVaga}><Plus size={16} />Adicionar vaga</button>
                ) : null}
              </div>

              {vagas.length === 0 ? (
                <>
                  <div className="wm-t5-hero"><img src={vagasGaragemImg} alt="" aria-hidden="true" /></div>
                  <div className="wm-t5-empty">
                    <ParkingCircle size={34} />
                    <strong>{possuiCategoriaVagaFixa ? "Nenhuma vaga cadastrada" : "Nenhuma vaga fixa precisa ser cadastrada"}</strong>
                    <p>{possuiCategoriaVagaFixa ? "Use “Adicionar vaga” para informar número, local e situação de uso." : "Selecione uma opção de vaga fixa acima caso precise cadastrar uma vaga."}</p>
                  </div>
                </>
              ) : (
                <div className="wm-t5-items-grid vagas">
                  {vagas.map((vaga) => {
                    const veiculo = veiculos.find((item) => item.id === vaga.idVeiculo);
                    return <VagaCard key={vaga.id} vaga={vaga} veiculo={veiculo} onEdit={() => editarVaga(vaga)} onDelete={() => setModalExcluirVaga(vaga)} />;
                  })}
                </div>
              )}
            </article>

            <section className="wm-t5-guidance-grid">
              <article className="wm-t5-side-card wm-t5-highlight">
                <span className="wm-t5-side-icon orange"><Building2 size={22} /></span>
                <h3>Organização da garagem</h3>
                <p>Informe a situação real de cada vaga para facilitar a conferência do cadastro.</p>
              </article>
              <article className="wm-t5-side-card">
                <span className="wm-t5-side-icon"><ShieldCheck size={22} /></span>
                <h3>Dicas úteis</h3>
                <ul>
                  <li>Um veículo pode ficar vinculado a somente uma vaga em uso.</li>
                  <li>Vagas alugadas ou emprestadas para outra unidade não precisam de veículo da sua unidade.</li>
                  <li>Vagas rotativas não exigem número fixo.</li>
                </ul>
              </article>
              <article className="wm-t5-side-card">
                <span className="wm-t5-side-icon orange"><Info size={22} /></span>
                <h3>Dúvidas frequentes</h3>
                <div className="wm-t5-faq-list">
                  {faqTela5().map((item) => <details key={item.pergunta}><summary>{item.pergunta}</summary><p>{item.resposta}</p></details>)}
                </div>
              </article>
            </section>
          </div>

          <footer className="wm-t5-actions">
            <button type="button" className="secondary" onClick={onBack} disabled={processando || salvandoRascunho}><ArrowLeft size={16} />Voltar</button>
            <button type="button" className="outline" onClick={salvarRascunho} disabled={processando || salvandoRascunho}><Save size={16} />{salvandoRascunho ? "Salvando..." : "Salvar e continuar depois"}</button>
            <button type="button" className="primary" onClick={avancar} disabled={processando || salvandoRascunho}>{processando ? "Salvando informações..." : "Continuar"}<ArrowRight size={18} /></button>
          </footer>
        </section>
      </div>

      {modalVeiculoAberto && veiculoAtual ? <ModalVeiculo veiculo={veiculoAtual} setVeiculo={setVeiculoAtual} camposInvalidos={camposInvalidos} onClose={fecharModalVeiculo} onSave={salvarVeiculo} /> : null}
      {modalVagaAberto && vagaAtual ? <ModalVaga vaga={vagaAtual} setVaga={setVagaAtual} camposInvalidos={camposInvalidos} garagemUsos={garagemUsos} veiculosDisponiveis={veiculosDisponiveisParaVaga(vagaAtual.id)} veiculos={veiculos} vagas={vagas} onClose={fecharModalVaga} onSave={salvarVaga} /> : null}
      {modalExcluirVeiculo ? <ModalConfirmacao titulo="Excluir veículo?" texto={`Deseja remover o veículo ${modalExcluirVeiculo.placa}? Se ele estiver vinculado a uma vaga, o vínculo também será removido.`} onClose={() => setModalExcluirVeiculo(null)} onConfirm={() => excluirVeiculo(modalExcluirVeiculo.id)} /> : null}
      {modalExcluirVaga ? <ModalConfirmacao titulo="Excluir vaga?" texto={`Deseja remover a vaga ${modalExcluirVaga.identificacao}?`} onClose={() => setModalExcluirVaga(null)} onConfirm={() => excluirVaga(modalExcluirVaga.id)} /> : null}

      {processando ? (
        <div className="wm-t5-processing" role="status" aria-live="polite">
          <div className="wm-t5-processing-card">
            <span className="wm-t5-spinner" />
            <strong>Salvando suas informações</strong>
            <p>Aguarde um instante. Estamos preparando a próxima etapa.</p>
          </div>
        </div>
      ) : null}
    </>
  );
}

function NoteCard({ icon, title, text, blue = false }) {
  return <div className={`wm-t5-note-card ${blue ? "blue" : ""}`}>{icon}<div><strong>{title}</strong><p>{text}</p></div></div>;
}

function VagaCard({ vaga, veiculo, onEdit, onDelete, compact = false }) {
  return (
    <article className={`wm-t5-item-card wm-t5-vaga-card ${compact ? "compact" : ""}`}>
      <div className="wm-t5-item-top">
        <div>
          <strong>{vaga.identificacao}</strong>
          <span>{[vaga.local, origemVagaLabel(vaga), situacaoVagaLabel(vaga)].filter(Boolean).join(" • ")}</span>
        </div>
        <ParkingCircle size={27} />
      </div>

      {veiculo && situacaoPermiteVeiculo(vaga) ? (
        <div className="wm-t5-vehicle-summary"><Car size={17} /><div><strong>{veiculo.placa}</strong><span>{veiculoDescricao(veiculo)}</span></div></div>
      ) : null}

      {vaga?.unidadeUsoConhecida ? (
        <div className="wm-t5-unit-rental"><Building2 size={16} /><span>{[vaga.unidadeUsoConhecida.torre, vaga.unidadeUsoConhecida.unidade].filter(Boolean).join(" • ")}</span></div>
      ) : null}

      {vaga.observacoes ? <div className="wm-t5-observation">{vaga.observacoes}</div> : null}

      {!compact ? (
        <div className="wm-t5-item-actions">
          <button type="button" onClick={onEdit}><Edit3 size={14} />Editar</button>
          <button type="button" className="danger" onClick={onDelete}><Trash2 size={14} />Excluir</button>
        </div>
      ) : null}
    </article>
  );
}

function ModalVaga({ vaga, setVaga, camposInvalidos, garagemUsos, veiculosDisponiveis, veiculos, vagas, onClose, onSave }) {
  const origensPermitidas = OPCOES_ORIGEM_VAGA.filter((origem) =>
    origem.valor === "minha_unidade"
      ? garagemUsos.includes("unidade_possui_vagas")
      : garagemUsos.includes("usa_vaga_outra_unidade")
  );

  const origemUnica = origensPermitidas.length === 1;
  const origemAtual = vaga?.origemVaga || "";
  const situacoes = origemAtual === "minha_unidade" ? SITUACOES_MINHA_UNIDADE : origemAtual === "outra_unidade" ? SITUACOES_OUTRA_UNIDADE : [];
  const permiteVeiculo = situacaoPermiteVeiculo(vaga);

  function atualizar(campo, valor) {
    setVaga((old) => ({ ...old, [campo]: valor }));
  }

  function selecionarOrigem(origem) {
    setVaga((old) => ({ ...old, origemVaga: origem, situacao: "", modalidadeUso: "", idVeiculo: "" }));
  }

  function selecionarSituacao(opcao) {
    setVaga((old) => ({ ...old, situacao: opcao.situacao, modalidadeUso: opcao.modalidadeUso, idVeiculo: opcao.permiteVeiculo ? old.idVeiculo : "" }));
  }

  function situacaoSelecionada(opcao) {
    return opcao.situacao === vaga?.situacao && opcao.modalidadeUso === vaga?.modalidadeUso;
  }

  return (
    <div className="wm-modal-overlay" role="dialog" aria-modal="true">
      <div className="wm-t5-modal">
        <header className="wm-t5-modal-head">
          <div>
            <h2>{vaga?.identificacao ? "Vaga de garagem" : "Adicionar vaga de garagem"}</h2>
            <p>Informe a situação da vaga, o número, o local e, quando aplicável, o veículo utilizado.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        </header>

        <div className="wm-t5-modal-body">
          {!origemUnica ? (
            <section className="wm-t5-modal-section">
              <h3>1. Qual vaga você quer cadastrar?</h3>
              <div className="wm-t5-origin-grid">
                {origensPermitidas.map((opcao) => (
                  <button key={opcao.valor} type="button" className={`wm-t5-origin-card ${origemAtual === opcao.valor ? "active" : ""} ${camposInvalidos.origemVaga ? "invalid" : ""}`} onClick={() => selecionarOrigem(opcao.valor)}>
                    <span>{origemAtual === opcao.valor ? <Check size={14} /> : null}</span>
                    <div><strong>{opcao.titulo}</strong><small>{opcao.texto}</small></div>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {origemAtual ? (
            <section className="wm-t5-modal-section">
              <h3>{origemUnica ? "1." : "2."} Como esta vaga está sendo utilizada?</h3>
              <div className="wm-t5-situation-grid">
                {situacoes.map((opcao) => (
                  <button key={opcao.valor} type="button" className={`wm-t5-situation-card ${situacaoSelecionada(opcao) ? "active" : ""} ${camposInvalidos.situacao ? "invalid" : ""}`} onClick={() => selecionarSituacao(opcao)}>
                    <span>{situacaoSelecionada(opcao) ? <Check size={13} /> : null}</span>
                    <strong>{opcao.titulo}</strong><small>{opcao.texto}</small>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {origemAtual && vaga?.situacao ? (
            <>
              <section className="wm-t5-modal-section">
                <h3>{origemUnica ? "2." : "3."} Identificação da vaga</h3>
                <div className="wm-t5-modal-grid two">
                  <Field label="Número / código da vaga *" value={vaga?.identificacao} onChange={(valor) => atualizar("identificacao", valor.toUpperCase())} invalid={camposInvalidos.identificacao} placeholder="Ex.: 12A, B-08, G2-14" />
                  <label className="wm-t5-field">
                    <span>Local da vaga *</span>
                    <select value={vaga?.local || ""} onChange={(event) => atualizar("local", event.target.value)} className={camposInvalidos.local ? "invalid" : ""}>
                      <option value="">Selecione</option>
                      {LOCAIS_VAGA.map((local) => <option key={local} value={local}>{local}</option>)}
                    </select>
                  </label>
                </div>
                <label className="wm-t5-field">
                  <span>Observações (opcional)</span>
                  <textarea value={vaga?.observacoes || ""} onChange={(event) => atualizar("observacoes", event.target.value)} placeholder="Inclua alguma informação que ajude a identificar ou compreender o uso desta vaga." />
                </label>
              </section>

              {permiteVeiculo ? (
                <section className="wm-t5-modal-section">
                  <h3>{origemUnica ? "3." : "4."} Veículo utilizado nesta vaga</h3>
                  {veiculos.length > 0 ? (
                    <label className="wm-t5-field">
                      <span>Selecione um veículo (opcional)</span>
                      <select value={vaga?.idVeiculo || ""} onChange={(event) => atualizar("idVeiculo", event.target.value)}>
                        <option value="">Nenhum veículo selecionado</option>
                        {veiculosDisponiveis.map((veiculo) => <option key={veiculo.id} value={veiculo.id}>{veiculo.placa} — {veiculoDescricao(veiculo)}</option>)}
                      </select>
                    </label>
                  ) : (
                    <div className="wm-t5-empty small"><Car size={26} /><strong>Nenhum veículo cadastrado</strong><p>Você pode salvar a vaga sem veículo e cadastrar um veículo depois.</p></div>
                  )}
                </section>
              ) : null}

              <section className="wm-t5-modal-section">
                <h3>Vagas já cadastradas</h3>
                {vagas.length > 0 ? (
                  <div className="wm-t5-modal-vagas">
                    {vagas.map((item) => {
                      const veiculo = veiculos.find((registro) => registro.id === item.idVeiculo);
                      return <VagaCard key={item.id} vaga={item} veiculo={veiculo} compact />;
                    })}
                  </div>
                ) : <div className="wm-t5-empty small"><ParkingCircle size={26} /><strong>Esta será a primeira vaga cadastrada</strong></div>}
              </section>
            </>
          ) : null}
        </div>

        <footer className="wm-t5-modal-actions">
          <button type="button" className="secondary" onClick={onClose}>Cancelar</button>
          {origemAtual && vaga?.situacao ? (
            <>
              <button type="button" className="outline" onClick={() => onSave({ adicionarOutraMesmoTipo: true })}>Salvar + adicionar outra igual</button>
              <button type="button" className="primary" onClick={() => onSave()}>Salvar vaga<Check size={15} /></button>
            </>
          ) : null}
        </footer>
      </div>
    </div>
  );
}

function ModalVeiculo({ veiculo, setVeiculo, camposInvalidos, onClose, onSave }) {
  function atualizar(campo, valor) {
    setVeiculo((old) => {
      const novo = { ...old, [campo]: valor };
      if (campo === "tipo" && valor === "Moto") novo.portas = "";
      return novo;
    });
  }

  return (
    <div className="wm-modal-overlay" role="dialog" aria-modal="true">
      <div className="wm-t5-modal wm-t5-modal-vehicle">
        <header className="wm-t5-modal-head">
          <div><h2>{veiculo?.placa ? "Veículo" : "Adicionar veículo"}</h2><p>Informe os dados principais do veículo que você utiliza.</p></div>
          <button type="button" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        </header>

        <div className="wm-t5-modal-body">
          <section className="wm-t5-modal-section">
            <h3>Dados do veículo</h3>
            <div className="wm-t5-modal-grid two">
              <Field label="Placa *" value={veiculo?.placa} onChange={(valor) => atualizar("placa", formatarPlaca(valor))} invalid={camposInvalidos.placa} placeholder="ABC-1234 ou ABC1D23" />
              <label className="wm-t5-field"><span>Tipo *</span><select value={veiculo?.tipo || ""} onChange={(event) => atualizar("tipo", event.target.value)} className={camposInvalidos.tipo ? "invalid" : ""}><option value="">Selecione</option>{TIPOS_VEICULO.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}</select></label>
            </div>
            <div className="wm-t5-modal-grid two">
              <Field label="Marca *" value={veiculo?.marca} onChange={(valor) => atualizar("marca", valor)} invalid={camposInvalidos.marca} placeholder="Ex.: Honda" />
              <Field label="Modelo *" value={veiculo?.modelo} onChange={(valor) => atualizar("modelo", valor)} invalid={camposInvalidos.modelo} placeholder="Ex.: Civic" />
            </div>
            <div className="wm-t5-modal-grid three">
              <Field label="Cor *" value={veiculo?.cor} onChange={(valor) => atualizar("cor", valor)} invalid={camposInvalidos.cor} placeholder="Ex.: Prata" />
              <Field label="Ano (opcional)" value={veiculo?.ano} onChange={(valor) => atualizar("ano", somenteNumeros(valor).slice(0, 4))} invalid={camposInvalidos.ano} inputMode="numeric" placeholder="2024" />
              <label className="wm-t5-field"><span>Combustível</span><select value={veiculo?.combustivel || ""} onChange={(event) => atualizar("combustivel", event.target.value)}><option value="">Selecione</option>{COMBUSTIVEIS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            </div>
            {veiculo?.tipo !== "Moto" ? <label className="wm-t5-field wm-t5-single-field"><span>Portas</span><select value={veiculo?.portas || ""} onChange={(event) => atualizar("portas", event.target.value)}><option value="">Selecione</option>{PORTAS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label> : null}
          </section>
        </div>

        <footer className="wm-t5-modal-actions">
          <button type="button" className="secondary" onClick={onClose}>Cancelar</button>
          <button type="button" className="primary" onClick={onSave}>Salvar veículo<Check size={15} /></button>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, invalid, placeholder, inputMode }) {
  return <label className="wm-t5-field"><span>{label}</span><input value={value || ""} onChange={(event) => onChange?.(event.target.value)} className={invalid ? "invalid" : ""} placeholder={placeholder} inputMode={inputMode} autoComplete="off" autoCorrect="off" spellCheck={false} /></label>;
}

function ModalConfirmacao({ titulo, texto, onClose, onConfirm }) {
  return (
    <div className="wm-modal-overlay" role="dialog" aria-modal="true">
      <div className="wm-modal-card">
        <button type="button" className="wm-modal-close" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        <h2>{titulo}</h2><p>{texto}</p>
        <div className="wm-modal-actions">
          <button type="button" className="wm-modal-secondary" onClick={onClose}>Cancelar</button>
          <button type="button" className="wm-modal-primary" onClick={onConfirm}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}