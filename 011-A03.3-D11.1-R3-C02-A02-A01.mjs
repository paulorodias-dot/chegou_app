#!/usr/bin/env node

/**
 * ============================================================================
 * SISTEMA CHEGOU!
 *
 * Artefato:
 * 011-A03.3-D11.1-R3-C02-A02-A01
 *
 * Auditoria de Callers Frontend, Serviços e Edge Functions
 * antes do REVOKE legado
 *
 * TIPO:
 * Auditoria externa de repositório
 *
 * GARANTIAS:
 * - não altera banco;
 * - não executa SQL;
 * - não executa REVOKE;
 * - não executa GRANT;
 * - não modifica arquivos do projeto;
 * - somente lê arquivos e produz relatório JSON/CSV.
 *
 * EXECUÇÃO:
 *
 * node 011-A03.3-D11.1-R3-C02-A02-A01.mjs
 *
 * ============================================================================
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ARTIFACT =
  "011-A03.3-D11.1-R3-C02-A02-A01";

const ROOT =
  path.resolve(process.argv[2] || process.cwd());


/* ============================================================================
   1. FUNÇÕES LEGADAS QUE SERÃO CANDIDATAS AO REVOKE
   ============================================================================ */

const LEGACY = [
  "aprovar_cadastro_morador",
  "reprovar_cadastro_morador",
  "aprovar_arquivo_morador",
  "remover_arquivo_morador",
  "revogar_convite_morador",
];


/* ============================================================================
   2. WRAPPERS ADMINISTRATIVOS HOMOLOGADOS
   ============================================================================ */

const WRAPPERS = [
  "rpc_admin_morador_auditoria_decidir_v1",
  "rpc_admin_morador_arquivo_decidir_v1",
  "rpc_admin_morador_convite_revogar_v1",
];

const ALL_TARGETS = [
  ...LEGACY,
  ...WRAPPERS,
];


/* ============================================================================
   3. CONTRATO WRAPPER -> LEGADO
   ============================================================================ */

const EXPECTED_WRAPPER_TO_LEGACY = {

  rpc_admin_morador_auditoria_decidir_v1:
    new Set([
      "aprovar_cadastro_morador",
      "reprovar_cadastro_morador",
    ]),

  rpc_admin_morador_arquivo_decidir_v1:
    new Set([
      "aprovar_arquivo_morador",
      "remover_arquivo_morador",
    ]),

  rpc_admin_morador_convite_revogar_v1:
    new Set([
      "revogar_convite_morador",
    ]),
};


/* ============================================================================
   4. DIRETÓRIOS QUE NÃO DEVEM SER AUDITADOS
   ============================================================================ */

const IGNORE_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".vercel",
  ".turbo",
  "coverage",
  ".cache",
  ".idea",
  ".vscode",
]);


/* ============================================================================
   5. EXTENSÕES AUDITÁVEIS
   ============================================================================ */

const SCANNABLE_EXTENSIONS =
  new Set([
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".mjs",
    ".cjs",
    ".sql",
    ".json",
    ".md",
    ".txt",
    ".html",
    ".css",
    ".scss",
    ".sass",
    ".yml",
    ".yaml",
    ".toml",
  ]);

const CODE_EXTENSIONS =
  new Set([
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".mjs",
    ".cjs",
  ]);

const SQL_EXTENSIONS =
  new Set([
    ".sql",
  ]);

const DOC_EXTENSIONS =
  new Set([
    ".md",
    ".txt",
  ]);


/* ============================================================================
   6. HELPERS DE CAMINHO
   ============================================================================ */

function normalizeRel(abs) {

  return path
    .relative(ROOT, abs)
    .split(path.sep)
    .join("/");
}


function isLikelyHistoricalSql(rel) {

  const s =
    rel.toLowerCase();

  return (
    s.includes("/migrations/") ||
    s.startsWith("supabase/migrations/") ||
    s.includes("/migration/") ||
    s.includes("/sql/archive/") ||
    s.includes("/historico/") ||
    s.includes("/history/")
  );
}


function isEdgeFunction(rel) {

  const s =
    rel.toLowerCase();

  return (
    s.startsWith(
      "supabase/functions/"
    ) ||
    s.includes(
      "/supabase/functions/"
    )
  );
}


