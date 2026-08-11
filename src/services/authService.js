import { supabase } from "./supabase";


export const TEMPO_INATIVIDADE_MS = 30 * 60 * 1000;


/**
 * Normaliza o código de acesso do condomínio.
 */
function normalizarCodigoCondominio(valor = "") {
  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .trim();
}


/**
 * Normaliza username institucional/operacional.
 */
function normalizarUsername(valor = "") {
  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase()
    .trim();
}


/**
 * Normaliza e-mail utilizado pelo Supabase Auth.
 */
function normalizarEmail(valor = "") {
  return String(valor).toLowerCase().trim();
}


/**
 * Retorna true quando o usuário optou por permanecer conectado.
 *
 * Essa preferência é gravada pelo Login.jsx após autenticação
 * bem-sucedida.
 */
export function deveManterConectado() {
  return localStorage.getItem("chegou_lembrar") === "true";
}


/**
 * Atualiza o horário da última atividade conhecida do usuário.
 */
function atualizarUltimoUso() {
  localStorage.setItem("chegou_ultimo_uso", String(Date.now()));
}


/**
 * Verifica se a sessão deve ser considerada expirada
 * pela política LOCAL de inatividade do Sistema Chegou!.
 *
 * Regra:
 * - "Manter-me conectado" marcado:
 *   não aplica timeout local de 30 minutos.
 *
 * - "Manter-me conectado" desmarcado:
 *   aplica timeout local de 30 minutos.
 *
 * Esta função não substitui a validade da sessão do Supabase.
 */
export function sessaoExpiradaPorInatividade() {
  if (deveManterConectado()) {
    return false;
  }

  const ultimoUso = Number(
    localStorage.getItem("chegou_ultimo_uso") || 0
  );

  if (!ultimoUso) {
    return false;
  }

  return Date.now() - ultimoUso > TEMPO_INATIVIDADE_MS;
}


/**
 * Registra atividade do usuário.
 *
 * Pode ser chamada pelo AppLayout ou camada global responsável
 * por mouse, teclado, toque etc.
 */
export function registrarAtividadeUsuario() {
  atualizarUltimoUso();
}


/**
 * Executa autenticação direta pelo Supabase Auth.
 */
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


/**
 * Busca o perfil oficial do usuário autenticado.
 */
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
    throw new Error(
      "Usuário autenticado, mas perfil não encontrado no sistema."
    );
  }

  if (!perfil.ativo) {
    await supabase.auth.signOut();
    limparSessaoLocal();

    throw new Error(
      "Conta inativa. Procure o administrador."
    );
  }

  return perfil;
}


/**
 * Valida se o perfil autenticado pode utilizar
 * a origem/aba de login selecionada.
 */
function validarAbaLogin(perfil, origemLogin) {
  const nivel = Number(perfil.nivel_id);

  // MASTER pode acessar os contextos autorizados.
  if (nivel === 1) {
    return;
  }

  if (
    origemLogin === "morador" &&
    ![6, 7].includes(nivel)
  ) {
    throw new Error(
      "Este usuário não possui permissão para acessar pela aba Morador."
    );
  }

  if (
    origemLogin === "funcionario" &&
    ![2, 3, 4, 5].includes(nivel)
  ) {
    throw new Error(
      "Este usuário deve acessar pela aba Funcionário."
    );
  }

  if (
    origemLogin === "equipe_chegou" &&
    nivel !== 1
  ) {
    throw new Error(
      "Este acesso é exclusivo para equipe Chegou!."
    );
  }
}


/**
 * Login de Morador / Dependente.
 */
export async function loginComEmailSenha(email, senha) {
  const auth = await autenticarPorEmail(email, senha);

  const perfil = await buscarPerfilUsuario(
    auth.user.id
  );

  validarAbaLogin(perfil, "morador");

  return {
    auth,

    perfil: {
      ...perfil,
      origem_login: "morador",
    },
  };
}


/**
 * Login de funcionário vinculado a condomínio.
 */
