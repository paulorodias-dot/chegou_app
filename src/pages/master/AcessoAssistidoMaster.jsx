import { useEffect, useState } from "react";
import { Building2, Search, ShieldCheck } from "lucide-react";
import { supabase } from "../../services/supabase";
import "./AcessoAssistidoMaster.css";

export default function AcessoAssistidoMaster({ perfil, onEntrarSuporte }) {
  const [codigo, setCodigo] = useState("");
  const [condominios, setCondominios] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    buscarCondominios();
  }, []);

  async function buscarCondominios(termo = "") {
    try {
      setCarregando(true);
      setErro("");

      let query = supabase
        .from("condominios")
        .select("id, business_id, nome_fantasia, razao_social, codigo_condominio, status_cadastro, ativo")
        .eq("ativo", true)
        .order("nome_fantasia", { ascending: true })
        .limit(12);

      if (termo.trim()) {
        const busca = termo.trim();
        query = query.or(
          `codigo_condominio.ilike.%${busca}%,nome_fantasia.ilike.%${busca}%,razao_social.ilike.%${busca}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      setCondominios(data || []);
    } catch (error) {
      setErro(error.message || "Erro ao buscar condomínios.");
    } finally {
      setCarregando(false);
    }
  }

  async function entrar(condominio) {
    const contexto = {
      modo_suporte_master: true,
      suporte_iniciado_em: new Date().toISOString(),
      suporte_master_id: perfil?.id,
      suporte_master_nome: perfil?.nome,
      suporte_master_email: perfil?.email,

      condominio_id: condominio.id,
      business_id_condominio: condominio.business_id,
      nome_condominio:
        condominio.nome_fantasia || condominio.razao_social || "Condomínio",
      codigo_condominio: condominio.codigo_condominio,
    };

    await supabase.from("logs_sistema").insert({
      acao: "MASTER_ACESSO_ASSISTIDO_INICIADO",
      condominio_id: condominio.id,
      usuario_id: perfil?.id || null,
      email: perfil?.email || null,
      origem: "master_suporte",
      detalhes: contexto,
    });

    onEntrarSuporte?.(contexto);
  }

  function pesquisar(event) {
    event.preventDefault();
    buscarCondominios(codigo);
  }

  return (
    <div className="mas-page">
      <header className="mas-header">
        <span>Master</span>
        <h1>Acesso Assistido</h1>
        <p>
          Acesse temporariamente o módulo Administrativo de um condomínio para suporte,
          implantação e acompanhamento operacional.
        </p>
      </header>

      <section className="mas-card">
        <div className="mas-card-title">
          <ShieldCheck size={22} />
          <div>
            <strong>Modo Suporte Master</strong>
            <small>Suas ações continuarão auditadas como Master.</small>
          </div>
        </div>

        <form className="mas-search" onSubmit={pesquisar}>
          <Search size={18} />
          <input
            value={codigo}
            onChange={(event) => setCodigo(event.target.value.toUpperCase())}
            placeholder="Buscar por código, nome ou razão social..."
          />
          <button type="submit">Buscar</button>
        </form>

        {erro ? <div className="mas-error">{erro}</div> : null}

        <div className="mas-list">
          {carregando ? (
            <div className="mas-empty">Carregando condomínios...</div>
          ) : condominios.length ? (
            condominios.map((condominio) => (
              <article key={condominio.id} className="mas-cond-card">
                <div className="mas-cond-icon">
                  <Building2 size={22} />
                </div>

                <div className="mas-cond-info">
                  <strong>
                    {condominio.nome_fantasia || condominio.razao_social}
                  </strong>
                  <span>Código: {condominio.codigo_condominio || "—"}</span>
                  <small>Status: {condominio.status_cadastro || "—"}</small>
                </div>

                <button type="button" onClick={() => entrar(condominio)}>
                  Entrar como Suporte
                </button>
              </article>
            ))
          ) : (
            <div className="mas-empty">Nenhum condomínio encontrado.</div>
          )}
        </div>
      </section>
    </div>
  );
}