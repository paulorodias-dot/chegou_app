import {
  useEffect,
  useState,
} from "react";

import MoradorRetiradaCard from "./components/MoradorRetiradaCard";
import MoradorRetiradaCredencialModal from "./components/MoradorRetiradaCredencialModal";
import MoradorRetiradasHeader from "./components/MoradorRetiradasHeader";
import MoradorRetiradasSidebar from "./components/MoradorRetiradasSidebar";
import MoradorRetiradasState from "./components/MoradorRetiradasState";
import MoradorRetiradasToolbar from "./components/MoradorRetiradasToolbar";

import {
  MORADOR_RETIRADAS_VIEW,
} from "./config/moradorRetiradas.constants";

import useMoradorRetiradaAcompanhamento from "./hooks/useMoradorRetiradaAcompanhamento";
import useMoradorRetiradas from "./hooks/useMoradorRetiradas";

import {
  criarCredencialMoradorRetirada,
  regenerarCredencialMoradorRetirada,
} from "./services/moradorRetiradas.service";

import "./MoradorRetiradas.css";

const CREDENCIAL_ESTADO = {
  INICIAL: "INICIAL",
  GERANDO: "GERANDO",
  GERADA: "GERADA",
  EXISTENTE: "EXISTENTE",
  REGENERANDO: "REGENERANDO",
  ERRO: "ERRO",
};

