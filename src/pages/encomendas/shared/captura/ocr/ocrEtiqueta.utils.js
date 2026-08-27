// ============================================================
// SISTEMA CHEGOU!
// OCR DE ETIQUETA — UTILITÁRIOS
//
// E3.2-D.5
//
// O OCR produz PISTAS.
// Nunca produz identidade canônica.
// ============================================================

export function limparTextoOCR(
  value
) {
  return String(
    value || ""
  )
    .replace(
      /\r/g,
      "\n"
    )
    .replace(
      /\n{3,}/g,
      "\n\n"
    )
    .replace(
      /[ \t]{2,}/g,
      " "
    )
    .trim();
}

export function normalizarLinhaOCR(
  value
) {
  return String(
    value || ""
  )
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toUpperCase()
    .replace(
      /[^A-Z0-9À-ÿ\s./-]/gi,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function somenteNumeros(
  value
) {
  return String(
    value || ""
  ).replace(
    /\D/g,
    ""
  );
}

// ============================================================
// UNIDADE
// ============================================================

export function extrairUnidadeOCR(
  texto
) {
  const linhas =
    limparTextoOCR(
      texto
    )
      .split("\n")
      .map(
        normalizarLinhaOCR
      )
      .filter(Boolean);

  const padroes =
    [
      /\b(?:AP|APT|APTO|APARTAMENTO|UNIDADE)\s*[:#.-]?\s*([A-Z0-9-]{1,10})\b/i,

      /\b(?:CASA|SALA)\s*[:#.-]?\s*([A-Z0-9-]{1,10})\b/i,
    ];

  for (
    const linha of linhas
  ) {
    for (
      const padrao of padroes
    ) {
      const match =
        linha.match(
          padrao
        );

      if (
        match?.[1]
      ) {
        return {
          valor:
            match[1],

          linha,
        };
      }
    }
  }

  /*
   * Fallback conservador:
   * linha curta exclusivamente numérica.
   *
   * Não usar números longos porque podem ser:
   * - CEP;
   * - rastreio;
   * - telefone;
   * - pedido.
   */
  for (
    const linha of linhas
  ) {
    const numeros =
      somenteNumeros(
        linha
      );

    if (
      numeros &&
      numeros.length >= 1 &&
      numeros.length <= 4 &&
      linha.length <= 8
    ) {
      return {
        valor:
          numeros,

        linha,
      };
    }
  }

  return null;
}

// ============================================================
// TORRE / BLOCO
// ============================================================

export function extrairTorreBlocoOCR(
  texto
) {
  const linhas =
    limparTextoOCR(
      texto
    )
      .split("\n")
      .map(
        normalizarLinhaOCR
      )
      .filter(Boolean);

  const padrao =
    /\b(TORRE|BLOCO|BL|EDIFICIO|EDIFÍCIO)\s*[:#.-]?\s*([A-Z0-9][A-Z0-9\s-]{0,25})/i;

  for (
    const linha of linhas
  ) {
    const match =
      linha.match(
        padrao
      );

    if (
      match?.[2]
    ) {
      return {
        tipo:
          match[1],

        valor:
          String(
            match[2]
          ).trim(),

        linha,
      };
    }
  }

  return null;
}

// ============================================================
// POSSÍVEL NOME
// ============================================================

function linhaPareceCodigo(
  linha
) {
  const compacta =
    linha.replace(
      /\s/g,
      ""
    );

  if (
    compacta.length >= 12 &&
    /^[A-Z0-9-]+$/.test(
      compacta
    )
  ) {
    return true;
  }

  return false;
}

function linhaPareceEndereco(
  linha
) {
  return /\b(RUA|R\.|AV|AVENIDA|ALAMEDA|ESTRADA|RODOVIA|CEP|BAIRRO|BRASIL|SP|RJ|MG|PR|SC|RS)\b/i.test(
    linha
  );
}

function linhaPareceLogistica(
  linha
) {
  return /\b(PEDIDO|ORDER|TRACKING|RASTREIO|SHIP|PACOTE|PACKAGE|REMETENTE|DESTINATARIO|DESTINATÁRIO|AMAZON|MERCADO LIVRE|CORREIOS)\b/i.test(
    linha
  );
}

export function extrairNomeProvavelOCR(
  texto
) {
  const linhas =
    limparTextoOCR(
      texto
    )
      .split("\n")
      .map(
        (linha) => ({
          original:
            linha.trim(),

          normalizada:
            normalizarLinhaOCR(
              linha
            ),
        })
      )
      .filter(
        (item) =>
          item.normalizada
      );

  const candidatos =
    linhas
      .filter(
        ({
          normalizada,
        }) => {
          if (
            normalizada.length <
            5
          ) {
            return false;
          }

          if (
            normalizada.length >
            70
          ) {
            return false;
          }

          if (
            linhaPareceCodigo(
              normalizada
            )
          ) {
            return false;
          }

          if (
            linhaPareceEndereco(
              normalizada
            )
          ) {
            return false;
          }

          if (
            linhaPareceLogistica(
              normalizada
            )
          ) {
            return false;
          }

          /*
           * Nome normalmente possui
           * duas ou mais palavras.
           */
          const palavras =
            normalizada
              .split(" ")
              .filter(Boolean);

          if (
            palavras.length <
            2
          ) {
            return false;
          }

          /*
           * Muito número reduz a chance
           * de ser nome.
           */
          const numeros =
            (
              normalizada.match(
                /\d/g
              ) || []
            ).length;

          return (
            numeros <= 1
          );
        }
      )
      .map(
        (item) => {
          const palavras =
            item.normalizada
              .split(" ")
              .length;

          let score =
            palavras * 10;

          if (
            /^[A-ZÀ-ÿ\s'-]+$/i.test(
              item.normalizada
            )
          ) {
            score += 30;
          }

          return {
            ...item,
            score,
          };
        }
      )
      .sort(
        (a, b) =>
          b.score -
          a.score
      );

  if (
    candidatos.length ===
    0
  ) {
    return null;
  }

  return {
    valor:
      candidatos[0]
        .original,

    linha:
      candidatos[0]
        .normalizada,

    score:
      candidatos[0]
        .score,
  };
}

// ============================================================
// EXTRAÇÃO GERAL
// ============================================================

export function analisarTextoEtiquetaOCR(
  texto
) {
  const textoLimpo =
    limparTextoOCR(
      texto
    );

  return {
    texto:
      textoLimpo,

    nome:
      extrairNomeProvavelOCR(
        textoLimpo
      ),

    torreBloco:
      extrairTorreBlocoOCR(
        textoLimpo
      ),

    unidade:
      extrairUnidadeOCR(
        textoLimpo
      ),
  };
}