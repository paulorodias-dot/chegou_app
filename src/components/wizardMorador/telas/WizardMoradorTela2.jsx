import {
  useMemo,
  useRef,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  IdCard,
  Info,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

import "../../../styles/wizardMorador/WizardMoradorTela2.css";

/*
 * =========================================================
 * AJUSTE ESTRUTURAL
 * =========================================================
 *
 * Nesta homologação:
 * false
 *
 * Quando o backend estiver preparado para preservar:
 *
 * ADMIN_ORIGINAL
 *      ↓
 * ALTERACAO_MORADOR
 *      ↓
 * AUDITORIA
 *
 * basta ativarmos esta experiência e ligarmos a persistência.
 *
 * IMPORTANTE:
 * atualmente nenhuma alteração de Torre/Unidade é enviada.
 */
const PERMITIR_AJUSTE_ESTRUTURAL = false;

function somenteNumeros(valor = "") {
  return String(valor).replace(/\D/g, "");
}

function normalizarDDI(valor = "") {
  const limpo = somenteNumeros(
    valor
  ).slice(0, 4);

  return limpo
    ? `+${limpo}`
    : "+55";
}

function obterDDINumerico(
  valor = ""
) {
  return (
    somenteNumeros(
      valor || "+55"
    ) || "55"
  );
}

function formatarTelefoneBrasil(
  valor = ""
) {
  const numeros = somenteNumeros(
    valor
  ).slice(0, 11);

  if (!numeros) return "";

  if (numeros.length <= 2) {
    return `(${numeros}`;
  }

  if (numeros.length <= 6) {
    return `(${numeros.slice(
      0,
      2
    )}) ${numeros.slice(2)}`;
  }

  if (numeros.length <= 10) {
    return `(${numeros.slice(
      0,
      2
    )}) ${numeros.slice(
      2,
      6
    )}-${numeros.slice(6)}`;
  }

  return `(${numeros.slice(
    0,
    2
  )}) ${numeros.slice(
    2,
    7
  )}-${numeros.slice(7)}`;
}

function formatarTelefoneInternacional({
  ddi = "+55",
  numero = "",
}) {
  const ddiNumerico =
    obterDDINumerico(ddi);

  const numeroLimpo =
    somenteNumeros(numero);

  if (!numeroLimpo) {
    return "";
  }

  if (ddiNumerico === "55") {
    return formatarTelefoneBrasil(
      numeroLimpo
    );
  }

  return numeroLimpo
    .replace(
      /(\d{3})(?=\d)/g,
      "$1 "
    )
    .trim();
}

function montarTelefoneE164({
  ddi = "+55",
  numero = "",
}) {
  const ddiNumerico =
    obterDDINumerico(ddi);

  const telefoneNumerico =
    somenteNumeros(numero);

  if (!telefoneNumerico) {
    return "";
  }

  return `+${ddiNumerico}${telefoneNumerico}`;
}

function capitalizarNome(
  valor = ""
) {
  return valor
    .toLowerCase()
    .replace(
      /(^|\s|-|')([\p{L}])/gu,
      (_, separador, letra) =>
        `${separador}${letra.toUpperCase()}`
    );
}

function formatarCpf(
  valor = ""
) {
  const v = somenteNumeros(
    valor
  ).slice(0, 11);

  return v
    .replace(
      /^(\d{3})(\d)/,
      "$1.$2"
    )
    .replace(
      /^(\d{3})\.(\d{3})(\d)/,
      "$1.$2.$3"
    )
    .replace(
      /\.(\d{3})(\d)/,
      ".$1-$2"
    );
}

function validarCpf(
  cpf = ""
) {
  const valor =
    somenteNumeros(cpf);

  if (valor.length !== 11) {
    return false;
  }

  if (/^(\d)\1{10}$/.test(valor)) {
    return false;
  }

  let soma = 0;

  for (
    let i = 0;
    i < 9;
    i += 1
  ) {
    soma +=
      Number(valor[i]) *
      (10 - i);
  }

  let digito =
    11 - (soma % 11);

  if (digito >= 10) {
    digito = 0;
  }

  if (
    digito !== Number(valor[9])
  ) {
    return false;
  }

  soma = 0;

  for (
    let i = 0;
    i < 10;
    i += 1
  ) {
    soma +=
      Number(valor[i]) *
      (11 - i);
  }

  digito =
    11 - (soma % 11);

  if (digito >= 10) {
    digito = 0;
  }

  return (
    digito ===
    Number(valor[10])
  );
}

function formatarData(
  valor = ""
) {
  const v = somenteNumeros(
    valor
  ).slice(0, 8);

  return v
    .replace(
      /^(\d{2})(\d)/,
      "$1/$2"
    )
    .replace(
      /^(\d{2})\/(\d{2})(\d)/,
      "$1/$2/$3"
    );
}

function dataBrParaISO(
  valor = ""
) {
  const numeros =
    somenteNumeros(valor);

  if (numeros.length !== 8) {
    return null;
  }

  const dia =
    numeros.slice(0, 2);

  const mes =
    numeros.slice(2, 4);

  const ano =
    numeros.slice(4, 8);

  return `${ano}-${mes}-${dia}`;
}

function dataISOParaBR(
  valor = ""
) {
  if (
    !valor ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      valor
    )
  ) {
    return "";
  }

  const [
    ano,
    mes,
    dia,
  ] = valor.split("-");

  return `${dia}/${mes}/${ano}`;
}

function validarEmail(
  email = ""
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(email).trim()
  );
}

