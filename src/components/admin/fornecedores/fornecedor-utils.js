export const PAGE_SIZE_OPTIONS = [5, 15, 30];

export function onlyDigits(value = "") {
  return String(value).replace(/\D/g, "");
}

export function maskCPF(value = "") {
  const digits = onlyDigits(value).slice(0, 11);

  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

export function maskCNPJ(value = "") {
  const digits = onlyDigits(value).slice(0, 14);

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

export function maskDocument(tipo, value) {
  return tipo === "CPF" ? maskCPF(value) : maskCNPJ(value);
}

export function isValidCPF(cpfValue = "") {
  const cpf = onlyDigits(cpfValue);

  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;

  for (let i = 0; i < 9; i += 1) {
    sum += Number(cpf[i]) * (10 - i);
  }

  let digit1 = 11 - (sum % 11);
  if (digit1 >= 10) digit1 = 0;

  if (digit1 !== Number(cpf[9])) return false;

  sum = 0;

  for (let i = 0; i < 10; i += 1) {
    sum += Number(cpf[i]) * (11 - i);
  }

  let digit2 = 11 - (sum % 11);
  if (digit2 >= 10) digit2 = 0;

  return digit2 === Number(cpf[10]);
}

export function isValidCNPJBasic(cnpjValue = "") {
  return onlyDigits(cnpjValue).length === 14;
}

export function formatSituacao(value, situacoes = []) {
  const found = situacoes.find((item) => item.codigo === value);
  return found?.nome || value || "-";
}

export function getDisplayName(item) {
  return (
    item?.nome_fantasia ||
    item?.razao_social ||
    item?.nome_completo ||
    "Fornecedor sem nome"
  );
}

export function formatDocumentForTable(tipo, documento) {
  if (!documento) return "-";
  return tipo === "CPF" ? maskCPF(documento) : maskCNPJ(documento);
}

export function buildInitialFornecedorForm() {
  return {
    tipo_documento: "CNPJ",
    documento: "",

    razao_social: "",
    nome_fantasia: "",
    nome_completo: "",
    situacao_receita: "",
    natureza_juridica: "",
    porte: "",
    cnae_principal: "",
    cnae_secundarios: [],

    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",

    telefone_receita: "",
    email_receita: "",
    dados_receita: {},

    responsavel_nome: "",
    responsavel_cargo: "",
    responsavel_telefone: "",
    responsavel_whatsapp: "",
    responsavel_email: "",

    inscricao_estadual: "",
    inscricao_municipal: "",

    telefone_local: "",
    whatsapp_local: "",
    email_local: "",
    site_local: "",
    observacoes: "",

    situacao: "EM_HOMOLOGACAO",
    categoria_ids: [],
    categoria_principal_id: "",
  };
}

export function normalizeFornecedorPayload({ form, condominioId }) {
  return {
    p_condominio_id: condominioId,
    p_tipo_documento: form.tipo_documento,
    p_documento: onlyDigits(form.documento),

    p_razao_social: form.razao_social || null,
    p_nome_fantasia: form.nome_fantasia || null,
    p_nome_completo: form.nome_completo || null,

    p_situacao_receita: form.situacao_receita || null,
    p_natureza_juridica: form.natureza_juridica || null,
    p_porte: form.porte || null,
    p_cnae_principal: form.cnae_principal || null,
    p_cnae_secundarios: form.cnae_secundarios || [],

    p_cep: onlyDigits(form.cep) || null,
    p_logradouro: form.logradouro || null,
    p_numero: form.numero || null,
    p_complemento: form.complemento || null,
    p_bairro: form.bairro || null,
    p_cidade: form.cidade || null,
    p_estado: form.estado || null,

    p_telefone_receita: form.telefone_receita || null,
    p_email_receita: form.email_receita || null,
    p_dados_receita: form.dados_receita || {},

    p_responsavel_nome: form.responsavel_nome || null,
    p_responsavel_cargo: form.responsavel_cargo || null,
    p_responsavel_telefone: form.responsavel_telefone || null,
    p_responsavel_whatsapp: form.responsavel_whatsapp || null,
    p_responsavel_email: form.responsavel_email || null,

    p_inscricao_estadual: form.inscricao_estadual || null,
    p_inscricao_municipal: form.inscricao_municipal || null,

    p_telefone_local: form.telefone_local || null,
    p_whatsapp_local: form.whatsapp_local || null,
    p_email_local: form.email_local || null,
    p_site_local: form.site_local || null,
    p_observacoes: form.observacoes || null,

    p_situacao: form.situacao,
    p_categoria_ids: form.categoria_ids,
    p_categoria_principal_id: form.categoria_principal_id || null,

    p_ip: null,
    p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    p_navegador: typeof navigator !== "undefined" ? navigator.userAgent : null,
    p_sistema_operacional:
      typeof navigator !== "undefined" ? navigator.platform : null,
  };
}