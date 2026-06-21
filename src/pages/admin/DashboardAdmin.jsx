import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  ClipboardCheck,
  Home,
  PackageCheck,
  ShieldCheck,
  UserRound,
  UsersRound,
  Warehouse,
} from "lucide-react";

import { supabase } from "../../services/supabase";
import "./DashboardAdmin.css";

const STATUS_EXCLUIR_PRE = new Set([
  "APROVADO",
  "ATIVO",
  "CONTA_ATIVA",
  "CANCELADO",
  "REPROVADO",
]);

function normalizar(valor = "") {
  return String(valor || "").trim().toUpperCase();
}

function obterCondominioId(perfil) {
  return (
    perfil?.condominio_id ||
    perfil?.condominio_atual_id ||
    perfil?.usuario_condominio?.condominio_id ||
    null
  );
}

function classificarPreCadastro(item = {}) {
  const statusAuditoria = normalizar(item.status_auditoria);
  const statusCadastro = normalizar(item.status_cadastro);
  const statusConta = normalizar(item.status_conta);
  const statusConvite = normalizar(item.status_convite || item.status_envio);
  const statusAcompanhamento = normalizar(item.status_acompanhamento);

  if (
    STATUS_EXCLUIR_PRE.has(statusAuditoria) ||
    STATUS_EXCLUIR_PRE.has(statusCadastro) ||
    STATUS_EXCLUIR_PRE.has(statusConta)
  ) {
    return null;
  }

  if (
    [
      "WIZARD_FINALIZADO",
      "AGUARDANDO_AUDITORIA",
      "AUDITORIA_INICIADA",
      "REAUDITORIA_PENDENTE",
      "CORRECAO_SOLICITADA",
    ].includes(statusAuditoria) ||
    ["WIZARD_FINALIZADO", "FINALIZADO"].includes(statusAcompanhamento)
  ) {
    return "finalizados";
  }

  if (
    ["EM_PREENCHIMENTO", "WIZARD_INICIADO"].includes(statusCadastro) ||
    ["EM_PREENCHIMENTO", "WIZARD_INICIADO", "FILA_AUDITORIA"].includes(
      statusAcompanhamento
    )
  ) {
    return "preenchimento";
  }

  if (
    [
      "ENVIADO",
      "ENTREGUE",
      "ABERTO",
      "AGUARDANDO_ENVIO",
      "PROGRAMADO",
      "NAO_ENVIADO",
      "NÃO_ENVIADO",
    ].includes(statusConvite)
  ) {
    return "enviados";
  }

  return "enviados";
}

function KpiCard({ icon: Icon, titulo, valor, detalhe, variante = "blue" }) {
  return (
    <section className="ada-kpi-card">
      <div className="ada-kpi-head">
        <div className={`ada-kpi-icon ada-kpi-icon-${variante}`}>
          <Icon size={20} />
        </div>

        <div>
          <strong>{titulo}</strong>
          <span>{detalhe}</span>
        </div>
      </div>

      <div className="ada-kpi-value">{valor}</div>
    </section>
  );
}

function PreCadastroCard({ resumo }) {
  if (!resumo?.total) return null;

  return (
    <section className="ada-kpi-card ada-pre-card">
      <div className="ada-kpi-head">
        <div className="ada-kpi-icon ada-kpi-icon-blue">
          <UserRound size={20} />
        </div>

        <div>
          <strong>Pré-Cadastro</strong>
          <span>Moradores em andamento</span>
        </div>
      </div>

      <div className="ada-pre-total">
        <span>Total</span>
        <strong>{resumo.total}</strong>
        <small>Funil ativo de cadastro</small>
      </div>

      <div className="ada-pre-mini-grid">
        <div>
          <span>Enviados</span>
          <strong>{resumo.enviados}</strong>
        </div>

        <div>
          <span>Preench.</span>
          <strong>{resumo.preenchimento}</strong>
        </div>

        <div>
          <span>Finaliz.</span>
          <strong>{resumo.finalizados}</strong>
        </div>
      </div>
    </section>
  );
}

function PartnerSidebarCard() {
  return (
    <section className="ada-side-card ada-side-card-blue">
      <div className="ada-side-title">
        <ShieldCheck size={18} />
        <strong>
          Parceiros Chegou<span>!</span>
        </strong>
      </div>

      <div className="ada-side-banner">
        <div>
          <strong>Publicidade Premium</strong>
          <span>Slide preparado para banners futuros.</span>
        </div>
      </div>
    </section>
  );
}