function calcularIdade(
  dataBr = ""
) {
  const iso =
    dataBrParaISO(dataBr);

  if (!iso) {
    return null;
  }

  const nascimento =
    new Date(
      `${iso}T00:00:00`
    );

  if (
    Number.isNaN(
      nascimento.getTime()
    )
  ) {
    return null;
  }

  const hoje = new Date();

  let idade =
    hoje.getFullYear() -
    nascimento.getFullYear();

  const mes =
    hoje.getMonth() -
    nascimento.getMonth();

  if (
    mes < 0 ||
    (
      mes === 0 &&
      hoje.getDate() <
        nascimento.getDate()
    )
  ) {
    idade -= 1;
  }

  return idade;
}

function validarDataNascimento(
  valor = ""
) {
  const iso =
    dataBrParaISO(valor);

  if (!iso) {
    return false;
  }

  const data = new Date(
    `${iso}T00:00:00`
  );

  const hoje = new Date();

  if (
    Number.isNaN(
      data.getTime()
    )
  ) {
    return false;
  }

  if (data > hoje) {
    return false;
  }

  return (
    data.getFullYear() >= 1900
  );
}

function formatarPerfil(
  perfil = ""
) {
  const rotulos = {
    proprietario_residente:
      "Proprietário residente",

    proprietario_nao_residente:
      "Proprietário não residente",

    inquilino:
      "Morador inquilino",

    responsavel_unidade_corporativa:
      "Responsável por unidade corporativa",

    unidade_vazia:
      "Responsável por unidade vazia",
  };

  return (
    rotulos[perfil] ||
    "Não informado"
  );
}

/*
 * =========================================================
 * TORRES
 * =========================================================
 *
 * A origem é exclusivamente a lista recebida do cadastro
 * do condomínio.
 *
 * O Morador NÃO digita o nome de Torre/Bloco.
 */
function montarRotuloTorre(
  torre = {}
) {
  const identificador =
    torre.numero ||
    torre.letra ||
    torre.codigo ||
    torre.identificacao ||
    torre.sigla ||
    "";

  const nome =
    torre.nome ||
    torre.nome_torre ||
    torre.nome_bloco ||
    torre.descricao ||
    "";

  if (
    identificador &&
    nome
  ) {
    return `${identificador} — ${nome}`;
  }

  return (
    nome ||
    identificador ||
    "Torre / Bloco"
  );
}

function obterIdTorre(
  torre = {}
) {
  return String(
    torre.id ||
    torre.torre_id ||
    torre.bloco_id ||
    torre.codigo ||
    ""
  );
}

