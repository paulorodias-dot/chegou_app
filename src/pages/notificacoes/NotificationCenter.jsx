import {
  Bell,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import "./NotificationCenter.css";

export default function NotificationCenter({
  perfil,
  moduleContext,
  onNavigate,
}) {
  return (
    <section
      className="chegou-notification-center-page"
      data-module-context={moduleContext}
    >
      <header className="chegou-notification-center-page__header">
        <div className="chegou-notification-center-page__heading">
          <div
            className="chegou-notification-center-page__heading-icon"
            aria-hidden="true"
          >
            <Bell size={22} />
          </div>

          <div className="chegou-notification-center-page__heading-copy">
            <h1>Central de Notificações</h1>

            <p>
              Acompanhe seus avisos e atualizações em um só lugar.
            </p>
          </div>
        </div>
      </header>

      <div className="chegou-notification-center-page__workspace">
        <div className="chegou-notification-center-page__toolbar">
          <label className="chegou-notification-center-page__search">
            <Search size={18} aria-hidden="true" />

            <input
              type="search"
              placeholder="Buscar notificações"
              aria-label="Buscar notificações"
            />
          </label>

          <button
            type="button"
            className="chegou-notification-center-page__filter-button"
          >
            <SlidersHorizontal
              size={18}
              aria-hidden="true"
            />

            <span>Filtros</span>
          </button>
        </div>

        <nav
          className="chegou-notification-center-page__tabs"
          aria-label="Visualização das notificações"
        >
          <button
            type="button"
            className="
              chegou-notification-center-page__tab
              chegou-notification-center-page__tab--active
            "
          >
            Todas
          </button>

          <button
            type="button"
            className="chegou-notification-center-page__tab"
          >
            Não lidas
          </button>

          <button
            type="button"
            className="chegou-notification-center-page__tab"
          >
            Prioridade
          </button>
        </nav>

        <div className="chegou-notification-center-page__content">
          <div className="chegou-notification-center-page__placeholder">
            <Bell size={22} aria-hidden="true" />

            <div>
              <strong>Central pronta para receber notificações</strong>

              <p>
                Os agrupamentos e notificações serão adicionados
                na próxima etapa do layout.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}