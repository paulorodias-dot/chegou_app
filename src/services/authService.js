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


const CHAVE_PERFIL_LOCAL =
  "chegou_perfil";

const CHAVE_CONTEXTO_SESSAO =
  "chegou_contexto_sessao";

const CHAVE_ULTIMO_USO =
  "chegou_ultimo_uso";

const CHAVE_LEMBRAR =
  "chegou_lembrar";


function lerJsonLocal(chave) {
  try {
    const valor =
      localStorage.getItem(chave);

    return valor
      ? JSON.parse(valor)
      : null;
  } catch {
    return null;
  }
}


function montarContextoSessao(perfil = {}) {
  return {
    version: 1,

    origem_login:
      String(
        perfil?.origem_login || ""
      ).trim() || null,

    usuario_id:
      perfil?.id || null,

    condominio_id:
      perfil?.condominio_id || null,

    unidade_id:
      perfil?.unidade_id || null,

    pessoa_id:
      perfil?.pessoa_id || null,

    papel:
      perfil?.papel || null,

    nivel_contextual:
      perfil?.nivel_contextual ??
      perfil?.nivel_id ??
      null,
  };
}


/**
 * Persiste apenas dados de apresentação/contexto da sessão.
 *
 * IMPORTANTE:
 * - não grava senha;
 * - não grava access_token;
 * - não grava refresh_token;
 * - o contexto salvo NÃO autoriza acesso;
 * - a autorização é revalidada no backend ao restaurar.
 */
export function salvarSessaoAutenticada(
  perfil,
  lembrar = false
) {
  if (!perfil?.id) {
    throw new Error(
      "Perfil autenticado inválido."
    );
  }

  localStorage.setItem(
    CHAVE_PERFIL_LOCAL,
    JSON.stringify(perfil)
  );

  localStorage.setItem(
    CHAVE_CONTEXTO_SESSAO,
    JSON.stringify(
      montarContextoSessao(perfil)
    )
  );

  localStorage.setItem(
    CHAVE_ULTIMO_USO,
    String(Date.now())
  );

  if (lembrar) {
    localStorage.setItem(
      CHAVE_LEMBRAR,
      "true"
    );
  } else {
    localStorage.removeItem(
      CHAVE_LEMBRAR
    );
  }
}


function obterContextoSessaoLocal() {
  return lerJsonLocal(
    CHAVE_CONTEXTO_SESSAO
  );
}


function selecionarContextoResidencial(
  resposta,
  contextoSalvo
) {
  const contextos =
    Array.isArray(
      resposta?.contextos
    )
      ? resposta.contextos
      : [];

  if (
    resposta?.contexto &&
    typeof resposta.contexto === "object"
  ) {
    return resposta.contexto;
  }

  if (!contextos.length) {
    return null;
  }

  const condominioId =
    contextoSalvo?.condominio_id ||
    null;

  const unidadeId =
    contextoSalvo?.unidade_id ||
    null;

  if (condominioId && unidadeId) {
    const exato =
      contextos.find(
        (item) =>
          String(
            item?.condominio_id || ""
          ) ===
            String(condominioId) &&
          String(
            item?.unidade_id || ""
          ) ===
            String(unidadeId)
      );

    if (exato) {
      return exato;
    }
  }

  if (condominioId) {
    const mesmoCondominio =
      contextos.filter(
        (item) =>
          String(
            item?.condominio_id || ""
          ) ===
          String(condominioId)
      );

    if (
      mesmoCondominio.length === 1
    ) {
      return mesmoCondominio[0];
    }
  }

  if (contextos.length === 1) {
    return contextos[0];
  }

  return null;
}


async function restaurarPerfilResidencial(
  session,
  contextoSalvo
) {
  const authUserId =
    session?.user?.id;

  if (!authUserId) {
    return null;
  }

  /*
   * O marcador local só informa qual contexto o usuário escolheu.
   * O backend revalida se esse auth.uid() ainda possui contexto
   * residencial ativo e autorizado.
   */
  const {
    data: contextoData,
    error: contextoError,
  } = await supabase.rpc(
    "fn_auth_morador_contexto_v1"
  );

  if (
    contextoError ||
    contextoData?.success !== true
  ) {
    return null;
  }

  const contexto =
    selecionarContextoResidencial(
      contextoData,
      contextoSalvo
    );

  if (!contexto) {
    return null;
  }

  if (
    String(
      contexto?.auth_user_id ||
      contexto?.usuario_id ||
      ""
    ) !==
      String(authUserId) &&
    String(
      contexto?.usuario_id || ""
    ) !==
      String(authUserId)
  ) {
    return null;
  }

  const nivelContextual =
    Number(
      contexto?.nivel_contextual
    );

  const papel =
    String(
      contexto?.papel || ""
    ).toUpperCase();

  if (
    ![6, 7].includes(
      nivelContextual
    ) ||
    ![
      "MORADOR",
      "DEPENDENTE",
    ].includes(papel)
  ) {
    return null;
  }

  const perfilRaiz =
    await buscarPerfilUsuario(
      authUserId
    );

  return {
    id:
      perfilRaiz.id,

    business_id:
      perfilRaiz.business_id,

    nome:
      perfilRaiz.nome,

    telefone:
      perfilRaiz.telefone,

    cpf:
      perfilRaiz.cpf,

    ativo:
      perfilRaiz.ativo,

    status_cadastro:
      perfilRaiz.status_cadastro,

    primeiro_acesso:
      perfilRaiz.primeiro_acesso,

    email:
      contexto?.email_login ||
      null,

    username:
      null,

    nivel_id:
      nivelContextual,

    nivel_contextual:
      nivelContextual,

    papel,

    tipo_vinculo:
      "morador",

    tipo_morador:
      contexto?.tipo_morador ||
      null,

    origem_login:
      "morador",

    pessoa_id:
      contexto?.pessoa_id,

    condominio_id:
      contexto?.condominio_id,

    unidade_id:
      contexto?.unidade_id,

    usuario_condominio_vinculo_id:
      contexto
        ?.usuario_condominio_vinculo_id,

    morador_unidade_vinculo_id:
      contexto
        ?.morador_unidade_vinculo_id,

    principal:
      Boolean(
        contexto?.principal
      ),

    permissao_global:
      false,

    permissao_global_contextual:
      false,
  };
}