function obterDadosUnidade(
  dadosWizard,
  formTela1
) {
  const pre =
    dadosWizard?.preCadastro ||
    dadosWizard?.pre_cadastro ||
    {};

  const condominio =
    dadosWizard?.condominio ||
    {};

  const perfil =
    formTela1?.perfilUnidade ||
    pre.perfil_unidade ||
    pre.relacao_unidade ||
    dadosWizard?.perfil_unidade ||
    dadosWizard?.relacao_unidade ||
    "";

  return {
    condominio:
      condominio.nome_fantasia ||
      condominio.nome ||
      dadosWizard
        ?.nome_condominio ||
      "Não informado",

    torre:
      pre.torre_nome ||
      pre.torre ||
      pre.bloco_nome ||
      pre.bloco ||
      dadosWizard?.torre_nome ||
      dadosWizard?.torre ||
      dadosWizard?.bloco ||
      "Não informado",

    torreId:
      pre.torre_id ||
      dadosWizard?.torre_id ||
      "",

    unidade:
      pre.unidade_nome ||
      pre.unidade ||
      dadosWizard?.unidade_nome ||
      dadosWizard?.unidade ||
      "Não informado",

    perfil:
      formatarPerfil(perfil),
  };
}

function obterTorresDisponiveis(
  dadosWizard
) {
  const lista =
    dadosWizard?.torres;

  if (!Array.isArray(lista)) {
    return [];
  }

  return lista
    .map((torre) => ({
      id:
        obterIdTorre(torre),

      label:
        montarRotuloTorre(
          torre
        ),

      original:
        torre,
    }))
    .filter(
      (torre) =>
        torre.id ||
        torre.label
    );
}

function montarPayloadTela2({
  formMorador,
  cpfPendenteValidacao,
}) {
  const telefoneE164 =
    montarTelefoneE164({
      ddi:
        formMorador.ddi ||
        "+55",

      numero:
        formMorador.whatsapp,
    });

  const nomeCompleto =
    formMorador
      .nomeCompleto
      ?.trim() || "";

  const nomeSocial =
    formMorador
      .nomeSocial
      ?.trim() || "";

  /*
   * IMPORTANTE:
   *
   * Torre/Bloco e Unidade NÃO fazem parte deste payload
   * nesta homologação.
   *
   * A futura alteração estrutural terá contrato próprio,
   * preservando:
   *
   * - informação original do Administrativo;
   * - proposta informada pelo Morador;
   * - comparação na Auditoria.
   */

  return {
    tela2: {
      nomeCompleto:
        nomeCompleto,

      nome_completo:
        nomeCompleto,

      nomeSocial:
        nomeSocial || null,

      nome_social:
        nomeSocial || null,

      nomeExibicao:
        nomeSocial ||
        nomeCompleto,

      cpf:
        somenteNumeros(
          formMorador.cpf
        ),

      cpfFormatado:
        formMorador.cpf,

      cpf_pendente_validacao:
        cpfPendenteValidacao,

      dataNascimento:
        formMorador
          .dataNascimento,

      data_nascimento:
        dataBrParaISO(
          formMorador
            .dataNascimento
        ),

      emailPrincipal:
        formMorador
          .emailPrincipal
          ?.trim()
          .toLowerCase(),

      email:
        formMorador
          .emailPrincipal
          ?.trim()
          .toLowerCase(),

      ddi:
        obterDDINumerico(
          formMorador.ddi ||
          "+55"
        ),

      whatsapp:
        somenteNumeros(
          formMorador.whatsapp
        ),

      whatsapp_e164:
        telefoneE164,

      telefone:
        telefoneE164,

      notificacaoPush:
        Boolean(
          formMorador
            .notificacaoPush
        ),

      notificacao_push:
        Boolean(
          formMorador
            .notificacaoPush
        ),

      notificacaoWhatsapp:
        Boolean(
          formMorador
            .notificacaoWhatsapp
        ),

      notificacao_whatsapp:
        Boolean(
          formMorador
            .notificacaoWhatsapp
        ),

      notificacaoEmail:
        Boolean(
          formMorador
            .notificacaoEmail
        ),

      notificacao_email:
        Boolean(
          formMorador
            .notificacaoEmail
        ),
    },
  };
}