export default function MoradorRetiradas() {
  const [visualizacao, setVisualizacao] = useState(
    MORADOR_RETIRADAS_VIEW.CARDS
  );

  const [itemCredencial, setItemCredencial] =
    useState(null);

  const [estadoCredencial, setEstadoCredencial] =
    useState(CREDENCIAL_ESTADO.INICIAL);

  const [credencial, setCredencial] =
    useState(null);

  const [erroCredencial, setErroCredencial] =
    useState(null);

  const {
    contexto,
    itens,
    resumo,
    escopo,
    ordem,
    total,
    possuiMais,
    carregando,
    carregandoMais,
    erro,
    alterarEscopo,
    alterarOrdem,
    carregarMais,
    recarregar,
  } = useMoradorRetiradas();

  const {
    acompanhamento,
    expirouJanelaLocal,
    erroAcompanhamento,
  } = useMoradorRetiradaAcompanhamento({
    aberto: Boolean(itemCredencial),
    condominioId:
      contexto?.condominioId || null,
    unidadeId:
      contexto?.unidadeId || null,
    encomendaId:
      itemCredencial?.id || null,
  });

  useEffect(() => {
    if (!expirouJanelaLocal) {
      return;
    }

    /*
     * A janela local de acompanhamento terminou.
     *
     * Isso NÃO cancela a retirada na Portaria,
     * NÃO invalida a credencial no banco e
     * NÃO altera nenhum registro.
     *
     * Apenas descartamos Token/QR mantidos
     * localmente e retornamos o mesmo modal
     * para sua tela inicial.
     */
    setCredencial(null);
    setErroCredencial(null);

    setEstadoCredencial(
      CREDENCIAL_ESTADO.INICIAL
    );
  }, [expirouJanelaLocal]);

  function limparEstadoCredencial() {
    setCredencial(null);
    setErroCredencial(null);
    setEstadoCredencial(
      CREDENCIAL_ESTADO.INICIAL
    );
  }

  function abrirCredencial(item) {
    limparEstadoCredencial();
    setItemCredencial(item);
  }

  function fecharCredencial() {
    /*
     * Token e qr_payload não são persistidos.
     * Ao fechar o modal, descartamos deliberadamente
     * a referência mantida no state React.
     *
     * Como itemCredencial passa a null, o hook de
     * acompanhamento também encerra imediatamente
     * seu ciclo local e não agenda novas consultas.
     */
    setCredencial(null);
    setErroCredencial(null);
    setEstadoCredencial(
      CREDENCIAL_ESTADO.INICIAL
    );
    setItemCredencial(null);
  }

  function montarCredencial(data) {
    return {
      autorizacaoId:
        data?.autorizacao_id || null,

      codigoAmigavel:
        data?.codigo_amigavel || null,

      token:
        data?.token || null,

      qrPayload:
        data?.qr_payload || null,

      usoUnico:
        data?.uso_unico === true,

      validadeModelo:
        data?.validade_modelo || null,
    };
  }

  async function gerarCredencial() {
    if (
      !itemCredencial?.id ||
      !contexto?.condominioId ||
      !contexto?.unidadeId
    ) {
      setErroCredencial(
        "Não foi possível identificar os dados necessários para gerar a credencial."
      );

      setEstadoCredencial(
        CREDENCIAL_ESTADO.ERRO
      );

      return;
    }

    setErroCredencial(null);
    setCredencial(null);

    setEstadoCredencial(
      CREDENCIAL_ESTADO.GERANDO
    );

    try {
      const data =
        await criarCredencialMoradorRetirada({
          condominioId: contexto.condominioId,
          unidadeId: contexto.unidadeId,
          encomendaId: itemCredencial.id,
        });

      if (data?.credencial_ja_existente === true) {
        setEstadoCredencial(
          CREDENCIAL_ESTADO.EXISTENTE
        );

        return;
      }

      if (!data?.token || !data?.qr_payload) {
        throw new Error(
          "A credencial foi criada, mas não foi possível apresentar o Token e o QR Code."
        );
      }

      setCredencial(
        montarCredencial(data)
      );

      setEstadoCredencial(
        CREDENCIAL_ESTADO.GERADA
      );
    } catch (error) {
      setCredencial(null);

      setErroCredencial(
        error?.message ||
          "Não foi possível gerar sua credencial de retirada."
      );

      setEstadoCredencial(
        CREDENCIAL_ESTADO.ERRO
      );
    }
  }

  async function regenerarCredencial() {
    if (
      !itemCredencial?.id ||
      !contexto?.condominioId ||
      !contexto?.unidadeId
    ) {
      setErroCredencial(
        "Não foi possível identificar os dados necessários para gerar uma nova credencial."
      );

      setEstadoCredencial(
        CREDENCIAL_ESTADO.ERRO
      );

      return;
    }

    setErroCredencial(null);
    setCredencial(null);

    setEstadoCredencial(
      CREDENCIAL_ESTADO.REGENERANDO
    );

    try {
      const data =
        await regenerarCredencialMoradorRetirada({
          condominioId: contexto.condominioId,
          unidadeId: contexto.unidadeId,
          encomendaId: itemCredencial.id,
        });

      if (!data?.token || !data?.qr_payload) {
        throw new Error(
          "A nova credencial foi criada, mas não foi possível apresentar o Token e o QR Code."
        );
      }

      setCredencial(
        montarCredencial(data)
      );

      setEstadoCredencial(
        CREDENCIAL_ESTADO.GERADA
      );
    } catch (error) {
      setCredencial(null);

      setErroCredencial(
        error?.message ||
          "Não foi possível gerar uma nova credencial de retirada."
      );

      setEstadoCredencial(
        CREDENCIAL_ESTADO.ERRO
      );
    }
  }

  return (
    <section className="morador-retiradas-page">
      <div className="morador-retiradas-layout">
        <main className="morador-retiradas-main">
          <MoradorRetiradasHeader
            carregando={carregando}
            onRefresh={recarregar}
          />

          <MoradorRetiradasToolbar
            escopo={escopo}
            ordem={ordem}
            visualizacao={visualizacao}
            total={total}
            onChangeScope={alterarEscopo}
            onChangeOrder={alterarOrdem}
            onChangeView={setVisualizacao}
          />

          {carregando ? (
            <MoradorRetiradasState
              tipo="loading"
            />
          ) : erro ? (
            <MoradorRetiradasState
              tipo="error"
              onRetry={recarregar}
            />
          ) : itens.length === 0 ? (
            <MoradorRetiradasState
              tipo="empty"
            />
          ) : (
            <>
              <div
                className={[
                  "morador-retiradas-items",
                  visualizacao ===
                  MORADOR_RETIRADAS_VIEW.LIST
                    ? "is-list"
                    : "is-cards",
                ].join(" ")}
              >
                {itens.map((item) => (
                  <MoradorRetiradaCard
                    key={item.id}
                    item={item}
                    modoLista={
                      visualizacao ===
                      MORADOR_RETIRADAS_VIEW.LIST
                    }
                    onSolicitarRetirada={
                      abrirCredencial
                    }
                  />
                ))}
              </div>

              {possuiMais ? (
                <button
                  type="button"
                  className="morador-retiradas-load-more"
                  onClick={carregarMais}
                  disabled={carregandoMais}
                >
                  {carregandoMais
                    ? "Carregando..."
                    : "Carregar mais"}
                </button>
              ) : null}
            </>
          )}
        </main>

        <aside className="morador-retiradas-sidebar">
          <MoradorRetiradasSidebar
            resumo={resumo}
            contexto={contexto}
          />
        </aside>
      </div>

      <MoradorRetiradaCredencialModal
        aberto={Boolean(itemCredencial)}
        item={itemCredencial}
        estado={estadoCredencial}
        credencial={credencial}
        erro={erroCredencial}
        acompanhamento={acompanhamento}
        erroAcompanhamento={erroAcompanhamento}
        onClose={fecharCredencial}
        onGerar={gerarCredencial}
        onRegenerar={regenerarCredencial}
      />
    </section>
  );
}