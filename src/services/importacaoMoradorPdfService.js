import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/* =========================================================
   HELPERS GERAIS
========================================================= */

function somenteNumeros(valor = "") {
  return String(valor || "").replace(/\D/g, "");
}

function normalizarTexto(valor = "") {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function normalizarEmail(valor = "") {
  return String(valor || "").trim().toLowerCase();
}

function normalizarUnidade(valor = "") {
  const texto = String(valor || "").trim().toUpperCase();

  if (!texto) return "";

  const match = texto.match(/^0*([0-9]+)([A-Z]*)$/);

  if (!match) return texto;

  return `${Number(match[1])}${match[2] || ""}`;
}

function obterDddPadrao(condominio = {}) {
  const uf = normalizarTexto(
    condominio.uf ||
      condominio.estado ||
      condominio.endereco_estado ||
      condominio.dados_endereco?.uf
  );

  const cidade = normalizarTexto(
    condominio.cidade ||
      condominio.endereco_cidade ||
      condominio.dados_endereco?.cidade
  );

  if (uf === "SP" || cidade.includes("SAO PAULO")) return "11";
  if (uf === "RJ" || cidade.includes("RIO DE JANEIRO")) return "21";
  if (uf === "BA" || cidade.includes("SALVADOR")) return "71";

  return "11";
}

/* =========================================================
   TORRE / UNIDADE
========================================================= */

function localizarTorrePorBloco(torres = [], blocoPdf = "", nomeTorrePdf = "") {
  const alvoBloco = normalizarTexto(blocoPdf);
  const alvoNome = normalizarTexto(nomeTorrePdf);

  return (
    torres.find((torre) => {
      const nome = normalizarTexto(torre.nome);
      const identificador = normalizarTexto(torre.identificador);

      return (
        identificador === alvoBloco ||
        nome === alvoBloco ||
        nome === alvoNome ||
        identificador === alvoNome
      );
    }) || null
  );
}

function localizarUnidadeOficial(unidades = [], torre = null, unidadePdf = "") {
  const unidadeNormalizada = normalizarUnidade(unidadePdf);

  const candidatas = torre?.id
    ? unidades.filter((unidade) => unidade.torre_id === torre.id)
    : unidades;

  return (
    candidatas.find((unidade) => {
      const numeroOficial = normalizarUnidade(unidade.numero);
      return numeroOficial === unidadeNormalizada;
    }) || null
  );
}

/* =========================================================
   CONTATOS
========================================================= */

function formatarTelefonePdf(valor = "", dddPadrao = "11") {
  const numeros = somenteNumeros(valor);

  if (!numeros) return "";

  if (numeros.length === 8 || numeros.length === 9) {
    return `+55${dddPadrao}${numeros}`;
  }

  if (numeros.length === 10 || numeros.length === 11) {
    return `+55${numeros}`;
  }

  if (numeros.startsWith("55") && numeros.length >= 12) {
    return `+${numeros}`;
  }

  return numeros;
}

function extrairEmailTexto(texto = "") {
  const match = String(texto).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);

  if (!match) return null;

  return normalizarEmail(match[0]);
}

function limparObservacaoContato(texto = "", valorContato = "") {
  return String(texto || "")
    .replace(/E-mail:/i, "")
    .replace(/Celular:/i, "")
    .replace(/Telefone residencial:/i, "")
    .replace(/Telefone comercial:/i, "")
    .replace(valorContato, "")
    .replace(/^[-:\s]+/, "")
    .trim();
}

function montarEmailOpcao(linha = "", observacaoExtra = "") {
  const email = extrairEmailTexto(linha);

  if (!email) return null;

  const observacao =
    limparObservacaoContato(linha, email) ||
    String(observacaoExtra || "").replace(/^-\s*/, "").trim() ||
    null;

  return {
    valor: email,
    observacao,
    bloqueado_sugerido: /NAO HABILITAR|NÃO HABILITAR|NAO USAR|NÃO USAR/i.test(
      observacao || ""
    ),
    linha_original: linha,
  };
}