export default function WizardMoradorTela2({
  dadosWizard,
  formTela1,
  formMorador,
  setFormMorador,
  onBack,
  onNext,
  onSaveDraft,
  onCancel,
}) {
  const inputDataRef =
    useRef(null);

  const [
    camposInvalidos,
    setCamposInvalidos,
  ] = useState({});

  const [
    tentativasCpfInvalidas,
    setTentativasCpfInvalidas,
  ] = useState(0);

  const [
    cpfPendenteValidacao,
    setCpfPendenteValidacao,
  ] = useState(false);

  const [
    processando,
    setProcessando,
  ] = useState(false);

  const [
    salvandoRascunho,
    setSalvandoRascunho,
  ] = useState(false);

  /*
   * Estados preparados para a futura correção estrutural.
   *
   * Não são persistidos e não interferem no cadastro atual.
   */
  const [
    modoAjusteUnidade,
    setModoAjusteUnidade,
  ] = useState(false);

  const unidade = useMemo(
    () =>
      obterDadosUnidade(
        dadosWizard,
        formTela1
      ),
    [
      dadosWizard,
      formTela1,
    ]
  );

  const torresDisponiveis =
    useMemo(
      () =>
        obterTorresDisponiveis(
          dadosWizard
        ),
      [dadosWizard]
    );

  const [
    ajusteUnidade,
    setAjusteUnidade,
  ] = useState(() => ({
    torreId:
      unidade.torreId || "",

    unidade:
      unidade.unidade ===
      "Não informado"
        ? ""
        : unidade.unidade,
  }));

  function atualizarCampo(
    campo,
    valor
  ) {
    setFormMorador(
      (old) => ({
        ...old,
        [campo]: valor,
      })
    );

    setCamposInvalidos(
      (old) => ({
        ...old,
        [campo]: false,
      })
    );
  }

  function atualizarNotificacao(
    campo,
    valor
  ) {
    setFormMorador(
      (old) => ({
        ...old,
        [campo]: valor,
      })
    );
  }

  function abrirCalendario() {
    const input =
      inputDataRef.current;

    if (!input) {
      return;
    }

    if (
      typeof input.showPicker ===
      "function"
    ) {
      input.showPicker();
      return;
    }

    input.focus();
    input.click();
  }

  function validarTela2() {
    const invalidos = {};

    if (
      !formMorador
        .nomeCompleto
        ?.trim()
    ) {
      invalidos.nomeCompleto =
        true;

      toast.error(
        "Informe seu nome completo."
      );
    }

    if (
      !formMorador.cpf?.trim()
    ) {
      invalidos.cpf = true;

      toast.error(
        "Informe seu CPF."
      );
    } else if (
      !validarCpf(
        formMorador.cpf
      )
    ) {
      const tentativaAtual =
        tentativasCpfInvalidas +
        1;

      if (
        tentativaAtual < 3
      ) {
        invalidos.cpf = true;

        setTentativasCpfInvalidas(
          tentativaAtual
        );

        toast.error(
          "Confira os números do CPF informado."
        );
      } else {
        setCpfPendenteValidacao(
          true
        );

        toast(
          "Você poderá continuar. A administração conferirá o CPF antes da aprovação do cadastro."
        );
      }
    } else {
      setCpfPendenteValidacao(
        false
      );
    }

    if (
      !formMorador
        .dataNascimento
        ?.trim()
    ) {
      invalidos.dataNascimento =
        true;

      toast.error(
        "Informe sua data de nascimento."
      );
    } else if (
      !validarDataNascimento(
        formMorador
          .dataNascimento
      )
    ) {
      invalidos.dataNascimento =
        true;

      toast.error(
        "Informe uma data de nascimento válida."
      );
    } else if (
      (
        calcularIdade(
          formMorador
            .dataNascimento
        ) || 0
      ) < 18
    ) {
      invalidos.dataNascimento =
        true;

      toast.error(
        "O responsável principal pela unidade deve ter 18 anos ou mais."
      );
    }

    if (
      !formMorador
        .emailPrincipal
        ?.trim()
    ) {
      invalidos.emailPrincipal =
        true;

      toast.error(
        "Informe seu e-mail principal."
      );
    } else if (
      !validarEmail(
        formMorador
          .emailPrincipal
      )
    ) {
      invalidos.emailPrincipal =
        true;

      toast.error(
        "Informe um e-mail válido."
      );
    }

    const ddi =
      obterDDINumerico(
        formMorador.ddi ||
        "+55"
      );

    const whatsapp =
      somenteNumeros(
        formMorador.whatsapp
      );

    if (!ddi) {
      invalidos.ddi = true;

      toast.error(
        "Informe o código do país."
      );
    }

    if (!whatsapp) {
      invalidos.whatsapp =
        true;

      toast.error(
        "Informe seu WhatsApp principal."
      );
    } else if (
      ddi === "55" &&
      whatsapp.length < 10
    ) {
      invalidos.whatsapp =
        true;

      toast.error(
        "Informe o WhatsApp com DDD."
      );
    } else if (
      ddi !== "55" &&
      whatsapp.length < 6
    ) {
      invalidos.whatsapp =
        true;

      toast.error(
        "Confira o número de telefone informado."
      );
    }

    setCamposInvalidos(
      invalidos
    );

    return (
      Object.keys(invalidos)
        .length === 0
    );
  }

  async function avancar() {
    if (
      processando ||
      salvandoRascunho
    ) {
      return;
    }

    if (!validarTela2()) {
      return;
    }

    const payload =
      montarPayloadTela2({
        formMorador,
        cpfPendenteValidacao,
      });

    try {
      setProcessando(true);

      const salvou =
        await onNext(payload);

      /*
      * O WizardMorador.jsx somente muda de etapa
      * quando o salvamento é concluído.
      *
      * Se houver falha, permanecemos nesta tela.
      */
      if (salvou === false) {
        setProcessando(false);
      }
    } catch (error) {
      console.error(
        "Erro ao continuar a Tela 2:",
        error
      );

      setProcessando(false);
    }
  }

  async function salvarRascunho() {
    if (
      processando ||
      salvandoRascunho
    ) {
      return;
    }

    const payload =
      montarPayloadTela2({
        formMorador,
        cpfPendenteValidacao,
      });

    try {
      setSalvandoRascunho(true);

      const salvou =
        await onSaveDraft(
          payload
        );

      if (salvou !== false) {
        toast.success(
          "Suas informações foram salvas."
        );
      }
    } catch (error) {
      console.error(
        "Erro ao salvar a Tela 2:",
        error
      );
    } finally {
      setSalvandoRascunho(false);
    }
  }

  return (
    <>
      <div className="wm-t2-page">
      <section className="wm-t2-card">
        <header className="wm-t2-title">
          <span className="wm-t2-title-icon">
            <UserRound
              size={23}
            />
          </span>

          <div>
            <h1>
              2. Seus dados
            </h1>

            <p>
              Confira e complete suas informações pessoais e de contato.
            </p>
          </div>
        </header>

        <div className="wm-t2-divider" />

        <section className="wm-t2-unit-card">
          <InfoCard
            icon={
              <Building2
                size={21}
              />
            }
            title="Sua unidade"
            lines={[
              `${unidade.torre} • ${unidade.unidade}`,
              unidade.perfil,
            ]}
          />

          <InfoCard
            icon={
              <Building2
                size={21}
              />
            }
            title="Condomínio"
            lines={[
              unidade.condominio,
            ]}
          />
        </section>

        {PERMITIR_AJUSTE_ESTRUTURAL ? (
          <section className="wm-t2-section">
            <div className="wm-t2-section-head">
              <h2>
                Precisa corrigir a unidade?
              </h2>

              <p>
                Se a torre, o bloco ou a unidade informados no convite estiverem incorretos, você poderá indicar a informação correta aqui.
              </p>
            </div>

            {!modoAjusteUnidade ? (
              <button
                type="button"
                className="wm-t2-btn outline"
                onClick={() =>
                  setModoAjusteUnidade(
                    true
                  )
                }
              >
                Corrigir informações da unidade
              </button>
            ) : (
              <div className="wm-t2-form-grid">
                <FieldSelect
                  label="Torre / Bloco"
                  value={
                    ajusteUnidade
                      .torreId
                  }
                  onChange={(
                    valor
                  ) =>
                    setAjusteUnidade(
                      (old) => ({
                        ...old,
                        torreId:
                          valor,
                      })
                    )
                  }
                  options={
                    torresDisponiveis
                  }
                  placeholder="Selecione a torre ou bloco"
                />

                <FieldText
                  label="Unidade"
                  value={
                    ajusteUnidade
                      .unidade
                  }
                  onChange={(
                    valor
                  ) =>
                    setAjusteUnidade(
                      (old) => ({
                        ...old,
                        unidade:
                          valor,
                      })
                    )
                  }
                  icon={
                    <Building2
                      size={16}
                    />
                  }
                  placeholder="Ex.: Apto 03"
                />

                <div className="wm-t2-structure-note">
                  <Info
                    size={16}
                  />

                  <span>
                    A informação enviada originalmente pela administração será preservada para conferência.
                  </span>
                </div>

                <button
                  type="button"
                  className="wm-t2-btn secondary"
                  onClick={() => {
                    setModoAjusteUnidade(
                      false
                    );

                    setAjusteUnidade({
                      torreId:
                        unidade.torreId ||
                        "",

                      unidade:
                        unidade.unidade ===
                        "Não informado"
                          ? ""
                          : unidade.unidade,
                    });
                  }}
                >
                  Manter informações do convite
                </button>
              </div>
            )}
          </section>
        ) : null}

        <section className="wm-t2-section">
          <div className="wm-t2-section-head">
            <h2>
              Dados pessoais
            </h2>

            <p>
              Confira seus dados e atualize o que for necessário.
            </p>
          </div>

          <div className="wm-t2-form-grid">
            <FieldText
              label="Nome completo *"
              value={
                formMorador
                  .nomeCompleto
              }
              onChange={(v) =>
                atualizarCampo(
                  "nomeCompleto",
                  capitalizarNome(v)
                )
              }
              invalid={
                camposInvalidos
                  .nomeCompleto
              }
              icon={
                <UserRound
                  size={16}
                />
              }
              placeholder="Digite seu nome completo"
              autoComplete="name"
            />

            <FieldText
              label="Nome social (opcional)"
              value={
                formMorador
                  .nomeSocial
              }
              onChange={(v) =>
                atualizarCampo(
                  "nomeSocial",
                  capitalizarNome(v)
                )
              }
              icon={
                <UserRound
                  size={16}
                />
              }
              placeholder="Como deseja ser chamado(a)"
              helper="Se informado, usaremos esse nome na sua identificação dentro do Chegou!."
              autoComplete="off"
            />

            <FieldText
              label="CPF *"
              value={
                formMorador.cpf
              }
              onChange={(v) =>
                atualizarCampo(
                  "cpf",
                  formatarCpf(v)
                )
              }
              invalid={
                camposInvalidos.cpf
              }
              icon={
                <IdCard
                  size={16}
                />
              }
              inputMode="numeric"
              placeholder="000.000.000-00"
              helper={
                cpfPendenteValidacao
                  ? "A administração conferirá este CPF antes da aprovação."
                  : validarCpf(
                        formMorador.cpf
                      )
                    ? "CPF conferido."
                    : ""
              }
              autoComplete="off"
            />

            <FieldDate
              label="Data de nascimento *"
              value={
                formMorador
                  .dataNascimento
              }
              onChange={(v) =>
                atualizarCampo(
                  "dataNascimento",
                  v
                )
              }
              invalid={
                camposInvalidos
                  .dataNascimento
              }
              inputRef={
                inputDataRef
              }
              onOpenCalendar={
                abrirCalendario
              }
            />
          </div>
        </section>

        <section className="wm-t2-section">
          <div className="wm-t2-section-head">
            <h2>
              Contato
            </h2>

            <p>
              Informe um e-mail e um WhatsApp que você utiliza com frequência.
            </p>
          </div>

          <div className="wm-t2-contact-grid">
            <FieldText
              label="E-mail principal *"
              value={
                formMorador
                  .emailPrincipal
              }
              onChange={(v) =>
                atualizarCampo(
                  "emailPrincipal",
                  v.toLowerCase()
                )
              }
              invalid={
                camposInvalidos
                  .emailPrincipal
              }
              icon={
                <Mail
                  size={16}
                />
              }
              inputMode="email"
              placeholder="seuemail@email.com"
              helper={
                validarEmail(
                  formMorador
                    .emailPrincipal
                )
                  ? "E-mail conferido."
                  : ""
              }
              autoComplete="email"
            />

            <div className="wm-t2-phone-group">
              <FieldText
                label="Código do país *"
                value={
                  formMorador.ddi ||
                  "+55"
                }
                onChange={(v) => {
                  const novoDDI =
                    normalizarDDI(
                      v
                    );

                  atualizarCampo(
                    "ddi",
                    novoDDI
                  );

                  atualizarCampo(
                    "whatsapp",
                    formatarTelefoneInternacional(
                      {
                        ddi:
                          novoDDI,

                        numero:
                          formMorador
                            .whatsapp,
                      }
                    )
                  );
                }}
                invalid={
                  camposInvalidos.ddi
                }
                inputMode="tel"
                placeholder="+55"
                autoComplete="tel-country-code"
              />

              <FieldText
                label="WhatsApp principal *"
                value={
                  formMorador
                    .whatsapp
                }
                onChange={(v) =>
                  atualizarCampo(
                    "whatsapp",
                    formatarTelefoneInternacional(
                      {
                        ddi:
                          formMorador
                            .ddi ||
                          "+55",

                        numero: v,
                      }
                    )
                  )
                }
                invalid={
                  camposInvalidos
                    .whatsapp
                }
                icon={
                  <Phone
                    size={16}
                  />
                }
                inputMode="tel"
                placeholder="(11) 99999-9999"
                autoComplete="tel-national"
              />
            </div>
          </div>

          <div className="wm-t2-notification-card">
            <strong>
              Como você prefere receber avisos?
            </strong>

            <div className="wm-t2-checks">
              <CheckOption
                label="No aplicativo"
                checked={
                  formMorador
                    .notificacaoPush
                }
                onChange={(v) =>
                  atualizarNotificacao(
                    "notificacaoPush",
                    v
                  )
                }
              />

              <CheckOption
                label="WhatsApp"
                checked={
                  formMorador
                    .notificacaoWhatsapp
                }
                onChange={(v) =>
                  atualizarNotificacao(
                    "notificacaoWhatsapp",
                    v
                  )
                }
              />

              <CheckOption
                label="E-mail"
                checked={
                  formMorador
                    .notificacaoEmail
                }
                onChange={(v) =>
                  atualizarNotificacao(
                    "notificacaoEmail",
                    v
                  )
                }
              />
            </div>
          </div>
        </section>

        <section className="wm-t2-good-practices">
          <PracticeCard
            icon={
              <ShieldCheck
                size={20}
              />
            }
            title="Confira seus dados"
            text="Informações corretas ajudam a administração a concluir seu cadastro com mais agilidade."
          />

          <PracticeCard
            icon={
              <Mail
                size={20}
              />
            }
            title="Mantenha seus contatos atualizados"
            text="Use contatos que você acompanha com frequência para não perder avisos importantes."
          />

          <PracticeCard
            icon={
              <Info
                size={20}
              />
            }
            title="Privacidade"
            text="Suas informações serão utilizadas para o funcionamento dos serviços do condomínio e do Chegou!."
          />
        </section>

        <footer className="wm-t2-actions">
          <button
            type="button"
            className="wm-t2-btn secondary"
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
            className="wm-t2-btn danger"
            onClick={onCancel}
            disabled={
              processando ||
              salvandoRascunho
            }
          >
            <X size={16} />
            Sair do cadastro
          </button>

          <button
            type="button"
            className="wm-t2-btn outline"
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
            className="wm-t2-btn primary"
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
          {processando ? (
        <div
          className="wm-t2-processing"
          role="status"
          aria-live="polite"
        >
          <div className="wm-t2-processing-card">
            <span className="wm-t2-spinner" />

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

function InfoCard({
  icon,
  title,
  lines = [],
}) {
  return (
    <div className="wm-t2-info-card">
      <span>{icon}</span>

      <div>
        <strong>
          {title}
        </strong>

        {lines.map(
          (line, index) => (
            <small
              key={`${title}-${index}`}
            >
              {line ||
                "Não informado"}
            </small>
          )
        )}
      </div>
    </div>
  );
}

function FieldText({
  label,
  value,
  onChange,
  invalid,
  icon,
  inputMode,
  helper,
  placeholder,
  autoComplete = "off",
}) {
  return (
    <label className="wm-t2-field">
      <span>{label}</span>

      <div
        className={`wm-t2-input ${
          invalid
            ? "invalid"
            : ""
        }`}
      >
        {icon ? (
          <i>{icon}</i>
        ) : null}

        <input
          value={value || ""}
          onChange={(e) =>
            onChange(
              e.target.value
            )
          }
          inputMode={
            inputMode
          }
          placeholder={
            placeholder
          }
          autoComplete={
            autoComplete
          }
          autoCorrect="off"
          spellCheck={false}
          data-lpignore="true"
        />
      </div>

      {helper ? (
        <small
          className={
            helper.includes(
              "conferido"
            )
              ? "ok"
              : "warning"
          }
        >
          {helper}
        </small>
      ) : null}
    </label>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder,
}) {
  return (
    <label className="wm-t2-field">
      <span>{label}</span>

      <div className="wm-t2-input wm-t2-select">
        <select
          value={value || ""}
          onChange={(e) =>
            onChange(
              e.target.value
            )
          }
        >
          <option value="">
            {placeholder ||
              "Selecione"}
          </option>

          {options.map(
            (option) => (
              <option
                key={
                  option.id ||
                  option.label
                }
                value={
                  option.id
                }
              >
                {option.label}
              </option>
            )
          )}
        </select>
      </div>
    </label>
  );
}

function FieldDate({
  label,
  value,
  onChange,
  invalid,
  inputRef,
  onOpenCalendar,
}) {
  const iso =
    dataBrParaISO(value) ||
    "";

  return (
    <label className="wm-t2-field">
      <span>{label}</span>

      <div
        className={`wm-t2-input ${
          invalid
            ? "invalid"
            : ""
        }`}
      >
        <i>
          <CalendarDays
            size={16}
          />
        </i>

        <input
          value={value || ""}
          onChange={(e) =>
            onChange(
              formatarData(
                e.target.value
              )
            )
          }
          inputMode="numeric"
          placeholder="DD/MM/AAAA"
          autoComplete="bday"
        />

        <button
          type="button"
          className="wm-t2-calendar-btn"
          onClick={
            onOpenCalendar
          }
          aria-label="Escolher data"
        >
          <CalendarDays
            size={16}
          />
        </button>

        <input
          ref={inputRef}
          type="date"
          className="wm-t2-date-native"
          value={iso}
          onChange={(e) =>
            onChange(
              dataISOParaBR(
                e.target.value
              )
            )
          }
          aria-label="Escolher data de nascimento"
        />
      </div>
    </label>
  );
}

function CheckOption({
  label,
  checked,
  onChange,
}) {
  return (
    <label className="wm-t2-check-option">
      <input
        type="checkbox"
        checked={Boolean(
          checked
        )}
        onChange={(e) =>
          onChange(
            e.target.checked
          )
        }
      />

      <span>{label}</span>
    </label>
  );
}

function PracticeCard({
  icon,
  title,
  text,
}) {
  return (
    <article className="wm-t2-practice-card">
      <span>{icon}</span>

      <div>
        <strong>
          {title}
        </strong>

        <p>{text}</p>
      </div>
    </article>
  );
}