export default function DashboardAdmin({ perfil }) {
  const condominioId = useMemo(() => obterCondominioId(perfil), [perfil]);

  const [resumoPreCadastro, setResumoPreCadastro] = useState({
    total: 0,
    enviados: 0,
    preenchimento: 0,
    finalizados: 0,
  });

  const [resumoCondominio, setResumoCondominio] = useState({
    torres: 0,
    unidadesTotal: 0,
    unidadesOcupadas: 0,
    garagens: 0,
    moradoresAtivos: 0,
    primeiroAcesso: 0,
  });

  const [kpis, setKpis] = useState({
    moradoresResponsaveis: 0,
    funcionarios: 0,
    encomendas: 0,
  });

  useEffect(() => {
    async function carregarDashboard() {
      if (!condominioId) return;

      try {
        const [
          preCadastrosRes,
          usuariosRes,
          torresRes,
          unidadesRes,
          garagensRes,
        ] = await Promise.all([
          supabase
            .from("pre_cadastro_moradores")
            .select(
              "id, unidade, status_cadastro, status_convite, status_envio, status_auditoria, status_conta, status_acompanhamento"
            )
            .eq("condominio_id", condominioId),

          supabase
            .from("usuarios")
            .select("id, nivel_id, ativo, primeiro_acesso, status_cadastro")
            .eq("condominio_id", condominioId),

          supabase
            .from("torres")
            .select("id")
            .eq("condominio_id", condominioId),

          supabase
            .from("unidades")
            .select("id")
            .eq("condominio_id", condominioId),

          supabase
            .from("vagas_garagem")
            .select("id")
            .eq("condominio_id", condominioId),
        ]);

        const preCadastros = preCadastrosRes.data || [];
        const usuarios = usuariosRes.data || [];
        const torres = torresRes.data || [];
        const unidades = unidadesRes.data || [];
        const garagens = garagensRes.data || [];

        const resumoPre = {
          enviados: 0,
          preenchimento: 0,
          finalizados: 0,
        };

        preCadastros.forEach((item) => {
          const grupo = classificarPreCadastro(item);
          if (grupo) resumoPre[grupo] += 1;
        });

        const usuariosAtivos = usuarios.filter((item) => item.ativo === true);

        const moradoresResponsaveis = usuariosAtivos.filter(
          (item) => Number(item.nivel_id) === 6
        ).length;

        const dependentesAtivos = usuariosAtivos.filter(
          (item) => Number(item.nivel_id) === 7
        ).length;

        const primeiroAcesso = usuariosAtivos.filter(
          (item) => item.primeiro_acesso === true
        ).length;

        const unidadesOcupadas = new Set(
          preCadastros
            .filter((item) => {
              const statusConta = normalizar(item.status_conta);
              const statusAuditoria = normalizar(item.status_auditoria);
              const statusCadastro = normalizar(item.status_cadastro);

              return (
                statusConta === "CONTA_ATIVA" ||
                statusAuditoria === "APROVADO" ||
                statusCadastro === "ATIVO"
              );
            })
            .map((item) => String(item.unidade || "").trim())
            .filter(Boolean)
        ).size;

        setResumoPreCadastro({
          ...resumoPre,
          total:
            resumoPre.enviados + resumoPre.preenchimento + resumoPre.finalizados,
        });

        setResumoCondominio({
          torres: torres.length,
          unidadesTotal: unidades.length,
          unidadesOcupadas,
          garagens: garagens.length,
          moradoresAtivos: moradoresResponsaveis + dependentesAtivos,
          primeiroAcesso,
        });

        setKpis({
          moradoresResponsaveis,
          funcionarios: usuariosAtivos.filter((item) => Number(item.nivel_id) === 5)
            .length,
          encomendas: 0,
        });
      } catch (error) {
        console.error("Erro ao carregar dashboard administrativo:", error);
      }
    }

    carregarDashboard();
  }, [condominioId]);

  return (
    <div className="ada-page">
      <main className="ada-main">
        <header className="ada-header">
          <div>
            <span>Administrativo</span>
            <h1>Dashboard do Condomínio</h1>
            <p>
              Bem-vindo, {perfil?.nome || "Administrador"}. Acompanhe os
              principais indicadores operacionais do condomínio.
            </p>
          </div>
        </header>

        <section className="ada-cards">
          <PreCadastroCard resumo={resumoPreCadastro} />

          <KpiCard
            icon={UsersRound}
            titulo="Moradores"
            valor={kpis.moradoresResponsaveis}
            detalhe="Responsáveis ativos"
            variante="green"
          />

          <KpiCard
            icon={PackageCheck}
            titulo="Encomendas"
            valor={kpis.encomendas}
            detalhe="Pendentes"
            variante="orange"
          />

          <KpiCard
            icon={Warehouse}
            titulo="Funcionários"
            valor={kpis.funcionarios}
            detalhe="Operacionais ativos"
            variante="purple"
          />
        </section>

        <section className="ada-empty-area" aria-label="Área futura do dashboard" />
      </main>

      <aside className="ada-rightbar">
        <section className="ada-side-card">
          <div className="ada-side-title">
            <Building2 size={18} />
            <strong>Resumo do Condomínio</strong>
          </div>

          <div className="ada-side-metrics">
            <div>
              <span>Torres</span>
              <strong>{resumoCondominio.torres}</strong>
            </div>

            <div>
              <span>Ocupadas / Total</span>
              <strong>
                {resumoCondominio.unidadesOcupadas} /{" "}
                {resumoCondominio.unidadesTotal}
              </strong>
            </div>

            <div>
              <span>Garagens</span>
              <strong>{resumoCondominio.garagens}</strong>
            </div>

            <div>
              <span>Moradores Ativos</span>
              <strong>{resumoCondominio.moradoresAtivos}</strong>
            </div>

            <div>
              <span>Primeiro Acesso</span>
              <strong>{resumoCondominio.primeiroAcesso}</strong>
            </div>
          </div>
        </section>

        <PartnerSidebarCard />

        <section className="ada-side-card">
          <div className="ada-side-title">
            <ClipboardCheck size={18} />
            <strong>Boas Práticas</strong>
          </div>

          <ul className="ada-best-list">
            <li>Revise pré-cadastros e auditorias diariamente.</li>
            <li>Cadastros finalizados ainda precisam de aprovação.</li>
            <li>Verifique conflitos de garagem antes de aprovar.</li>
            <li>Mantenha dados de moradores sempre atualizados.</li>
            <li>Revogue acessos inativos quando necessário.</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}