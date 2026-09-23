import {
  AlertTriangle,
  KeyRound,
  LoaderCircle,
  Package,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";

import {
  QRCodeSVG,
} from "qrcode.react";

import "./MoradorRetiradaCredencialModal.css";

const ESTADO = {
  INICIAL: "INICIAL",
  GERANDO: "GERANDO",
  GERADA: "GERADA",
  EXISTENTE: "EXISTENTE",
  REGENERANDO: "REGENERANDO",
  ERRO: "ERRO",
};

const RESULTADO_RETIRADA = {
  INICIADA: "INICIADA",
  VALIDADA: "VALIDADA",
  CONCLUIDA: "CONCLUIDA",
};

function formatarToken(token) {
  if (!token) {
    return "";
  }

  const valor = String(token).trim();

  if (/^\d{6}$/.test(valor)) {
    return `${valor.slice(0, 3)} ${valor.slice(3)}`;
  }

  return valor;
}

function textoDataHora(valor) {
  if (!valor) {
    return "Não informado";
  }

  const texto = String(valor).trim();

  /*
   * Quando o backend já envia a data no horário
   * do condomínio, preservamos esse horário e
   * apenas mudamos sua apresentação.
   *
   * Exemplo:
   * 2026-09-22T03:19:23
   * →
   * 22/09/2026 às 03:19
   */
  const formatoLocal =
    texto.match(
      /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/
    );

  if (formatoLocal) {
    const [
      ,
      ano,
      mes,
      dia,
      hora,
      minuto,
    ] = formatoLocal;

    return `${dia}/${mes}/${ano} às ${hora}:${minuto}`;
  }

  /*
   * Fallback para valores que venham como uma
   * data completa com informação de fuso.
   *
   * Não utilizamos este caminho para os campos
   * *_local recebidos normalmente pelo modal.
   */
  const data = new Date(texto);

  if (Number.isNaN(data.getTime())) {
    return texto;
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  )
    .format(data)
    .replace(",", " às");
}

function metodoFoiQr(metodoValidacao) {
  const metodo =
    String(
      metodoValidacao || ""
    ).toUpperCase();

  return (
    metodo === "QR" ||
    metodo === "QR_CODE" ||
    metodo.includes("QR")
  );
}

function textoCredencialConfirmada(
  metodoValidacao
) {
  return metodoFoiQr(metodoValidacao)
    ? "QR Code confirmado pela Portaria."
    : "Código confirmado pela Portaria.";
}

function InformacoesEncomenda({
  item,
  compacto = false,
}) {
  const possuiRastreio =
    Boolean(item?.codigoRastreio);

  return (
    <div
      className={[
        "morador-retirada-credencial-modal__package",
        compacto ? "is-compact" : "",
      ].filter(Boolean).join(" ")}
    >
      <div>
        <span>ID</span>

        <strong>
          #{item?.numero || "—"}
        </strong>
      </div>

      <div>
        <span>Transportadora</span>

        <strong>
          {item?.transportadora ||
            "Não informada"}
        </strong>
      </div>

      {possuiRastreio ? (
        <div>
          <span>Rastreio</span>

          <strong>
            {item.codigoRastreio}
          </strong>
        </div>
      ) : null}

      {!compacto ? (
        <div>
          <span>Destinatário</span>

          <strong>
            {item?.destinatarioNome ||
              "Não informado"}
          </strong>
        </div>
      ) : null}
    </div>
  );
}

function EstadoInicial({
  item,
  onClose,
  onGerar,
}) {
  return (
    <>
      <div className="morador-retirada-credencial-modal__body">
        <div className="morador-retirada-credencial-modal__intro">
          <div className="morador-retirada-credencial-modal__credential-icons">
            <span aria-hidden="true">
              <KeyRound size={21} />
            </span>

            <span aria-hidden="true">
              <QrCode size={21} />
            </span>
          </div>

          <div>
            <h3>
              Gere sua credencial de retirada
            </h3>

            <p>
              Você receberá um Token e um QR Code
              para apresentar na Portaria.
            </p>
          </div>
        </div>

        <InformacoesEncomenda
          item={item}
        />

        <div className="morador-retirada-credencial-modal__security">
          <ShieldCheck size={18} />

          <p>
            Uso único e válida enquanto a
            encomenda estiver disponível para
            retirada.
          </p>
        </div>
      </div>

      <footer className="morador-retirada-credencial-modal__footer">
        <button
          type="button"
          className="morador-retirada-credencial-modal__secondary"
          onClick={onClose}
        >
          Agora não
        </button>

        <button
          type="button"
          className="morador-retirada-credencial-modal__primary"
          onClick={onGerar}
        >
          <QrCode size={18} />

          <span>
            Gerar Token / QR Code
          </span>
        </button>
      </footer>
    </>
  );
}

function EstadoProcessando({
  item,
  regenerando,
}) {
  return (
    <div className="morador-retirada-credencial-modal__body">
      <InformacoesEncomenda
        item={item}
        compacto
      />

      <div
        className="morador-retirada-credencial-modal__processing"
        role="status"
        aria-live="polite"
      >
        <LoaderCircle
          size={30}
          className="morador-retirada-credencial-modal__spinner"
        />

        <strong>
          {regenerando
            ? "Gerando nova credencial..."
            : "Gerando sua credencial..."}
        </strong>

        <span>
          Aguarde alguns instantes.
        </span>
      </div>
    </div>
  );
}

function CredencialTokenQr({
  credencial,
}) {
  if (
    !credencial?.token ||
    !credencial?.qrPayload
  ) {
    return null;
  }

  return (
    <>
      <div className="morador-retirada-credencial-modal__credential">
        <div className="morador-retirada-credencial-modal__token">
          <span>Token</span>

          <strong>
            {formatarToken(
              credencial.token
            )}
          </strong>

          <small>
            6 dígitos
          </small>
        </div>

        <div className="morador-retirada-credencial-modal__qr">
          <span>QR Code</span>

          <div className="morador-retirada-credencial-modal__qr-box">
            <QRCodeSVG
              value={
                credencial.qrPayload
              }
              size={154}
              level="M"
              marginSize={1}
              title="QR Code para retirada da encomenda"
            />
          </div>
        </div>
      </div>

      <div className="morador-retirada-credencial-modal__validity">
        <ShieldCheck size={16} />

        <span>
          Uso único · válida até a retirada
          da encomenda.
        </span>
      </div>
    </>
  );
}

function EstadoGerado({
  item,
  credencial,
  onClose,
}) {
  return (
    <>
      <div className="morador-retirada-credencial-modal__body is-generated">
        <div className="morador-retirada-credencial-modal__success">
          <ShieldCheck size={19} />

          <div>
            <strong>
              Credencial pronta
            </strong>

            <span>
              Apresente o Token ou o QR Code
              na Portaria.
            </span>
          </div>
        </div>

        <InformacoesEncomenda
          item={item}
          compacto
        />

        <CredencialTokenQr
          credencial={credencial}
        />
      </div>

      <footer className="morador-retirada-credencial-modal__footer">
        <button
          type="button"
          className="morador-retirada-credencial-modal__primary is-full"
          onClick={onClose}
        >
          Fechar
        </button>
      </footer>
    </>
  );
}

function EstadoRetiradaIniciada({
  item,
  credencial,
  retirada,
  onClose,
}) {
  const possuiCredencialVisivel =
    Boolean(
      credencial?.token &&
      credencial?.qrPayload
    );

  return (
    <>
      <div className="morador-retirada-credencial-modal__body is-generated">
        <div
          className="morador-retirada-credencial-modal__success"
          role="status"
          aria-live="polite"
        >
          <Truck size={19} />

          <div>
            <strong>
              Retirada iniciada na Portaria
            </strong>

            <span>
              A Portaria iniciou o atendimento
              desta encomenda.
            </span>
          </div>
        </div>

        <InformacoesEncomenda
          item={item}
          compacto
        />

        {possuiCredencialVisivel ? (
          <CredencialTokenQr
            credencial={credencial}
          />
        ) : (
          <div className="morador-retirada-credencial-modal__security">
            <ShieldCheck size={18} />

            <p>
              A retirada está em andamento na
              Portaria. Aguarde a conferência da
              credencial.
            </p>
          </div>
        )}

        {retirada?.iniciadaEmLocal ? (
          <div className="morador-retirada-credencial-modal__package is-compact">
            <div>
              <span>Retirada iniciada</span>

              <strong>
                {textoDataHora(
                  retirada.iniciadaEmLocal
                )}
              </strong>
            </div>
          </div>
        ) : null}
      </div>

      <footer className="morador-retirada-credencial-modal__footer">
        <button
          type="button"
          className="morador-retirada-credencial-modal__primary is-full"
          onClick={onClose}
        >
          Fechar
        </button>
      </footer>
    </>
  );
}

function EstadoRetiradaValidada({
  item,
  retirada,
  onClose,
}) {
  const mensagemConfirmacao =
    textoCredencialConfirmada(
      retirada?.metodoValidacao
    );

  return (
    <>
      <div className="morador-retirada-credencial-modal__body">
        <div
          className="morador-retirada-credencial-modal__success"
          role="status"
          aria-live="polite"
        >
          <ShieldCheck size={19} />

          <div>
            <strong>
              {mensagemConfirmacao}
            </strong>

            <span>
              Aguardando conclusão da entrega.
            </span>
          </div>
        </div>

        <InformacoesEncomenda
          item={item}
          compacto
        />

        <div className="morador-retirada-credencial-modal__security">
          <Truck size={18} />

          <p>
            A conferência foi concluída pela
            Portaria. Aguarde a entrega da
            encomenda.
          </p>
        </div>

        <div className="morador-retirada-credencial-modal__package is-compact">
          {retirada?.retiranteNome ? (
            <div>
              <span>Retirada por</span>

              <strong>
                {retirada.retiranteNome}
              </strong>
            </div>
          ) : null}

          {retirada?.validadaEmLocal ? (
            <div>
              <span>Credencial confirmada</span>

              <strong>
                {textoDataHora(
                  retirada.validadaEmLocal
                )}
              </strong>
            </div>
          ) : null}

          {retirada?.validadaPorNome ? (
            <div>
              <span>Conferida por</span>

              <strong>
                {retirada.validadaPorNome}
              </strong>
            </div>
          ) : null}
        </div>
      </div>

      <footer className="morador-retirada-credencial-modal__footer">
        <button
          type="button"
          className="morador-retirada-credencial-modal__primary is-full"
          onClick={onClose}
        >
          Fechar
        </button>
      </footer>
    </>
  );
}

function EstadoRetiradaConcluida({
  item,
  retirada,
  onClose,
}) {
  const mensagemConfirmacao =
    textoCredencialConfirmada(
      retirada?.metodoValidacao
    );

  return (
    <>
      <div className="morador-retirada-credencial-modal__body">
        <div
          className="morador-retirada-credencial-modal__success"
          role="status"
          aria-live="polite"
        >
          <ShieldCheck size={19} />

          <div>
            <strong>
              Retirada concluída
            </strong>

            <span>
              A entrega desta encomenda foi
              concluída pela Portaria.
            </span>
          </div>
        </div>

        <InformacoesEncomenda
          item={item}
          compacto
        />

        <div className="morador-retirada-credencial-modal__package">
          <div>
            <span>Retirada por</span>

            <strong>
              {retirada?.retiranteNome ||
                "Não informado"}
            </strong>
          </div>

          <div>
            <span>Concluída em</span>

            <strong>
              {textoDataHora(
                retirada?.concluidaEmLocal ||
                retirada?.concluidaEm
              )}
            </strong>
          </div>

          <div>
            <span>Entregue por</span>

            <strong>
              {retirada?.entreguePorNome ||
                "Não informado"}
            </strong>
          </div>

          <div>
            <span>Volumes entregues</span>

            <strong>
              {retirada?.totalVolumesEntregues ??
                "Não informado"}
            </strong>
          </div>
        </div>

        <div className="morador-retirada-credencial-modal__existing">
          <ShieldCheck size={22} />

          <div>
            <h3>
              Histórico da retirada
            </h3>

            <p>
              Abaixo estão as etapas registradas
              durante esta retirada.
            </p>
          </div>
        </div>

        <div className="morador-retirada-credencial-modal__package">
          {retirada?.iniciadaEmLocal ||
          retirada?.iniciadaEm ? (
            <div>
              <span>
                Retirada iniciada na Portaria
              </span>

              <strong>
                {textoDataHora(
                  retirada?.iniciadaEmLocal ||
                  retirada?.iniciadaEm
                )}
              </strong>
            </div>
          ) : null}

          {retirada?.validadaEmLocal ||
          retirada?.validadaEm ? (
            <div>
              <span>
                {mensagemConfirmacao}
              </span>

              <strong>
                {textoDataHora(
                  retirada?.validadaEmLocal ||
                  retirada?.validadaEm
                )}
              </strong>
            </div>
          ) : null}

          {retirada?.concluidaEmLocal ||
          retirada?.concluidaEm ? (
            <div>
              <span>
                Entrega concluída
              </span>

              <strong>
                {textoDataHora(
                  retirada?.concluidaEmLocal ||
                  retirada?.concluidaEm
                )}
              </strong>
            </div>
          ) : null}
        </div>
      </div>

      <footer className="morador-retirada-credencial-modal__footer">
        <button
          type="button"
          className="morador-retirada-credencial-modal__primary is-full"
          onClick={onClose}
        >
          Fechar
        </button>
      </footer>
    </>
  );
}

function EstadoExistente({
  item,
  onClose,
  onRegenerar,
}) {
  return (
    <>
      <div className="morador-retirada-credencial-modal__body">
        <InformacoesEncomenda
          item={item}
          compacto
        />

        <div className="morador-retirada-credencial-modal__existing">
          <ShieldCheck size={22} />

          <div>
            <h3>
              Já existe uma credencial ativa
            </h3>

            <p>
              Por segurança, o Token e o QR Code
              anteriores não podem ser exibidos
              novamente.
            </p>
          </div>
        </div>

        <div className="morador-retirada-credencial-modal__warning">
          <AlertTriangle size={18} />

          <p>
            Ao gerar uma nova credencial, a
            anterior será invalidada.
          </p>
        </div>
      </div>

      <footer className="morador-retirada-credencial-modal__footer">
        <button
          type="button"
          className="morador-retirada-credencial-modal__secondary"
          onClick={onClose}
        >
          Manter atual
        </button>

        <button
          type="button"
          className="morador-retirada-credencial-modal__primary"
          onClick={onRegenerar}
        >
          <RefreshCw size={17} />

          <span>
            Gerar nova credencial
          </span>
        </button>
      </footer>
    </>
  );
}

function EstadoErro({
  item,
  erro,
  onClose,
  onGerar,
}) {
  return (
    <>
      <div className="morador-retirada-credencial-modal__body">
        <InformacoesEncomenda
          item={item}
          compacto
        />

        <div
          className="morador-retirada-credencial-modal__error"
          role="alert"
        >
          <AlertTriangle size={22} />

          <div>
            <h3>
              Não foi possível gerar a credencial
            </h3>

            <p>
              {erro ||
                "Tente novamente em alguns instantes."}
            </p>
          </div>
        </div>
      </div>

      <footer className="morador-retirada-credencial-modal__footer">
        <button
          type="button"
          className="morador-retirada-credencial-modal__secondary"
          onClick={onClose}
        >
          Fechar
        </button>

        <button
          type="button"
          className="morador-retirada-credencial-modal__primary"
          onClick={onGerar}
        >
          Tentar novamente
        </button>
      </footer>
    </>
  );
}

export default function MoradorRetiradaCredencialModal({
  aberto,
  item,
  estado = ESTADO.INICIAL,
  credencial,
  erro,
  acompanhamento,
  erroAcompanhamento,
  onClose,
  onGerar,
  onRegenerar,
}) {
  if (!aberto || !item) {
    return null;
  }

  const retirada =
    acompanhamento?.retirada || null;

  const resultadoRetirada =
    retirada?.resultado || null;

  const retiradaIniciada =
    resultadoRetirada ===
    RESULTADO_RETIRADA.INICIADA;

  const retiradaValidada =
    resultadoRetirada ===
    RESULTADO_RETIRADA.VALIDADA;

  const retiradaConcluida =
    resultadoRetirada ===
    RESULTADO_RETIRADA.CONCLUIDA;

  const possuiEstadoOficialRetirada =
    retiradaIniciada ||
    retiradaValidada ||
    retiradaConcluida;

  const processando =
    !possuiEstadoOficialRetirada &&
    (
      estado === ESTADO.GERANDO ||
      estado === ESTADO.REGENERANDO
    );

  return (
    <div
      className="morador-retirada-credencial-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !processando
        ) {
          onClose?.();
        }
      }}
    >
      <section
        className="morador-retirada-credencial-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="morador-retirada-credencial-title"
      >
        <header className="morador-retirada-credencial-modal__header">
          <div className="morador-retirada-credencial-modal__heading">
            <span
              className="morador-retirada-credencial-modal__icon"
              aria-hidden="true"
            >
              <Package size={20} />
            </span>

            <div>
              <span>
                Retirada de encomenda
              </span>

              <h2 id="morador-retirada-credencial-title">
                ID #{item.numero || "—"}
              </h2>
            </div>
          </div>

          <button
            type="button"
            className="morador-retirada-credencial-modal__close"
            onClick={onClose}
            disabled={processando}
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </header>

        {retiradaConcluida ? (
          <EstadoRetiradaConcluida
            item={item}
            retirada={retirada}
            onClose={onClose}
          />
        ) : null}

        {retiradaValidada ? (
          <EstadoRetiradaValidada
            item={item}
            retirada={retirada}
            onClose={onClose}
          />
        ) : null}

        {retiradaIniciada ? (
          <EstadoRetiradaIniciada
            item={item}
            credencial={credencial}
            retirada={retirada}
            onClose={onClose}
          />
        ) : null}

        {!possuiEstadoOficialRetirada &&
        estado === ESTADO.INICIAL ? (
          <EstadoInicial
            item={item}
            onClose={onClose}
            onGerar={onGerar}
          />
        ) : null}

        {!possuiEstadoOficialRetirada &&
        estado === ESTADO.GERANDO ? (
          <EstadoProcessando
            item={item}
            regenerando={false}
          />
        ) : null}

        {!possuiEstadoOficialRetirada &&
        estado === ESTADO.REGENERANDO ? (
          <EstadoProcessando
            item={item}
            regenerando
          />
        ) : null}

        {!possuiEstadoOficialRetirada &&
        estado === ESTADO.GERADA ? (
          <EstadoGerado
            item={item}
            credencial={credencial}
            onClose={onClose}
          />
        ) : null}

        {!possuiEstadoOficialRetirada &&
        estado === ESTADO.EXISTENTE ? (
          <EstadoExistente
            item={item}
            onClose={onClose}
            onRegenerar={onRegenerar}
          />
        ) : null}

        {!possuiEstadoOficialRetirada &&
        estado === ESTADO.ERRO ? (
          <EstadoErro
            item={item}
            erro={erro}
            onClose={onClose}
            onGerar={onGerar}
          />
        ) : null}

        {erroAcompanhamento &&
        !possuiEstadoOficialRetirada ? null : null}
      </section>
    </div>
  );
}