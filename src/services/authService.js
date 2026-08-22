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
 * Verifica expiração local por inatividade.
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
 */
export function registrarAtividadeUsuario() {
  atualizarUltimoUso();
}


/**
 * Executa autenticação direta pelo Supabase Auth.
 *
 * Usada pelos fluxos Funcionário e Equipe Chegou!.
 *
 * O Morador NÃO utiliza mais autenticação direta por
 * e-mail técnico.
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
 * Busca o perfil raiz oficial do usuário autenticado.
 *
 * Utilizada pelos contextos que ainda operam diretamente
 * sobre o perfil funcional raiz.
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
 * Validação dos fluxos FUNCIONÁRIO / EQUIPE.
 *
 * Morador não passa por esta função.
 * O contexto Morador é autoritativamente resolvido pelo backend.
 */
function validarAbaLogin(perfil, origemLogin) {
  const nivel = Number(perfil.nivel_id);

  if (origemLogin === "funcionario") {
    if (![2, 3, 4, 5].includes(nivel)) {
      throw new Error(
        "Este usuário deve acessar pela aba Funcionário."
      );
    }

    return;
  }

  if (origemLogin === "equipe_chegou") {
    if (nivel !== 1) {
      throw new Error(
        "Este acesso é exclusivo para equipe Chegou!."
      );
    }

    return;
  }
}


/**
 * Login canônico de Morador / Dependente.
 *
 * Entrada permitida:
 * - CPF
 * - e-mail cadastrado no papel Morador
 *
 * Username não participa deste fluxo.
 *
 * A Edge Function:
 * 1. resolve a identidade/Auth canônico;
 * 2. valida a senha no Supabase Auth;
 * 3. resolve o contexto residencial;
 * 4. devolve perfil contextual Nível 6/7.
 */
export async function loginComEmailSenha(
  identificador,
  senha
) {
  const loginTratado =
    String(identificador || "").trim();

  if (!loginTratado || !senha) {
    throw new Error(
      "Informe seu CPF/e-mail e senha."
    );
  }

  const {
    data,
    error,
  } = await supabase.functions.invoke(
    "login-morador",
    {
      body: {
        identificador: loginTratado,
        senha,
      },
    }
  );

  if (error) {
    throw new Error(
      "CPF/e-mail ou senha inválidos."
    );
  }

  if (
    !data?.success ||
    !data?.session?.access_token ||
    !data?.session?.refresh_token ||
    !data?.perfil
  ) {
    throw new Error(
      data?.error ||
        "CPF/e-mail ou senha inválidos."
    );
  }

  /**
   * Instala no client global do sistema
   * a sessão Auth canônica criada pela Edge.
   */
  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.setSession({
    access_token:
      data.session.access_token,

    refresh_token:
      data.session.refresh_token,
  });

  if (
    sessionError ||
    !sessionData?.session?.user?.id
  ) {
    limparSessaoLocal();

    throw new Error(
      "Não foi possível iniciar sua sessão."
    );
  }

  /**
   * Defesa contra resolução cruzada.
   */
  if (
    sessionData.session.user.id !==
    data.perfil.id
  ) {
    await supabase.auth.signOut();

    limparSessaoLocal();

    throw new Error(
      "Não foi possível validar sua identidade."
    );
  }

  /**
   * Defesa adicional sobre o contrato contextual.
   */
  if (
    data.perfil.origem_login !== "morador" ||
    !["MORADOR", "DEPENDENTE"].includes(
      String(data.perfil.papel || "").toUpperCase()
    ) ||
    ![6, 7].includes(
      Number(data.perfil.nivel_id)
    )
  ) {
    await supabase.auth.signOut();

    limparSessaoLocal();

    throw new Error(
      "Contexto residencial inválido."
    );
  }

  atualizarUltimoUso();

  return {
    auth: sessionData.session,

    perfil: {
      ...data.perfil,

      origem_login: "morador",

      /**
       * Contexto residencial nunca herda
       * globalidade de outro papel do mesmo Auth.
       */
      permissao_global: false,
      permissao_global_contextual: false,
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

  validarAbaLogin(
    perfil,
    "funcionario"
  );

  return {
    auth,

    perfil: {
      ...perfil,

      tipo_vinculo:
        vinculo.tipo_vinculo,

      cargo:
        vinculo.cargo,

      username:
        vinculo.username ||
        perfil.username,

      condominio_id:
        vinculo.condominio_id,

      nome_condominio:
        vinculo.nome_condominio,

      origem_login:
        "funcionario",
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

      tipo_vinculo:
        vinculo.tipo_vinculo,

      cargo:
        vinculo.cargo,

      username:
        vinculo.username ||
        perfil.username,

      condominio_id:
        null,

      nome_condominio:
        null,

      origem_login:
        "equipe_chegou",
    },
  };
}


/**
 * Recupera uma sessão Supabase já existente.
 *
 * ATENÇÃO:
 * este método ainda será evoluído no GATE 46B.11DC
 * para restaurar corretamente contextos multi-role.
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
 */
export function limparSessaoLocal() {
  localStorage.removeItem(
    "chegou_perfil"
  );

  localStorage.removeItem(
    "chegou_ultimo_uso"
  );

  localStorage.removeItem(
    "chegou_lembrar"
  );
}


/**
 * Logout oficial.
 */
export async function logout() {
  limparSessaoLocal();

  await supabase.auth.signOut();
}