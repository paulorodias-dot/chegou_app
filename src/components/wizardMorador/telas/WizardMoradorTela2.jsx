import { useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  IdCard,
  Info,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  Upload,
  UserRound,
  X,
} from "lucide-react";

import "../../../styles/wizardMorador/WizardMoradorTela2.css";

const LIMITE_UPLOAD_FOTO_MB = 5;
const LIMITE_UPLOAD_FOTO_BYTES = LIMITE_UPLOAD_FOTO_MB * 1024 * 1024;

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
  return valor
    .toLowerCase()
    .replace(
      /(^|\s|-|')([\p{L}])/gu,
      (_, separador, letra) => `${separador}${letra.toUpperCase()}`
    );
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

function validarEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}
function calcularIdade(dataBr = "") {
  const iso = dataBrParaISO(dataBr);
  if (!iso) return null;

  const nascimento = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(nascimento.getTime())) return null;

  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();

  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
    idade -= 1;
  }

  return idade;
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

function mascararToken(token = "") {
  const limpo = String(token).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  if (!limpo) return "Não informado";

  if (limpo.length <= 9) {
    return `${limpo.slice(0, 3)}-${limpo.slice(3, 6)}-${limpo.slice(6, 9)}`;
  }

  return `${limpo.slice(0, 4)}-${limpo.slice(4, 8)}-${limpo.slice(8, 12)}`;
}

function obterTokenAuditoria(dadosWizard) {
  return (
    dadosWizard?.token_publico ||
    dadosWizard?.codigo_convite ||
    dadosWizard?.token ||
    dadosWizard?.token_convite ||
    ""
  );
}

function obterDadosUnidade(dadosWizard, formTela1) {
  const pre = dadosWizard?.preCadastro || dadosWizard?.pre_cadastro || {};
  const condominio = dadosWizard?.condominio || {};

  const perfil =
    formTela1?.perfilUnidade ||
    pre.relacao_unidade ||
    dadosWizard?.relacao_unidade ||
    "Não informado";

  const perfilFormatado = String(perfil)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());

  const tokenAuditoria = obterTokenAuditoria(dadosWizard);

  return {
    condominio:
      condominio.nome_fantasia ||
      condominio.nome ||
      dadosWizard?.nome_condominio ||
      "Não informado",
    torre:
      pre.torre_nome ||
      pre.torre ||
      pre.bloco_nome ||
      pre.bloco ||
      dadosWizard?.torre ||
      "Não informado",
    unidade:
      pre.unidade_nome ||
      pre.unidade ||
      dadosWizard?.unidade ||
      "Não informado",
    perfil: perfilFormatado,
    businessId: dadosWizard?.business_id || "Não informado",
    condominioId: dadosWizard?.condominio_id || "Não informado",
    token: mascararToken(tokenAuditoria),
    tokenReal: tokenAuditoria,
  };
}