export async function loginFuncionarioCondominio(
  codigoCondominio,
  username,
  senha
) {
  const codigoTratado =
    normalizarCodigoCondominio(codigoCondominio);

  const usernameTratado =
    normalizarUsername(username);

  const { data: vinculos, error } =
    await supabase.rpc(
      "buscar_login_funcionario",
      {
        p_codigo_login: codigoTratado,
        p_username: usernameTratado,
      }
    );

  if (error) {
    throw new Error(
      "Erro ao validar usuário do condomínio."
    );
  }

  if (!vinculos || vinculos.length === 0) {
    throw new Error(
      "Código do condomínio ou usuário inválido."
    );
  }

  const vinculo = vinculos[0];

  if (!vinculo.email_login) {
    throw new Error(
      "Usuário sem e-mail técnico vinculado. Verifique o cadastro."
    );
  }

  const auth = await autenticarPorEmail(
    vinculo.email_login,
    senha
  );

  const perfil = await buscarPerfilUsuario(
    auth.user.id
  );

  if (perfil.id !== vinculo.usuario_id) {
    await supabase.auth.signOut();
    limparSessaoLocal();

    throw new Error(
      "Usuário autenticado não corresponde ao vínculo informado."
    );
  }

  validarAbaLogin(perfil, "funcionario");

  return {
    auth,

    perfil: {
      ...perfil,
      tipo_vinculo: vinculo.tipo_vinculo,
      cargo: vinculo.cargo,
      username:
        vinculo.username || perfil.username,
      condominio_id: vinculo.condominio_id,
      nome_condominio: vinculo.nome_condominio,
      origem_login: "funcionario",
    },
  };
}


/**
 * Login institucional da equipe Chegou!.
 */
export async function loginEquipeChegou(
  username,
  senha
) {
  const usernameTratado =
    normalizarUsername(username);

  const { data: vinculos, error } =
    await supabase.rpc(
      "buscar_login_equipe_chegou",
      {
        p_username: usernameTratado,
      }
    );

  if (error) {
    throw new Error(
      "Erro ao validar usuário da equipe Chegou!"
    );
  }

  if (!vinculos || vinculos.length === 0) {
    throw new Error(
      "Usuário institucional inválido."
    );
  }

  const vinculo = vinculos[0];

  if (!vinculo.email_login) {
    throw new Error(
      "Usuário institucional sem e-mail técnico vinculado."
    );
  }

  const auth = await autenticarPorEmail(
    vinculo.email_login,
    senha
  );

  const perfil = await buscarPerfilUsuario(
    auth.user.id
  );

  if (perfil.id !== vinculo.usuario_id) {
    await supabase.auth.signOut();
    limparSessaoLocal();

    throw new Error(
      "Usuário autenticado não corresponde ao vínculo institucional."
    );
  }

  validarAbaLogin(
    perfil,
    "equipe_chegou"
  );

  return {
    auth,

    perfil: {
      ...perfil,
      tipo_vinculo: vinculo.tipo_vinculo,
      cargo: vinculo.cargo,
      username:
        vinculo.username || perfil.username,
      condominio_id: null,
      nome_condominio: null,
      origem_login: "equipe_chegou",
    },
  };
}


/**
 * Recupera uma sessão Supabase já existente.
 *
 * Antes de recuperar:
 * - aplica a regra de 30 minutos, caso o usuário NÃO tenha
 *   escolhido "Manter-me conectado";
 * - ignora o timeout local quando essa opção estiver ativa.
 */
export async function recuperarSessaoAtual() {
  if (sessaoExpiradaPorInatividade()) {
    await logout();
    return null;
  }

  const { data, error } =
    await supabase.auth.getSession();

  if (error) {
    limparSessaoLocal();
    return null;
  }

  if (!data?.session?.user?.id) {
    limparSessaoLocal();
    return null;
  }

  const perfil = await buscarPerfilUsuario(
    data.session.user.id
  );

  atualizarUltimoUso();

  return {
    auth: data.session,
    perfil,
  };
}


/**
 * Remove os dados locais relacionados à sessão.
 *
 * O "chegou_lembrar" também é removido porque a opção
 * "Manter-me conectado" pertence à sessão escolhida
 * naquele login.
 */
export function limparSessaoLocal() {
  localStorage.removeItem("chegou_perfil");
  localStorage.removeItem("chegou_ultimo_uso");
  localStorage.removeItem("chegou_lembrar");
}


/**
 * Logout oficial.
 *
 * Sempre encerra a sessão, independentemente da opção
 * "Manter-me conectado".
 */
export async function logout() {
  limparSessaoLocal();

  await supabase.auth.signOut();
}