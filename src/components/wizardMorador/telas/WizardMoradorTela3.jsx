import { useEffect, useMemo, useRef, useState } from "react";
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
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import "../../../styles/wizardMorador/WizardMoradorTela3.css";

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
  recebe_encomendas: false,
  retira_portaria: false,
  acesso_proprio_futuro: false,
  email: "",
  ddi: "+55",
  whatsapp: "",
  menor_16_ciencia: false,
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
  if (numeros.length <= 6) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
  }

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
    .replace(/(^|\s|-|')([\p{L}]+)/gu, (_, separador, palavra) => {
      if (separador === " " && minusculas.has(palavra)) {
        return `${separador}${palavra}`;
      }

      return `${separador}${palavra.charAt(0).toUpperCase()}${palavra.slice(1)}`;
    });
}

function iniciais(nome = "") {
  const partes = String(nome).trim().split(/\s+/).filter(Boolean);

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

  if (
    diffMes < 0 ||
    (diffMes === 0 && hoje.getDate() < nascimento.getDate())
  ) {
    idade -= 1;
  }

  return idade >= 0 ? idade : "";
}

function validarDataNascimento(valor = "") {
  const iso = dataBrParaISO(valor);
  if (!iso) return false;

  const [ano, mes, dia] = iso.split("-").map(Number);
  const data = new Date(`${iso}T00:00:00`);
  const hoje = new Date();

  if (Number.isNaN(data.getTime())) return false;
  if (data > hoje) return false;
  if (ano < 1900) return false;

  return (
    data.getFullYear() === ano &&
    data.getMonth() + 1 === mes &&
    data.getDate() === dia
  );
}

function validarEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function gerarId() {
  return `dep-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
    torre:
      pre.torre_nome ||
      pre.torre ||
      pre.bloco_nome ||
      pre.bloco ||
      dadosWizard?.torre_nome ||
      dadosWizard?.torre ||
      dadosWizard?.bloco ||
      "Não informado",
    unidade:
      pre.unidade_nome ||
      pre.unidade ||
      dadosWizard?.unidade_nome ||
      dadosWizard?.unidade ||
      "Não informado",
    perfil: traduzirPerfil(perfil),
    morador: nomeExibicao,
    cpf: formMorador?.cpf || pre.cpf || "",
    email: formMorador?.emailPrincipal || pre.email || "",
  };
}

function montarPayloadTela3({ dependentes, possuiPessoas }) {
  return {
    possui_pessoas_vinculadas: Boolean(possuiPessoas),
    pessoas_vinculadas: possuiPessoas
      ? dependentes.map((pessoa) => {
          const telefoneE164 = montarTelefoneE164({
            ddi: pessoa.ddi || "+55",
            numero: pessoa.whatsapp,
          });

          return {
            id: pessoa.id,
            nome: pessoa.nome?.trim() || "",
            tipo_vinculo: pessoa.tipo_vinculo || "",
            data_nascimento: pessoa.data_nascimento || "",
            data_nascimento_iso: dataBrParaISO(pessoa.data_nascimento),
            idade: pessoa.idade === "" ? null : Number(pessoa.idade),
            cpf: somenteNumeros(pessoa.cpf),
            cpf_formatado: pessoa.cpf || "",
            cpf_pendente_validacao: Boolean(pessoa.cpf_pendente_validacao),
            recebe_encomendas: Boolean(pessoa.recebe_encomendas),
            retira_portaria: Boolean(pessoa.retira_portaria),
            acesso_proprio_futuro: Boolean(pessoa.acesso_proprio_futuro),
            email: pessoa.acesso_proprio_futuro
              ? pessoa.email?.trim().toLowerCase() || ""
              : "",
            ddi: pessoa.acesso_proprio_futuro
              ? obterDDINumerico(pessoa.ddi || "+55")
              : "",
            whatsapp: pessoa.acesso_proprio_futuro
              ? somenteNumeros(pessoa.whatsapp)
              : "",
            whatsapp_e164: pessoa.acesso_proprio_futuro ? telefoneE164 : "",
            menor_16_ciencia: Boolean(pessoa.menor_16_ciencia),
          };
        })
      : [],
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

  const [
    processando,
    setProcessando,
  ] = useState(false);

  const [
    salvandoRascunho,
    setSalvandoRascunho,
  ] = useState(false);

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

    if (!pessoa?.nome?.trim()) {
      invalidos.nome = true;
      toast.error("Informe o nome completo do dependente.");
    }

    if (!pessoa?.tipo_vinculo) {
      invalidos.tipo_vinculo = true;
      toast.error("Selecione o parentesco.");
    }

    if (!pessoa?.data_nascimento) {
      invalidos.data_nascimento = true;
      toast.error("Informe a data de nascimento.");
    } else if (!validarDataNascimento(pessoa.data_nascimento)) {
      invalidos.data_nascimento = true;
      toast.error("Informe uma data de nascimento válida.");
    }

    if (pessoa?.cpf) {
      const cpfDuplicado = cpfJaUsado(pessoa.cpf, pessoa.id);

      if (cpfDuplicado === "responsavel") {
        invalidos.cpf = true;
        toast.error("Este CPF já foi informado para o responsável pela unidade.");
      } else if (cpfDuplicado === "dependente") {
        invalidos.cpf = true;
        toast.error("Este CPF já foi informado para outro dependente.");
      } else if (!validarCpf(pessoa.cpf) && !pessoa.cpf_pendente_validacao) {
        const tentativas = (pessoa.tentativas_cpf_invalidas || 0) + 1;

        if (tentativas < 3) {
          invalidos.cpf = true;

          setPessoaAtual((old) => ({
            ...old,
            tentativas_cpf_invalidas: tentativas,
          }));

          toast.error("Confira os números do CPF informado.");
        } else {
          setPessoaAtual((old) => ({
            ...old,
            tentativas_cpf_invalidas: tentativas,
            cpf_pendente_validacao: true,
          }));

          toast(
            "Você pode continuar. A administração conferirá o CPF informado antes da aprovação do cadastro."
          );
        }
      }
    }

    if (pessoa?.acesso_proprio_futuro) {
      if (!pessoa.email?.trim() || !validarEmail(pessoa.email)) {
        invalidos.email = true;
        toast.error("Informe um e-mail válido para este dependente.");
      }

      const ddi = obterDDINumerico(pessoa.ddi || "+55");
      const whatsapp = somenteNumeros(pessoa.whatsapp);

      if (!ddi) {
        invalidos.ddi = true;
        toast.error("Informe o código do país.");
      }

      if (!whatsapp) {
        invalidos.whatsapp = true;
        toast.error("Informe o WhatsApp do dependente.");
      } else if (ddi === "55" && whatsapp.length < 10) {
        invalidos.whatsapp = true;
        toast.error("Informe o WhatsApp com DDD.");
      } else if (ddi !== "55" && whatsapp.length < 6) {
        invalidos.whatsapp = true;
        toast.error("Confira o número de telefone informado.");
      }
    }

    if (
      menor16 &&
      (pessoa?.retira_portaria || pessoa?.acesso_proprio_futuro) &&
      !pessoa?.menor_16_ciencia
    ) {
      invalidos.menor_16_ciencia = true;
      toast.error("Confirme sua ciência sobre as permissões concedidas ao menor.");
    }

    setCamposInvalidos(invalidos);
    return Object.keys(invalidos).length === 0;
  }

  function salvarPessoa() {
    if (!pessoaAtual || !validarPessoa(pessoaAtual)) return;

    const pessoaFinal = {
      ...pessoaAtual,
      nome: capitalizarNome(pessoaAtual.nome),
      email: pessoaAtual.acesso_proprio_futuro
        ? pessoaAtual.email?.trim().toLowerCase() || ""
        : "",
      ddi: pessoaAtual.acesso_proprio_futuro ? pessoaAtual.ddi || "+55" : "+55",
      whatsapp: pessoaAtual.acesso_proprio_futuro ? pessoaAtual.whatsapp || "" : "",
    };

    setDependentes((old) => {
      const existe = old.some((item) => item.id === pessoaFinal.id);

      return existe
        ? old.map((item) => (item.id === pessoaFinal.id ? pessoaFinal : item))
        : [...old, pessoaFinal];
    });

    setPossuiPessoas(true);
    toast.success("Dependente salvo.");
    fecharModal();
  }

  function excluirPessoa(id) {
    setDependentes((old) => old.filter((item) => item.id !== id));
    setModalExcluir(null);
    setPessoaDetalhe(null);
    toast.success("Dependente removido.");
  }

  function selecionarSemDependentes() {
    if (dependentes.length > 0) {
      const confirmar = window.confirm(
        "Ao escolher esta opção, os dependentes já adicionados nesta etapa serão removidos. Deseja continuar?"
      );

      if (!confirmar) return;
      setDependentes([]);
    }

    setPossuiPessoas(false);
  }

  async function salvarRascunho() {
    if (
      salvandoRascunho ||
      processando
    ) {
      return;
    }

    try {
      setSalvandoRascunho(true);

      const salvou =
        await onSaveDraft(
          montarPayloadTela3({
            dependentes,
            possuiPessoas,
          })
        );

      if (salvou !== false) {
        toast.success(
          "Suas informações foram salvas."
        );
      }
    } catch (error) {
      console.error(
        "Erro ao salvar a Tela 3:",
        error
      );
    } finally {
      setSalvandoRascunho(false);
    }
  }

  async function avancar() {
    if (
      processando ||
      salvandoRascunho
    ) {
      return;
    }

    if (
      possuiPessoas &&
      dependentes.length === 0
    ) {
      toast.error(
        "Adicione pelo menos um dependente ou escolha continuar sem cadastrar."
      );

      return;
    }

    try {
      setProcessando(true);

      const salvou =
        await onNext(
          montarPayloadTela3({
            dependentes,
            possuiPessoas,
          })
        );

      if (salvou === false) {
        setProcessando(false);
      }
    } catch (error) {
      console.error(
        "Erro ao continuar a Tela 3:",
        error
      );

      setProcessando(false);
    }
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
              <h1>3. Dependentes e familiares</h1>
              <p>
                Cadastre familiares ligados à sua unidade e defina quais permissões cada pessoa poderá ter.
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
                resumo.cidadeUf || resumo.cep
                  ? `${resumo.cidadeUf}${resumo.cep ? ` • CEP ${resumo.cep}` : ""}`
                  : "",
              ]}
            />

            <SummaryCard
              icon={<Building2 size={21} />}
              title="Unidade"
              lines={[
                `${resumo.torre} • ${resumo.unidade}`,
                `Relação com a unidade: ${resumo.perfil}`,
              ]}
            />

            <SummaryCard
              icon={<UserRound size={21} />}
              title="Responsável pela unidade"
              lines={[
                resumo.morador,
                resumo.cpf ? `CPF: ${resumo.cpf}` : "CPF não informado",
                resumo.email,
              ]}
            />
          </section>

          <section className="wm-t3-choice-card">
            <div>
              <h2>Deseja cadastrar dependentes ou familiares agora?</h2>
              <p>
                Você pode informar quem está ligado à unidade e escolher, quando necessário, permissões para encomendas e acesso próprio.
              </p>
            </div>

            <div className="wm-t3-choice">
              <button
                type="button"
                className={possuiPessoas ? "active" : ""}
                onClick={() => setPossuiPessoas(true)}
                aria-pressed={possuiPessoas}
              >
                <Check size={15} />
                Sim, quero cadastrar
              </button>

              <button
                type="button"
                className={!possuiPessoas ? "active light" : "light"}
                onClick={selecionarSemDependentes}
                aria-pressed={!possuiPessoas}
              >
                Continuar sem cadastrar
              </button>
            </div>
          </section>

          {possuiPessoas ? (
            <section className="wm-t3-list-section">
              <div className="wm-t3-list-head">
                <div>
                  <h2>Dependentes cadastrados ({dependentes.length})</h2>
                  <p>Revise os dados e permissões antes de continuar.</p>
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
                          <th>Acesso próprio depois</th>
                          <th>CPF</th>
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
                              {pessoa.idade !== "" ? `${pessoa.idade} anos` : "—"}
                            </td>
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
                              <div className="wm-t3-actions-mini">
                                <button
                                  type="button"
                                  onClick={() => editarPessoa(pessoa)}
                                  aria-label={`Editar ${pessoa.nome}`}
                                >
                                  <Edit3 size={15} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setModalExcluir(pessoa)}
                                  aria-label={`Excluir ${pessoa.nome}`}
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

                        <div className="wm-t3-mobile-person">
                          <strong>{pessoa.nome}</strong>
                          <span>{pessoa.tipo_vinculo}</span>
                          <small>
                            {pessoa.idade !== "" ? `${pessoa.idade} anos` : "Idade não informada"}
                          </small>
                        </div>

                        <div className="wm-t3-mobile-permissions">
                          <MobilePermission
                            label="Recebe encomendas"
                            ativo={pessoa.recebe_encomendas}
                          />
                          <MobilePermission
                            label="Retira na portaria"
                            ativo={pessoa.retira_portaria}
                          />
                          <MobilePermission
                            label="Acesso próprio depois"
                            ativo={pessoa.acesso_proprio_futuro}
                          />
                        </div>

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

                    <button
                      type="button"
                      className="wm-t3-mobile-add"
                      onClick={abrirNovaPessoa}
                    >
                      <i>+</i>
                      <strong>Adicionar dependente</strong>
                      <span>Familiar ligado à unidade</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="wm-t3-empty">
                  <UsersRound size={34} />
                  <strong>Nenhum dependente cadastrado</strong>
                  <p>Adicione um familiar ou escolha continuar sem cadastrar nesta etapa.</p>
                </div>
              )}

              <div className="wm-t3-note">
                <Info size={16} />
                <span>
                  Se você marcar que um dependente poderá ter acesso próprio, o convite será enviado somente depois, a partir da área do Morador.
                </span>
              </div>
            </section>
          ) : (
            <section className="wm-t3-empty">
              <UsersRound size={34} />
              <strong>Nenhum dependente será incluído agora</strong>
              <p>Você poderá cadastrar familiares posteriormente pela área do Morador.</p>
            </section>
          )}

          <section className="wm-t3-good-practices">
            <PracticeCard
              icon={<ShieldCheck size={20} />}
              title="Permissões sob seu controle"
              text="Escolha separadamente quem pode receber encomendas, retirar na portaria ou ter acesso próprio depois."
            />

            <PracticeCard
              icon={<Mail size={20} />}
              title="Acesso enviado depois"
              text="Cadastrar um dependente aqui não envia convite neste momento."
            />

            <PracticeCard
              icon={<Info size={20} />}
              title="Funcionários ficam em outra etapa"
              text="Funcionários do lar não devem ser cadastrados como dependentes."
            />
          </section>

          <footer className="wm-t3-actions">
            <button
              type="button"
              className="secondary"
              onClick={onBack}
              disabled={
                processando ||
                salvandoRascunho
              }
            >
              <ArrowLeft size={16} />
              Voltar
            </button>

            <button
              type="button"
              className="outline"
              onClick={salvarRascunho}
              disabled={
                processando ||
                salvandoRascunho
              }
            >
              <Save size={16} />

              {salvandoRascunho
                ? "Salvando..."
                : "Salvar e continuar depois"}
            </button>

            <button
              type="button"
              className="primary"
              onClick={avancar}
              disabled={
                processando ||
                salvandoRascunho
              }
              aria-busy={processando}
            >
              {processando
                ? "Salvando informações..."
                : "Continuar"}

              <ArrowRight size={18} />
            </button>
          </footer>
        </section>
      </div>

      {modalAberto && pessoaAtual ? (
        <ModalPessoa
          pessoa={pessoaAtual}
          setPessoa={setPessoaAtual}
          camposInvalidos={camposInvalidos}
          dependentes={dependentes}
          cpfResponsavel={formMorador?.cpf || ""}
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
          texto={`Deseja remover ${modalExcluir.nome} deste cadastro?`}
          onClose={() => setModalExcluir(null)}
          onConfirm={() => excluirPessoa(modalExcluir.id)}
        />
      ) : null}

      {processando ? (
        <div
          className="wm-t3-processing"
          role="status"
          aria-live="polite"
        >
          <div className="wm-t3-processing-card">
            <span className="wm-t3-processing-spinner" />

            <strong>
              Salvando suas informações
            </strong>

            <p>
              Aguarde um instante. Estamos preparando a próxima etapa.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SummaryCard({ icon, title, lines = [] }) {
  return (
    <article className="wm-t3-summary-card">
      <span>{icon}</span>

      <div>
        <strong>{title}</strong>
        {lines.filter(Boolean).map((line, index) => (
          <small key={`${title}-${index}`}>{line}</small>
        ))}
      </div>
    </article>
  );
}

function Avatar({ pessoa }) {
  return <span className="wm-t3-avatar fallback">{iniciais(pessoa?.nome)}</span>;
}

function PessoaMini({ pessoa }) {
  return (
    <div className="wm-t3-person-mini">
      <Avatar pessoa={pessoa} />

      <div>
        <strong>{pessoa.nome}</strong>
        <small>{pessoa.email || "Sem acesso próprio definido"}</small>
      </div>
    </div>
  );
}

function Bool({ ativo }) {
  return (
    <span
      className={`wm-t3-bool ${ativo ? "ok" : "no"}`}
      aria-label={ativo ? "Sim" : "Não"}
      title={ativo ? "Sim" : "Não"}
    >
      {ativo ? <Check size={12} /> : <X size={12} />}
    </span>
  );
}

function MobilePermission({ label, ativo }) {
  return (
    <span className="wm-t3-mobile-permission">
      <Bool ativo={ativo} />
      {label}
    </span>
  );
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
  const inputDataRef = useRef(null);

  const idadeNumerica = pessoa?.idade !== "" ? Number(pessoa.idade) : null;
  const menor16 = idadeNumerica !== null && idadeNumerica < 16;
  const menor18 = idadeNumerica !== null && idadeNumerica < 18;
  const exigeCiencia =
    menor16 && (pessoa?.retira_portaria || pessoa?.acesso_proprio_futuro);

  const cpfLimpo = somenteNumeros(pessoa?.cpf);
  const cpfValido = cpfLimpo.length === 11 && validarCpf(pessoa?.cpf);

  useEffect(() => {
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function aoPressionarTecla(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", aoPressionarTecla);

    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", aoPressionarTecla);
    };
  }, [onClose]);

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
        novo.tentativas_cpf_invalidas = 0;
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
        novo.ddi = "+55";
        novo.whatsapp = "";
      }

      return novo;
    });
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
            <h2>{pessoa.nome ? "Editar dependente" : "Adicionar dependente"}</h2>
            <p>Informe os dados do familiar e escolha as permissões que deseja conceder.</p>
          </div>

          <button type="button" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </header>

        <div className="wm-t3-modal-body">
          <div className="wm-t3-modal-main">
            <section className="wm-t3-modal-section">
              <h3>Dados do dependente</h3>

              <div className="wm-t3-modal-grid two">
                <Field
                  label="Nome completo *"
                  value={pessoa.nome}
                  onChange={(v) => atualizar("nome", v)}
                  invalid={camposInvalidos.nome}
                  placeholder="Nome do dependente"
                  autoComplete="name"
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
                  valid={
                    cpfValido &&
                    !cpfDuplicadoLocal(pessoa.cpf) &&
                    !pessoa.cpf_pendente_validacao
                  }
                  placeholder="000.000.000-00"
                  autoComplete="off"
                />
              </div>

              {pessoa.cpf_pendente_validacao ? (
                <div className="wm-t3-cpf-note">
                  <Info size={15} />
                  <span>
                    Você pode continuar. A administração conferirá o CPF informado antes da aprovação do cadastro.
                  </span>
                </div>
              ) : null}
            </section>

            <section className="wm-t3-modal-section">
              <h3>Permissões</h3>

              <PermissionCard
                checked={pessoa.recebe_encomendas}
                title="Pode receber encomendas em seu nome"
                text="Permite que encomendas destinadas a este dependente sejam associadas à unidade."
                onChange={(v) => atualizar("recebe_encomendas", v)}
              />

              <PermissionCard
                checked={pessoa.retira_portaria}
                title="Pode retirar encomendas na portaria"
                text="Autoriza este dependente a retirar encomendas quando as demais condições de entrega estiverem atendidas."
                onChange={(v) => atualizar("retira_portaria", v)}
                green
              />

              <PermissionCard
                checked={pessoa.acesso_proprio_futuro}
                title="Poderá ter acesso próprio depois"
                text="Nenhum convite será enviado agora. Você poderá liberar o acesso posteriormente pela área do Morador."
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
                    inputMode="email"
                    autoComplete="email"
                  />

                  <div className="wm-t3-modal-grid phone">
                    <Field
                      label="Código do país *"
                      value={pessoa.ddi || "+55"}
                      onChange={(v) => atualizar("ddi", v)}
                      invalid={camposInvalidos.ddi}
                      inputMode="tel"
                      placeholder="+55"
                      autoComplete="tel-country-code"
                    />

                    <Field
                      label="WhatsApp *"
                      value={pessoa.whatsapp}
                      onChange={(v) => atualizar("whatsapp", v)}
                      invalid={camposInvalidos.whatsapp}
                      inputMode="tel"
                      icon={<Phone size={15} />}
                      placeholder="(11) 99999-9999"
                      autoComplete="tel-national"
                    />
                  </div>

                  <div className="wm-t3-access-note">
                    <Info size={15} />
                    <span>
                      Esses contatos ficarão preparados para quando você decidir liberar o acesso próprio deste dependente.
                    </span>
                  </div>
                </div>
              ) : null}
            </section>

            {menor18 ? (
              <section className={`wm-t3-minor-alert ${menor16 ? "strong" : ""}`}>
                <h3>{menor16 ? "Dependente menor de 16 anos" : "Dependente menor de idade"}</h3>

                <p>
                  Idade: <strong>{pessoa.idade} anos</strong>
                </p>

                <div>
                  <Info size={16} />
                  <span>
                    {menor16
                      ? "Revise com atenção as permissões de retirada e de acesso próprio concedidas a este dependente."
                      : "As permissões concedidas a um menor permanecem sob responsabilidade do responsável pela unidade."}
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
                      Estou ciente das permissões escolhidas e assumo a responsabilidade por elas.
                    </span>
                  </label>
                ) : null}
              </section>
            ) : null}
          </div>

          <aside className="wm-t3-guidance-card">
            <ShieldCheck size={22} />
            <strong>Antes de salvar</strong>
            <p>
              Confira o parentesco e marque apenas as permissões que realmente deseja conceder.
            </p>
            <p>
              Nenhum acesso será enviado ao dependente durante este cadastro.
            </p>
          </aside>
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
  autoComplete = "off",
}) {
  return (
    <label className="wm-t3-field">
      <span>{label}</span>

      <div
        className={`wm-t3-input ${invalid ? "invalid" : ""} ${
          disabled ? "disabled" : ""
        } ${valid ? "valid" : ""}`}
      >
        {icon ? <i className="wm-t3-input-icon">{icon}</i> : null}

        <input
          value={value ?? ""}
          onChange={(e) => onChange?.(e.target.value)}
          inputMode={inputMode}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoCorrect="off"
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
        <i className="wm-t3-input-icon">
          <CalendarDays size={15} />
        </i>

        <input
          value={value || ""}
          onChange={(e) => onChange(formatarData(e.target.value))}
          inputMode="numeric"
          placeholder="DD/MM/AAAA"
          autoComplete="bday"
        />

        <button
          type="button"
          className="wm-t3-calendar-btn"
          onClick={onOpenCalendar}
          aria-label="Escolher data"
        >
          <CalendarDays size={15} />
        </button>

        <input
          ref={inputRef}
          type="date"
          className="wm-t3-date-native"
          value={iso}
          onChange={(e) => onChange(dataISOParaBR(e.target.value))}
          aria-label="Selecionar data de nascimento"
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
      aria-pressed={checked}
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
  useEffect(() => {
    function aoPressionarTecla(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", aoPressionarTecla);
    return () => window.removeEventListener("keydown", aoPressionarTecla);
  }, [onClose]);

  return (
    <div className="wm-modal-overlay" role="dialog" aria-modal="true">
      <div className="wm-t3-detail-sheet">
        <button type="button" className="close" onClick={onClose} aria-label="Fechar">
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
            Acesso próprio depois
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
  useEffect(() => {
    function aoPressionarTecla(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", aoPressionarTecla);
    return () => window.removeEventListener("keydown", aoPressionarTecla);
  }, [onClose]);

  return (
    <div className="wm-modal-overlay" role="dialog" aria-modal="true">
      <div className="wm-modal-card">
        <button
          type="button"
          className="wm-modal-close"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        <h2>{titulo}</h2>
        <p>{texto}</p>

        <div className="wm-modal-actions">
          <button type="button" className="wm-modal-secondary" onClick={onClose}>
            Cancelar
          </button>

          <button type="button" className="wm-modal-primary" onClick={onConfirm}>
            Excluir
          </button>
        </div>
      </div>
    </div>

    
  );
}