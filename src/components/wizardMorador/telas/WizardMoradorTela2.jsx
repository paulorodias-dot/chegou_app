import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  Camera,
  Check,
  Copy,
  IdCard,
  Info,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Upload,
  UserRound,
  X,
} from "lucide-react";

function somenteNumeros(valor = "") {
  return String(valor).replace(/\D/g, "");
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

function validarEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function obterDadosCondominio(dadosWizard) {
  const pre = dadosWizard?.pre_cadastro || {};
  const condominio = dadosWizard?.condominio || {};

  return {
    nome:
      condominio.nome_fantasia ||
      condominio.nome ||
      dadosWizard?.nome_condominio ||
      "Não informado",
    cnpj: condominio.cnpj || dadosWizard?.cnpj || "Não informado",
    endereco:
      condominio.endereco ||
      dadosWizard?.endereco ||
      "Endereço não informado",
    torre: pre.torre_nome || pre.torre || dadosWizard?.torre || "Não informado",
    unidade:
      pre.unidade_nome || pre.unidade || dadosWizard?.unidade || "Não informado",
    token:
      dadosWizard?.token_publico ||
      dadosWizard?.codigo_convite ||
      dadosWizard?.token ||
      "Token não informado",
  };
}

function montarPayloadTela2({ dadosWizard, formMorador, cpfPendenteValidacao }) {
  return {
    pre_cadastro_id: dadosWizard?.pre_cadastro_id || null,
    business_id: dadosWizard?.business_id || null,
    condominio_id: dadosWizard?.condominio_id || null,

    nome: formMorador.nomeCompleto?.trim(),
    cpf: somenteNumeros(formMorador.cpf),
    cpf_formatado: formMorador.cpf,
    cpf_pendente_validacao: cpfPendenteValidacao,

    data_nascimento: formMorador.dataNascimento,
    email: formMorador.emailPrincipal?.trim().toLowerCase(),

    ddi: somenteNumeros(formMorador.ddi || "55"),
    ddd: somenteNumeros(formMorador.ddd),
    whatsapp: somenteNumeros(formMorador.whatsapp),

    foto_perfil_base64: formMorador.fotoPerfilBase64 || null,
    foto_perfil_nome: formMorador.fotoPerfilNome || null,

    etapa_atual: 2,
    atualizado_em: new Date().toISOString(),
  };
}

export default function WizardMoradorTela2({
  dadosWizard,
  formMorador,
  setFormMorador,
  onBack,
  onNext,
  onSaveDraft,
  onCancel,
}) {
  const [camposInvalidos, setCamposInvalidos] = useState({});
  const [tentativasCpfInvalidas, setTentativasCpfInvalidas] = useState(0);
  const [cpfPendenteValidacao, setCpfPendenteValidacao] = useState(false);

  const condominio = useMemo(
    () => obterDadosCondominio(dadosWizard),
    [dadosWizard]
  );

  function atualizarCampo(campo, valor) {
    setFormMorador((old) => ({
      ...old,
      [campo]: valor,
    }));
  }

  async function selecionarFoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const tiposPermitidos = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

    if (!tiposPermitidos.includes(file.type)) {
      toast.error("Envie uma imagem PNG, JPG ou WebP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      atualizarCampo("fotoPerfilBase64", reader.result);
      atualizarCampo("fotoPerfilNome", file.name);
    };

    reader.onerror = () => {
      toast.error("Não foi possível carregar a foto.");
    };

    reader.readAsDataURL(file);
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
    }

    if (!formMorador.emailPrincipal?.trim()) {
      invalidos.emailPrincipal = true;
      toast.error("Informe seu e-mail.");
    } else if (!validarEmail(formMorador.emailPrincipal)) {
      invalidos.emailPrincipal = true;
      toast.error("Informe um e-mail válido.");
    }

    if (!somenteNumeros(formMorador.ddi || "55")) {
      invalidos.ddi = true;
      toast.error("Informe o DDI.");
    }

    if (!somenteNumeros(formMorador.ddd)) {
      invalidos.ddd = true;
      toast.error("Informe o DDD.");
    }

    if (!somenteNumeros(formMorador.whatsapp)) {
      invalidos.whatsapp = true;
      toast.error("Informe o número do WhatsApp.");
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

  function copiarToken() {
    navigator.clipboard?.writeText(condominio.token);
    toast.success("Token do convite copiado.");
  }

  return (
    <>
      <div className="wm-t2-grid">
        <section className="wm-t2-main">
          <section className="wm-t2-card wm-t2-condominio">
            <div className="wm-t2-card-head">
              <span className="wm-t2-icon">
                <Building2 size={26} />
              </span>

              <div>
                <h1>Dados do Condomínio</h1>
                <p>Confira os dados da sua unidade.</p>
              </div>

              <div className="wm-t2-token">
                <small>Token do Convite</small>
                <strong>{condominio.token}</strong>
                <button type="button" onClick={copiarToken} aria-label="Copiar token">
                  <Copy size={16} />
                </button>
              </div>
            </div>

            <div className="wm-t2-cond-grid">
              <InfoLine icon={<Building2 />} label="Condomínio" value={condominio.nome} />
              <InfoLine icon={<IdCard />} label="CNPJ" value={condominio.cnpj} />
              <InfoLine icon={<MapPin />} label="Endereço" value={condominio.endereco} />
              <InfoLine icon={<Building2 />} label="Torre / Bloco" value={condominio.torre} />
              <InfoLine icon={<Phone />} label="Unidade" value={condominio.unidade} />
            </div>

            <div className="wm-t2-blue-note">
              <Info size={18} />
              <span>
                Este cadastro ativa seu acesso ao Sistema Chegou<span className="wm-orange">!</span> para receber notificações,
                acompanhar encomendas e autorizar retiradas com segurança.
              </span>
            </div>
          </section>

          <section className="wm-t2-card">
            <div className="wm-t2-card-head simple">
              <span className="wm-t2-icon">
                <UserRound size={26} />
              </span>

              <div>
                <h1>Seus dados pessoais</h1>
                <p>Revise e mantenha seus dados sempre atualizados.</p>
              </div>
            </div>

            <div className="wm-t2-form-layout">
              <aside className="wm-t2-photo-card">
                <span>Foto de perfil (opcional)</span>

                <div className="wm-t2-photo-preview">
                  {formMorador.fotoPerfilBase64 ? (
                    <img src={formMorador.fotoPerfilBase64} alt="Foto do perfil" />
                  ) : (
                    <UserRound size={58} />
                  )}
                </div>

                <label className="wm-t2-upload-btn">
                  <Upload size={17} />
                  Escolher foto
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={selecionarFoto}
                  />
                </label>

                <p>Formatos: JPG, PNG ou WebP<br />Tamanho máx.: 5MB</p>

                {formMorador.fotoPerfilBase64 ? (
                  <button
                    type="button"
                    className="wm-t2-remove-photo"
                    onClick={() => {
                      atualizarCampo("fotoPerfilBase64", "");
                      atualizarCampo("fotoPerfilNome", "");
                    }}
                  >
                    Remover foto
                  </button>
                ) : null}
              </aside>

              <div className="wm-t2-fields">
                <FieldText
                  label="Nome completo *"
                  value={formMorador.nomeCompleto}
                  onChange={(v) => atualizarCampo("nomeCompleto", capitalizarNome(v))}
                  invalid={camposInvalidos.nomeCompleto}
                  icon={<UserRound size={17} />}
                />

                <div className="wm-t2-two-cols">
                  <FieldText
                    label="CPF *"
                    value={formMorador.cpf}
                    onChange={(v) => atualizarCampo("cpf", formatarCpf(v))}
                    invalid={camposInvalidos.cpf}
                    icon={<IdCard size={17} />}
                    inputMode="numeric"
                    helper={
                      cpfPendenteValidacao
                        ? "CPF pendente de auditoria administrativa."
                        : validarCpf(formMorador.cpf)
                          ? "CPF válido"
                          : ""
                    }
                  />

                  <FieldText
                    label="Data de nascimento *"
                    value={formMorador.dataNascimento}
                    onChange={(v) => atualizarCampo("dataNascimento", formatarData(v))}
                    invalid={camposInvalidos.dataNascimento}
                    icon={<CalendarDays size={17} />}
                    inputMode="numeric"
                  />
                </div>

                <div className="wm-t2-contact-grid">
                  <div className="wm-t2-contact-fields">
                    <FieldText
                      label="E-mail *"
                      value={formMorador.emailPrincipal}
                      onChange={(v) => atualizarCampo("emailPrincipal", v.toLowerCase())}
                      invalid={camposInvalidos.emailPrincipal}
                      icon={<Mail size={17} />}
                      badge={validarEmail(formMorador.emailPrincipal) ? "Contato validado" : ""}
                    />

                    <div className="wm-t2-phone-row">
                      <FieldText
                        label="DDI"
                        value={formMorador.ddi || "55"}
                        onChange={(v) => atualizarCampo("ddi", somenteNumeros(v).slice(0, 3))}
                        invalid={camposInvalidos.ddi}
                        inputMode="numeric"
                      />

                      <FieldText
                        label="DDD"
                        value={formMorador.ddd}
                        onChange={(v) => atualizarCampo("ddd", somenteNumeros(v).slice(0, 2))}
                        invalid={camposInvalidos.ddd}
                        inputMode="numeric"
                      />

                      <FieldText
                        label="Número"
                        value={formMorador.whatsapp}
                        onChange={(v) => atualizarCampo("whatsapp", somenteNumeros(v).slice(0, 9))}
                        invalid={camposInvalidos.whatsapp}
                        icon={<Phone size={17} />}
                        inputMode="numeric"
                      />
                    </div>
                  </div>

                  <div className="wm-t2-contact-alerts">
                    <div className="wm-t2-warning">
                      <Info size={17} />
                      <span>
                        <strong>Atenção:</strong> o e-mail informado será utilizado para comunicações importantes
                        e recuperação de acesso.
                      </span>
                    </div>

                    <div className="wm-t2-warning">
                      <Info size={17} />
                      <span>
                        <strong>Atenção:</strong> o WhatsApp será usado para notificações de encomendas quando habilitado.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="wm-t2-blue-note">
              <ShieldCheck size={18} />
              <span>
                Seu CPF poderá ser utilizado como forma alternativa de acesso seguro em caso de esquecimento
                do e-mail cadastrado, conforme as políticas de autenticação do condomínio e do Sistema
                Chegou<span className="wm-orange">!</span>.
              </span>
            </div>
          </section>

          <footer className="wm-t2-actions">
            <button type="button" className="wm-t2-btn secondary" onClick={onBack}>
              <ArrowLeft size={18} />
              Voltar
            </button>

            <button type="button" className="wm-t2-btn danger" onClick={onCancel}>
              <X size={18} />
              Sair do cadastro
            </button>

            <button type="button" className="wm-t2-btn outline" onClick={salvarRascunho}>
              <Save size={18} />
              Salvar e continuar depois
            </button>

            <button type="button" className="wm-t2-btn primary" onClick={avancar}>
              Continuar
              <ArrowRight size={20} />
            </button>
          </footer>
        </section>

        <aside className="wm-t2-side">
          <SideCard
            icon={<ShieldCheck />}
            title="Validação e Segurança"
            items={[
              "CPF validado",
              "Formato de e-mail verificado",
              "Contato em análise pelo sistema",
              "Dados sujeitos à auditoria administrativa",
            ]}
          />

          <section className="wm-t2-side-card">
            <span className="wm-t2-side-icon">
              <ShieldCheck size={23} />
            </span>

            <h3>Importante</h3>
            <p>
              Seu CPF poderá ser utilizado como forma alternativa de login seguro em caso
              de esquecimento do e-mail cadastrado.
            </p>
          </section>

          <section className="wm-t2-side-card">
            <span className="wm-t2-side-icon">
              <Camera size={23} />
            </span>

            <h3>Boas práticas</h3>
            <ul>
              <li>Use dados reais e atualizados.</li>
              <li>Mantenha seu e-mail e WhatsApp sempre válidos.</li>
              <li>A foto de perfil ajuda na identificação administrativa.</li>
              <li>Alterações poderão passar por auditoria.</li>
            </ul>
          </section>
        </aside>
      </div>
    </>
  );
}

function InfoLine({ icon, label, value }) {
  return (
    <div className="wm-t2-info-line">
      {icon}
      <div>
        <span>{label}</span>
        <strong>{value || "Não informado"}</strong>
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
  badge,
}) {
  const autocompleteHint = "new-password";

  return (
    <label className="wm-t2-field">
      <span>{label}</span>

      <div className={`wm-t2-input ${invalid ? "invalid" : ""}`}>
        {icon}

        <input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          inputMode={inputMode}
          autoComplete={autocompleteHint}
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-lpignore="true"
          data-form-type="other"
        />

        {badge ? <em>{badge}</em> : null}
      </div>

      {helper ? (
        <small className={helper.includes("válido") ? "ok" : "warning"}>
          {helper}
        </small>
      ) : null}
    </label>
  );
}

function SideCard({ icon, title, items }) {
  return (
    <section className="wm-t2-side-card">
      <span className="wm-t2-side-icon">{icon}</span>

      <h3>{title}</h3>

      <ul>
        {items.map((item) => (
          <li key={item}>
            <Check size={15} />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}