function montarTelefoneOpcao(linha = "", dddPadrao = "11", observacaoExtra = "") {
  const ehTelefone =
    /Celular:/i.test(linha) ||
    /Telefone residencial:/i.test(linha) ||
    /Telefone comercial:/i.test(linha);

  if (!ehTelefone) return null;

  const tipo = /Celular:/i.test(linha)
    ? "celular"
    : /Telefone residencial:/i.test(linha)
      ? "residencial"
      : "comercial";

  const textoLimpo = linha
    .replace(/Cliente:/i, "")
    .replace(/Celular:/i, "")
    .replace(/Telefone residencial:/i, "")
    .replace(/Telefone comercial:/i, "")
    .trim();

  const partes = textoLimpo.split(" - ");
  const numeroTexto = partes[0] || "";

  const observacao =
    partes.slice(1).join(" - ").trim() ||
    String(observacaoExtra || "").replace(/^-\s*/, "").trim() ||
    null;

  const telefone = formatarTelefonePdf(numeroTexto, dddPadrao);

  if (!telefone) return null;

  return {
    valor: telefone,
    tipo,
    observacao,
    bloqueado_sugerido: false,
    linha_original: linha,
  };
}

function escolherEmailPrincipal(emails = [], nomeMorador = "") {
  if (!emails.length) return null;

  const nomeNormalizado = normalizarTexto(nomeMorador);
  const habilitados = emails.filter((email) => !email.bloqueado_sugerido);

  const porNome = habilitados.find((email) =>
    normalizarTexto(email.observacao).includes(nomeNormalizado)
  );

  return porNome || habilitados[0] || emails[0];
}

function escolherTelefonePrincipal(telefones = [], nomeMorador = "") {
  if (!telefones.length) return null;

  const nomeNormalizado = normalizarTexto(nomeMorador);
  const celulares = telefones.filter((telefone) => telefone.tipo === "celular");

  const porNome = celulares.find((telefone) =>
    normalizarTexto(telefone.observacao).includes(nomeNormalizado)
  );

  return porNome || celulares[0] || telefones[0];
}

/* =========================================================
   MODELO A — PDF ADMINISTRADORA
   Formato:
   Bloco
   Código administradora
   Unidade
   Nome
========================================================= */

function ehBlocoPdf(linha = "") {
  return /^[A-Z0-9]{1,3}$/i.test(String(linha).trim());
}

function ehCodigoAdministradora(linha = "") {
  return /^[0-9]{4,9}$/i.test(String(linha).trim());
}

function ehUnidadePdf(linha = "") {
  return /^[0-9]{2,6}[A-Z]?$/i.test(String(linha).trim());
}

function ehNomeMoradorPdf(linha = "") {
  const texto = String(linha || "").trim();

  if (!texto) return false;
  if (texto.includes("@")) return false;

  if (
    /^(Cliente:|Celular:|Telefone|E-mail:|Condomínio:|CNPJ:|Bloco|Unidade|Nome|Agenda)/i.test(
      texto
    )
  ) {
    return false;
  }

  return /[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{2,}/i.test(texto) && texto.length >= 5;
}

function parseRegistroAdministradoraPorLinhas(linhas = [], index = 0) {
  const bloco = linhas[index];
  const codigoAdministradora = linhas[index + 1];
  const unidade = linhas[index + 2];
  const nome = linhas[index + 3];

  if (
    ehBlocoPdf(bloco) &&
    ehCodigoAdministradora(codigoAdministradora) &&
    ehUnidadePdf(unidade) &&
    ehNomeMoradorPdf(nome)
  ) {
    return {
      registro: {
        modelo_pdf: "ADMINISTRADORA_LINHAS",
        bloco_pdf: String(bloco).trim(),
        nome_torre_pdf: "",
        unidade_pdf: String(unidade).trim(),
        codigo_administradora: String(codigoAdministradora).trim(),
        nome: String(nome).trim().replace(/\s+Cliente:\s*$/i, ""),
        linha_original: [bloco, codigoAdministradora, unidade, nome].join(" | "),
      },
      proximoIndex: index + 4,
    };
  }

  return null;
}

/* =========================================================
   MODELO B/C — PDF TABELA / PLANILHA EM PDF
========================================================= */

function linhaPossuiCabecalhoTabela(linha = "") {
  const texto = normalizarTexto(linha);

  return (
    texto.includes("TORRE/BLOCO") &&
    texto.includes("NOME TORRE/BLOCO") &&
    texto.includes("UNIDADE") &&
    texto.includes("NOME COMPLETO")
  );
}

function parseLinhaTabelaPrincipal(linha = "") {
  const texto = String(linha || "").trim();

  const regex =
    /^([A-Z0-9]+)\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9\s.-]+?)\s+([A-Z0-9]+)\s+(.+?)\s+(\+?55|55|\+\d{1,3})\s+(.+)$/i;

  const match = texto.match(regex);

  if (!match) return null;

  const [, bloco, nomeTorre, unidade, nome, ddi, telefone] = match;

  return {
    modelo_pdf: "TABELA_PDF",
    bloco_pdf: bloco.trim(),
    nome_torre_pdf: nomeTorre.trim(),
    unidade_pdf: unidade.trim(),
    codigo_administradora: null,
    nome: nome.trim(),
    ddi: ddi.trim(),
    telefone: telefone.trim(),
    linha_original: linha,
  };
}