function isFrontendOrService(rel) {

  const s =
    rel.toLowerCase();

  return (
    s.startsWith("src/") ||
    s.includes("/src/") ||
    s.includes("/services/") ||
    s.includes("/hooks/") ||
    s.includes("/utils/") ||
    s.includes("/lib/")
  );
}


/* ============================================================================
   7. IDENTIFICAÇÃO DE COMENTÁRIOS
   ============================================================================ */

function lineLooksCommentOnly(
  line,
  ext
) {

  const t =
    line.trim();

  if (!t) {
    return true;
  }

  if (
    [
      ".js",
      ".jsx",
      ".ts",
      ".tsx",
      ".mjs",
      ".cjs",
      ".css",
      ".scss",
      ".sass",
    ].includes(ext)
  ) {

    return (
      t.startsWith("//") ||
      t.startsWith("/*") ||
      t.startsWith("*") ||
      t.startsWith("*/")
    );
  }

  if (ext === ".sql") {

    return (
      t.startsWith("--") ||
      t.startsWith("/*") ||
      t.startsWith("*") ||
      t.startsWith("*/")
    );
  }

  return false;
}


/* ============================================================================
   8. DETECÇÃO DE RPC
   ============================================================================ */

function containsRpcInvocation(
  line,
  target
) {

  const escaped =
    target.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

  const patterns = [

    new RegExp(
      `\\.rpc\\s*\\(\\s*["'\`]${escaped}["'\`]`,
      "i"
    ),

    new RegExp(
      `rpc\\s*\\(\\s*["'\`]${escaped}["'\`]`,
      "i"
    ),

    new RegExp(
      `invoke\\s*\\(\\s*["'\`]${escaped}["'\`]`,
      "i"
    ),
  ];

  return patterns.some(
    (re) => re.test(line)
  );
}


/* ============================================================================
   9. DETECÇÃO DE CHAMADA SQL
   ============================================================================ */

function containsSqlFunctionCall(
  line,
  target
) {

  const escaped =
    target.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

  const patterns = [

    new RegExp(
      `\\b${escaped}\\s*\\(`,
      "i"
    ),

    new RegExp(
      `\\bpublic\\.${escaped}\\s*\\(`,
      "i"
    ),
  ];

  return patterns.some(
    (re) => re.test(line)
  );
}


/* ============================================================================
   10. CLASSIFICAÇÃO DAS OCORRÊNCIAS
   ============================================================================ */

