import "./DashboardMoradorHeader.css";

export default function DashboardMoradorHeader({
  primeiroNome,
}) {
  return (
    <header className="dashboard-morador-header">
      <span className="dashboard-morador-header__eyebrow">
        Módulo Morador
      </span>

      <h1>
        Início
      </h1>

      <p>
        Olá, {primeiroNome}. Acompanhe sua
        unidade, encomendas, serviços e
        informações importantes do condomínio.
      </p>
    </header>
  );
}