function parseLinhaEmailObservacao(linha = "") {
  const email = extrairEmailTexto(linha);

  if (!email) return null;

  const observacao = String(linha || "")
    .replace(email, "")
    .replace(/^[-:\s]+/, "")
    .trim();

  return {
    email,
    observacao: observacao || null,
  };
}

function extrairModeloTabelaPdf(paginasTexto = []) {
  const todasLinhas = paginasTexto.flatMap((pagina) => pagina.linhas);
  const temCabecalho = todasLinhas.some(linhaPossuiCabecalhoTabela);

  if (!temCabecalho) return [];

  const principais = [];
  const contatos = [];

  todasLinhas.forEach((linha) => {
    const registro = parseLinhaTabelaPrincipal(linha);

    if (registro) {
      principais.push(registro);
      return;
    }

    const contato = parseLinhaEmailObservacao(linha);

    if (contato) {
      contatos.push(contato);
    }
  });

  return principais.map((registro, index) => ({
    registro,
    contatosTabela: contatos[index] ? [contatos[index]] : [],
    contatos: [],
    linhaNumero: index + 2,
  }));
}

/* =========================================================
   CONTATOS ADMINISTRADORA
========================================================= */

function montarContatosComObservacoes(contatos = [], dddPadrao = "11") {
  const emails = [];
  const telefones = [];

  for (let i = 0; i < contatos.length; i += 1) {
    const linha = contatos[i];
    const proximaLinha = contatos[i + 1];

    const observacaoExtra = /^-\s+/.test(proximaLinha || "") ? proximaLinha : "";

    const email = montarEmailOpcao(linha, observacaoExtra);
    if (email) emails.push(email);

    const telefone = montarTelefoneOpcao(linha, dddPadrao, observacaoExtra);
    if (telefone) telefones.push(telefone);
  }

  return { emails, telefones };
}

/* =========================================================
   MONTAGEM FINAL PARA REUSAR IMPORTAÇÃO XLSX
========================================================= */