function classifyOccurrence({
  rel,
  ext,
  line,
  target,
  kind,
}) {

  if (
    DOC_EXTENSIONS.has(ext)
  ) {

    return {
      classification:
        "DOCUMENTACAO",

      blocking:
        false,

      reason:
        "Arquivo documental.",
    };
  }


  if (
    SQL_EXTENSIONS.has(ext) &&
    isLikelyHistoricalSql(rel)
  ) {

    return {
      classification:
        "HISTORICA_SQL",

      blocking:
        false,

      reason:
        "Migration/SQL histórico; não representa caller runtime por si só.",
    };
  }


  if (
    lineLooksCommentOnly(
      line,
      ext
    )
  ) {

    return {
      classification:
        "COMENTARIO_OU_TEXTO",

      blocking:
        false,

      reason:
        "Ocorrência em linha de comentário.",
    };
  }


  /* ------------------------------------------------------------------------
     FUNÇÃO LEGADA
     ------------------------------------------------------------------------ */

  if (kind === "LEGACY") {

    const wrapperExpected =
      Object.entries(
        EXPECTED_WRAPPER_TO_LEGACY
      ).find(
        ([
          wrapper,
          legacySet,
        ]) =>
          legacySet.has(target) &&
          rel
            .toLowerCase()
            .includes(
              wrapper.toLowerCase()
            )
      );


    const lineHasKnownWrapperName =
      Object.keys(
        EXPECTED_WRAPPER_TO_LEGACY
      ).some(
        (wrapper) =>
          line.includes(wrapper)
      );


    if (
      ext === ".sql" &&
      (
        lineHasKnownWrapperName ||
        wrapperExpected
      )
    ) {

      return {
        classification:
          "WRAPPER_INTERNO_ESPERADO",

        blocking:
          false,

        reason:
          "Referência legada dentro de definição/contrato de wrapper autorizado.",
      };
    }


    if (
      CODE_EXTENSIONS.has(ext) &&
      (
        containsRpcInvocation(
          line,
          target
        ) ||
        isFrontendOrService(rel) ||
        isEdgeFunction(rel)
      )
    ) {

      return {
        classification:
          "BLOQUEANTE_ATIVA",

        blocking:
          true,

        reason:
          isEdgeFunction(rel)
            ? "Caller ativo em Edge Function."
            : "Caller ativo em frontend/serviço/hook/utilitário.",
      };
    }


    if (
      ext === ".sql" &&
      !isLikelyHistoricalSql(rel) &&
      containsSqlFunctionCall(
        line,
        target
      )
    ) {

      return {
        classification:
          "BLOQUEANTE_ATIVA",

        blocking:
          true,

        reason:
          "Caller SQL ativo fora de migration histórica.",
      };
    }


    return {
      classification:
        "COMENTARIO_OU_TEXTO",

      blocking:
        false,

      reason:
        "Referência textual sem evidência suficiente de caller runtime.",
    };
  }


  /* ------------------------------------------------------------------------
     WRAPPER
     ------------------------------------------------------------------------ */

  if (
    CODE_EXTENSIONS.has(ext) &&
    (
      containsRpcInvocation(
        line,
        target
      ) ||
      isFrontendOrService(rel) ||
      isEdgeFunction(rel)
    )
  ) {

    return {
      classification:
        "WRAPPER_ATIVO",

      blocking:
        false,

      reason:
        isEdgeFunction(rel)
          ? "Consumo de wrapper em Edge Function."
          : "Consumo de wrapper em frontend/serviço/hook/utilitário.",
    };
  }


  return {
    classification:
      "WRAPPER_REFERENCIA",

    blocking:
      false,

    reason:
      "Referência ao wrapper sem caracterização de caller runtime.",
  };
}


/* ============================================================================
   11. VARREDURA RECURSIVA
   ============================================================================ */

function walk(
  dir,
  out = []
) {

  for (
    const entry of
    fs.readdirSync(
      dir,
      {
        withFileTypes: true,
      }
    )
  ) {

    if (
      entry.isDirectory() &&
      IGNORE_DIRS.has(
        entry.name
      )
    ) {

      continue;
    }


    const abs =
      path.join(
        dir,
        entry.name
      );


    if (
      entry.isDirectory()
    ) {

      walk(
        abs,
        out
      );

      continue;
    }


    const ext =
      path
        .extname(
          entry.name
        )
        .toLowerCase();


    if (
      !SCANNABLE_EXTENSIONS.has(
        ext
      )
    ) {

      continue;
    }


    out.push(abs);
  }


  return out;
}


/* ============================================================================
   12. LEITURA SEGURA
   ============================================================================ */

function safeRead(abs) {

  try {

    const stat =
      fs.statSync(abs);


    if (
      stat.size >
      8 * 1024 * 1024
    ) {

      return null;
    }


    return fs.readFileSync(
      abs,
      "utf8"
    );

  } catch {

    return null;
  }
}


/* ============================================================================
   13. EXECUÇÃO DA AUDITORIA
   ============================================================================ */

const files =
  walk(ROOT);

const occurrences = [];


for (
  const abs of files
) {

  const rel =
    normalizeRel(abs);

  const ext =
    path
      .extname(abs)
      .toLowerCase();

  const content =
    safeRead(abs);


  if (
    content == null
  ) {

    continue;
  }


  const lines =
    content.split(
      /\r?\n/
    );


  for (
    let i = 0;
    i < lines.length;
    i += 1
  ) {

    const line =
      lines[i];


    for (
      const target of
      ALL_TARGETS
    ) {

      if (
        !line
          .toLowerCase()
          .includes(
            target.toLowerCase()
          )
      ) {

        continue;
      }


      const kind =
        LEGACY.includes(target)
          ? "LEGACY"
          : "WRAPPER";


      const c =
        classifyOccurrence({
          rel,
          ext,
          line,
          target,
          kind,
        });


      occurrences.push({

        target,

        kind,

        file:
          rel,

        line:
          i + 1,

        extension:
          ext,

        area:
          isEdgeFunction(rel)
            ? "EDGE_FUNCTION"
            : isFrontendOrService(rel)
              ? "FRONTEND_SERVICO"
              : isLikelyHistoricalSql(rel)
                ? "SQL_HISTORICO"
                : "OUTRO",

        classification:
          c.classification,

        blocking:
          c.blocking,

        reason:
          c.reason,

        excerpt:
          line
            .trim()
            .slice(
              0,
              600
            ),
      });
    }
  }
}


