import { useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  Edit3,
  Info,
  LockKeyhole,
  Mail,
  PackageCheck,
  Phone,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import "../../../styles/wizardMorador/WizardMoradorTela3.css";

const LIMITE_UPLOAD_FOTO_MB = 5;
const LIMITE_UPLOAD_FOTO_BYTES = LIMITE_UPLOAD_FOTO_MB * 1024 * 1024;

const TIPOS_VINCULO = [
  "Cônjuge / Companheiro(a)",
  "Filho(a)",
  "Pai / Mãe",
  "Irmão(ã)",
  "Avô / Avó",
  "Neto(a)",
  "Outro familiar",
];

const pessoaInicial = {
  id: null,
  nome: "",
  tipo_vinculo: "",
  data_nascimento: "",
  idade: "",
  cpf: "",
  cpf_pendente_validacao: false,
  tentativas_cpf_invalidas: 0,
  foto_base64: "",
  foto_nome: "",
  foto_mime: "",
  foto_tamanho: "",
  recebe_encomendas: false,
  retira_portaria: false,
  acesso_proprio_futuro: false,
  email: "",
  ddi: "+55",
  whatsapp: "",
  menor_16_ciencia: false,
  status: "PENDENTE",
};

function somenteNumeros(valor = "") {
  return String(valor).replace(/\D/g, "");
}

function normalizarDDI(valor = "") {
  const limpo = somenteNumeros(valor).slice(0, 4);
  return limpo ? `+${limpo}` : "+55";
}

function obterDDINumerico(valor = "") {
  return somenteNumeros(valor || "+55") || "55";
}

function formatarTelefoneBrasil(valor = "") {
  const numeros = somenteNumeros(valor).slice(0, 11);

  if (!numeros) return "";
  if (numeros.length <= 2) return `(${numeros}`;
  if (numeros.length <= 6) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;

  if (numeros.length <= 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }

  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
}

function formatarTelefoneInternacional({ ddi = "+55", numero = "" }) {
  const ddiNumerico = obterDDINumerico(ddi);
  const numeroLimpo = somenteNumeros(numero);

  if (!numeroLimpo) return "";

  if (ddiNumerico === "55") {
    return formatarTelefoneBrasil(numeroLimpo);
  }

  return numeroLimpo.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}

function montarTelefoneE164({ ddi = "+55", numero = "" }) {
  const ddiNumerico = obterDDINumerico(ddi);
  const telefoneNumerico = somenteNumeros(numero);

  if (!telefoneNumerico) return "";

  return `+${ddiNumerico}${telefoneNumerico}`;
}

function capitalizarNome(valor = "") {
  const minusculas = new Set(["da", "de", "do", "das", "dos", "e"]);

  return String(valor)
    .trimStart()
    .toLowerCase()
    .replace(/(^|\s|-|')([\p{L}]+)/gu, (_, sep, palavra) => {
      if (sep === " " && minusculas.has(palavra)) return `${sep}${palavra}`;
      return `${sep}${palavra.charAt(0).toUpperCase()}${palavra.slice(1)}`;
    });
}

function iniciais(nome = "") {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  return `${partes[0]?.[0] || "P"}${partes[1]?.[0] || ""}`.toUpperCase();
}
function formatarCpf(valor = "") {
  const v = somenteNumeros(valor).slice(0, 11);

  return v
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function validarCpf(cpf = "") {
  const valor = somenteNumeros(cpf);

  if (!valor) return true;
  if (valor.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(valor)) return false;

  let soma = 0;

  for (let i = 0; i < 9; i += 1) {
    soma += Number(valor[i]) * (10 - i);
  }

  let digito = 11 - (soma % 11);
  if (digito >= 10) digito = 0;
  if (digito !== Number(valor[9])) return false;

  soma = 0;

  for (let i = 0; i < 10; i += 1) {
    soma += Number(valor[i]) * (11 - i);
  }

  digito = 11 - (soma % 11);
  if (digito >= 10) digito = 0;

  return digito === Number(valor[10]);
}

function formatarData(valor = "") {
  const v = somenteNumeros(valor).slice(0, 8);

  return v
    .replace(/^(\d{2})(\d)/, "$1/$2")
    .replace(/^(\d{2})\/(\d{2})(\d)/, "$1/$2/$3");
}

function dataBrParaISO(valor = "") {
  const numeros = somenteNumeros(valor);

  if (numeros.length !== 8) return null;

  const dia = numeros.slice(0, 2);
  const mes = numeros.slice(2, 4);
  const ano = numeros.slice(4, 8);

  return `${ano}-${mes}-${dia}`;
}

function dataISOParaBR(valor = "") {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return "";

  const [ano, mes, dia] = valor.split("-");
  return `${dia}/${mes}/${ano}`;
}

function calcularIdade(data = "") {
  const iso = dataBrParaISO(data);
  if (!iso) return "";

  const nascimento = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(nascimento.getTime())) return "";

  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const diffMes = hoje.getMonth() - nascimento.getMonth();

  if (diffMes < 0 || (diffMes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade -= 1;
  }

  return idade >= 0 ? idade : "";
}

function validarDataNascimento(valor = "") {
  const iso = dataBrParaISO(valor);
  if (!iso) return false;

  const data = new Date(`${iso}T00:00:00`);
  const hoje = new Date();

  if (Number.isNaN(data.getTime())) return false;
  if (data > hoje) return false;

  return data.getFullYear() >= 1900;
}

function validarEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function gerarId() {
  return `dep-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function traduzirPerfil(perfil = "") {
  const mapa = {
    proprietario_residente: "Proprietário Residente",
    proprietario_morador: "Proprietário Residente",
    proprietario_nao_residente: "Proprietário Não Residente",
    proprietario_unidade_alugada: "Proprietário Não Residente",
    inquilino: "Morador Inquilino",
    responsavel_unidade_corporativa: "Unidade Corporativa",
    unidade_vazia: "Unidade Vazia",
  };

  return mapa[perfil] || perfil || "Perfil não informado";
}

function mascararToken(token = "") {
  const limpo = String(token).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  if (!limpo) return "PEN-NÃO-INFORMADO";

  const prefixoStatus = "PEN";
  const miolo = limpo.slice(0, 9);

  return `${prefixoStatus}-${miolo.slice(0, 3)}-${miolo.slice(3, 6)}-${miolo.slice(6, 9)}`;
}

function obterResumo(dadosWizard, formTela1, formMorador) {
  const pre = dadosWizard?.preCadastro || dadosWizard?.pre_cadastro || {};
  const condominio = dadosWizard?.condominio || {};

  const perfil =
    formTela1?.perfilUnidade ||
    formTela1?.relacaoUnidade ||
    formTela1?.perfil_unidade ||
    formTela1?.relacao_unidade ||
    pre.perfil_unidade ||
    pre.relacao_unidade ||
    dadosWizard?.perfil_unidade ||
    dadosWizard?.relacao_unidade ||
    "";

  const nomeExibicao =
    formMorador?.nomeSocial ||
    formMorador?.nome_exibicao ||
    formMorador?.nomeCompleto ||
    pre.nome ||
    "Não informado";

  return {
    condominio:
      condominio.nome_fantasia ||
      condominio.nome ||
      dadosWizard?.nome_condominio ||
      "Condomínio",
    endereco: condominio.endereco || dadosWizard?.endereco || "",
    cidadeUf:
      condominio.cidade_uf ||
      condominio.cidadeUf ||
      dadosWizard?.cidade_uf ||
      "",
    cep: condominio.cep || dadosWizard?.cep || "",
    idCondominio:
      dadosWizard?.condominio_id ||
      pre.condominio_id ||
      "ID não informado",
    token:
      dadosWizard?.token_publico ||
      dadosWizard?.codigo_convite ||
      dadosWizard?.token ||
      "Token não informado",
    torre: pre.torre_nome || pre.torre || pre.bloco_nome || pre.bloco || dadosWizard?.torre || "Torre",
    unidade: pre.unidade_nome || pre.unidade || dadosWizard?.unidade || "Unidade",
    perfil: traduzirPerfil(perfil),
    unidadeVazia: perfil === "unidade_vazia",
    morador: nomeExibicao,
    cpf: formMorador?.cpf || pre.cpf || "",
    email: formMorador?.emailPrincipal || pre.email || "",
    whatsapp: montarTelefoneE164({
      ddi: formMorador?.ddi || "+55",
      numero: formMorador?.whatsapp || "",
    }),
  };
}
async function processarImagemLocal(file) {
  const tiposPermitidos = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/heic",
    "image/heif",
  ];

  if (!tiposPermitidos.includes(file.type)) {
    throw new Error("Envie uma imagem PNG, JPG, HEIC ou WebP.");
  }

  if (file.size > LIMITE_UPLOAD_FOTO_BYTES) {
    throw new Error(`A imagem deve ter no máximo ${LIMITE_UPLOAD_FOTO_MB}MB.`);
  }

  const dataUrlOriginal = await new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Não foi possível carregar a foto."));

    reader.readAsDataURL(file);
  });

  const imagem = await new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível processar a imagem."));

    img.src = dataUrlOriginal;
  });

  const maxLado = 1024;
  const proporcao = Math.min(maxLado / imagem.width, maxLado / imagem.height, 1);
  const largura = Math.round(imagem.width * proporcao);
  const altura = Math.round(imagem.height * proporcao);

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;

  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.drawImage(imagem, 0, 0, largura, altura);

  const webpBase64 = canvas.toDataURL("image/webp", 0.86);
  const nomeBase = file.name.replace(/\.[^/.]+$/, "") || "foto-dependente";

  return {
    previewBase64: webpBase64,
    nome: `${nomeBase}.webp`,
    mime: "image/webp",
    tamanhoEstimado: Math.round((webpBase64.length * 3) / 4),
  };
}

function montarPayloadTela3({ dadosWizard, dependentes, possuiPessoas }) {
  const pre = dadosWizard?.preCadastro || dadosWizard?.pre_cadastro || {};

  return {
    business_id: dadosWizard?.business_id || null,
    condominio_id: dadosWizard?.condominio_id || null,
    pre_cadastro_id: dadosWizard?.pre_cadastro_id || null,
    unidade_id: pre.unidade_id || dadosWizard?.unidade_id || null,
    possui_pessoas_vinculadas: Boolean(possuiPessoas),
    pessoas_vinculadas: dependentes.map((pessoa) => {
      const telefoneE164 = montarTelefoneE164({
        ddi: pessoa.ddi || "+55",
        numero: pessoa.whatsapp,
      });

      return {
        id: pessoa.id,
        nome: pessoa.nome,
        tipo_vinculo: pessoa.tipo_vinculo,
        data_nascimento: pessoa.data_nascimento,
        data_nascimento_iso: dataBrParaISO(pessoa.data_nascimento),
        idade: pessoa.idade,
        cpf: somenteNumeros(pessoa.cpf),
        cpf_formatado: pessoa.cpf,
        cpf_pendente_validacao: pessoa.cpf_pendente_validacao,

        foto_base64: pessoa.foto_base64 || null,
        foto_nome: pessoa.foto_nome || null,
        foto_mime: pessoa.foto_mime || null,
        foto_tamanho: pessoa.foto_tamanho || null,

        recebe_encomendas: Boolean(pessoa.recebe_encomendas),
        retira_portaria: Boolean(pessoa.retira_portaria),
        acesso_proprio_futuro: Boolean(pessoa.acesso_proprio_futuro),

        email: pessoa.acesso_proprio_futuro
          ? pessoa.email?.trim().toLowerCase()
          : "",
        ddi: obterDDINumerico(pessoa.ddi || "+55"),
        whatsapp: pessoa.acesso_proprio_futuro
          ? somenteNumeros(pessoa.whatsapp)
          : "",
        whatsapp_e164: pessoa.acesso_proprio_futuro ? telefoneE164 : "",

        menor_16_ciencia: Boolean(pessoa.menor_16_ciencia),
        status: pessoa.status || "PENDENTE",
        auditoria_status: "AGUARDANDO_AUDITORIA",
      };
    }),
    status: "RASCUNHO",
    etapa_atual: 3,
    atualizado_em: new Date().toISOString(),
  };
}

export default function WizardMoradorTela3({
  dadosWizard,
  formTela1,
  formData,
  formMorador,
  dependentes = [],
  setDependentes,
  onBack,
  onNext,
  onSaveDraft,
}) {
  const [possuiPessoas, setPossuiPessoas] = useState(dependentes.length > 0);
  const [modalAberto, setModalAberto] = useState(false);
  const [pessoaAtual, setPessoaAtual] = useState(null);
  const [pessoaDetalhe, setPessoaDetalhe] = useState(null);
  const [camposInvalidos, setCamposInvalidos] = useState({});
  const [modalExcluir, setModalExcluir] = useState(null);

  const resumo = useMemo(
    () => obterResumo(dadosWizard, formTela1 || formData, formMorador),
    [dadosWizard, formTela1, formData, formMorador]
  );

  function abrirNovaPessoa() {
    setPessoaAtual({ ...pessoaInicial, id: gerarId() });
    setCamposInvalidos({});
    setModalAberto(true);
  }

  function editarPessoa(pessoa) {
    setPessoaAtual({ ...pessoaInicial, ...pessoa });
    setCamposInvalidos({});
    setPessoaDetalhe(null);
    setModalAberto(true);
  }

  function fecharModal() {
    setPessoaAtual(null);
    setCamposInvalidos({});
    setModalAberto(false);
  }
    function cpfJaUsado(cpf, idAtual) {
    const cpfLimpo = somenteNumeros(cpf);
    const cpfResponsavel = somenteNumeros(formMorador?.cpf);

    if (!cpfLimpo) return false;

    if (cpfResponsavel && cpfLimpo === cpfResponsavel) {
      return "responsavel";
    }

    const repetido = dependentes.some(
      (item) => item.id !== idAtual && somenteNumeros(item.cpf) === cpfLimpo
    );

    return repetido ? "dependente" : false;
  }

  function validarPessoa(pessoa) {
    const invalidos = {};
    const idade = pessoa?.idade !== "" ? Number(pessoa.idade) : null;
    const menor16 = idade !== null && idade < 16;

    if (!pessoa?.nome?.trim()) invalidos.nome = true;
    if (!pessoa?.tipo_vinculo) invalidos.tipo_vinculo = true;

    if (!pessoa?.data_nascimento) {
      invalidos.data_nascimento = true;
    } else if (!validarDataNascimento(pessoa.data_nascimento)) {
      invalidos.data_nascimento = true;
      toast.error("Informe uma data de nascimento válida.");
    }

    if (pessoa?.cpf) {
      const cpfDuplicado = cpfJaUsado(pessoa.cpf, pessoa.id);

      if (cpfDuplicado === "responsavel") {
        invalidos.cpf = true;
        toast.error("Este CPF já pertence ao morador responsável.");
      }

      if (cpfDuplicado === "dependente") {
        invalidos.cpf = true;
        toast.error("Este CPF já foi informado em outro dependente.");
      }

      if (!validarCpf(pessoa.cpf)) {
        const tentativas = (pessoa.tentativas_cpf_invalidas || 0) + 1;

        if (tentativas < 3) {
          invalidos.cpf = true;

          setPessoaAtual((old) => ({
            ...old,
            tentativas_cpf_invalidas: tentativas,
          }));

          toast.error(
            `CPF inválido. Verifique os números informados. Tentativa ${tentativas}/3.`
          );
        } else {
          setPessoaAtual((old) => ({
            ...old,
            cpf_pendente_validacao: true,
          }));

          toast("CPF seguirá para auditoria administrativa.");
        }
      }
    }

    if (pessoa?.acesso_proprio_futuro) {
      if (!pessoa.email?.trim() || !validarEmail(pessoa.email)) {
        invalidos.email = true;
        toast.error("Informe um e-mail válido para futuro acesso próprio.");
      }

      const ddi = obterDDINumerico(pessoa.ddi || "+55");
      const whatsapp = somenteNumeros(pessoa.whatsapp);

      if (!ddi) {
        invalidos.ddi = true;
      }

      if (!whatsapp) {
        invalidos.whatsapp = true;
        toast.error("Informe o WhatsApp para futuro convite de acesso.");
      } else if (ddi === "55" && whatsapp.length < 10) {
        invalidos.whatsapp = true;
        toast.error("Informe um WhatsApp válido com DDD.");
      } else if (ddi !== "55" && whatsapp.length < 6) {
        invalidos.whatsapp = true;
        toast.error("Informe um telefone internacional válido.");
      }
    }

    if (
      menor16 &&
      (pessoa?.retira_portaria || pessoa?.acesso_proprio_futuro) &&
      !pessoa?.menor_16_ciencia
    ) {
      invalidos.menor_16_ciencia = true;
      toast.error("Confirme a ciência para menor de 16 anos.");
    }

    setCamposInvalidos(invalidos);
    return Object.keys(invalidos).length === 0;
  }

  function salvarPessoa() {
    if (!validarPessoa(pessoaAtual)) return;

    const pessoaFinal = {
      ...pessoaAtual,
      nome: capitalizarNome(pessoaAtual.nome),
      email: pessoaAtual.email?.trim().toLowerCase(),
      status: pessoaAtual.status || "PENDENTE",
    };

    setDependentes((old) => {
      const existe = old.some((item) => item.id === pessoaFinal.id);

      return existe
        ? old.map((item) => (item.id === pessoaFinal.id ? pessoaFinal : item))
        : [...old, pessoaFinal];
    });

    setPossuiPessoas(true);
    toast.success("Dependente salvo com sucesso.");
    fecharModal();
  }

  function excluirPessoa(id) {
    setDependentes((old) => old.filter((item) => item.id !== id));
    setModalExcluir(null);
    setPessoaDetalhe(null);
    toast.success("Dependente removido.");
  }

  async function salvarRascunho() {
    await onSaveDraft(
      montarPayloadTela3({
        dadosWizard,
        dependentes,
        possuiPessoas,
      })
    );

    toast.success("Rascunho salvo com sucesso.");
  }

  async function avancar() {
    if (possuiPessoas && dependentes.length === 0) {
      toast.error(
        "Adicione um dependente ou marque que não deseja cadastrar agora."
      );
      return;
    }

    await onNext(
      montarPayloadTela3({
        dadosWizard,
        dependentes,
        possuiPessoas,
      })
    );
  }

  return (
    <>
      <div className="wm-t3-page">
        <section className="wm-t3-card">
          <header className="wm-t3-title">
            <span className="wm-t3-title-icon">
              <UsersRound size={24} />
            </span>

            <div>
              <h1>3. Dependentes e Pessoas Vinculadas</h1>
              <p>
                Cadastre familiares vinculados à unidade. Funcionários, prestadores e terceiros
                serão cadastrados em área específica posteriormente.
              </p>
            </div>
          </header>

          <div className="wm-t3-divider" />

          <section className="wm-t3-summary-grid">
            <SummaryCard
              icon={<Building2 size={21} />}
              title="Condomínio"
              lines={[
                resumo.condominio,
                resumo.endereco,
                resumo.cidadeUf || resumo.cep ? `${resumo.cidadeUf}${resumo.cep ? ` • CEP ${resumo.cep}` : ""}` : "",
              ]}
            />

            <SummaryCard
              icon={<Building2 size={21} />}
              title="Unidade"
              lines={[
                `${resumo.torre} • ${resumo.unidade}`,
                `Perfil: ${resumo.perfil}`,
                resumo.unidadeVazia ? "Unidade vazia" : "Unidade ocupada",
              ]}
            />

            <SummaryCard
              icon={<UserRound size={21} />}
              title="Morador responsável"
              lines={[
                resumo.morador,
                resumo.cpf ? `CPF: ${resumo.cpf}` : "CPF não informado",
                resumo.email,
              ]}
            />

            <SummaryCard
              icon={<ShieldCheck size={21} />}
              title="Token"
              lines={[mascararToken(resumo.token), "Status: pendente"]}
            />
          </section>

          <section className="wm-t3-choice-card">
            <div>
              <h2>Deseja cadastrar dependentes agora?</h2>
              <p>
                Você pode cadastrar familiares que possam receber encomendas, retirar na portaria
                ou receber convite de acesso futuramente.
              </p>
            </div>

            <div className="wm-t3-choice">
              <button
                type="button"
                className={possuiPessoas ? "active" : ""}
                onClick={() => setPossuiPessoas(true)}
              >
                <Check size={15} />
                Sim, quero cadastrar
              </button>

              <button
                type="button"
                className={!possuiPessoas ? "active light" : "light"}
                onClick={() => setPossuiPessoas(false)}
              >
                Não quero cadastrar agora
              </button>
            </div>
          </section>
                    {possuiPessoas ? (
            <section className="wm-t3-list-section">
              <div className="wm-t3-list-head">
                <div>
                  <h2>Dependentes cadastrados ({dependentes.length})</h2>
                  <p>Todos iniciam com status pendente até a auditoria administrativa.</p>
                </div>

                <button type="button" onClick={abrirNovaPessoa}>
                  + Adicionar dependente
                </button>
              </div>

              {dependentes.length > 0 ? (
                <>
                  <div className="wm-t3-table-wrap">
                    <table className="wm-t3-table">
                      <thead>
                        <tr>
                          <th>Dependente</th>
                          <th>Parentesco</th>
                          <th>Idade</th>
                          <th>Recebe encomendas</th>
                          <th>Retira na portaria</th>
                          <th>Acesso futuro</th>
                          <th>CPF</th>
                          <th>Status</th>
                          <th>Ações</th>
                        </tr>
                      </thead>

                      <tbody>
                        {dependentes.map((pessoa) => (
                          <tr key={pessoa.id}>
                            <td>
                              <PessoaMini pessoa={pessoa} />
                            </td>

                            <td>{pessoa.tipo_vinculo}</td>

                            <td>{pessoa.idade !== "" ? `${pessoa.idade} anos` : "—"}</td>

                            <td>
                              <Bool ativo={pessoa.recebe_encomendas} />
                            </td>

                            <td>
                              <Bool ativo={pessoa.retira_portaria} />
                            </td>

                            <td>
                              <Bool ativo={pessoa.acesso_proprio_futuro} />
                            </td>

                            <td>{pessoa.cpf || "—"}</td>

                            <td>
                              <Status status={pessoa.status} />
                            </td>

                            <td>
                              <div className="wm-t3-actions-mini">
                                <button
                                  type="button"
                                  onClick={() => editarPessoa(pessoa)}
                                  aria-label="Editar dependente"
                                >
                                  <Edit3 size={15} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setModalExcluir(pessoa)}
                                  aria-label="Excluir dependente"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="wm-t3-mobile-cards">
                    {dependentes.map((pessoa) => (
                      <article key={pessoa.id} className="wm-t3-mobile-card">
                        <Avatar pessoa={pessoa} />

                        <div>
                          <strong>{pessoa.nome}</strong>
                          <span>{pessoa.tipo_vinculo}</span>
                          <small>{pessoa.idade !== "" ? `${pessoa.idade} anos` : "Idade não informada"}</small>
                        </div>

                        <Status status={pessoa.status} />

                        <div className="wm-t3-mobile-actions">
                          <button type="button" onClick={() => editarPessoa(pessoa)}>
                            Editar
                          </button>
                          <button type="button" onClick={() => setModalExcluir(pessoa)}>
                            Excluir
                          </button>
                        </div>
                      </article>
                    ))}

                    <button type="button" className="wm-t3-mobile-add" onClick={abrirNovaPessoa}>
                      <i>+</i>
                      <strong>Adicionar dependente</strong>
                      <span>Familiar vinculado à unidade</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="wm-t3-empty">
                  <UsersRound size={34} />
                  <strong>Nenhum dependente cadastrado</strong>
                  <p>
                    Clique em “Adicionar dependente” para incluir familiares vinculados à unidade.
                  </p>
                </div>
              )}

              <div className="wm-t3-note">
                <Info size={16} />
                <span>
                  O convite do dependente não será enviado agora. Após aprovação, o responsável
                  poderá enviar um token temporário e de uso único pelo WhatsApp no Portal do Morador.
                </span>
              </div>
            </section>
          ) : (
            <section className="wm-t3-empty">
              <UsersRound size={34} />
              <strong>Cadastro de dependentes pulado</strong>
              <p>
                Você poderá adicionar dependentes posteriormente no Portal do Morador.
              </p>
            </section>
          )}

          <section className="wm-t3-good-practices">
            <PracticeCard
              icon={<ShieldCheck size={20} />}
              title="Autorização controlada"
              text="Dependentes não iniciam autorizados para retirada. Toda permissão deve ser marcada pelo responsável."
            />

            <PracticeCard
              icon={<Mail size={20} />}
              title="Convite posterior"
              text="O acesso próprio poderá ser enviado depois pelo WhatsApp do responsável, com token temporário."
            />

            <PracticeCard
              icon={<Info size={20} />}
              title="Somente parentesco"
              text="Funcionários domésticos, prestadores e terceiros serão cadastrados em área própria."
            />
          </section>

          <footer className="wm-t3-actions">
            <button type="button" className="secondary" onClick={onBack}>
              <ArrowLeft size={16} />
              Voltar
            </button>

            <button type="button" className="outline" onClick={salvarRascunho}>
              <Save size={16} />
              Salvar e continuar depois
            </button>

            <button type="button" className="primary" onClick={avancar}>
              Salvar e continuar
              <ArrowRight size={18} />
            </button>
          </footer>
        </section>
      </div>

      {modalAberto ? (
        <ModalPessoa
          pessoa={pessoaAtual}
          setPessoa={setPessoaAtual}
          camposInvalidos={camposInvalidos}
          dependentes={dependentes}
          cpfResponsavel={formMorador?.cpf}
          onClose={fecharModal}
          onSave={salvarPessoa}
        />
      ) : null}

      {pessoaDetalhe ? (
        <ModalDetalhePessoa
          pessoa={pessoaDetalhe}
          onClose={() => setPessoaDetalhe(null)}
          onEdit={() => editarPessoa(pessoaDetalhe)}
          onDelete={() => setModalExcluir(pessoaDetalhe)}
        />
      ) : null}

      {modalExcluir ? (
        <ModalConfirmacao
          titulo="Excluir dependente?"
          texto={`Deseja remover ${modalExcluir.nome} da lista de dependentes?`}
          onClose={() => setModalExcluir(null)}
          onConfirm={() => excluirPessoa(modalExcluir.id)}
        />
      ) : null}
    </>
  );
}
function SummaryCard({ icon, title, lines = [] }) {
  return (
    <div className="wm-t3-summary-card">
      <span>{icon}</span>

      <div>
        <strong>{title}</strong>

        {lines
          .filter(Boolean)
          .map((line) => (
            <small key={line}>{line}</small>
          ))}
      </div>
    </div>
  );
}

function PessoaMini({ pessoa }) {
  return (
    <div className="wm-t3-person-mini">
      <Avatar pessoa={pessoa} />

      <div>
        <strong>{pessoa.nome}</strong>
        {pessoa.acesso_proprio_futuro ? <small>Acesso futuro</small> : null}
      </div>
    </div>
  );
}

function Avatar({ pessoa }) {
  if (pessoa.foto_base64) {
    return (
      <img
        className="wm-t3-avatar"
        src={pessoa.foto_base64}
        alt={pessoa.nome}
      />
    );
  }

  return <span className="wm-t3-avatar fallback">{iniciais(pessoa.nome)}</span>;
}

function Bool({ ativo }) {
  return (
    <span className={`wm-t3-bool ${ativo ? "ok" : "no"}`}>
      {ativo ? <Check size={12} /> : <X size={12} />}
    </span>
  );
}

function Status({ status = "PENDENTE" }) {
  const label = {
    PENDENTE: "Pendente",
    REVISAO: "Revisão",
    APROVADO: "Aprovado",
    REJEITADO: "Rejeitado",
  }[status] || "Pendente";

  return <span className={`wm-t3-status ${status.toLowerCase()}`}>{label}</span>;
}

function PracticeCard({ icon, title, text }) {
  return (
    <article className="wm-t3-practice-card">
      <span>{icon}</span>

      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </article>
  );
}

function ModalPessoa({
  pessoa,
  setPessoa,
  camposInvalidos,
  dependentes,
  cpfResponsavel,
  onClose,
  onSave,
}) {
  const inputFotoGaleriaRef = useRef(null);
  const inputFotoCameraRef = useRef(null);
  const inputDataRef = useRef(null);

  const [processandoFoto, setProcessandoFoto] = useState(false);

  const ehMobile =
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  const idadeNumerica = pessoa?.idade !== "" ? Number(pessoa.idade) : null;
  const menor16 = idadeNumerica !== null && idadeNumerica < 16;
  const menor18 = idadeNumerica !== null && idadeNumerica < 18;
  const exigeCiencia =
    menor16 && (pessoa?.retira_portaria || pessoa?.acesso_proprio_futuro);

  const cpfLimpo = somenteNumeros(pessoa?.cpf);
  const cpfValido = cpfLimpo.length === 11 && validarCpf(pessoa?.cpf);

  function salvarEtapaLocalAntesFoto() {
    try {
      sessionStorage.setItem("wizard_morador_etapa_atual", "3");
    } catch (error) {
      console.warn("Não foi possível salvar etapa local:", error);
    }
  }

  function cpfDuplicadoLocal(cpf) {
    const cpfAtual = somenteNumeros(cpf);
    if (!cpfAtual) return false;

    if (somenteNumeros(cpfResponsavel) === cpfAtual) {
      return "responsavel";
    }

    const existe = dependentes.some(
      (item) => item.id !== pessoa.id && somenteNumeros(item.cpf) === cpfAtual
    );

    return existe ? "dependente" : false;
  }

  function atualizar(campo, valor) {
    setPessoa((old) => {
      const novo = { ...old, [campo]: valor };

      if (campo === "nome") {
        novo.nome = capitalizarNome(valor);
      }

      if (campo === "cpf") {
        novo.cpf = formatarCpf(valor);
        novo.cpf_pendente_validacao = false;

        const duplicado = cpfDuplicadoLocal(novo.cpf);

        if (duplicado === "responsavel") {
          toast.error("Este CPF já pertence ao morador responsável.");
        }

        if (duplicado === "dependente") {
          toast.error("Este CPF já foi informado em outro dependente.");
        }
      }

      if (campo === "data_nascimento") {
        novo.data_nascimento = formatarData(valor);
        novo.idade = calcularIdade(novo.data_nascimento);

        if (Number(novo.idade) >= 16) {
          novo.menor_16_ciencia = false;
        }
      }

      if (campo === "ddi") {
        const novoDDI = normalizarDDI(valor);
        novo.ddi = novoDDI;
        novo.whatsapp = formatarTelefoneInternacional({
          ddi: novoDDI,
          numero: novo.whatsapp,
        });
      }

      if (campo === "whatsapp") {
        novo.whatsapp = formatarTelefoneInternacional({
          ddi: novo.ddi || "+55",
          numero: valor,
        });
      }

      if (campo === "acesso_proprio_futuro" && !valor) {
        novo.email = "";
        novo.whatsapp = "";
      }

      return novo;
    });
  }

  async function selecionarFoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setProcessandoFoto(true);

      const foto = await processarImagemLocal(file);

      atualizar("foto_base64", foto.previewBase64);
      atualizar("foto_nome", foto.nome);
      atualizar("foto_mime", foto.mime);
      atualizar("foto_tamanho", foto.tamanhoEstimado);

      toast.success("Foto otimizada com sucesso.");
    } catch (error) {
      toast.error(error.message || "Não foi possível processar a foto.");
    } finally {
      setProcessandoFoto(false);
      if (event.target) event.target.value = "";
    }
  }

  function removerFoto() {
    atualizar("foto_base64", "");
    atualizar("foto_nome", "");
    atualizar("foto_mime", "");
    atualizar("foto_tamanho", "");
  }

  function abrirCalendario() {
    const input = inputDataRef.current;
    if (!input) return;

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.focus();
    input.click();
  }

  return (
    <div className="wm-modal-overlay" role="dialog" aria-modal="true">
      <div className="wm-t3-modal">
        <header className="wm-t3-modal-head">
          <div>
            <h2>Adicionar dependente</h2>
            <p>Informe os dados do familiar e defina as permissões com cuidado.</p>
          </div>

          <button type="button" onClick={onClose} aria-label="Fechar modal">
            <X size={20} />
          </button>
        </header>

        <div className="wm-t3-modal-body">
          <section className="wm-t3-modal-section">
            <h3>1. Dados básicos</h3>

            <div className="wm-t3-photo-line">
              <div className="wm-t3-photo-preview">
                {pessoa.foto_base64 ? (
                  <img src={pessoa.foto_base64} alt="Foto do dependente" />
                ) : (
                  <UserRound size={36} />
                )}
              </div>

              <div className="wm-t3-photo-info">
                <strong>Foto do dependente (opcional)</strong>
                <span>JPG, PNG, HEIC ou WebP até 5MB. Otimização automática para WebP.</span>

                <div className="wm-t3-photo-actions">
                  <button
                    type="button"
                    className="wm-t3-mini-btn"
                    onClick={() => {
                      salvarEtapaLocalAntesFoto();
                      inputFotoGaleriaRef.current?.click();
                    }}
                    disabled={processandoFoto}
                  >
                    <Upload size={14} />
                    {processandoFoto ? "Processando..." : "Galeria"}
                  </button>

                  {ehMobile ? (
                    <button
                      type="button"
                      className="wm-t3-mini-btn"
                      onClick={() => {
                        salvarEtapaLocalAntesFoto();
                        inputFotoCameraRef.current?.click();
                      }}
                      disabled={processandoFoto}
                    >
                      <UserRound size={14} />
                      Câmera
                    </button>
                  ) : null}

                  {pessoa.foto_base64 ? (
                    <button
                      type="button"
                      className="wm-t3-mini-btn ghost"
                      onClick={removerFoto}
                      disabled={processandoFoto}
                    >
                      Remover
                    </button>
                  ) : null}

                  <input
                    ref={inputFotoGaleriaRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif"
                    onChange={selecionarFoto}
                    hidden
                  />

                  {ehMobile ? (
                    <input
                      ref={inputFotoCameraRef}
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={selecionarFoto}
                      hidden
                    />
                  ) : null}
                </div>
              </div>
            </div>

            <div className="wm-t3-modal-grid two">
              <Field
                label="Nome completo *"
                value={pessoa.nome}
                onChange={(v) => atualizar("nome", v)}
                invalid={camposInvalidos.nome}
                placeholder="Nome do dependente"
              />

              <label className="wm-t3-field">
                <span>Parentesco *</span>

                <select
                  value={pessoa.tipo_vinculo}
                  onChange={(e) => atualizar("tipo_vinculo", e.target.value)}
                  className={camposInvalidos.tipo_vinculo ? "invalid" : ""}
                  autoComplete="off"
                >
                  <option value="">Selecione</option>

                  {TIPOS_VINCULO.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="wm-t3-modal-grid three">
              <FieldDate
                label="Data de nascimento *"
                value={pessoa.data_nascimento}
                onChange={(v) => atualizar("data_nascimento", v)}
                invalid={camposInvalidos.data_nascimento}
                inputRef={inputDataRef}
                onOpenCalendar={abrirCalendario}
              />

              <Field
                label="Idade"
                value={pessoa.idade !== "" ? `${pessoa.idade} anos` : "—"}
                disabled
              />

              <Field
                label="CPF (opcional)"
                value={pessoa.cpf}
                onChange={(v) => atualizar("cpf", v)}
                invalid={camposInvalidos.cpf}
                inputMode="numeric"
                valid={cpfValido && !cpfDuplicadoLocal(pessoa.cpf)}
                placeholder="000.000.000-00"
              />
            </div>

            {pessoa.cpf_pendente_validacao ? (
              <div className="wm-t3-cpf-audit">
                CPF será encaminhado para auditoria administrativa.
              </div>
            ) : null}
          </section>

          <section className="wm-t3-modal-section">
            <h3>2. Permissões</h3>

            <PermissionCard
              checked={pessoa.recebe_encomendas}
              title="Pode receber encomendas em seu nome"
              text="Permite registrar encomendas destinadas a este dependente."
              onChange={(v) => atualizar("recebe_encomendas", v)}
            />

            <PermissionCard
              checked={pessoa.retira_portaria}
              title="Pode retirar encomendas na portaria"
              text="Permite retirada somente quando houver autorização ativa registrada no sistema."
              onChange={(v) => atualizar("retira_portaria", v)}
              green
            />

            <PermissionCard
              checked={pessoa.acesso_proprio_futuro}
              title="Poderá receber acesso próprio futuramente"
              text="O convite não será enviado agora. Após aprovação, o responsável poderá enviar pelo WhatsApp no Portal do Morador."
              onChange={(v) => atualizar("acesso_proprio_futuro", v)}
              purple
            />

            {pessoa.acesso_proprio_futuro ? (
              <div className="wm-t3-access-fields">
                <Field
                  label="E-mail *"
                  value={pessoa.email}
                  onChange={(v) => atualizar("email", v.toLowerCase())}
                  invalid={camposInvalidos.email}
                  placeholder="email@exemplo.com"
                />

                <div className="wm-t3-modal-grid phone">
                  <Field
                    label="DDI *"
                    value={pessoa.ddi || "+55"}
                    onChange={(v) => atualizar("ddi", v)}
                    invalid={camposInvalidos.ddi}
                    inputMode="tel"
                    placeholder="+55"
                  />

                  <Field
                    label="WhatsApp *"
                    value={pessoa.whatsapp}
                    onChange={(v) => atualizar("whatsapp", v)}
                    invalid={camposInvalidos.whatsapp}
                    inputMode="tel"
                    icon={<Phone size={15} />}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="wm-t3-access-note">
                  <Info size={15} />
                  <span>
                    O convite será enviado posteriormente pelo WhatsApp do responsável,
                    com token temporário e de uso único.
                  </span>
                </div>
              </div>
            ) : null}
          </section>

          {menor18 ? (
            <section className={`wm-t3-minor-alert ${menor16 ? "strong" : ""}`}>
              <h3>{menor16 ? "3. Menor de 16 anos" : "3. Menor de idade"}</h3>

              <p>
                Idade da pessoa: <strong>{pessoa.idade} anos</strong>
              </p>

              <div>
                <Info size={16} />
                <span>
                  {menor16
                    ? "Retirada na portaria e futuro acesso próprio exigem ciência e responsabilidade do morador responsável."
                    : "Dependentes menores de 18 anos exigem responsabilidade do morador responsável para permissões operacionais."}
                </span>
              </div>

              {exigeCiencia ? (
                <label
                  className={`wm-t3-check ${
                    camposInvalidos.menor_16_ciencia ? "invalid" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={pessoa.menor_16_ciencia}
                    onChange={() =>
                      atualizar("menor_16_ciencia", !pessoa.menor_16_ciencia)
                    }
                  />
                  <span>
                    Declaro ciência e assumo responsabilidade pelas autorizações concedidas.
                  </span>
                </label>
              ) : null}
            </section>
          ) : null}
        </div>

        <footer className="wm-t3-modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancelar
          </button>

          <button type="button" className="primary" onClick={onSave}>
            Salvar dependente
            <Check size={15} />
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  invalid,
  inputMode,
  icon,
  disabled,
  valid,
  placeholder,
}) {
  return (
    <label className="wm-t3-field">
      <span>{label}</span>

      <div
        className={`wm-t3-input ${invalid ? "invalid" : ""} ${
          disabled ? "disabled" : ""
        } ${valid ? "valid" : ""}`}
      >
        {icon}

        <input
          value={value || ""}
          onChange={(e) => onChange?.(e.target.value)}
          inputMode={inputMode}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />

        {valid ? (
          <i className="wm-t3-input-check">
            <Check size={14} />
          </i>
        ) : null}
      </div>
    </label>
  );
}

