import "./DashboardAdmin.css";

export default function DashboardAdmin({ perfil }) {
  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Dashboard do Condomínio</h1>
        <p>
          Bem-vindo, {perfil?.nome || "Administrador"}! Aqui você acompanha a
          gestão do condomínio.
        </p>
      </div>

      <div className="admin-cards">
        <div className="card">
          <strong>Moradores</strong>
          <span>0 cadastrados</span>
        </div>

        <div className="card">
          <strong>Funcionários</strong>
          <span>0 ativos</span>
        </div>

        <div className="card">
          <strong>Encomendas</strong>
          <span>0 pendentes</span>
        </div>

        <div className="card">
          <strong>Notificações</strong>
          <span>0 novas</span>
        </div>
      </div>

      <div className="admin-welcome">
        <h2>Primeiros passos</h2>

        <ul>
          <li>✔ Cadastre os moradores do condomínio</li>
          <li>✔ Cadastre funcionários autorizados</li>
          <li>✔ Configure acessos e permissões</li>
          <li>✔ Comece a registrar encomendas</li>
        </ul>
      </div>
    </div>
  );
}