function montarLinhaImportacao({
  registro,
  contatos = [],
  contatosTabela = [],
  torres,
  unidades,
  condominio,
  linhaNumero,
}) {
  const dddPadrao = obterDddPadrao(condominio);

  const torre = localizarTorrePorBloco(
    torres,
    registro.bloco_pdf,
    registro.nome_torre_pdf
  );

  const unidadeOficial = localizarUnidadeOficial(
    unidades,
    torre,
    registro.unidade_pdf
  );

  const contatosProcessados = montarContatosComObservacoes(contatos, dddPadrao);

  const emailsTabela = contatosTabela
    .map((contato) =>
      contato?.email
        ? {
            valor: contato.email,
            observacao: contato.observacao || null,
            bloqueado_sugerido: false,
            linha_original: contato.email,
          }
        : null
    )
    .filter(Boolean);

  const telefonesTabela = registro.telefone
    ? [
        {
          valor: formatarTelefonePdf(registro.telefone, dddPadrao),
          tipo: "celular",
          observacao: "Telefone informado na tabela PDF",
          bloqueado_sugerido: false,
          linha_original: registro.telefone,
        },
      ]
    : [];

  const emails = [...contatosProcessados.emails, ...emailsTabela];
  const telefones = [...contatosProcessados.telefones, ...telefonesTabela];

  const emailPrincipal = escolherEmailPrincipal(emails, registro.nome);
  const telefonePrincipal = escolherTelefonePrincipal(telefones, registro.nome);

  const pendencias = [];

  if (!torre) pendencias.push("TORRE_NAO_ENCONTRADA");
  if (!unidadeOficial) pendencias.push("UNIDADE_NAO_ENCONTRADA");
  if (!emailPrincipal) pendencias.push("EMAIL_NAO_IDENTIFICADO");
  if (!telefonePrincipal) pendencias.push("TELEFONE_NAO_IDENTIFICADO");

  return {
    linha: linhaNumero,
    "Torre/Bloco": registro.bloco_pdf,
    "Nome Torre/Bloco": torre?.nome || registro.nome_torre_pdf || "",
    Unidade: unidadeOficial?.numero || normalizarUnidade(registro.unidade_pdf),
    "Nome Completo do Responsável": registro.nome,
    DDI: "+55",
    "DDD + Número": telefonePrincipal?.valor || "",
    "E-mail": emailPrincipal?.valor || "",
    Observações: pendencias.length
      ? `PDF: ${pendencias.join(", ")}`
      : "Importado via PDF",

    dados_pdf: {
      modelo_pdf: registro.modelo_pdf,
      bloco_pdf: registro.bloco_pdf,
      nome_torre_pdf: registro.nome_torre_pdf || null,
      unidade_pdf: registro.unidade_pdf,
      codigo_administradora: registro.codigo_administradora || null,

      unidade_oficial_id: unidadeOficial?.id || null,
      unidade_oficial_numero: unidadeOficial?.numero || null,

      torre_id: torre?.id || null,
      torre_nome: torre?.nome || null,
      torre_identificador: torre?.identificador || null,

      emails_encontrados: emails,
      telefones_encontrados: telefones,
      email_principal: emailPrincipal,
      telefone_principal: telefonePrincipal,

      pendencias,
      linha_original: registro.linha_original,
    },
  };
}

/* =========================================================
   EXTRAÇÃO PRINCIPAL
========================================================= */

export async function extrairMoradoresDePdf({
  arquivo,
  condominio,
  torres = [],
  unidades = [],
}) {
  if (!arquivo) {
    throw new Error("Arquivo PDF não informado.");
  }

  const buffer = await arquivo.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const paginasTexto = [];
  const linhasTexto = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    const textoPagina = content.items
      .map((item) => item.str)
      .join("\n")
      .split("\n")
      .map((linha) => linha.trim())
      .filter(Boolean);

    paginasTexto.push({
      pagina: pageNumber,
      linhas: textoPagina,
    });

    linhasTexto.push(...textoPagina);
  }

  let registros = extrairModeloTabelaPdf(paginasTexto);

  if (!registros.length) {
    const registrosAdministradora = [];
    let contatosBuffer = [];
    let i = 0;

    while (i < linhasTexto.length) {
      const registroEncontrado = parseRegistroAdministradoraPorLinhas(
        linhasTexto,
        i
      );

      if (registroEncontrado) {
        registrosAdministradora.push({
          registro: registroEncontrado.registro,
          contatos: [...contatosBuffer],
          contatosTabela: [],
          linhaNumero: i + 1,
        });

        contatosBuffer = [];
        i = registroEncontrado.proximoIndex;
        continue;
      }

      const linhaAtual = linhasTexto[i];

      if (
        /E-mail:/i.test(linhaAtual) ||
        /Celular:/i.test(linhaAtual) ||
        /Telefone residencial:/i.test(linhaAtual) ||
        /Telefone comercial:/i.test(linhaAtual) ||
        /^-\s+/.test(linhaAtual)
      ) {
        contatosBuffer.push(linhaAtual);
      }

      i += 1;
    }

    registros = registrosAdministradora;
  }

  const linhas = registros.map((item) =>
    montarLinhaImportacao({
      registro: item.registro,
      contatos: item.contatos || [],
      contatosTabela: item.contatosTabela || [],
      torres,
      unidades,
      condominio,
      linhaNumero: item.linhaNumero,
    })
  );

  return {
    total_paginas: pdf.numPages,
    total_registros: linhas.length,
    linhas,
  };
}