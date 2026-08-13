import {
  PackagePlus,
  Plus,
} from "lucide-react";


// ============================================================
// SISTEMA CHEGOU!
// RECEBIMENTO — TOOLBAR
//
// Responsabilidades:
// - iniciar Novo Recebimento;
// - disponibilizar acesso global à Tela de Entrada.
//
// IMPORTANTE:
// O botão Entrada:
// - apenas navega;
// - não seleciona lote;
// - não transporta dados;
// - não altera status;
// - não depende da fila atualmente filtrada.
//
// A contextualização de um lote específico pertence
// às ações da Tabela e do Drawer.
// ============================================================


export default function RecebimentoToolbar({
  onNovoRecebimento,
  onEntrada,
}) {
  return (
    <section
      className="recebimento-toolbar"
      aria-label="Ações do recebimento"
    >
      <div className="recebimento-toolbar__content">
        <h2 className="recebimento-toolbar__title">
          Operação de Recebimento
        </h2>

        <p className="recebimento-toolbar__description">
          Registre novos recebimentos ou acesse a Entrada
          de encomendas.
        </p>
      </div>


      <div className="recebimento-toolbar__actions">
        <button
          type="button"
          className="
            recebimento-toolbar__button
            recebimento-toolbar__button--new
          "
          onClick={
            onNovoRecebimento
          }
        >
          <Plus
            size={17}
            strokeWidth={2.2}
            aria-hidden="true"
          />

          Novo Recebimento
        </button>


        <button
          type="button"
          className="
            recebimento-toolbar__button
            recebimento-toolbar__button--entry
          "
          onClick={
            onEntrada
          }
          title="Ir para Entrada"
        >
          <PackagePlus
            size={17}
            strokeWidth={2.2}
            aria-hidden="true"
          />

          Entrada
        </button>
      </div>
    </section>
  );
}