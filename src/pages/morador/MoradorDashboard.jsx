import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CircleHelp,
  Package,
  PackageCheck,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { supabase } from "../../services/supabase";
import "./MoradorDashboard.css";

export default function MoradorDashboard({ usuario }) {
  const [mostrarOverlay, setMostrarOverlay] = useState(false);
  const [resumoMorador, setResumoMorador] = useState({
    perfil: "Morador Responsável",
    torre: "Carregando...",
    unidade: "Carregando...",
    garagem: "Não informada",
    localGaragem: "Não informado",
    dependentes: 0,
  });

  const primeiroNome = useMemo(() => {
    const nome = usuario?.nome || usuario?.nome_completo || "Morador";
    return nome.trim().split(" ")[0];
  }, [usuario]);

  useEffect(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    const chave = `chegou_overlay_morador_${usuario?.id || "usuario"}`;
    const ultimaExibicao = localStorage.getItem(chave);

    if (ultimaExibicao !== hoje) {
      setMostrarOverlay(true);
      localStorage.setItem(chave, hoje);
    }
  }, [usuario?.id]);

  useEffect(() => {
    async function carregarResumoMorador() {
        if (!usuario?.id) return;

        try {
        const perfil =
            usuario?.tipo_morador ||
            usuario?.perfil_morador ||
            usuario?.papel_morador ||
            (Number(usuario?.nivel_id) === 7
            ? "Morador Dependente"
            : "Morador Responsável");

        const { data: vinculo, error: erroVinculo } = await supabase
            .from("usuario_unidade")
            .select("id, usuario_id, unidade_id, tipo")
            .eq("usuario_id", usuario.id)
            .limit(1)
            .maybeSingle();

        if (erroVinculo) {
            throw erroVinculo;
        }

        if (!vinculo?.unidade_id) {
            setResumoMorador((atual) => ({
            ...atual,
            perfil,
            torre: "Não vinculada",
            unidade: "Não vinculada",
            }));
            return;
        }

        const { data: unidade, error: erroUnidade } = await supabase
            .from("unidades")
            .select("id, numero, torre_id, condominio_id")
            .eq("id", vinculo.unidade_id)
            .maybeSingle();

        if (erroUnidade) {
            throw erroUnidade;
        }

        let torreNome = "Não vinculada";

        if (unidade?.torre_id) {
            const { data: torre, error: erroTorre } = await supabase
            .from("torres")
            .select("id, nome")
            .eq("id", unidade.torre_id)
            .maybeSingle();

            if (!erroTorre && torre?.nome) {
            torreNome = torre.nome;
            }
        }

        let dependentesTotal = 0;

        const { count, error: erroDependentes } = await supabase
            .from("usuario_unidade")
            .select("id", { count: "exact", head: true })
            .eq("unidade_id", vinculo.unidade_id)
            .neq("usuario_id", usuario.id);

        if (!erroDependentes) {
            dependentesTotal = count || 0;
        }

        let garagemTexto = "Não informada";
        let localGaragemTexto = "Não informado";

        const { data: vaga, error: erroVaga } = await supabase
        .from("vagas_unidade")
        .select(
            `
            id,
            numero_vaga,
            identificacao_vaga,
            localizacao,
            localizacao_vaga,
            tipo_vaga,
            tipo_fisico_vaga,
            status,
            status_vaga
        `
        )
        .eq("unidade_id", vinculo.unidade_id)
        .eq("condominio_id", unidade?.condominio_id || usuario?.condominio_id)
        .order("criado_em", { ascending: true })
        .limit(1)
        .maybeSingle();

        if (!erroVaga && vaga) {
        garagemTexto =
            vaga.identificacao_vaga ||
            vaga.numero_vaga ||
            vaga.tipo_vaga ||
            "Informada";

        localGaragemTexto =
            vaga.localizacao_vaga ||
            vaga.localizacao ||
            vaga.tipo_fisico_vaga ||
            "Não informado";
        }

        setResumoMorador({
        perfil,
        torre: torreNome,
        unidade: unidade?.numero || "Não vinculada",
        garagem: garagemTexto,
        localGaragem: localGaragemTexto,
        dependentes: dependentesTotal,
        });
        } catch (error) {
        console.error("Erro ao carregar resumo do morador:", error);

        setResumoMorador((atual) => ({
            ...atual,
            torre: "Não vinculada",
            unidade: "Não vinculada",
        }));
        }
    }

    carregarResumoMorador();
    }, [
    usuario?.id,
    usuario?.nivel_id,
    usuario?.tipo_morador,
    usuario?.perfil_morador,
    usuario?.papel_morador,
    ]);

  const kpis = [
    {
      titulo: "Encomendas",
      descricao: "Aguardando retirada",
      valor: 0,
      icon: Package,
      cor: "orange",
    },
    {
      titulo: "Últimas entregas",
      descricao: "Recebidas recentemente",
      valor: 0,
      icon: PackageCheck,
      cor: "blue",
    },
    {
      titulo: "Notificações",
      descricao: "Novas mensagens",
      valor: 0,
      icon: Bell,
      cor: "purple",
    },
  ];

  return (
    <main className="mda-page">
      {mostrarOverlay && (
        <div className="mda-daily-overlay" role="dialog" aria-modal="true">
          <div className="mda-daily-card">
            <strong>Resumo do dia</strong>

            <h2>Olá, {primeiroNome}</h2>
            <p>Veja rapidamente se existe algo novo para sua unidade.</p>

            <div className="mda-daily-list">
              <div>
                <span>Encomendas aguardando</span>
                <b>0</b>
              </div>

              <div>
                <span>Notificações novas</span>
                <b>0</b>
              </div>

              <div>
                <span>Comunicados pendentes</span>
                <b>0</b>
              </div>
            </div>

            <button type="button" onClick={() => setMostrarOverlay(false)}>
              Abrir dashboard
            </button>
          </div>
        </div>
      )}

      <section className="mda-main">
        <header className="mda-header">
          <span>Portal do Morador</span>
          <h1>Olá, {primeiroNome}</h1>
          <p>
            Bem-vindo ao Sistema Chegou. Acompanhe os principais serviços da sua
            unidade.
          </p>
        </header>

        <section className="mda-cards">
          {kpis.map((item) => {
            const Icon = item.icon;

            return (
              <article className="mda-kpi-card" key={item.titulo}>
                <div className="mda-kpi-head">
                  <div className={`mda-kpi-icon mda-kpi-icon-${item.cor}`}>
                    <Icon size={20} />
                  </div>

                  <div>
                    <strong>{item.titulo}</strong>
                    <span>{item.descricao}</span>
                  </div>
                </div>

                <div className="mda-kpi-value">{item.valor}</div>
              </article>
            );
          })}
        </section>

        <section className="mda-content-grid">
          <article className="mda-content-card">
            <div className="mda-content-title">
              <Package size={17} />
              <strong>Minhas encomendas</strong>
            </div>

            <div className="mda-empty-state">
              <Package size={28} />
              <strong>Nenhuma encomenda aguardando retirada</strong>
              <p>
                Quando a portaria registrar uma nova encomenda, ela aparecerá
                aqui.
              </p>
            </div>
          </article>

          <article className="mda-content-card">
            <div className="mda-content-title">
              <Bell size={17} />
              <strong>Notificações recentes</strong>
            </div>

            <div className="mda-mini-list">
              <div>
                <span>Novas mensagens</span>
                <strong>0</strong>
              </div>

              <div>
                <span>Comunicados pendentes</span>
                <strong>0</strong>
              </div>

              <div>
                <span>Alertas da unidade</span>
                <strong>0</strong>
              </div>
            </div>
          </article>
        </section>
      </section>

      <aside className="mda-rightbar">
        <article className="mda-side-card">
          <div className="mda-side-title">
            <UserRound size={17} />
            <strong>Resumo do Morador</strong>
          </div>

          <div className="mda-side-metrics">
            <div>
              <span>Perfil</span>
              <strong>{resumoMorador.perfil}</strong>
            </div>

            <div>
              <span>Torre</span>
              <strong>{resumoMorador.torre}</strong>
            </div>

            <div>
              <span>Unidade</span>
              <strong>{resumoMorador.unidade}</strong>
            </div>

            <div>
              <span>Garagem</span>
              <strong>{resumoMorador.garagem}</strong>
            </div>

            <div>
              <span>Local</span>
              <strong>{resumoMorador.localGaragem}</strong>
            </div>

            <div>
              <span>Dependentes</span>
              <strong>{resumoMorador.dependentes}</strong>
            </div>
          </div>
        </article>

        <article className="mda-side-card mda-side-card-blue">
          <div className="mda-side-title">
            <ShieldCheck size={17} />
            <strong>
              Parceiros Chegou<span>!</span>
            </strong>
          </div>

          <div className="mda-side-banner">
            <div>
              <strong>Publicidade Premium</strong>
              <span>Slide preparado para banners futuros.</span>
            </div>
          </div>
        </article>

        <article className="mda-side-card">
          <div className="mda-side-title">
            <CircleHelp size={17} />
            <strong>Orientações do Módulo</strong>
          </div>

          <ul className="mda-best-list">
            <li>Acompanhe suas encomendas pelo painel inicial.</li>
            <li>Consulte notificações e comunicados importantes.</li>
            <li>Mantenha seus dados de unidade sempre atualizados.</li>
          </ul>
        </article>
      </aside>
    </main>
  );
}