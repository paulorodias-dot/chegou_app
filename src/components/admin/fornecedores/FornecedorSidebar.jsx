// src/components/admin/fornecedores/FornecedorSidebar.jsx

import { BookOpen, CircleHelp, Info, Megaphone } from "lucide-react";

export default function FornecedorSidebar({ kpis }) {
  const totalFornecedores = kpis?.total_fornecedores || 0;
  const emHomologacao = kpis?.em_homologacao || 0;
  const categoriasUtilizadas = kpis?.categorias_utilizadas || 0;

  return (
    <aside className="cad-fornecedores-sidebar">
      <article className="sidebar-card-premium sidebar-card-info">
        <div className="sidebar-card-title">
          <Info size={18} />
          <h3>Como funciona</h3>
        </div>

        <p>
          O cadastro reúne fornecedores, prestadores e empresas de insumos
          utilizados pelo condomínio.
        </p>

        <p>
          A busca por CPF ou CNPJ consulta primeiro a Base Central do Sistema
          Chegou!. Quando não houver cadastro interno, os dados poderão ser
          preenchidos automaticamente pela consulta externa.
        </p>

        <ul>
          <li>{totalFornecedores} fornecedores cadastrados</li>
          <li>{emHomologacao} em homologação</li>
          <li>{categoriasUtilizadas} categorias utilizadas</li>
        </ul>
      </article>

      <article className="sidebar-card-premium comunicacao-chegou-card">
        <div className="sidebar-card-title">
          <Megaphone size={18} />
          <h3>Painel de Comunicados Chegou!</h3>
        </div>

        <div className="comunicado-preview">
          <strong>Comunicados do Módulo</strong>
          <p>
            Espaço reservado para avisos operacionais, orientações, novidades do
            sistema e comunicados importantes da Equipe Chegou!.
          </p>
        </div>

        <p>
          Este painel será usado para alertas sobre fornecedores, boas práticas,
          atualizações e segurança operacional.
        </p>
      </article>

      <article className="sidebar-card-premium">
        <div className="sidebar-card-title">
          <CircleHelp size={18} />
          <h3>Ajuda e Manual</h3>
        </div>

        <p>
          Consulte orientações de uso, dúvidas comuns e instruções para cadastrar
          fornecedores corretamente.
        </p>

        <div className="sidebar-faq-list">
          <details>
            <summary>Fornecedor é o mesmo que Parceiro?</summary>
            <p>
              Não. Fornecedor é operacional do condomínio. Parceiro pertence ao
              ecossistema comercial, publicidade, campanhas e benefícios.
            </p>
          </details>

          <details>
            <summary>Funcionário pode ver fornecedores?</summary>
            <p>
              Sim. Funcionários podem consultar fornecedores do condomínio para
              uso operacional, mas não podem criar, editar ou inativar.
            </p>
          </details>

          <details>
            <summary>CPF pode ser usado?</summary>
            <p>
              Sim. Prestadores pessoa física podem ser cadastrados por CPF, com
              validação obrigatória antes do cadastro.
            </p>
          </details>
        </div>

        <button type="button" className="btn-manual-premium">
          <BookOpen size={16} />
          Abrir manual
        </button>
      </article>
    </aside>
  );
}