/**
 * Retorna true quando o usuário optou por permanecer conectado.
 */
export function deveManterConectado() {
  return localStorage.getItem(CHAVE_LEMBRAR) === "true";
}


/**
 * Atualiza o horário da última atividade conhecida do usuário.
 */
function atualizarUltimoUso() {
  localStorage.setItem(CHAVE_ULTIMO_USO, String(Date.now()));
}


/**
 * Verifica expiração local por inatividade.
 */
export function sessaoExpiradaPorInatividade() {
  if (deveManterConectado()) {
    return false;
  }

  const ultimoUso = Number(
    localStorage.getItem(CHAVE_ULTIMO_USO) || 0
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
 * Regra multi-role:
 * - a sessão Auth identifica QUEM está autenticado;
 * - chegou_contexto_sessao registra QUAL contexto foi escolhido;
 * - se o último contexto foi Morador/Dependente, o backend
 *   revalida esse contexto antes de reconstruir o perfil;
 * - nenhum papel é restaurado somente a partir do localStorage.
 */
export async function recuperarSessaoAtual() {
  if (
    sessaoExpiradaPorInatividade()
  ) {
    await logout();
    return null;
  }

  const {
    data,
    error,
  } = await supabase.auth
    .getSession();

  if (error) {
    limparSessaoLocal();
    return null;
  }

  const session =
    data?.session;

  const userId =
    session?.user?.id;

  if (!userId) {
    limparSessaoLocal();
    return null;
  }

  const contextoSalvo =
    obterContextoSessaoLocal();

  let perfil = null;

  /*
   * Último login escolhido explicitamente como Morador.
   *
   * Não reutilizamos chegou_perfil como autoridade.
   * A função fn_auth_morador_contexto_v1() confirma novamente
   * vínculo, condomínio, unidade e papel contextual.
   */
  if (
    contextoSalvo?.origem_login ===
      "morador" &&
    (
      !contextoSalvo?.usuario_id ||
      String(
        contextoSalvo.usuario_id
      ) === String(userId)
    )
  ) {
    perfil =
      await restaurarPerfilResidencial(
        session,
        contextoSalvo
      );

    /*
     * Se o contexto residencial salvo não puder mais ser
     * confirmado, não fazemos fallback silencioso para um
     * perfil global/administrativo. Isso impediria justamente
     * a troca involuntária de papel que esta correção resolve.
     */
    if (!perfil) {
      limparSessaoLocal();

      await supabase.auth
        .signOut();

      return null;
    }
  } else {
    /*
     * Fluxos já existentes de Equipe/Funcionário/Admin.
     * Mantemos a restauração raiz atual para não alterar
     * contratos fora do escopo deste GATE.
     */
    perfil =
      await buscarPerfilUsuario(
        userId
      );
  }

  atualizarUltimoUso();

  /*
   * Atualiza apenas a cópia de apresentação e o marcador
   * do contexto depois que a autorização foi reconstruída.
   */
  localStorage.setItem(
    CHAVE_PERFIL_LOCAL,
    JSON.stringify(perfil)
  );

  localStorage.setItem(
    CHAVE_CONTEXTO_SESSAO,
    JSON.stringify(
      montarContextoSessao(perfil)
    )
  );

  return {
    auth: session,
    perfil,
  };
}


/**
 * Remove os dados locais relacionados à sessão.
 */
export function limparSessaoLocal() {
  localStorage.removeItem(
    CHAVE_PERFIL_LOCAL
  );

  localStorage.removeItem(
    CHAVE_CONTEXTO_SESSAO
  );

  localStorage.removeItem(
    CHAVE_ULTIMO_USO
  );

  localStorage.removeItem(
    CHAVE_LEMBRAR
  );
}


/**
 * Logout oficial.
 */
export async function logout() {
  limparSessaoLocal();

  await supabase.auth.signOut();
}