function FieldDate({ label, value, onChange, invalid, inputRef, onOpenCalendar }) {
  const iso = dataBrParaISO(value) || "";

  return (
    <label className="wm-t3-field">
      <span>{label}</span>

      <div className={`wm-t3-input ${invalid ? "invalid" : ""}`}>
        <CalendarDays size={15} />

        <input
          value={value || ""}
          onChange={(e) => onChange(formatarData(e.target.value))}
          inputMode="numeric"
          placeholder="DD/MM/AAAA"
          autoComplete="off"
        />

        <button
          type="button"
          className="wm-t3-calendar-btn"
          onClick={onOpenCalendar}
          aria-label="Abrir calendário"
        >
          <CalendarDays size={15} />
        </button>

        <input
          ref={inputRef}
          type="date"
          className="wm-t3-date-native"
          value={iso}
          onChange={(e) => onChange(dataISOParaBR(e.target.value))}
          aria-label="Selecionar data"
        />
      </div>
    </label>
  );
}

function PermissionCard({ checked, title, text, onChange, green, purple }) {
  return (
    <button
      type="button"
      className={`wm-t3-permission ${checked ? "active" : ""} ${
        green ? "green" : ""
      } ${purple ? "purple" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span>{checked ? <Check size={13} /> : null}</span>

      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </button>
  );
}

function ModalDetalhePessoa({ pessoa, onClose, onEdit, onDelete }) {
  return (
    <div className="wm-modal-overlay" role="dialog" aria-modal="true">
      <div className="wm-t3-detail-sheet">
        <button type="button" className="close" onClick={onClose}>
          <X size={18} />
        </button>

        <Avatar pessoa={pessoa} />

        <h2>{pessoa.nome}</h2>
        <strong>{pessoa.tipo_vinculo}</strong>

        <div className="wm-t3-detail-perms">
          <p>
            <PackageCheck size={16} />
            Recebe encomendas
            <Bool ativo={pessoa.recebe_encomendas} />
          </p>

          <p>
            <LockKeyhole size={16} />
            Retira na portaria
            <Bool ativo={pessoa.retira_portaria} />
          </p>

          <p>
            <UserRound size={16} />
            Acesso futuro ao sistema
            <Bool ativo={pessoa.acesso_proprio_futuro} />
          </p>
        </div>

        <button type="button" onClick={onEdit}>
          Editar
        </button>

        <button type="button" className="danger" onClick={onDelete}>
          Excluir dependente
        </button>

        <button type="button" className="secondary" onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  );
}

function ModalConfirmacao({ titulo, texto, onClose, onConfirm }) {
  return (
    <div className="wm-modal-overlay" role="dialog" aria-modal="true">
      <div className="wm-modal-card">
        <button type="button" className="wm-modal-close" onClick={onClose}>
          <X size={18} />
        </button>

        <h2>{titulo}</h2>
        <p>{texto}</p>

        <div className="wm-modal-actions">
          <button type="button" className="wm-modal-primary" onClick={onConfirm}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}