function montarPayloadTela2({ dadosWizard, formMorador, cpfPendenteValidacao }) {
  const telefoneE164 = montarTelefoneE164({
    ddi: formMorador.ddi || "+55",
    numero: formMorador.whatsapp,
  });

  const nomeCompleto = formMorador.nomeCompleto?.trim() || "";
  const nomeSocial = formMorador.nomeSocial?.trim() || "";

  return {
    pre_cadastro_id: dadosWizard?.pre_cadastro_id || null,
    business_id: dadosWizard?.business_id || null,
    condominio_id: dadosWizard?.condominio_id || null,

    nome: nomeCompleto,
    nome_social: nomeSocial || null,
    nome_exibicao: nomeSocial || nomeCompleto,

    cpf: somenteNumeros(formMorador.cpf),
    cpf_formatado: formMorador.cpf,
    cpf_pendente_validacao: cpfPendenteValidacao,

    data_nascimento: formMorador.dataNascimento,
    data_nascimento_iso: dataBrParaISO(formMorador.dataNascimento),
    idade: calcularIdade(formMorador.dataNascimento),

    email: formMorador.emailPrincipal?.trim().toLowerCase(),

    ddi: obterDDINumerico(formMorador.ddi || "+55"),
    whatsapp: somenteNumeros(formMorador.whatsapp),
    telefone: telefoneE164,
    whatsapp_e164: telefoneE164,

    notificacao_push: Boolean(formMorador.notificacaoPush),
    notificacao_whatsapp: Boolean(formMorador.notificacaoWhatsapp),
    notificacao_email: Boolean(formMorador.notificacaoEmail),

    foto_perfil_url: formMorador.fotoPerfilUrl || null,
    foto_perfil_path: formMorador.fotoPerfilPath || null,
    foto_perfil_nome: formMorador.fotoPerfilNome || null,
    foto_perfil_preview_base64: formMorador.fotoPerfilBase64 || null,

    etapa_atual: 2,
    atualizado_em: new Date().toISOString(),
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
  const nomeBase = file.name.replace(/\.[^/.]+$/, "") || "foto-perfil";

  return {
    previewBase64: webpBase64,
    nome: `${nomeBase}.webp`,
    mime: "image/webp",
    tamanhoEstimado: Math.round((webpBase64.length * 3) / 4),
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

  const inputFotoGaleriaRef = useRef(null);
  const inputFotoCameraRef = useRef(null);
  const inputDataRef = useRef(null);

  const ehMobile =
    /Android|iPhone|iPad|iPod|Mobile/i.test(
      navigator.userAgent
    );

  const [camposInvalidos, setCamposInvalidos] = useState({});
  const [tentativasCpfInvalidas, setTentativasCpfInvalidas] = useState(0);
  const [cpfPendenteValidacao, setCpfPendenteValidacao] = useState(false);
  const [processandoFoto, setProcessandoFoto] = useState(false);

  const unidade = useMemo(
    () => obterDadosUnidade(dadosWizard, formTela1),
    [dadosWizard, formTela1]
  );

  function atualizarCampo(campo, valor) {
    setFormMorador((old) => ({
      ...old,
      [campo]: valor,
    }));

    setCamposInvalidos((old) => ({
      ...old,
      [campo]: false,
    }));
  }

  function atualizarNotificacao(campo, valor) {
    setFormMorador((old) => ({
      ...old,
      [campo]: valor,
    }));
  }

  async function selecionarFoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setProcessandoFoto(true);

      const foto = await processarImagemLocal(file);

      atualizarCampo("fotoPerfilBase64", foto.previewBase64);
      atualizarCampo("fotoPerfilNome", foto.nome);
      atualizarCampo("fotoPerfilMime", foto.mime);
      atualizarCampo("fotoPerfilTamanho", foto.tamanhoEstimado);

      toast.success("Foto otimizada com sucesso.");
    } catch (error) {
      toast.error(error.message || "Não foi possível processar a foto.");
    } finally {
      setProcessandoFoto(false);
      if (event.target) event.target.value = "";
    }
  }

  function salvarEtapaLocalAntesFoto() {
    try {
      sessionStorage.setItem(
        "wizard_morador_etapa_atual",
        "2"
      );
    } catch (error) {
      console.warn(error);
    }
  }

  function removerFoto() {
    atualizarCampo("fotoPerfilBase64", "");
    atualizarCampo("fotoPerfilNome", "");
    atualizarCampo("fotoPerfilMime", "");
    atualizarCampo("fotoPerfilTamanho", "");
    atualizarCampo("fotoPerfilUrl", "");
    atualizarCampo("fotoPerfilPath", "");
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
    function validarTela2() {
    const invalidos = {};

    if (!formMorador.nomeCompleto?.trim()) {
      invalidos.nomeCompleto = true;
      toast.error("Informe seu nome completo.");
    }

    if (!formMorador.cpf?.trim()) {
      invalidos.cpf = true;
      toast.error("Informe seu CPF.");
    } else if (!validarCpf(formMorador.cpf)) {
      const tentativaAtual = tentativasCpfInvalidas + 1;

      if (tentativaAtual < 3) {
        invalidos.cpf = true;
        setTentativasCpfInvalidas(tentativaAtual);
        toast.error(`CPF inválido. Verifique os números informados. Tentativa ${tentativaAtual}/3.`);
      } else {
        setCpfPendenteValidacao(true);
        toast("CPF seguirá para auditoria administrativa antes da liberação do acesso.");
      }
    } else {
      setCpfPendenteValidacao(false);
    }

    if (!formMorador.dataNascimento?.trim()) {
      invalidos.dataNascimento = true;
      toast.error("Informe sua data de nascimento.");
    } else if (!validarDataNascimento(formMorador.dataNascimento)) {
      invalidos.dataNascimento = true;
      toast.error("Informe uma data de nascimento válida.");
    } else if ((calcularIdade(formMorador.dataNascimento) || 0) < 18) {
      invalidos.dataNascimento = true;
      toast.error(
        "O cadastro principal do morador responsável exige idade mínima de 18 anos. Dependentes devem ser cadastrados na etapa de dependentes."
      );
    }

    if (!formMorador.emailPrincipal?.trim()) {
      invalidos.emailPrincipal = true;
      toast.error("Informe seu e-mail principal.");
    } else if (!validarEmail(formMorador.emailPrincipal)) {
      invalidos.emailPrincipal = true;
      toast.error("Informe um e-mail válido.");
    }

    const ddi = obterDDINumerico(formMorador.ddi || "+55");
    const whatsapp = somenteNumeros(formMorador.whatsapp);

    if (!ddi) {
      invalidos.ddi = true;
      toast.error("Informe o DDI.");
    }

    if (!whatsapp) {
      invalidos.whatsapp = true;
      toast.error("Informe seu WhatsApp principal.");
    } else if (ddi === "55" && whatsapp.length < 10) {
      invalidos.whatsapp = true;
      toast.error("Informe um WhatsApp válido com DDD.");
    } else if (ddi !== "55" && whatsapp.length < 6) {
      invalidos.whatsapp = true;
      toast.error("Informe um telefone internacional válido.");
    }

    setCamposInvalidos(invalidos);
    return Object.keys(invalidos).length === 0;
  }

  async function avancar() {
    if (!validarTela2()) return;

    const payload = montarPayloadTela2({
      dadosWizard,
      formMorador,
      cpfPendenteValidacao,
    });

    await onNext(payload);
  }

  async function salvarRascunho() {
    const payload = montarPayloadTela2({
      dadosWizard,
      formMorador,
      cpfPendenteValidacao,
    });

    const salvou = await onSaveDraft(payload);

    if (salvou !== false) {
      toast.success("Rascunho salvo com sucesso.");
    }
  }

  return (
    <div className="wm-t2-page">
      <section className="wm-t2-card">
        <header className="wm-t2-title">
          <span className="wm-t2-title-icon">
            <UserRound size={23} />
          </span>

          <div>
            <h1>2. Dados Pessoais do Morador Responsável</h1>
            <p>
              Informe seus dados principais. Eles serão usados para identificação,
              acesso e comunicação dentro do Sistema Chegou<span className="wm-orange">!</span>.
            </p>
          </div>
        </header>

        <div className="wm-t2-divider" />

        <section className="wm-t2-unit-card">
          <InfoCard
            icon={<Building2 size={21} />}
            title="Unidade selecionada"
            lines={[`${unidade.torre} • ${unidade.unidade}`, `Perfil: ${unidade.perfil}`]}
          />

          <InfoCard icon={<Building2 size={21} />} title="Condomínio" lines={[unidade.condominio]} />

          <InfoCard icon={<ShieldCheck size={21} />} title="ID Business" lines={[unidade.businessId]} />

          <InfoCard icon={<IdCard size={21} />} title="Token" lines={[unidade.token]} />
        </section>

        <section className="wm-t2-section">
          <div className="wm-t2-section-head">
            <h2>Dados pessoais</h2>
            <p>Use informações reais, atualizadas e de uso frequente.</p>
          </div>

          <div className="wm-t2-form-grid">
            <FieldText
              label="Nome Completo *"
              value={formMorador.nomeCompleto}
              onChange={(v) => atualizarCampo("nomeCompleto", capitalizarNome(v))}
              invalid={camposInvalidos.nomeCompleto}
              icon={<UserRound size={16} />}
              placeholder="Digite seu nome completo"
            />

            <FieldText
              label="Nome Social (opcional)"
              value={formMorador.nomeSocial}
              onChange={(v) => atualizarCampo("nomeSocial", capitalizarNome(v))}
              icon={<UserRound size={16} />}
              placeholder="Como deseja ser chamado(a)"
              helper="Se preenchido, será priorizado na experiência do sistema."
            />

            <FieldText
              label="CPF *"
              value={formMorador.cpf}
              onChange={(v) => atualizarCampo("cpf", formatarCpf(v))}
              invalid={camposInvalidos.cpf}
              icon={<IdCard size={16} />}
              inputMode="numeric"
              placeholder="000.000.000-00"
              helper={
                cpfPendenteValidacao
                  ? "CPF pendente de auditoria administrativa."
                  : validarCpf(formMorador.cpf)
                    ? "CPF válido"
                    : "Validação matemática obrigatória."
              }
            />

            <FieldDate
              label="Data de Nascimento *"
              value={formMorador.dataNascimento}
              onChange={(v) => atualizarCampo("dataNascimento", v)}
              invalid={camposInvalidos.dataNascimento}
              inputRef={inputDataRef}
              onOpenCalendar={abrirCalendario}
            />
          </div>
        </section>

        <section className="wm-t2-section wm-t2-contact-photo-section">
          <div className="wm-t2-contact-photo-grid">
            <div>
              <div className="wm-t2-section-head">
                <h2>Contatos e notificações</h2>
                <p>
                  Informe e-mail e WhatsApp que você utiliza no dia a dia. Esses contatos serão usados
                  para avisos importantes do condomínio e notificações do Sistema Chegou<span className="wm-orange">!</span>.
                </p>
              </div>

              <div className="wm-t2-contact-grid">
                <FieldText
                  label="E-mail principal *"
                  value={formMorador.emailPrincipal}
                  onChange={(v) => atualizarCampo("emailPrincipal", v.toLowerCase())}
                  invalid={camposInvalidos.emailPrincipal}
                  icon={<Mail size={16} />}
                  inputMode="email"
                  placeholder="seuemail@email.com"
                  helper={validarEmail(formMorador.emailPrincipal) ? "E-mail em formato válido." : ""}
                />

                <div className="wm-t2-phone-group">
                  <FieldText
                    label="DDI *"
                    value={formMorador.ddi || "+55"}
                    onChange={(v) => {
                      const novoDDI = normalizarDDI(v);
                      atualizarCampo("ddi", novoDDI);
                      atualizarCampo(
                        "whatsapp",
                        formatarTelefoneInternacional({
                          ddi: novoDDI,
                          numero: formMorador.whatsapp,
                        })
                      );
                    }}
                    invalid={camposInvalidos.ddi}
                    inputMode="tel"
                    placeholder="+55"
                  />

                  <FieldText
                    label="WhatsApp principal *"
                    value={formMorador.whatsapp}
                    onChange={(v) =>
                      atualizarCampo(
                        "whatsapp",
                        formatarTelefoneInternacional({
                          ddi: formMorador.ddi || "+55",
                          numero: v,
                        })
                      )
                    }
                    invalid={camposInvalidos.whatsapp}
                    icon={<Phone size={16} />}
                    inputMode="tel"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div className="wm-t2-notification-card">
                <strong>Receber notificações via:</strong>

                <div className="wm-t2-checks">
                  <CheckOption
                    label="Push"
                    checked={formMorador.notificacaoPush}
                    onChange={(v) => atualizarNotificacao("notificacaoPush", v)}
                  />

                  <CheckOption
                    label="WhatsApp"
                    checked={formMorador.notificacaoWhatsapp}
                    onChange={(v) => atualizarNotificacao("notificacaoWhatsapp", v)}
                  />

                  <CheckOption
                    label="E-mail"
                    checked={formMorador.notificacaoEmail}
                    onChange={(v) => atualizarNotificacao("notificacaoEmail", v)}
                  />
                </div>
              </div>
            </div>

            <section className="wm-t2-photo-card">
              <div className="wm-t2-photo-preview">
                {formMorador.fotoPerfilBase64 ? (
                  <img src={formMorador.fotoPerfilBase64} alt="Foto do perfil" />
                ) : (
                  <UserRound size={38} />
                )}
              </div>

              <div className="wm-t2-photo-info">
                <strong>Foto de perfil (opcional)</strong>
                <span>Ajuda na identificação administrativa e em validações operacionais futuras.</span>
                <span>JPG, PNG, HEIC ou WebP até 5MB. Otimização automática para WebP.</span>

                <div className="wm-t2-photo-actions">
                  <button
                    type="button"
                    className="wm-t2-btn outline small"
                    onClick={() => {
                      salvarEtapaLocalAntesFoto();
                      inputFotoGaleriaRef.current?.click();
                    }}
                    disabled={processandoFoto}
                  >
                    <Upload size={15} />
                    {processandoFoto ? "Processando..." : "Galeria"}
                  </button>

                  {ehMobile && (
                    <button
                      type="button"
                      className="wm-t2-btn outline small"
                      onClick={() => {
                        salvarEtapaLocalAntesFoto();
                        inputFotoCameraRef.current?.click();
                      }}
                      disabled={processandoFoto}
                    >
                      <UserRound size={15} />
                      Câmera
                    </button>
                  )}

                  {formMorador.fotoPerfilBase64 ? (
                    <button type="button" className="wm-t2-btn secondary small" onClick={removerFoto}>
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

                  <input
                    ref={inputFotoCameraRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={selecionarFoto}
                    hidden
                  />
                </div>
              </div>
            </section>
          </div>
        </section>

        <section className="wm-t2-good-practices">
          <PracticeCard
            icon={<ShieldCheck size={20} />}
            title="Validação e auditoria"
            text="CPF, e-mail e WhatsApp ajudam na validação do cadastro e na segurança do acesso."
          />

          <PracticeCard
            icon={<Mail size={20} />}
            title="Contato principal"
            text="Use contatos acessados com frequência para receber avisos importantes sem atrasos."
          />

          <PracticeCard
            icon={<Info size={20} />}
            title="Privacidade"
            text="Os dados serão usados para gestão condominial, segurança e comunicação operacional."
          />
        </section>

        <footer className="wm-t2-actions">
          <button type="button" className="wm-t2-btn secondary" onClick={onBack}>
            <ArrowLeft size={16} />
            Voltar
          </button>

          <button type="button" className="wm-t2-btn danger" onClick={onCancel}>
            <X size={16} />
            Sair do cadastro
          </button>

          <button type="button" className="wm-t2-btn outline" onClick={salvarRascunho}>
            <Save size={16} />
            Salvar e continuar depois
          </button>

          <button type="button" className="wm-t2-btn primary" onClick={avancar}>
            Continuar
            <ArrowRight size={18} />
          </button>
        </footer>
      </section>
    </div>
  );
}

function InfoCard({ icon, title, lines = [] }) {
  return (
    <div className="wm-t2-info-card">
      <span>{icon}</span>

      <div>
        <strong>{title}</strong>
        {lines.map((line) => (
          <small key={line}>{line || "Não informado"}</small>
        ))}
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
}) {
  return (
    <label className="wm-t2-field">
      <span>{label}</span>

      <div className={`wm-t2-input ${invalid ? "invalid" : ""}`}>
        {icon ? <i>{icon}</i> : null}

        <input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          inputMode={inputMode}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-lpignore="true"
          data-form-type="other"
        />
      </div>

      {helper ? (
        <small className={helper.includes("válido") ? "ok" : "warning"}>
          {helper}
        </small>
      ) : null}
    </label>
  );
}

function FieldDate({ label, value, onChange, invalid, inputRef, onOpenCalendar }) {
  const iso = dataBrParaISO(value) || "";

  return (
    <label className="wm-t2-field">
      <span>{label}</span>

      <div className={`wm-t2-input ${invalid ? "invalid" : ""}`}>
        <i>
          <CalendarDays size={16} />
        </i>

        <input
          value={value || ""}
          onChange={(e) => onChange(formatarData(e.target.value))}
          inputMode="numeric"
          placeholder="DD/MM/AAAA"
          autoComplete="off"
        />

        <button
          type="button"
          className="wm-t2-calendar-btn"
          onClick={onOpenCalendar}
          aria-label="Abrir calendário"
        >
          <CalendarDays size={16} />
        </button>

        <input
          ref={inputRef}
          type="date"
          className="wm-t2-date-native"
          value={iso}
          onChange={(e) => onChange(dataISOParaBR(e.target.value))}
          aria-label="Selecionar data"
        />
      </div>
    </label>
  );
}

function CheckOption({ label, checked, onChange }) {
  return (
    <label className="wm-t2-check-option">
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function PracticeCard({ icon, title, text }) {
  return (
    <article className="wm-t2-practice-card">
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </article>
  );
}