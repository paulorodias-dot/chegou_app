import { supabase } from "./supabase";

export const TEMPO_INATIVIDADE_MS = 30 * 60 * 1000;

function normalizarCodigoCondominio(valor = "") {
  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .trim();
}

function normalizarUsername(valor = "") {
  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase()
    .trim();
}

function normalizarEmail(valor = "") {
  return String(valor).toLowerCase().trim();
}

function atualizarUltimoUso() {
  localStorage.setItem("chegou_ultimo_uso", String(Date.now()));
}

export function sessaoExpiradaPorInatividade() {
  const ultimoUso = Number(localStorage.getItem("chegou_ultimo_uso") || 0);

  if (!ultimoUso) return false;

  return Date.now() - ultimoUso > TEMPO_INATIVIDADE_MS;
}

export function registrarAtividadeUsuario() {
  atualizarUltimoUso();
}

async function autenticarPorEmail(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizarEmail(email),
    password: senha,
  });

  if (error) {
    throw new Error("Usuário ou senha inválidos.");
  }

  atualizarUltimoUso();

  return data;
}

export async function buscarPerfilUsuario(userId) {
  const { data: perfil, error } = await supabase
    .from("usuarios")
    .select(
      `
      id,
      business_id,
      nome,
      email,
      username,
      telefone,
      cpf,
      nivel_id,
      condominio_id,
      ativo,
      status_cadastro,
      primeiro_acesso,
      permissao_global
    `
    )
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error("Usuário autenticado, mas perfil não encontrado no sistema.");
  }

  if (!perfil.ativo) {
    await supabase.auth.signOut();
    limparSessaoLocal();
    throw new Error("Conta inativa. Procure o administrador.");
  }

  return perfil;
}

function validarAbaLogin(perfil, origemLogin) {
  const nivel = Number(perfil.nivel_id);

  if (nivel === 1) return;

  if (origemLogin === "morador" && ![6, 7].includes(nivel)) {
    throw new Error("Este usuário não possui permissão para acessar pela aba Morador.");
  }

  if (origemLogin === "funcionario" && ![2, 3, 4, 5].includes(nivel)) {
    throw new Error("Este usuário deve acessar pela aba Funcionário.");
  }

  if (origemLogin === "equipe_chegou" && nivel !== 1) {
    throw new Error("Este acesso é exclusivo para equipe Chegou!.");
  }
}

export async function loginComEmailSenha(email, senha) {
  const auth = await autenticarPorEmail(email, senha);
  const perfil = await buscarPerfilUsuario(auth.user.id);

  validarAbaLogin(perfil, "morador");

  return {
    auth,
    perfil: {
      ...perfil,
      origem_login: "morador",
    },
  };
}

export async function loginFuncionarioCondominio(codigoCondominio, username, senha) {
  const codigoTratado = normalizarCodigoCondominio(codigoCondominio);
  const usernameTratado = normalizarUsername(username);

  const { data: vinculos, error } = await supabase.rpc("buscar_login_funcionario", {
    p_codigo_login: codigoTratado,
    p_username: usernameTratado,
  });

  if (error) {
    throw new Error("Erro ao validar usuário do condomínio.");
  }

  if (!vinculos || vinculos.length === 0) {
    throw new Error("Código do condomínio ou usuário inválido.");
  }

  const vinculo = vinculos[0];

  if (!vinculo.email_login) {
    throw new Error("Usuário sem e-mail técnico vinculado. Verifique o cadastro.");
  }

  const auth = await autenticarPorEmail(vinculo.email_login, senha);
  const perfil = await buscarPerfilUsuario(auth.user.id);

  if (perfil.id !== vinculo.usuario_id) {
    await supabase.auth.signOut();
    limparSessaoLocal();
    throw new Error("Usuário autenticado não corresponde ao vínculo informado.");
  }

  validarAbaLogin(perfil, "funcionario");

  return {
    auth,
    perfil: {
      ...perfil,
      tipo_vinculo: vinculo.tipo_vinculo,
      cargo: vinculo.cargo,
      username: vinculo.username || perfil.username,
      condominio_id: vinculo.condominio_id,
      nome_condominio: vinculo.nome_condominio,
      origem_login: "funcionario",
    },
  };
}

export async function loginEquipeChegou(username, senha) {
  const usernameTratado = normalizarUsername(username);

  const { data: vinculos, error } = await supabase.rpc("buscar_login_equipe_chegou", {
    p_username: usernameTratado,
  });

  if (error) {
    throw new Error("Erro ao validar usuário da equipe Chegou!");
  }

  if (!vinculos || vinculos.length === 0) {
    throw new Error("Usuário institucional inválido.");
  }

  const vinculo = vinculos[0];

  if (!vinculo.email_login) {
    throw new Error("Usuário institucional sem e-mail técnico vinculado.");
  }

  const auth = await autenticarPorEmail(vinculo.email_login, senha);
  const perfil = await buscarPerfilUsuario(auth.user.id);

  if (perfil.id !== vinculo.usuario_id) {
    await supabase.auth.signOut();
    limparSessaoLocal();
    throw new Error("Usuário autenticado não corresponde ao vínculo institucional.");
  }

  validarAbaLogin(perfil, "equipe_chegou");

  return {
    auth,
    perfil: {
      ...perfil,
      tipo_vinculo: vinculo.tipo_vinculo,
      cargo: vinculo.cargo,
      username: vinculo.username || perfil.username,
      condominio_id: null,
      nome_condominio: null,
      origem_login: "equipe_chegou",
    },
  };
}

export async function recuperarSessaoAtual() {
  if (sessaoExpiradaPorInatividade()) {
    await logout();
    return null;
  }

  const { data } = await supabase.auth.getSession();

  if (!data?.session?.user?.id) {
    limparSessaoLocal();
    return null;
  }

  const perfil = await buscarPerfilUsuario(data.session.user.id);

  atualizarUltimoUso();

  return {
    auth: data.session,
    perfil,
  };
}

export function limparSessaoLocal() {
  localStorage.removeItem("chegou_perfil");
  localStorage.removeItem("chegou_ultimo_uso");
  localStorage.removeItem("chegou_lembrar");
}

export async function logout() {
  limparSessaoLocal();
  await supabase.auth.signOut();
}