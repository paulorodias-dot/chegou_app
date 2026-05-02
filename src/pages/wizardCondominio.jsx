import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { supabase } from "../services/supabase"
import logo from "../assets/logo.png"
import "../styles/wizardCondominio.css"

const formInicial = {
  nome_condominio: "",
  razao_social: "",
  cnpj: "",
  email_condominio: "",
  telefone_condominio: "",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  nome_responsavel: "",
  email_responsavel: "",
  telefone_responsavel: "",
  username: "",
  quantidade_torres: 0,
  quantidade_unidades: "",
}

export default function WizardCondominio() {
  const [searchParams] = useSearchParams()

  const token = searchParams.get("token")
  const modo = searchParams.get("modo")
  const isModoValidacao = modo === "teste"

  const [etapa, setEtapa] = useState(1)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState("")
  const [modalTorres, setModalTorres] = useState(false)
  const [condominioId, setCondominioId] = useState(null)

  const [form, setForm] = useState(formInicial)
  const [qtdTorresModal, setQtdTorresModal] = useState("")
  const [torres, setTorres] = useState([])

  useEffect(() => {
    async function carregarConvite() {
      try {
        setLoading(true)
        setErro("")

        const { data: convite, error: conviteError } = await supabase
          .from("convites_condominio")
          .select("*")
          .eq("token", token)
          .eq("status", "pendente")
          .maybeSingle()



      if (conviteError || !convite) {
        setErro("Convite inválido, expirado ou já utilizado.")
        return
      }

      if (new Date(convite.expira_em) < new Date()) {
        setErro("Convite expirado.")
        return
      }

      setCondominioId(convite.condominio_id)

      const { data: condominio, error: condominioError } = await supabase
        .from("condominios")
        .select("*")
        .eq("id", convite.condominio_id)
        .single()

      if (condominioError || !condominio) {
        setErro("Não foi possível carregar os dados do condomínio.")
        return
      }

      const { data: endereco } = await supabase
        .from("enderecos")
        .select("*")
        .eq("condominio_id", convite.condominio_id)
        .maybeSingle()

      const { data: responsavel } = await supabase
        .from("responsavel_logistica")
        .select("*")
        .eq("id", convite.responsavel_id)
        .maybeSingle()

      setForm({
        nome_condominio: condominio.nome_fantasia || "",
        razao_social: condominio.razao_social || "",
        cnpj: condominio.cnpj || "",
        email_condominio: condominio.email_condominio || "",
        telefone_condominio: condominio.telefone_condominio || "",

        cep: endereco?.cep || "",
        endereco: endereco?.logradouro || "",
        numero: endereco?.numero || "",
        complemento: endereco?.complemento || "",
        bairro: endereco?.bairro || "",
        cidade: endereco?.cidade || "",
        uf: endereco?.uf || "",

        nome_responsavel: responsavel?.nome || convite.nome_responsavel || "",
        email_responsavel: responsavel?.email || convite.email_destino || "",
        telefone_responsavel: responsavel?.telefone || "",
        username: "",

        quantidade_torres: condominio.quantidade_blocos || 0,
        quantidade_unidades: condominio.quantidade_unidades || "",
      })

    } catch (error) {
      console.error(error)
      setErro("Erro inesperado ao carregar o convite.")
    } finally {
      setLoading(false)
    }
  }

  function carregarModoValidacao() {
    setForm(formInicial)
    setCondominioId(null)
    setErro("")
    setLoading(false)
  }

  if (isModoValidacao) {
    carregarModoValidacao()
    return
  }

  if (token) {
    carregarConvite()
    return
  }

  const timer = setTimeout(() => {
  setErro("Acesso não autorizado.")
  setLoading(false)
}, 0)

return () => clearTimeout(timer)
}, [token, isModoValidacao])

  function limparTexto(valor) {
    return valor
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase()
  }

  function gerarUsernameAutomatico() {
    if (isModoValidacao) {
      atualizarCampo("username", "teste.administrativo")
      return
    }

  const partesNome = form.nome_responsavel
    .trim()
    .split(" ")
    .filter(Boolean)

  if (partesNome.length < 2) {
    alert("Informe nome e sobrenome do responsável para gerar o username.")
    return
  }

  const primeiroNome = limparTexto(partesNome[0])
  const ultimoSobrenome = limparTexto(partesNome[partesNome.length - 1])

  const sugestao = `${primeiroNome}.${ultimoSobrenome}`

  atualizarCampo("username", sugestao)
}

  function atualizarCampo(campo, valor) {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
    }))
  }

  function gerarCamposTorres() {
    const quantidade = Number(qtdTorresModal)

    if (!quantidade || quantidade <= 0) {
      alert("Informe uma quantidade válida de torres/blocos.")
      return
    }

    const novasTorres = Array.from({ length: quantidade }, (_, index) => ({
      ordem: index + 1,
      nome: torres[index]?.nome || "",
      identificador: torres[index]?.identificador || "",
    }))

    setTorres(novasTorres)
  }

  function atualizarTorre(index, campo, valor) {
    const lista = [...torres]
    lista[index][campo] = valor
    setTorres(lista)
  }

  function salvarTorresModal() {
    if (torres.length === 0) {
      alert("Gere os campos das torres/blocos antes de salvar.")
      return
    }

    const incompletas = torres.some(
      (torre) => !torre.nome.trim() || !torre.identificador.trim()
    )

    if (incompletas) {
      alert("Preencha o nome e o número/letra de todas as torres/blocos.")
      return
    }

    setForm((prev) => ({
      ...prev,
      quantidade_torres: torres.length,
    }))

    setModalTorres(false)
  }

  function avancarEtapa() {
  if (isModoValidacao) {
    setEtapa((atual) => atual + 1)
    return
  }

  if (etapa === 1 && (!form.nome_condominio || !form.cnpj)) {
    alert("Confirme o nome do condomínio e o CNPJ.")
    return
  }

  if (
    etapa === 2 &&
    (!form.quantidade_unidades || Number(form.quantidade_torres) <= 0)
  ) {
    alert("Cadastre as torres/blocos e informe a quantidade de unidades.")
    return
  }

  setEtapa((atual) => atual + 1)
}

  const podeSalvar = useMemo(() => {
    return (
      form.nome_condominio &&
      form.cnpj &&
      form.quantidade_unidades &&
      Number(form.quantidade_torres) > 0 &&
      form.nome_responsavel &&
      form.email_responsavel &&
      form.username
    )
  }, [form])

  async function finalizarWizard(e) {
    e.preventDefault()

    if (!podeSalvar) {
      alert("Preencha os campos obrigatórios antes de finalizar.")
      return
    }

    if (isModoValidacao) {
      alert("Modo validação: fluxo testado com sucesso. Nenhum dado foi salvo.")
      return
    }

    try {
      setSalvando(true)

      const { error: condominioError } = await supabase
        .from("condominios")
        .update({
          nome_condominio: form.nome_condominio,
          razao_social: form.razao_social,
          cnpj: form.cnpj,
          email_condominio: form.email_condominio,
          telefone_condominio: form.telefone_condominio,
          
          nome_responsavel: form.nome_responsavel,
          email_responsavel: form.email_responsavel,
          telefone_responsavel: form.telefone_responsavel,
          
          quantidade_torres: Number(form.quantidade_torres),
          quantidade_unidades: Number(form.quantidade_unidades),
          status_cadastro: "em_validacao",
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", condominioId)

      if (condominioError) throw condominioError

      await supabase
        .from("condominio_torres")
        .delete()
        .eq("condominio_id", condominioId)

      const torresPayload = torres.map((torre) => ({
        condominio_id: condominioId,
        nome: torre.nome,
        identificador: torre.identificador,
        ordem: torre.ordem,
      }))

      const { error: torresError } = await supabase
        .from("condominio_torres")
        .insert(torresPayload)

      if (torresError) throw torresError

      await supabase
        .from("convites_condominio")
        .update({
          status: "aceito",
          aceito_em: new Date().toISOString(),
        })
        .eq("token", token)

      alert("Cadastro enviado para validação com sucesso!")
    } catch (error) {
      console.error(error)
      alert("Não foi possível finalizar o cadastro.")
    } finally {
      setSalvando(false)
    }
  }

  if (loading) return <div className="wizard-loading">Carregando convite...</div>

  if (erro) {
    return (
      <div className="wizard-wrapper">
        <div className="wizard-box wizard-error">
          <h1>Convite indisponível</h1>
          <p>{erro}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="wizard-wrapper">
      <div className="wizard-box">
        <header className="wizard-top">
          <div className="wizard-brand">
            <img src={logo} alt="Chegou!" />
            <div>
              <span>Gestão Inteligente de Encomendas</span>
              <h1>Primeiro acesso do condomínio</h1>
            </div>
          </div>

          {isModoValidacao && <div className="wizard-mode">Modo Validação</div>}
        </header>

        <div className="wizard-intro">
          <strong>Validação inicial do condomínio</strong>
          <p>
            Confira os dados recebidos pelo convite, cadastre a estrutura do condomínio
            e finalize com o responsável pela logística das encomendas.
          </p>
        </div>

        <div className="wizard-steps">
          <button className={etapa === 1 ? "active" : ""} type="button">
            <span>1</span> Condomínio
          </button>
          <button className={etapa === 2 ? "active" : ""} type="button">
            <span>2</span> Estrutura
          </button>
          <button className={etapa === 3 ? "active" : ""} type="button">
            <span>3</span> Responsável
          </button>
        </div>

        <form onSubmit={finalizarWizard} className="wizard-form">
          {etapa === 1 && (
            <section className="wizard-section">
              <div className="wizard-section-title">
                <h2>Dados do condomínio</h2>
                <p>Confirme as informações principais cadastradas pelo Master.</p>
              </div>

              <div className="wizard-grid">
                <label>Nome do Condomínio *<input value={form.nome_condominio} onChange={(e) => atualizarCampo("nome_condominio", e.target.value)} /></label>
                <label>Razão Social<input value={form.razao_social} onChange={(e) => atualizarCampo("razao_social", e.target.value)} /></label>
                <label>CNPJ *<input value={form.cnpj} onChange={(e) => atualizarCampo("cnpj", e.target.value)} /></label>
                <label>E-mail do Condomínio<input value={form.email_condominio} onChange={(e) => atualizarCampo("email_condominio", e.target.value)} /></label>
                <label>Telefone / WhatsApp<input value={form.telefone_condominio} onChange={(e) => atualizarCampo("telefone_condominio", e.target.value)} /></label>
              </div>

              <div className="wizard-section-title second">
                <h2>Endereço</h2>
                <p>Esses dados ajudam a organizar portaria, moradores e unidades.</p>
              </div>

              <div className="wizard-grid">
                <label>CEP<input value={form.cep} onChange={(e) => atualizarCampo("cep", e.target.value)} /></label>
                <label>Endereço<input value={form.endereco} onChange={(e) => atualizarCampo("endereco", e.target.value)} /></label>
                <label>Número<input value={form.numero} onChange={(e) => atualizarCampo("numero", e.target.value)} /></label>
                <label>Complemento<input value={form.complemento} onChange={(e) => atualizarCampo("complemento", e.target.value)} /></label>
                <label>Bairro<input value={form.bairro} onChange={(e) => atualizarCampo("bairro", e.target.value)} /></label>
                <label>Cidade<input value={form.cidade} onChange={(e) => atualizarCampo("cidade", e.target.value)} /></label>
                <label>UF<input value={form.uf} onChange={(e) => atualizarCampo("uf", e.target.value.toUpperCase())} maxLength={2} /></label>
              </div>

              <div className="wizard-tip">
                <strong>Dica:</strong> valide CNPJ, endereço e contato antes de avançar. Esses dados serão base para os próximos convites.
              </div>
            </section>
          )}

          {etapa === 2 && (
            <section className="wizard-section">
              <div className="wizard-section-title">
                <h2>Estrutura do condomínio</h2>
                <p>Cadastre torres/blocos e quantidade total de unidades.</p>
              </div>

              <div className="wizard-grid structure">
                <label>Torres / Blocos cadastrados *<input value={form.quantidade_torres} readOnly /></label>
                <label>Quantidade de Unidades *<input type="number" min="1" value={form.quantidade_unidades} onChange={(e) => atualizarCampo("quantidade_unidades", e.target.value)} /></label>

                <div className="wizard-action-card">
                  <strong>Cadastro de torres/blocos</strong>
                  <p>Informe a quantidade e depois nomeie cada torre ou bloco.</p>
                  <button type="button" onClick={() => setModalTorres(true)}>
                    Cadastrar Torres / Blocos
                  </button>
                </div>
              </div>

              {torres.length > 0 && (
                <div className="wizard-preview">
                  <strong>Torres cadastradas:</strong>
                  <div>
                    {torres.map((torre) => (
                      <span key={torre.ordem}>{torre.nome} - {torre.identificador}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="wizard-tip">
                <strong>Dica:</strong> essa estrutura será usada futuramente para vincular moradores, unidades e entregas por torre/bloco.
              </div>
            </section>
          )}

          {etapa === 3 && (
            <section className="wizard-section">
              <div className="wizard-section-title">
                <h2>Responsável pela logística</h2>
                <p>Informe quem será a referência inicial para a gestão das encomendas.</p>
              </div>

              <div className="wizard-grid">
                <label>Nome do Responsável *<input value={form.nome_responsavel} onChange={(e) => atualizarCampo("nome_responsavel", e.target.value)} /></label>
                <label>E-mail do Responsável *<input value={form.email_responsavel} onChange={(e) => atualizarCampo("email_responsavel", e.target.value)} /></label>
                <label>Telefone do Responsável<input value={form.telefone_responsavel} onChange={(e) => atualizarCampo("telefone_responsavel", e.target.value)} /></label>

                <label>
                  Username de acesso *
                  <input
                    value={form.username}
                    onChange={(e) => atualizarCampo("username", e.target.value.toLowerCase().trim())}
                    placeholder="ex: logistica.condominio"
                  />
                  <small>Use letras minúsculas, sem espaços.</small>
                </label>

                <div className="wizard-action-card">
                  <strong>Sugestão automática</strong>
                  <p>Gerar um username com base no nome do condomínio e cidade.</p>
                  <button type="button" onClick={gerarUsernameAutomatico}>
                    Gerar username
                  </button>
                </div>
              </div>

              <div className="wizard-tip">
                <strong>Dica:</strong> depois vamos validar disponibilidade do username em tempo real antes de salvar.
              </div>
            </section>
          )}

          <div className="wizard-footer">
            {etapa > 1 && (
              <button type="button" className="btn ghost" onClick={() => setEtapa((atual) => atual - 1)}>
                Voltar
              </button>
            )}

            {etapa < 3 && (
              <button type="button" className="btn primary" onClick={avancarEtapa}>
                Próximo
              </button>
            )}

            {etapa === 3 && (
              <button
  type="submit"
  className="btn primary"
  disabled={!isModoValidacao && (!podeSalvar || salvando)}
>
  {salvando ? "Salvando..." : "Finalizar primeiro acesso"}
</button>
            )}
          </div>
        </form>
      </div>

      {modalTorres && (
        <div className="wizard-modal-overlay">
          <div className="wizard-modal">
            <div className="wizard-modal-header">
              <div>
                <h2>Cadastro de Torres / Blocos</h2>
                <p>Defina a quantidade e identifique cada torre ou bloco.</p>
              </div>
              <button type="button" onClick={() => setModalTorres(false)}>×</button>
            </div>

            <div className="wizard-modal-content">
              <label>
                Quantidade de Torres / Blocos
                <div className="wizard-inline">
                  <input type="number" min="1" value={qtdTorresModal} onChange={(e) => setQtdTorresModal(e.target.value)} />
                  <button type="button" onClick={gerarCamposTorres}>Gerar campos</button>
                </div>
              </label>

              {torres.length > 0 && (
                <div className="wizard-torres-list">
                  {torres.map((torre, index) => (
                    <div className="wizard-torre-item" key={torre.ordem}>
                      <strong>{torre.ordem}</strong>
                      <input placeholder="Nome. Ex: Torre A" value={torre.nome} onChange={(e) => atualizarTorre(index, "nome", e.target.value)} />
                      <input placeholder="Número ou letra. Ex: A, B, 1" value={torre.identificador} onChange={(e) => atualizarTorre(index, "identificador", e.target.value)} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="wizard-modal-actions">
              <button type="button" className="btn ghost" onClick={() => setModalTorres(false)}>Cancelar</button>
              <button type="button" className="btn primary" onClick={salvarTorresModal}>Salvar torres</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}