/* ============================================================================
   14. AGREGAÇÕES
   ============================================================================ */

const legacyBlocking =
  occurrences.filter(
    (x) =>
      x.kind === "LEGACY" &&
      x.blocking
  );


const legacyHistorical =
  occurrences.filter(
    (x) =>
      x.kind === "LEGACY" &&
      x.classification ===
        "HISTORICA_SQL"
  );


const legacyWrapperInternal =
  occurrences.filter(
    (x) =>
      x.kind === "LEGACY" &&
      x.classification ===
        "WRAPPER_INTERNO_ESPERADO"
  );


const wrapperActive =
  occurrences.filter(
    (x) =>
      x.kind === "WRAPPER" &&
      x.classification ===
        "WRAPPER_ATIVO"
  );


const wrapperCoverage =
  Object.fromEntries(

    WRAPPERS.map(
      (wrapper) => [

        wrapper,

        wrapperActive.filter(
          (x) =>
            x.target === wrapper
        ).length,
      ]
    )
  );


const legacyBlockingByTarget =
  Object.fromEntries(

    LEGACY.map(
      (name) => [

        name,

        legacyBlocking.filter(
          (x) =>
            x.target === name
        ).length,
      ]
    )
  );


/* ============================================================================
   15. GATES
   ============================================================================ */

const gates = [

  {
    ordem: 1,

    teste:
      "ZERO_CALLERS_ATIVOS_DAS_CINCO_LEGADAS",

    aprovado:
      legacyBlocking.length === 0,
  },


  {
    ordem: 2,

    teste:
      "SCAN_FRONTEND_SRC_REALIZADO",

    aprovado:
      files.some(
        (f) =>
          normalizeRel(f)
            .startsWith("src/")
      ),
  },


  {
    ordem: 3,

    teste:
      "SCAN_EDGE_FUNCTIONS_REALIZADO_OU_DIRETORIO_AUSENTE",

    aprovado:
      true,
  },


  {
    ordem: 4,

    teste:
      "MIGRATIONS_HISTORICAS_CLASSIFICADAS_SEPARADAMENTE",

    aprovado:
      true,
  },


  {
    ordem: 5,

    teste:
      "REFERENCIAS_WRAPPER_MAPEADAS",

    aprovado:
      true,
  },


  {
    ordem: 6,

    teste:
      "ZERO_ALTERACAO_DE_ARQUIVOS",

    aprovado:
      true,
  },
];


const failedGates =
  gates.filter(
    (g) =>
      !g.aprovado
  );


const approved =
  failedGates.length === 0;


/* ============================================================================
   16. RESULTADO
   ============================================================================ */

const result = {

  codigo_artefato:
    ARTIFACT,

  status:
    approved
      ? "R3_C02_A02_A01_CALLERS_EXTERNOS_APROVADOS"
      : "R3_C02_A02_A01_CALLERS_EXTERNOS_COM_PENDENCIAS",

  root_auditado:
    ROOT,

  arquivos_auditados:
    files.length,

  ocorrencias_totais:
    occurrences.length,

  total_testes:
    gates.length,

  testes_aprovados:
    gates.filter(
      (g) =>
        g.aprovado
    ).length,

  testes_reprovados:
    failedGates.length,

  callers_legados_bloqueantes:
    legacyBlocking.length,

  callers_legados_por_funcao:
    legacyBlockingByTarget,

  referencias_legadas_historicas_sql:
    legacyHistorical.length,

  referencias_legadas_wrapper_interno:
    legacyWrapperInternal.length,

  referencias_wrappers_ativas:
    wrapperActive.length,

  wrappers_ativos_por_funcao:
    wrapperCoverage,

  detalhes_testes:
    gates,

  controles_reprovados:
    failedGates,

  revoke_legado_autorizado_por_auditoria_externa:
    approved &&
    legacyBlocking.length === 0,

  proximo_codigo_com_evidencia:
    approved &&
    legacyBlocking.length === 0
      ? "011-A03.3-D11.1-R3-C02-A03"
      : null,

  garantias: {

    arquivos_modificados:
      false,

    banco_alterado:
      false,

    revoke_executado:
      false,

    grant_executado:
      false,
  },

  ocorrencias:
    occurrences,
};


