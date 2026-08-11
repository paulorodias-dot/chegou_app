import { useState } from "react";
import {
  CheckCircle2,
  Info,
  PackageSearch,
  ShoppingBag,
  Truck,
} from "lucide-react";

import RastreioModalShell from "./RastreioModalShell";

const TABS = [
  {
    id: "rastreio",
    label: "Rastreio",
    icon: PackageSearch,
  },
  {
    id: "compra",
    label: "Compra",
    icon: ShoppingBag,
  },
  {
    id: "acompanhamento",
    label: "Acompanhamento",
    icon: Truck,
  },
];

export default function NovoRastreioModal({
  open,
  onClose,
}) {
  const [activeTab, setActiveTab] =
    useState("rastreio");

  const [codigo, setCodigo] = useState("");
  const [descricao, setDescricao] =
    useState("");

  function handleClose() {
    setActiveTab("rastreio");
    setCodigo("");
    setDescricao("");
    onClose?.();
  }

  return (
    <RastreioModalShell
      open={open}
      onClose={handleClose}
      size="large"
      title="Novo Rastreio"
      description="Informe uma compra que você está aguardando."
      footer={
        <>
          <button
            type="button"
            className="rastreio-secondary-button"
            onClick={handleClose}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="rastreio-primary-button"
            disabled
          >
            Salvar rastreio
          </button>
        </>
      }
    >
      <nav
        className="rastreio-modal-tabs"
        aria-label="Etapas do novo rastreio"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              className={`rastreio-modal-tab ${
                active
                  ? "rastreio-modal-tab--active"
                  : ""
              }`}
              aria-current={
                active ? "step" : undefined
              }
              onClick={() =>
                setActiveTab(tab.id)
              }
            >
              <Icon size={17} aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {activeTab === "rastreio" && (
        <div className="rastreio-modal-panel">
          <div className="rastreio-form-section">
            <div className="rastreio-form-section__heading">
              <h3>Identifique sua entrega</h3>

              <p>
                Informe o código exatamente como aparece
                no acompanhamento da sua compra.
              </p>
            </div>

            <label className="rastreio-field">
              <span>Código de rastreio</span>

              <input
                type="text"
                value={codigo}
                onChange={(event) =>
                  setCodigo(event.target.value)
                }
                placeholder="Digite o código de rastreio"
                autoComplete="off"
              />
            </label>

            <div className="rastreio-field">
              <span>Transportadora</span>

              <div className="rastreio-readonly-field">
                Será identificada automaticamente
                quando disponível.
              </div>
            </div>

            <aside className="rastreio-good-practice">
              <Info size={18} aria-hidden="true" />

              <div>
                <strong>Boa prática</strong>

                <p>
                  Você não precisa saber qual é a
                  transportadora. Quando possível, o
                  Sistema Chegou! fará essa identificação
                  para você.
                </p>
              </div>
            </aside>
          </div>
        </div>
      )}

      {activeTab === "compra" && (
        <div className="rastreio-modal-panel">
          <div className="rastreio-form-section">
            <div className="rastreio-form-section__heading">
              <h3>Identifique sua compra</h3>

              <p>
                Esta informação é opcional e serve apenas
                para facilitar sua própria organização.
              </p>
            </div>

            <label className="rastreio-field">
              <span>Nome ou apelido da compra</span>

              <input
                type="text"
                value={descricao}
                onChange={(event) =>
                  setDescricao(event.target.value)
                }
                placeholder="Ex.: Presente, tênis, livro"
                autoComplete="off"
              />

              <small>
                Evite incluir informações pessoais ou
                detalhes desnecessários sobre o conteúdo
                da compra.
              </small>
            </label>

            <aside className="rastreio-good-practice">
              <Info size={18} aria-hidden="true" />

              <div>
                <strong>Privacidade</strong>

                <p>
                  Use apenas uma identificação simples
                  que ajude você a reconhecer a entrega.
                </p>
              </div>
            </aside>
          </div>
        </div>
      )}

      {activeTab === "acompanhamento" && (
        <div className="rastreio-modal-panel">
          <div className="rastreio-integration-preview">
            <div className="rastreio-integration-preview__icon">
              <Truck size={26} aria-hidden="true" />
            </div>

            <div>
              <h3>Acompanhamento da entrega</h3>

              <p>
                Quando o acompanhamento estiver disponível
                para este rastreio, as informações da
                transportadora aparecerão aqui.
              </p>
            </div>
          </div>

          <div className="rastreio-capability-placeholder">
            <CheckCircle2
              size={18}
              aria-hidden="true"
            />

            <div>
              <strong>
                Preparado para acompanhamento integrado
              </strong>

              <p>
                A disponibilidade poderá variar conforme
                a transportadora responsável pela entrega.
              </p>
            </div>
          </div>

          <aside className="rastreio-good-practice">
            <Info size={18} aria-hidden="true" />

            <div>
              <strong>Importante</strong>

              <p>
                A informação de chegada da transportadora
                não significa que a encomenda já esteja
                disponível para retirada na Portaria.
              </p>
            </div>
          </aside>

          <p className="rastreio-integration-note">
            Nesta etapa visual, nenhum acompanhamento
            externo está sendo consultado.
          </p>
        </div>
      )}
    </RastreioModalShell>
  );
}