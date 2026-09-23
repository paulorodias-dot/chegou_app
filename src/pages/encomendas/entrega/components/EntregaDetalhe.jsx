import {
  ArrowLeft,
  Building2,
  Boxes,
  MapPin,
  Package,
  PackageCheck,
  ScanBarcode,
  Truck,
  UserRound,
} from "lucide-react";

import {
  useMemo,
} from "react";

import EntregaHistorico from "./EntregaHistorico";
import EntregaRetirante from "./EntregaRetirante";
import EntregaCredencial from "./EntregaCredencial";
import EntregaConfirmacao from "./EntregaConfirmacao";

import "./EntregaDetalhe.css";


// ============================================================
// SISTEMA CHEGOU!
// CENTRAL DE ENCOMENDAS — ENTREGA
// DETALHE OPERACIONAL
//
// Responsabilidade:
// - exibir contexto oficial retornado pelo backend;
// - permitir selecionar visualmente quem está retirando;
// - apresentar histórico seguro;
// - preparar próxima etapa operacional;
// - apresentar a retirada concluída somente para leitura.
//
// NÃO:
// - inicia retirada;
// - valida Código/QR;
// - conclui entrega;
// - acessa Supabase;
// - inventa permissão;
// - mostra dados técnicos.
// ============================================================


// ============================================================
// STATUS
// ============================================================

function obterStatusVisual(
  status
) {
  switch (status) {
    case "DISPONIVEL_RETIRADA":
      return {
        label:
          "Disponível para retirada",

        classe:
          "entrega-detalhe-status--available",
      };

    case "RETIRADA_AGENDADA":
      return {
        label:
          "Retirada agendada",

        classe:
          "entrega-detalhe-status--scheduled",
      };

    case "EM_RETIRADA":
      return {
        label:
          "Retirada em andamento",

        classe:
          "entrega-detalhe-status--progress",
      };

    case "FINALIZADA":
      return {
        label:
          "Entrega concluída",

        classe:
          "entrega-detalhe-status--finished",
      };

    default:
      return {
        label:
          "Encomenda",

        classe:
          "",
      };
  }
}


// ============================================================
// VOLUMES
// ============================================================

function montarVolumes(
  encomenda
) {
  const conferida =
    Number(
      encomenda
        ?.quantidade_conferida
    );

  if (
    Number.isFinite(
      conferida
    ) &&
    conferida > 0
  ) {
    return conferida === 1
      ? "1 volume conferido"
      : `${conferida} volumes conferidos`;
  }


  const bipada =
    Number(
      encomenda
        ?.quantidade_bipada
    );

  if (
    Number.isFinite(
      bipada
    ) &&
    bipada > 0
  ) {
    return bipada === 1
      ? "1 volume identificado"
      : `${bipada} volumes identificados`;
  }


  const informada =
    Number(
      encomenda
        ?.quantidade_informada
    );

  if (
    Number.isFinite(
      informada
    ) &&
    informada > 0
  ) {
    return informada === 1
      ? "1 volume"
      : `${informada} volumes`;
  }


  return "Quantidade não informada";
}


// ============================================================
// COMPONENTE DE INFORMAÇÃO
// ============================================================