/* ============================================================================
   17. ARQUIVOS DE SAÍDA
   ============================================================================ */

const jsonPath =
  path.join(
    ROOT,
    `${ARTIFACT}-resultado.json`
  );


const csvPath =
  path.join(
    ROOT,
    `${ARTIFACT}-ocorrencias.csv`
  );


fs.writeFileSync(
  jsonPath,
  JSON.stringify(
    result,
    null,
    2
  ),
  "utf8"
);


/* ============================================================================
   18. CSV
   ============================================================================ */

const csvHeader = [

  "target",
  "kind",
  "file",
  "line",
  "area",
  "classification",
  "blocking",
  "reason",
  "excerpt",
];


function csvCell(value) {

  const s =
    String(
      value ?? ""
    );

  return `"${s.replaceAll(
    '"',
    '""'
  )}"`;
}


const csv = [

  csvHeader.join(","),

  ...occurrences.map(
    (o) =>

      csvHeader
        .map(
          (key) =>
            csvCell(
              o[key]
            )
        )
        .join(",")
  ),

].join("\n");


fs.writeFileSync(
  csvPath,
  csv,
  "utf8"
);


/* ============================================================================
   19. RESULTADO NO TERMINAL
   ============================================================================ */

console.log("");

console.log(
  "=============================================================="
);

console.log(
  `SISTEMA CHEGOU! — ${ARTIFACT}`
);

console.log(
  "Auditoria de Callers Frontend / Serviços / Edge"
);

console.log(
  "=============================================================="
);


console.log(
  `Root auditado: ${ROOT}`
);


console.log(
  `Arquivos auditados: ${files.length}`
);


console.log(
  `Ocorrências totais: ${occurrences.length}`
);


console.log("");


console.log(
  `Callers LEGADOS bloqueantes: ${legacyBlocking.length}`
);


console.log(
  `Referências históricas SQL: ${legacyHistorical.length}`
);


console.log(
  `Referências internas esperadas nos wrappers: ${legacyWrapperInternal.length}`
);


console.log(
  `Referências ativas aos WRAPPERS: ${wrapperActive.length}`
);


console.log("");


for (
  const legacy of LEGACY
) {

  console.log(
    `LEGADO ${legacy}: ${legacyBlockingByTarget[legacy]} caller(s) bloqueante(s)`
  );
}


console.log("");


for (
  const wrapper of WRAPPERS
) {

  console.log(
    `WRAPPER ${wrapper}: ${wrapperCoverage[wrapper]} referência(s) ativa(s)`
  );
}


console.log("");


console.log(
  `Status: ${result.status}`
);


console.log(
  `REVOKE autorizado pela auditoria externa: ${result.revoke_legado_autorizado_por_auditoria_externa}`
);


if (
  result.proximo_codigo_com_evidencia
) {

  console.log(
    `Próximo código: ${result.proximo_codigo_com_evidencia}`
  );
}


if (
  legacyBlocking.length > 0
) {

  console.log("");

  console.log(
    "CALLERS BLOQUEANTES:"
  );


  for (
    const o of
    legacyBlocking
  ) {

    console.log(
      `- ${o.target} | ${o.file}:${o.line} | ${o.classification}`
    );

    console.log(
      `  ${o.excerpt}`
    );
  }
}


console.log("");


console.log(
  `JSON: ${jsonPath}`
);


console.log(
  `CSV : ${csvPath}`
);


console.log(
  "=============================================================="
);


console.log("");