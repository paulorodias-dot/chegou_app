import {
  AlertCircle,
  PackageOpen,
  RefreshCw,
} from "lucide-react";

import "./MoradorRetiradasState.css";

export default function MoradorRetiradasState({
  tipo,
  onRetry,
}) {
  if (tipo === "loading") {
    return (
      <div className="morador-retiradas-state" role="status">
        <RefreshCw className="is-spinning" size={24} />
        <strong>Carregando suas encomendas</strong>
        <span>Aguarde só um instante.</span>
      </div>
    );
  }

  if (tipo === "error") {
    return (
      <div className="morador-retiradas-state is-error" role="alert">
        <AlertCircle size={25} />
        <strong>Não foi possível carregar as encomendas</strong>
        <span>Confira sua conexão e tente novamente.</span>
        <button type="button" onClick={onRetry}>Tentar novamente</button>
      </div>
    );
  }

  return (
    <div className="morador-retiradas-state">
      <PackageOpen size={26} />
      <strong>Nenhuma encomenda encontrada</strong>
      <span>Não há itens para o filtro selecionado.</span>
    </div>
  );
}