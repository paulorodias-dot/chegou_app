import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Copy,
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

const TIPOS_VINCULO = [
  "Cônjuge / Companheiro(a)",
  "Filho(a)",
  "Pai / Mãe",
  "Irmão(ã)",
  "Familiar",
  "Funcionário pessoal",
  "Autorizado eventual",
  "Outro",
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
  recebe_encomendas_nome: false,
  retira_portaria: false,
  acesso_proprio: false,
  email: "",
  ddi: "55",
  ddd: "",
  whatsapp: "",
  menor_16_ciencia: false,
  status: "Pendente",
};

function somenteNumeros(valor = "") {
  return String(valor).replace(/\D/g, "");
}

function capitalizarNome(valor = "") {
  const minusculas = new Set(["da", "de", "do", "das", "dos", "e"]);

  return String(valor)
    .trimStart()
    .toLowerCase()
    .replace(/(^|\s|-|')([\p{L}]+)/gu, (match, sep, palavra) => {
      if (sep === " " && minusculas.has(palavra)) return `${sep}${palavra}`;
      return `${sep}${palavra.charAt(0).toUpperCase()}${palavra.slice(1)}`;
    });
}

function primeiroNome(nome = "") {
  return nome.trim().split(/\s+/)[0] || "Pessoa";
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

function calcularIdade(data = "") {
  const partes = data.split("/");
  if (partes.length !== 3) return "";

  const [dia, mes, ano] = partes.map(Number);
  if (!dia || !mes || !ano || ano < 1900) return "";

  const nascimento = new Date(ano, mes - 1, dia);
  if (Number.isNaN(nascimento.getTime())) return "";

  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const diffMes = hoje.getMonth() - nascimento.getMonth();

  if (diffMes < 0 || (diffMes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade -= 1;
  }

  return idade >= 0 ? idade : "";
}

function validarEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function gerarId() {
  return `dep-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function mascararCpf(cpf = "") {
  const v = somenteNumeros(cpf);
  if (v.length !== 11) return cpf || "Não informado";
  return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9, 11)}`;
}

function traduzirPerfil(perfil = "") {
  const mapa = {
    proprietario_residente: "Proprietário Morador",
    proprietario_morador: "Proprietário Morador",
    proprietario_nao_residente: "Proprietário Não Residente",
    proprietario_unidade_alugada: "Proprietário Não Residente",
    inquilino: "Inquilino",
    responsavel_unidade_corporativa: "Unidade Corporativa",
    unidade_vazia: "Unidade Vazia",
  };

  return mapa[perfil] || perfil || "Perfil não informado";
}

function obterResumo(dadosWizard, formTela1, formMorador) {
  const pre = dadosWizard?.pre_cadastro || {};
  const condominio = dadosWizard?.condominio || {};

  const perfil =
    formTela1?.perfilUnidade ||
    formTela1?.relacaoUnidade ||
    pre.relacao_unidade ||
    dadosWizard?.perfil_unidade ||
    "";

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
    torre: pre.torre_nome || pre.torre || dadosWizard?.torre || "Torre",
    unidade: pre.unidade_nome || pre.unidade || dadosWizard?.unidade || "Unidade",
    perfil: traduzirPerfil(perfil),
    unidadeVazia: perfil === "unidade_vazia",
    morador: formMorador?.nomeCompleto || pre.nome || "Não informado",
    cpf: formMorador?.cpf || pre.cpf || "",
    email: formMorador?.emailPrincipal || pre.email || "",
    whatsapp: `+${formMorador?.ddi || "55"} (${formMorador?.ddd || ""}) ${
      formMorador?.whatsapp || ""
    }`,
  };
}

function montarPayloadTela3({ dadosWizard, dependentes, possuiPessoas }) {
  return {
    business_id: dadosWizard?.business_id || null,
    condominio_id: dadosWizard?.condominio_id || null,
    pre_cadastro_id: dadosWizard?.pre_cadastro_id || null,
    unidade_id: dadosWizard?.pre_cadastro?.unidade_id || dadosWizard?.unidade_id || null,
    possui_pessoas_vinculadas: possuiPessoas,
    pessoas_vinculadas: dependentes.map((pessoa) => ({
      id: pessoa.id,
      nome: pessoa.nome,
      tipo_vinculo: pessoa.tipo_vinculo,
      data_nascimento: pessoa.data_nascimento,
      idade: pessoa.idade,
      cpf: somenteNumeros(pessoa.cpf),
      cpf_pendente_validacao: pessoa.cpf_pendente_validacao,
      foto_base64: pessoa.foto_base64 || null,
      foto_nome: pessoa.foto_nome || null,
      recebe_encomendas_nome: pessoa.recebe_encomendas_nome,
      retira_portaria: pessoa.retira_portaria,
      acesso_proprio: pessoa.acesso_proprio,
      email: pessoa.acesso_proprio ? pessoa.email?.trim().toLowerCase() : "",
      ddi: somenteNumeros(pessoa.ddi || "55"),
      ddd: somenteNumeros(pessoa.ddd),
      whatsapp: pessoa.acesso_proprio ? somenteNumeros(pessoa.whatsapp) : "",
      menor_16_ciencia: pessoa.menor_16_ciencia,
      status: pessoa.status || "Pendente",
      auditoria_status: "AGUARDANDO_AUDITORIA",
    })),
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
  onCancel,
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
    const menor16 = pessoa?.idade !== "" && Number(pessoa.idade) < 16;

    if (!pessoa?.nome?.trim()) invalidos.nome = true;
    if (!pessoa?.tipo_vinculo) invalidos.tipo_vinculo = true;
    if (!pessoa?.data_nascimento) invalidos.data_nascimento = true;

    if (pessoa?.cpf) {
      const cpfDuplicado = cpfJaUsado(pessoa.cpf, pessoa.id);

      if (cpfDuplicado === "responsavel") {
        invalidos.cpf = true;
        toast.error("Este CPF já pertence ao morador responsável.");
      }

      if (cpfDuplicado === "dependente") {
        invalidos.cpf = true;
        toast.error("Este CPF já foi informado em outra pessoa vinculada.");
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

    if (pessoa?.acesso_proprio) {
      if (!pessoa.email?.trim() || !validarEmail(pessoa.email)) {
        invalidos.email = true;
        toast.error("Informe um e-mail válido para o acesso próprio.");
      }

      if (!somenteNumeros(pessoa.ddd)) {
        invalidos.ddd = true;
      }

      if (!somenteNumeros(pessoa.whatsapp)) {
        invalidos.whatsapp = true;
        toast.error("Informe o WhatsApp para o acesso próprio.");
      }
    }

    if (
      menor16 &&
      (pessoa?.retira_portaria || pessoa?.acesso_proprio) &&
      !pessoa?.menor_16_ciencia
    ) {
      invalidos.menor_16_ciencia = true;
      toast.error("Confirme a ciência para menor de 16 anos.");
    }

    if (Object.keys(invalidos).length > 0) {
      setCamposInvalidos(invalidos);
      return false;
    }

    return true;
  }

  function salvarPessoa() {
    if (!validarPessoa(pessoaAtual)) return;

    const pessoaFinal = {
      ...pessoaAtual,
      nome: capitalizarNome(pessoaAtual.nome),
      email: pessoaAtual.email?.trim().toLowerCase(),
      status: "Pendente",
    };

    setDependentes((old) => {
      const existe = old.some((item) => item.id === pessoaFinal.id);

      return existe
        ? old.map((item) => (item.id === pessoaFinal.id ? pessoaFinal : item))
        : [...old, pessoaFinal];
    });

    setPossuiPessoas(true);
    toast.success("Pessoa vinculada salva com sucesso.");
    fecharModal();
  }

  function excluirPessoa(id) {
    setDependentes((old) => old.filter((item) => item.id !== id));
    setModalExcluir(null);
    setPessoaDetalhe(null);
    toast.success("Pessoa vinculada removida.");
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
        "Adicione uma pessoa vinculada ou marque que não deseja cadastrar agora."
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

  function copiarToken() {
    navigator.clipboard?.writeText(resumo.token);
    toast.success("Token copiado.");
  }

  return (
    <>
      <div className="wm-t3-grid">
        <section className="wm-t3-main">
          <header className="wm-t3-hero">
            <span className="wm-t3-hero-icon">
              <UsersRound size={26} />
            </span>

            <div>
              <h1>Pessoas vinculadas à unidade</h1>
              <p>
                Cadastre quem pode receber encomendas, retirar na portaria ou ter
                acesso próprio ao Sistema Chegou<span className="wm-orange">!</span>.
              </p>
            </div>
          </header>

          <section className="wm-t3-summary">
            <div>
              <span>1. Resumo do Condomínio</span>
              <strong>{resumo.condominio}</strong>
              <p>{resumo.endereco}</p>
              {resumo.cidadeUf || resumo.cep ? (
                <p>
                  {resumo.cidadeUf}
                  {resumo.cep ? ` • CEP ${resumo.cep}` : ""}
                </p>
              ) : null}
              <p>ID do Condomínio: {resumo.idCondominio}</p>

              <button type="button" onClick={copiarToken}>
                Token do seu convite: {resumo.token}
                <Copy size={13} />
              </button>
            </div>

            <div>
              <span>2. Torre e Unidade</span>
              <strong>
                {resumo.torre} • {resumo.unidade}
              </strong>
              <p>Perfil: {resumo.perfil}</p>
              <em>{resumo.unidadeVazia ? "Unidade vazia" : "Unidade ocupada"}</em>
            </div>

            <div>
              <span>3. Morador Responsável</span>
              <strong>{resumo.morador}</strong>
              <p>CPF: {mascararCpf(resumo.cpf)}</p>
              <p>{resumo.email}</p>
              <p>{resumo.whatsapp}</p>
            </div>
          </section>

          <section className="wm-t3-card">
            <div className="wm-t3-card-head">
              <div>
                <h2>Deseja cadastrar pessoas vinculadas à sua unidade?</h2>
                <p>
                  Inclua pessoas que podem receber encomendas, retirar na portaria
                  ou ter acesso próprio.
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
            </div>

            {possuiPessoas ? (
              <>
                <div className="wm-t3-list-head">
                  <h3>Pessoas vinculadas cadastradas ({dependentes.length})</h3>

                  <button type="button" onClick={abrirNovaPessoa}>
                    + Adicionar pessoa
                  </button>
                </div>

                {dependentes.length > 0 ? (
                  <>
                    <div className="wm-t3-table-wrap">
                      <table className="wm-t3-table">
                        <thead>
                          <tr>
                            <th>Nome</th>
                            <th>Vínculo</th>
                            <th>Idade</th>
                            <th>Recebe em seu nome</th>
                            <th>Retira na portaria</th>
                            <th>Acesso próprio</th>
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
                              <td>
                                {pessoa.idade !== "" ? `${pessoa.idade} anos` : "-"}
                              </td>
                              <td>
                                <Bool ativo={pessoa.recebe_encomendas_nome} />
                              </td>
                              <td>
                                <Bool ativo={pessoa.retira_portaria} />
                              </td>
                              <td>
                                <Bool ativo={pessoa.acesso_proprio} />
                              </td>
                              <td>{pessoa.cpf || "—"}</td>
                              <td>
                                <Status />
                              </td>
                              <td>
                                <div className="wm-t3-actions-mini">
                                  <button
                                    type="button"
                                    onClick={() => editarPessoa(pessoa)}
                                  >
                                    <Edit3 size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setModalExcluir(pessoa)}
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

                    <div className="wm-t3-mobile-avatars">
                      {dependentes.map((pessoa) => (
                        <button
                          key={pessoa.id}
                          type="button"
                          onClick={() => setPessoaDetalhe(pessoa)}
                        >
                          <Avatar pessoa={pessoa} />
                          <strong>{primeiroNome(pessoa.nome)}</strong>
                          <span>{pessoa.tipo_vinculo}</span>
                        </button>
                      ))}

                      <button type="button" className="add" onClick={abrirNovaPessoa}>
                        <i>+</i>
                        <strong>Adicionar</strong>
                        <span>pessoa</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="wm-t3-empty">
                    <UsersRound size={36} />
                    <strong>Nenhuma pessoa vinculada cadastrada</strong>
                    <p>
                      Clique em “Adicionar pessoa” para incluir dependentes,
                      familiares ou autorizados.
                    </p>
                  </div>
                )}

                <div className="wm-t3-note">
                  <Info size={16} />
                  <span>
                    A aprovação das pessoas vinculadas será feita pela administração
                    do condomínio. Você poderá acompanhar o status no Portal do Morador.
                  </span>
                </div>
              </>
            ) : (
              <div className="wm-t3-empty">
                <UsersRound size={36} />
                <strong>Cadastro de pessoas vinculadas pulado</strong>
                <p>
                  Você poderá adicionar pessoas vinculadas posteriormente no Portal
                  do Morador.
                </p>
              </div>
            )}

            <footer className="wm-t3-actions">
              <button type="button" className="secondary" onClick={onBack}>
                <ArrowLeft size={17} />
                Voltar
              </button>

              <button type="button" className="outline" onClick={salvarRascunho}>
                <Save size={17} />
                Salvar e continuar depois
              </button>

              <button type="button" className="primary" onClick={avancar}>
                Salvar e continuar
                <ArrowRight size={18} />
              </button>
            </footer>
          </section>
        </section>
                <aside className="wm-t3-side">
          <SideInfo
            title="Entenda as permissões"
            text="Receber encomendas em seu nome registra encomendas para a pessoa. Retirar na portaria permite retirada física, inclusive de encomendas do responsável e de outros dependentes autorizados."
            icon={<Info size={23} />}
          />

          <SideInfo
            title="Menores de 16 anos"
            text="Retirada na portaria e acesso próprio exigem ciência e responsabilidade do morador responsável."
            icon={<ShieldCheck size={23} />}
            orange
          />

          <SideInfo
            title="Convite de acesso"
            text="O convite não será enviado agora. Após aprovação, o responsável poderá enviar um token temporário e de uso único pelo Portal do Morador."
            icon={<Mail size={23} />}
            green
          />
        </aside>
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
          titulo="Excluir pessoa vinculada?"
          texto={`Deseja remover ${modalExcluir.nome} da lista de pessoas vinculadas?`}
          onClose={() => setModalExcluir(null)}
          onConfirm={() => excluirPessoa(modalExcluir.id)}
        />
      ) : null}
    </>
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
  const menor16 = pessoa?.idade !== "" && Number(pessoa.idade) < 16;
  const exigeCiencia = menor16 && (pessoa?.retira_portaria || pessoa?.acesso_proprio);
  const cpfLimpo = somenteNumeros(pessoa?.cpf);
  const cpfValido = cpfLimpo.length === 11 && validarCpf(pessoa?.cpf);

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
          toast.error("Este CPF já foi informado em outra pessoa vinculada.");
        }
      }

      if (campo === "data_nascimento") {
        novo.data_nascimento = formatarData(valor);
        novo.idade = calcularIdade(novo.data_nascimento);

        if (Number(novo.idade) >= 16) {
          novo.menor_16_ciencia = false;
        }
      }

      if (campo === "acesso_proprio" && !valor) {
        novo.email = "";
        novo.ddd = "";
        novo.whatsapp = "";
      }

      return novo;
    });
  }

  async function selecionarFoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type)) {
      toast.error("Envie uma imagem PNG, JPG ou WebP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      atualizar("foto_base64", reader.result);
      atualizar("foto_nome", file.name);
    };

    reader.onerror = () => {
      toast.error("Não foi possível carregar a foto.");
    };

    reader.readAsDataURL(file);
  }

  return (
    <div className="wm-modal-overlay" role="dialog" aria-modal="true">
      <div className="wm-t3-modal">
        <header className="wm-t3-modal-head">
          <div>
            <h2>Adicionar pessoa vinculada</h2>
            <p>Preencha os dados da pessoa e defina as permissões de acesso.</p>
          </div>

          <button type="button" onClick={onClose} aria-label="Fechar modal">
            <X size={20} />
          </button>
        </header>

        <div className="wm-t3-modal-body">
          <section className="wm-t3-modal-section">
            <h3>1. Dados básicos</h3>

            <div className="wm-t3-photo-line">
              <label className="wm-t3-photo-upload">
                {pessoa.foto_base64 ? (
                  <img src={pessoa.foto_base64} alt="Foto da pessoa" />
                ) : (
                  <>
                    <Upload size={24} />
                    <span>Adicionar foto</span>
                  </>
                )}

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={selecionarFoto}
                />
              </label>

              <div className="wm-t3-photo-tip">
                <Info size={16} />
                <span>A foto ajuda a identificar esta pessoa na portaria e no aplicativo.</span>
              </div>
            </div>

            <div className="wm-t3-modal-grid two">
              <Field
                label="Nome completo *"
                value={pessoa.nome}
                onChange={(v) => atualizar("nome", v)}
                invalid={camposInvalidos.nome}
              />

              <label className="wm-t3-field">
                <span>Tipo de vínculo *</span>
                <select
                  value={pessoa.tipo_vinculo}
                  onChange={(e) => atualizar("tipo_vinculo", e.target.value)}
                  className={camposInvalidos.tipo_vinculo ? "invalid" : ""}
                  autoComplete="off"
                >
                  <option value="">Selecione o vínculo</option>
                  {TIPOS_VINCULO.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="wm-t3-modal-grid three">
              <Field
                label="Data de nascimento *"
                value={pessoa.data_nascimento}
                onChange={(v) => atualizar("data_nascimento", v)}
                invalid={camposInvalidos.data_nascimento}
                inputMode="numeric"
                icon={<CalendarDays size={15} />}
              />

              <Field
                label="Idade"
                value={pessoa.idade !== "" ? `${pessoa.idade} anos` : "— anos"}
                disabled
              />

              <Field
                label="CPF (opcional)"
                value={pessoa.cpf}
                onChange={(v) => atualizar("cpf", v)}
                invalid={camposInvalidos.cpf}
                inputMode="numeric"
                valid={cpfValido && !cpfDuplicadoLocal(pessoa.cpf)}
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
              checked={pessoa.recebe_encomendas_nome}
              title="Pode receber encomendas em seu nome"
              text="Permite que encomendas sejam registradas no nome desta pessoa. Ex.: presentes enviados por familiares."
              onChange={(v) => atualizar("recebe_encomendas_nome", v)}
            />

            <PermissionCard
              checked={pessoa.retira_portaria}
              title="Pode retirar encomendas na portaria"
              text="Permite retirar encomendas dela mesma, de outros dependentes autorizados e também do morador responsável."
              onChange={(v) => atualizar("retira_portaria", v)}
              green
            />

            <PermissionCard
              checked={pessoa.acesso_proprio}
              title="Terá acesso próprio ao Sistema Chegou!"
              text="Após aprovação, o responsável poderá enviar um convite individual pelo Portal do Morador."
              onChange={(v) => atualizar("acesso_proprio", v)}
              purple
            />

            {pessoa.acesso_proprio ? (
              <div className="wm-t3-access-fields">
                <Field
                  label="E-mail *"
                  value={pessoa.email}
                  onChange={(v) => atualizar("email", v.toLowerCase())}
                  invalid={camposInvalidos.email}
                />

                <div className="wm-t3-modal-grid three compact">
                  <Field
                    label="DDI"
                    value={pessoa.ddi || "55"}
                    onChange={(v) => atualizar("ddi", somenteNumeros(v).slice(0, 3))}
                  />

                  <Field
                    label="DDD *"
                    value={pessoa.ddd}
                    onChange={(v) => atualizar("ddd", somenteNumeros(v).slice(0, 2))}
                    invalid={camposInvalidos.ddd}
                  />

                  <Field
                    label="WhatsApp *"
                    value={pessoa.whatsapp}
                    onChange={(v) =>
                      atualizar("whatsapp", somenteNumeros(v).slice(0, 9))
                    }
                    invalid={camposInvalidos.whatsapp}
                    icon={<Phone size={15} />}
                  />
                </div>

                <div className="wm-t3-access-note">
                  <Info size={15} />
                  <span>
                    O convite não será enviado agora. Após aprovação, o responsável
                    poderá enviar um token temporário pelo Portal do Morador.
                  </span>
                </div>
              </div>
            ) : null}
          </section>

          {menor16 ? (
            <section className="wm-t3-minor-alert">
              <h3>3. Menor de 16 anos</h3>
              <p>
                Idade da pessoa: <strong>{pessoa.idade} anos</strong>
              </p>

              <div>
                <Info size={16} />
                <span>
                  A retirada de encomendas na portaria e a criação de acesso próprio
                  exigem autorização do morador responsável.
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
            Salvar pessoa vinculada
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

function PessoaMini({ pessoa }) {
  return (
    <div className="wm-t3-person-mini">
      <Avatar pessoa={pessoa} />

      <div>
        <strong>{pessoa.nome}</strong>
        {pessoa.acesso_proprio ? <small>Acesso próprio</small> : null}
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

function Status() {
  return <span className="wm-t3-status">Pendente</span>;
}

function SideInfo({ title, text, icon, orange, green }) {
  return (
    <section
      className={`wm-t3-side-card ${orange ? "orange" : ""} ${
        green ? "green" : ""
      }`}
    >
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </section>
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
            Recebe encomendas em seu nome
            <Bool ativo={pessoa.recebe_encomendas_nome} />
          </p>

          <p>
            <LockKeyhole size={16} />
            Retira encomendas na portaria
            <Bool ativo={pessoa.retira_portaria} />
          </p>

          <p>
            <UserRound size={16} />
            Acesso próprio ao sistema
            <Bool ativo={pessoa.acesso_proprio} />
          </p>
        </div>

        {pessoa.retira_portaria ? (
          <div className="wm-t3-note">
            <Info size={15} />
            <span>
              Com a permissão de retirada, esta pessoa poderá retirar encomendas
              dela, de outros dependentes autorizados e do morador responsável.
            </span>
          </div>
        ) : null}

        <button type="button" onClick={onEdit}>
          Editar permissões
        </button>

        <button type="button" className="danger" onClick={onDelete}>
          Excluir pessoa
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