function EntregaDetalheInfo({
  icon: Icon,
  label,
  value,
  destaque = false,
}) {
  return (
    <div
      className={[
        "entrega-detalhe-info",
        destaque
          ? "entrega-detalhe-info--highlight"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >

      <span
        className="entrega-detalhe-info__icon"
        aria-hidden="true"
      >
        <Icon size={16} />
      </span>


      <div className="entrega-detalhe-info__content">

        <span>
          {label}
        </span>

        <strong>
          {value || "Não informado"}
        </strong>

      </div>

    </div>
  );
}


// ============================================================
// COMPONENTE
// ============================================================

export default function EntregaDetalhe({
  detalhe,
  timezoneIana = null,

  retiranteSelecionado = null,
  onSelecionarRetirante,

  retiradaEmAndamento = false,

  metodoCredencial = null,
  codigoCredencial = "",
  identidadeConfirmada = false,
  credencialConfirmada = false,
  resultadoRetirada = null,
  erroOperacao = null,
  mensagemOperacao = null,
  carregandoCredencial = false,

  carregandoConfirmacao = false,
  onConfirmarEntrega,

  onMetodoCredencialChange,
  onCodigoCredencialChange,
  onIdentidadeConfirmadaChange,
  onConferirCodigo,
  onLerQr,
  onOutrasOpcoes,

  onVoltar,
}) {
  const encomenda =
    detalhe?.encomenda ||
    null;

  const residencia =
    detalhe?.residencia ||
    null;

  const destinatario =
    detalhe?.destinatario ||
    null;

  const localizacao =
    detalhe?.localizacao ||
    null;

  const lote =
    detalhe?.lote ||
    null;

  const acoes =
    detalhe?.acoes_permitidas ||
    {};

  const historico =
    Array.isArray(
      detalhe
        ?.historico_retiradas
    )
      ? detalhe.historico_retiradas
      : [];

  const retirantes =
    Array.isArray(
      detalhe
        ?.retirantes_elegiveis
    )
      ? detalhe.retirantes_elegiveis.filter(
          (
            item
          ) =>
            item?.selecionavel ===
            true
        )
      : [];


  // ==========================================================
  // RETIRADA CONCLUÍDA
  //
  // Após a conclusão, a encomenda deixa de apresentar
  // qualquer controle operacional de retirada.
  //
  // Mantemos duas fontes oficiais:
  // - resultado da retirada;
  // - status final da encomenda.
  //
  // Isso também protege a apresentação durante a atualização
  // do detalhe imediatamente após a conclusão.
  // ==========================================================

  const retiradaConcluida =
    resultadoRetirada ===
      "CONCLUIDA" ||
    detalhe?.retirada_atual
      ?.resultado ===
      "CONCLUIDA" ||
    encomenda?.status ===
      "FINALIZADA";


  // ==========================================================
  // STATUS
  // ==========================================================

  const status =
    useMemo(
      () =>
        obterStatusVisual(
          retiradaConcluida
            ? "FINALIZADA"
            : encomenda?.status
        ),
      [
        encomenda?.status,
        retiradaConcluida,
      ]
    );


  // ==========================================================
  // RESIDÊNCIA
  // ==========================================================

  const residenciaTexto =
    useMemo(
      () => {
        const partes =
          [];


        if (
          residencia
            ?.numero
        ) {
          partes.push(
            `Unidade ${residencia.numero}`
          );
        }


        const torreId =
          residencia
            ?.torre
            ?.identificador;

        const torreNome =
          residencia
            ?.torre
            ?.nome;


        if (
          torreId ||
          torreNome
        ) {
          const torre =
            [
              torreId
                ? `Torre ${torreId}`
                : null,

              torreNome ||
              null,
            ]
              .filter(Boolean)
              .join(" • ");

          partes.push(
            torre
          );
        }


        return (
          partes.join(" • ") ||
          "Residência não informada"
        );
      },
      [
        residencia,
      ]
    );


  // ==========================================================
  // RASTREIOS
  // ==========================================================

  const rastreios =
    Array.isArray(
      encomenda?.rastreios
    )
      ? encomenda.rastreios
      : [];


  // ==========================================================
  // TOTAL DE VOLUMES PARA A CONFIRMAÇÃO / RESUMO
  // ==========================================================

  const totalVolumesConfirmacao =
    useMemo(
      () => {
        const candidatos = [
          detalhe?.retirada_atual
            ?.total_volumes_entregues,
          encomenda?.quantidade_conferida,
          encomenda?.quantidade_bipada,
          encomenda?.quantidade_informada,
        ];

        for (
          const valor of candidatos
        ) {
          const numero =
            Number(valor);

          if (
            Number.isFinite(numero) &&
            numero > 0
          ) {
            return numero;
          }
        }

        return 1;
      },
      [
        detalhe?.retirada_atual
          ?.total_volumes_entregues,
        encomenda?.quantidade_conferida,
        encomenda?.quantidade_bipada,
        encomenda?.quantidade_informada,
      ]
    );


  // ==========================================================
  // NOME DE QUEM RETIROU
  //
  // Durante a operação usamos a seleção local.
  // Depois da conclusão, priorizamos o registro oficial.
  // ==========================================================

  const retiranteNome =
    retiradaConcluida
      ? (
          detalhe?.retirada_atual
            ?.retirante_nome_exibicao ||
          retiranteSelecionado?.nome ||
          null
        )
      : (
          retiranteSelecionado?.nome ||
          detalhe?.retirada_atual
            ?.retirante_nome_exibicao ||
          null
        );


  // ==========================================================
  // SEM DETALHE
  // ==========================================================

  if (
    !detalhe ||
    detalhe?.ok !== true ||
    !encomenda
  ) {
    return null;
  }


  return (
    <section
      className={[
        "entrega-detalhe",
        retiradaConcluida
          ? "entrega-detalhe--finished"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby="entrega-detalhe-title"
    >

      {/* =====================================================
          TOPO
      ===================================================== */}

      <header className="entrega-detalhe__header">

        <button
          type="button"
          className="entrega-detalhe__back"
          onClick={
            onVoltar
          }
        >
          <ArrowLeft
            size={17}
            aria-hidden="true"
          />

          <span>
            {retiradaConcluida
              ? "Nova entrega"
              : "Voltar"}
          </span>
        </button>


        <div className="entrega-detalhe__identity">

          <div
            className="entrega-detalhe__package"
            aria-hidden="true"
          >
            {retiradaConcluida ? (
              <PackageCheck size={25} />
            ) : (
              <Package size={25} />
            )}
          </div>


          <div>
            <span className="entrega-detalhe__eyebrow">
              ID Chegou!
            </span>

            <h3 id="entrega-detalhe-title">
              #{encomenda.numero_encomenda}
            </h3>
          </div>

        </div>


        <span
          className={[
            "entrega-detalhe-status",
            status.classe,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {status.label}
        </span>

      </header>


      {/* =====================================================
          PRINCIPAL
      ===================================================== */}

      <div className="entrega-detalhe__grid">

        <EntregaDetalheInfo
          icon={UserRound}
          label="Destinatário"
          value={
            destinatario
              ?.nome_exibicao
          }
        />


        <EntregaDetalheInfo
          icon={Building2}
          label="Residência"
          value={
            residenciaTexto
          }
        />


        <EntregaDetalheInfo
          icon={Truck}
          label="Transportadora"
          value={
            encomenda
              ?.transportadora
          }
        />


        <EntregaDetalheInfo
          icon={PackageCheck}
          label="Volumes"
          value={
            montarVolumes(
              encomenda
            )
          }
        />


        {lote?.referencia ||
         lote?.numero ? (
          <EntregaDetalheInfo
            icon={Boxes}
            label="Lote"
            value={
              lote?.referencia ||
              String(lote.numero)
            }
          />
        ) : null}


        <EntregaDetalheInfo
          icon={MapPin}
          label="Onde está"
          value={
            localizacao?.nome
              ? [
                  localizacao.nome,
                  localizacao.codigo,
                ]
                  .filter(Boolean)
                  .join(" • ")
              : localizacao?.codigo
          }
          destaque
        />

      </div>


      {/* =====================================================
          RASTREIOS
      ===================================================== */}

      {rastreios.length > 0 ? (
        <section className="entrega-detalhe-section">

          <div className="entrega-detalhe-section__heading">

            <ScanBarcode
              size={16}
              aria-hidden="true"
            />

            <div>
              <span>
                Identificação
              </span>

              <h4>
                Rastreio
              </h4>
            </div>

          </div>


          <div className="entrega-detalhe__tracking-list">

            {rastreios.map(
              (
                rastreio
              ) => (
                <span
                  key={rastreio}
                  className="entrega-detalhe__tracking"
                >
                  {rastreio}
                </span>
              )
            )}

          </div>

        </section>
      ) : null}


      {/* =====================================================
          FLUXO OPERACIONAL
          
          Não existe depois que a retirada foi concluída.
      ===================================================== */}

      {!retiradaConcluida ? (
        <>
          {/* =================================================
              QUEM ESTÁ RETIRANDO
          ================================================= */}

          {acoes
            ?.pode_selecionar_retirante &&
          retirantes.length > 0 ? (

            <EntregaRetirante
              retirantes={
                retirantes
              }
              retiranteSelecionado={
                retiranteSelecionado
              }
              onSelecionar={
                onSelecionarRetirante
              }
              desabilitado={
                retiradaEmAndamento
              }
            />

          ) : null}


          {/* =================================================
              CONFERIR RETIRADA
          ================================================= */}

          {retiranteSelecionado &&
          !credencialConfirmada ? (

            <EntregaCredencial
              retiranteSelecionado={
                retiranteSelecionado
              }

              metodo={
                metodoCredencial
              }

              codigo={
                codigoCredencial
              }

              identidadeConfirmada={
                identidadeConfirmada
              }

              carregando={
                carregandoCredencial
              }

              onMetodoChange={
                onMetodoCredencialChange
              }

              onCodigoChange={
                onCodigoCredencialChange
              }

              onIdentidadeConfirmadaChange={
                onIdentidadeConfirmadaChange
              }

              onConferirCodigo={
                onConferirCodigo
              }

              onLerQr={
                onLerQr
              }

              onOutrasOpcoes={
                onOutrasOpcoes
              }
            />

          ) : null}


          {/* =================================================
              CONFIRMAR ENTREGA FÍSICA
          ================================================= */}

          {credencialConfirmada ? (

            <EntregaConfirmacao
              concluida={
                false
              }

              erro={
                erroOperacao?.mensagem ||
                null
              }

              mensagem={
                mensagemOperacao
              }

              retiranteNome={
                retiranteNome
              }

              numeroEncomenda={
                encomenda?.numero_encomenda
              }

              totalVolumes={
                totalVolumesConfirmacao
              }

              carregando={
                carregandoConfirmacao
              }

              onConfirmar={
                onConfirmarEntrega
              }
            />

          ) : null}
        </>
      ) : null}


      {/* =====================================================
          RETIRADA CONCLUÍDA — SOMENTE LEITURA
      ===================================================== */}

      {retiradaConcluida ? (

        <EntregaConfirmacao
          concluida={
            true
          }

          erro={
            null
          }

          mensagem={
            mensagemOperacao ||
            "Esta encomenda já foi entregue."
          }

          retiranteNome={
            retiranteNome
          }

          numeroEncomenda={
            encomenda?.numero_encomenda
          }

          totalVolumes={
            totalVolumesConfirmacao
          }

          carregando={
            false
          }

          onConfirmar={
            undefined
          }
        />

      ) : null}


      {/* =====================================================
          HISTÓRICO
      ===================================================== */}

      <EntregaHistorico
        historico={
          historico
        }
        timezoneIana={
          timezoneIana
        }
      />

    </section>
  );
}