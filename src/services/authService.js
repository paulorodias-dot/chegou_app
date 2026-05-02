import { supabase } from './supabase'

async function autenticarPorEmail(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase().trim(),
    password: senha,
  })

  if (error) {
    throw new Error('Usuário ou senha inválidos.')
  }

  return data
}

async function buscarPerfilUsuario(userId) {
  const { data: perfil, error } = await supabase
    .from('usuarios')
    .select('id, business_id, nome, email, nivel_id, condominio_id, ativo')
    .eq('id', userId)
    .single()

  if (error) {
    throw new Error('Usuário autenticado, mas perfil não encontrado no sistema.')
  }

  if (!perfil.ativo) {
    await supabase.auth.signOut()
    throw new Error('Conta inativa. Procure o administrador.')
  }

  return perfil
}

export async function loginComEmailSenha(email, senha) {
  const auth = await autenticarPorEmail(email, senha)
  const perfil = await buscarPerfilUsuario(auth.user.id)

  return {
    auth,
    perfil,
  }
}

export async function loginFuncionarioCondominio(codigoCondominio, username, senha) {
  const codigoTratado = codigoCondominio.toLowerCase().trim()
  const usernameTratado = username.toLowerCase().trim()

  const { data: vinculos, error } = await supabase.rpc('buscar_login_funcionario', {
    p_codigo_login: codigoTratado,
    p_username: usernameTratado,
  })

  if (error) {
    throw new Error('Erro ao validar usuário do condomínio.')
  }

  if (!vinculos || vinculos.length === 0) {
    throw new Error('Código do condomínio ou usuário inválido.')
  }

  const vinculo = vinculos[0]

  if (!vinculo.email_login) {
    throw new Error('Usuário sem e-mail técnico vinculado. Verifique o cadastro.')
  }

  const auth = await autenticarPorEmail(vinculo.email_login, senha)
  const perfil = await buscarPerfilUsuario(auth.user.id)

  if (perfil.id !== vinculo.usuario_id) {
    await supabase.auth.signOut()
    throw new Error('Usuário autenticado não corresponde ao vínculo informado.')
  }

  return {
    auth,
    perfil: {
      ...perfil,
      tipo_vinculo: vinculo.tipo_vinculo,
      cargo: vinculo.cargo,
      username: vinculo.username,
      condominio_id: vinculo.condominio_id,
      nome_condominio: vinculo.nome_condominio,
    },
  }
}

export async function loginEquipeChegou(username, senha) {
  const usernameTratado = username.toLowerCase().trim()

  const { data: vinculos, error } = await supabase.rpc('buscar_login_equipe_chegou', {
    p_username: usernameTratado,
  })

  if (error) {
    throw new Error('Erro ao validar usuário da equipe Chegou!')
  }

  if (!vinculos || vinculos.length === 0) {
    throw new Error('Usuário institucional inválido.')
  }

  const vinculo = vinculos[0]

  if (!vinculo.email_login) {
    throw new Error('Usuário institucional sem e-mail técnico vinculado.')
  }

  const auth = await autenticarPorEmail(vinculo.email_login, senha)
  const perfil = await buscarPerfilUsuario(auth.user.id)

  if (perfil.id !== vinculo.usuario_id) {
    await supabase.auth.signOut()
    throw new Error('Usuário autenticado não corresponde ao vínculo institucional.')
  }

  return {
    auth,
    perfil: {
      ...perfil,
      tipo_vinculo: vinculo.tipo_vinculo,
      cargo: vinculo.cargo,
      username: vinculo.username,
      condominio_id: null,
      nome_condominio: null,
    },
  }
}

export async function logout() {
  await supabase.auth.signOut()
}