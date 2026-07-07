// src/components/admin/fornecedores/FornecedorKpis.jsx

import { BadgeCheck, Clock3, Tags, TriangleAlert } from "lucide-react";

export default function FornecedorKpis({ kpis }) {
  const data = kpis || {
    fornecedores_ativos: 0,
    em_homologacao: 0,
    suspensos: 0,
    categorias_utilizadas: 0,
  };

  return (
    <section className="cad-fornecedores-kpis">
      <article className="kpi-premium-card">
        <div className="kpi-premium-icon success">
          <BadgeCheck size={18} />
        </div>
        <span>Fornecedores Ativos</span>
        <strong>{data.fornecedores_ativos || 0}</strong>
      </article>

      <article className="kpi-premium-card">
        <div className="kpi-premium-icon warning">
          <Clock3 size={18} />
        </div>
        <span>Em Homologação</span>
        <strong>{data.em_homologacao || 0}</strong>
      </article>

      <article className="kpi-premium-card">
        <div className="kpi-premium-icon danger">
          <TriangleAlert size={18} />
        </div>
        <span>Suspensos</span>
        <strong>{data.suspensos || 0}</strong>
      </article>

      <article className="kpi-premium-card">
        <div className="kpi-premium-icon info">
          <Tags size={18} />
        </div>
        <span>Categorias Utilizadas</span>
        <strong>{data.categorias_utilizadas || 0}</strong>
      </article>
    </section>
  );
}