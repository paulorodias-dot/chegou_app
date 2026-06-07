import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  FolderOpen,
  Loader2,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

import { supabase } from "../../services/supabase";
import { extrairMoradoresDePdf } from "../../services/importacaoMoradorPdfService";
import { importarMoradoresXLSX } from "../../services/cadastroMoradorService";
import "./ModalImportacaoMorador.css";

const RESUMO_INICIAL = {
  total: 0,
  criar: 0,
  atualizar: 0,
  divergencias: 0,
};

function formatarTamanhoArquivo(bytes = 0) {
  if (!bytes) return "0 KB";

  const kb = bytes / 1024;

  if (kb < 1024) return `${kb.toFixed(2)} KB`;

  return `${(kb / 1024).toFixed(2)} MB`;
}

function obterResultadoClasse(resultado = "") {
  const chave = String(resultado || "").toUpperCase();

  if (chave === "CRIAR") return "criar";
  if (chave === "ATUALIZAR") return "atualizar";
  if (chave === "DIVERGENCIA") return "divergencia";
  if (chave === "IGNORAR") return "ignorar";

  return "ignorar";
}

function baixarDivergenciasPDF(divergencias = []) {
  if (!divergencias.length) {
    toast("Nenhuma divergência para baixar.");
    return;
  }

  const dados = divergencias.map((item) => ({
    Linha: item.linha,
    "Torre/Bloco": item.torre,
    AP: item.unidade,
    Nome: item.nome,
    Email: item.email,
    WhatsApp: item.telefone,
    Motivo: item.motivo,
    Orientacao: item.orientacao || item.motivo,
  }));

  const ws = XLSX.utils.json_to_sheet(dados);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "Divergencias PDF");
  XLSX.writeFile(wb, "divergencias_importacao_pdf_moradores.xlsx");
}

function formatarOpcaoContato(opcao = null, vazio = "Não identificado") {
  if (!opcao?.valor) return vazio;

  const observacao = opcao.observacao ? ` — ${opcao.observacao}` : "";
  const bloqueado = opcao.bloqueado_sugerido ? " ⚠️" : "";

  return `${opcao.valor}${observacao}${bloqueado}`;
}

function montarLinhaComContatosSelecionados(linha = {}) {
  const emailSelecionado =
    linha.dados_pdf?.emails_encontrados?.find(
      (item) => item.valor === linha["E-mail"]
    ) ||
    linha.dados_pdf?.email_principal ||
    null;

  const telefoneSelecionado =
    linha.dados_pdf?.telefones_encontrados?.find(
      (item) => item.valor === linha["DDD + Número"]
    ) ||
    linha.dados_pdf?.telefone_principal ||
    null;

  return {
    ...linha,
    "E-mail": emailSelecionado?.valor || linha["E-mail"] || "",
    "DDD + Número": telefoneSelecionado?.valor || linha["DDD + Número"] || "",
    dados_pdf: {
      ...(linha.dados_pdf || {}),
      email_principal: emailSelecionado,
      telefone_principal: telefoneSelecionado,
    },
  };
}

function atualizarContatoLinha({ linhas, linhaAlvo, tipo, valor }) {
  return linhas.map((linha) => {
    if (linha.linha !== linhaAlvo) return linha;

    if (tipo === "email") {
      const selecionado =
        linha.dados_pdf?.emails_encontrados?.find(
          (item) => item.valor === valor
        ) || null;

      return {
        ...linha,
        "E-mail": selecionado?.valor || "",
        dados_pdf: {
          ...(linha.dados_pdf || {}),
          email_principal: selecionado,
        },
      };
    }

    if (tipo === "telefone") {
      const selecionado =
        linha.dados_pdf?.telefones_encontrados?.find(
          (item) => item.valor === valor
        ) || null;

      return {
        ...linha,
        "DDD + Número": selecionado?.valor || "",
        dados_pdf: {
          ...(linha.dados_pdf || {}),
          telefone_principal: selecionado,
        },
      };
    }

    return linha;
  });
}

export default function ModalImportacaoMoradorPDF({
  aberto,
  onClose,
  perfil,
  condominio,
  torres = [],
  unidades = [],
  preCadastros = [],
  onImportacaoConcluida,
}) {
  const inputRef = useRef(null);

  const [arquivo, setArquivo] = useState(null);
  const [linhas, setLinhas] = useState([]);
  const [preview, setPreview] = useState([]);
  const [divergencias, setDivergencias] = useState([]);
  const [resumo, setResumo] = useState(RESUMO_INICIAL);
  const [validado, setValidado] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [metadadosPdf, setMetadadosPdf] = useState(null);

  const possuiProcessaveis = resumo.criar > 0 || resumo.atualizar > 0;

  const podeConfirmar =
    validado &&
    arquivo &&
    linhas.length > 0 &&
    possuiProcessaveis &&
    !processando;

  const textoArquivo = useMemo(() => {
    if (!arquivo) return null;

    return {
      nome: arquivo.name,
      tamanho: formatarTamanhoArquivo(arquivo.size),
      linhas: linhas.length,
    };
  }, [arquivo, linhas.length]);

  useEffect(() => {
    if (!aberto) return;

    function handleEsc(event) {
      if (event.key === "Escape" && !processando) {
        onClose?.();
      }
    }

    window.addEventListener("keydown", handleEsc);

    return () => window.removeEventListener("keydown", handleEsc);
  }, [aberto, processando, onClose]);

  useEffect(() => {
    if (!aberto) {
      setArquivo(null);
      setLinhas([]);
      setPreview([]);
      setDivergencias([]);
      setResumo(RESUMO_INICIAL);
      setValidado(false);
      setProcessando(false);
      setMetadadosPdf(null);
    }
  }, [aberto]);

  if (!aberto) return null;

  function recalcularValidacao(linhasBase = []) {
    const resultadosValidados = linhasBase.map((linha, index) => {
      const pendencias = linha.dados_pdf?.pendencias || [];

      const possuiPendenciaContato =
        pendencias.includes("EMAIL_NAO_IDENTIFICADO") ||
        pendencias.includes("TELEFONE_NAO_IDENTIFICADO");

      const possuiDivergenciaCritica =
        pendencias.includes("TORRE_NAO_ENCONTRADA");

      if (possuiDivergenciaCritica) {
        return {
          linha: linha.linha || index + 2,
          torre: linha["Nome Torre/Bloco"] || linha["Torre/Bloco"],
          unidade: linha.Unidade,
          nome: linha["Nome Completo do Responsável"],
          email: linha["E-mail"],
          telefone: linha["DDD + Número"],
          resultado: "DIVERGENCIA",
          motivo: "TORRE_NAO_ENCONTRADA",
          orientacao:
            "Revise o bloco informado no PDF e a estrutura oficial cadastrada.",
        };
      }

      if (possuiPendenciaContato) {
        return {
          linha: linha.linha || index + 2,
          torre: linha["Nome Torre/Bloco"] || linha["Torre/Bloco"],
          unidade: linha.Unidade,
          nome: linha["Nome Completo do Responsável"],
          email: linha["E-mail"],
          telefone: linha["DDD + Número"],
          resultado: "CRIAR",
          motivo: "Contato pendente para ajuste posterior.",
          orientacao:
            "Será importado, mas ficará com pendência informativa.",
        };
      }

      return {
        linha: linha.linha || index + 2,
        torre: linha["Nome Torre/Bloco"] || linha["Torre/Bloco"],
        unidade: linha.Unidade,
        nome: linha["Nome Completo do Responsável"],
        email: linha["E-mail"],
        telefone: linha["DDD + Número"],
        resultado: "CRIAR",
        motivo: "Registro extraído do PDF.",
        orientacao: "A confirmação fará a validação definitiva.",
      };
    });

    const divergenciasLocais = resultadosValidados.filter(
      (item) => item.resultado === "DIVERGENCIA"
    );

    setResumo({
      total: linhasBase.length,
      criar: resultadosValidados.filter((item) => item.resultado === "CRIAR")
        .length,
      atualizar: resultadosValidados.filter(
        (item) => item.resultado === "ATUALIZAR"
      ).length,
      divergencias: divergenciasLocais.length,
    });

    setPreview(resultadosValidados);
    setDivergencias(divergenciasLocais);
    setValidado(true);
  }

  async function lerArquivoSelecionado(file) {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Selecione um arquivo PDF válido.");
      return;
    }

    try {
      setProcessando(true);
      setArquivo(file);
      setLinhas([]);
      setPreview([]);
      setDivergencias([]);
      setResumo(RESUMO_INICIAL);
      setValidado(false);

      const resultado = await extrairMoradoresDePdf({
        arquivo: file,
        condominio,
        torres,
        unidades,
      });

      const linhasComContatosSelecionados = (resultado.linhas || []).map(
        montarLinhaComContatosSelecionados
      );

      setLinhas(linhasComContatosSelecionados);
      setMetadadosPdf({
        paginas: resultado.total_paginas,
        registros: resultado.total_registros,
      });

      toast.success(
        `${resultado.total_registros} registro(s) extraído(s) do PDF.`
      );
    } catch (error) {
      console.error("Erro ao ler PDF:", error);
      toast.error(error.message || "Não foi possível ler o PDF.");
    } finally {
      setProcessando(false);
    }
  }

  function handleDrop(event) {
    event.preventDefault();

    if (processando) return;

    lerArquivoSelecionado(event.dataTransfer.files?.[0]);
  }

  function handleDragOver(event) {
    event.preventDefault();
  }

  async function validarPdf() {
    if (!arquivo || linhas.length === 0) {
      toast.error("Selecione um PDF antes de validar.");
      return;
    }

    try {
      setProcessando(true);
      recalcularValidacao(linhas);
      toast.success("PDF validado para prévia.");
    } catch (error) {
      console.error("Erro ao validar PDF:", error);
      toast.error("Não foi possível validar o PDF.");
    } finally {
      setProcessando(false);
    }
  }

  function selecionarContato({ linhaAlvo, tipo, valor }) {
    const novasLinhas = atualizarContatoLinha({
      linhas,
      linhaAlvo,
      tipo,
      valor,
    });

    setLinhas(novasLinhas);

    if (validado) {
      recalcularValidacao(novasLinhas);
    }
  }

  async function confirmarImportacao() {
    if (!arquivo || linhas.length === 0) {
      toast.error("Selecione um PDF antes de importar.");
      return;
    }

    try {
      setProcessando(true);

      const { data: preCadastrosAtuais, error: erroPreCadastros } =
        await supabase
          .from("pre_cadastro_moradores")
          .select("*")
          .eq("condominio_id", perfil?.condominio_id);

      if (erroPreCadastros) throw erroPreCadastros;

      const resultado = await importarMoradoresXLSX({
        perfil,
        condominio,
        arquivoNome: arquivo.name,
        linhas,
        torres,
        preCadastros: preCadastrosAtuais || preCadastros,
      });

      const resultados = resultado?.resultados || [];
      const divergenciasImportacao = resultados.filter(
        (item) => item.resultado === "DIVERGENCIA"
      );

      setResumo({
        total: resultado?.total_linhas || linhas.length,
        criar: resultado?.criadas || 0,
        atualizar: resultado?.atualizadas || 0,
        divergencias: resultado?.divergencias || 0,
      });

      setPreview(resultados.slice(0, 120));
      setDivergencias(divergenciasImportacao);
      setValidado(true);

      if (resultado?.divergencias > 0) {
        toast("PDF importado com divergências.");
      } else {
        toast.success("PDF importado com sucesso.");
      }

      await onImportacaoConcluida?.(resultado);
    } catch (error) {
      console.error("Erro ao importar PDF:", error);
      toast.error(error.message || "Erro ao importar PDF.");
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div className="mi-morador-overlay" role="dialog" aria-modal="true">
      <div className="mi-morador-modal">
        <header className="mi-morador-header">
          <div className="mi-morador-title-wrap">
            <div className="mi-morador-file-icon">
              <FileText size={28} />
              <span>PDF</span>
            </div>

            <div>
              <h2>Importação de Moradores PDF</h2>
              <p>
                Extraia moradores e contatos a partir de relação de condôminos.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="mi-morador-close"
            onClick={onClose}
            disabled={processando}
            aria-label="Fechar modal"
          >
            <X size={20} />
          </button>
        </header>

        <div className="mi-morador-scroll">
          <section className="mi-morador-top-grid">
            <article className="mi-morador-card">
              <div className="mi-section-title">
                <span>1</span>
                <h3>Seleção de PDF</h3>
              </div>

              <div className="mi-upload-row">
                <div
                  className="mi-upload-box"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  <UploadCloud size={33} />
                  <p>Arraste o arquivo PDF aqui</p>
                  <small>ou</small>

                  <button
                    type="button"
                    className="mi-btn mi-btn-light"
                    onClick={() => inputRef.current?.click()}
                    disabled={processando}
                  >
                    <FolderOpen size={15} />
                    Selecionar PDF
                  </button>

                  <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf"
                    hidden
                    onChange={(event) =>
                      lerArquivoSelecionado(event.target.files?.[0])
                    }
                  />
                </div>

                <div className="mi-file-preview">
                  {textoArquivo ? (
                    <>
                      <div className="mi-file-preview-icon">
                        <FileText size={26} />
                      </div>

                      <div>
                        <strong>{textoArquivo.nome}</strong>
                        <span>{textoArquivo.tamanho}</span>
                        <p>{textoArquivo.linhas} registros extraídos</p>

                        {metadadosPdf ? (
                          <small>
                            {metadadosPdf.paginas} página(s) analisada(s)
                          </small>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <div className="mi-file-empty">
                      <strong>Nenhum PDF selecionado</strong>
                      <span>
                        Selecione ou arraste uma relação de moradores em PDF.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </article>

            <article className="mi-morador-card">
              <div className="mi-section-title">
                <span>2</span>
                <h3>Resumo da Análise</h3>
              </div>

              <div className="mi-summary-grid">
                <div className="mi-summary-card total">
                  <CheckCircle2 size={30} />
                  <strong>{resumo.total}</strong>
                  <span>Total</span>
                  <small>Registros extraídos</small>
                </div>

                <div className="mi-summary-card criar">
                  <CheckCircle2 size={30} />
                  <strong>{resumo.criar}</strong>
                  <span>Criar</span>
                  <small>Processáveis</small>
                </div>

                <div className="mi-summary-card atualizar">
                  <ShieldCheck size={30} />
                  <strong>{resumo.atualizar}</strong>
                  <span>Atualizar</span>
                  <small>Mesma unidade/nome</small>
                </div>

                <div className="mi-summary-card divergencia">
                  <AlertTriangle size={30} />
                  <strong>{resumo.divergencias}</strong>
                  <span>Divergências</span>
                  <small>Separadas para ajuste</small>
                </div>
              </div>
            </article>
          </section>

          <section className="mi-morador-card mi-preview-card">
            <div className="mi-card-head-row">
              <div className="mi-section-title">
                <span>3</span>
                <h3>Prévia da Importação PDF</h3>
              </div>
            </div>

            <div className="mi-table-wrap">
              <table className="mi-table">
                <thead>
                  <tr>
                    <th>Linha</th>
                    <th>Torre / Bloco</th>
                    <th>AP</th>
                    <th>Nome</th>
                    <th>WhatsApp escolhido</th>
                    <th>E-mail escolhido</th>
                    <th>Resultado</th>
                    <th>Motivo</th>
                  </tr>
                </thead>

                <tbody>
                  {preview.length === 0 ? (
                    <tr>
                      <td colSpan="8">
                        Selecione e valide um PDF para visualizar a prévia.
                      </td>
                    </tr>
                  ) : (
                    preview.map((item) => {
                      const linhaOriginal =
                        linhas.find((linha) => linha.linha === item.linha) ||
                        null;

                      const emails =
                        linhaOriginal?.dados_pdf?.emails_encontrados || [];

                      const telefones =
                        linhaOriginal?.dados_pdf?.telefones_encontrados || [];

                      return (
                        <tr key={`${item.linha}-${item.nome}-${item.email}`}>
                          <td>{item.linha}</td>
                          <td>{item.torre || "—"}</td>
                          <td>{item.unidade || "—"}</td>
                          <td>{item.nome || "—"}</td>

                          <td>
                            {telefones.length > 1 ? (
                              <select
                                className="mi-contact-select"
                                value={linhaOriginal?.["DDD + Número"] || ""}
                                onChange={(event) =>
                                  selecionarContato({
                                    linhaAlvo: item.linha,
                                    tipo: "telefone",
                                    valor: event.target.value,
                                  })
                                }
                              >
                                <option value="">Selecionar telefone</option>
                                {telefones.map((telefone) => (
                                  <option
                                    key={`${item.linha}-${telefone.valor}-${telefone.observacao}`}
                                    value={telefone.valor}
                                  >
                                    {formatarOpcaoContato(
                                      telefone,
                                      "Telefone não identificado"
                                    )}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              item.telefone || "—"
                            )}
                          </td>

                          <td>
                            {emails.length > 1 ? (
                              <select
                                className="mi-contact-select"
                                value={linhaOriginal?.["E-mail"] || ""}
                                onChange={(event) =>
                                  selecionarContato({
                                    linhaAlvo: item.linha,
                                    tipo: "email",
                                    valor: event.target.value,
                                  })
                                }
                              >
                                <option value="">Selecionar e-mail</option>
                                {emails.map((email) => (
                                  <option
                                    key={`${item.linha}-${email.valor}-${email.observacao}`}
                                    value={email.valor}
                                  >
                                    {formatarOpcaoContato(
                                      email,
                                      "E-mail não identificado"
                                    )}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              item.email || "—"
                            )}
                          </td>

                          <td>
                            <span
                              className={`mi-result-badge ${obterResultadoClasse(
                                item.resultado
                              )}`}
                            >
                              {item.resultado || "IGNORAR"}
                            </span>
                          </td>

                          <td>{item.motivo || "—"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {divergencias.length > 0 ? (
            <section className="mi-morador-card mi-divergencias-card">
              <div className="mi-divergencia-alert">
                <AlertTriangle size={18} />
                <div>
                  <strong>Divergências separadas para tratativa</strong>
                  <p>
                    Os registros válidos poderão ser importados. As divergências
                    serão registradas para análise posterior.
                  </p>
                </div>
              </div>

              <div className="mi-card-head-row">
                <div className="mi-section-title danger">
                  <AlertTriangle size={20} />
                  <h3>Divergências Encontradas ({divergencias.length})</h3>
                </div>

                <button
                  type="button"
                  className="mi-btn mi-btn-light"
                  onClick={() => baixarDivergenciasPDF(divergencias)}
                  disabled={processando}
                >
                  <Download size={15} />
                  Baixar Divergências
                </button>
              </div>

              <div className="mi-table-wrap small">
                <table className="mi-table">
                  <thead>
                    <tr>
                      <th>Linha</th>
                      <th>Nome</th>
                      <th>Torre</th>
                      <th>AP</th>
                      <th>Motivo</th>
                      <th>Orientação</th>
                    </tr>
                  </thead>

                  <tbody>
                    {divergencias.slice(0, 12).map((item) => (
                      <tr
                        key={`pdf-div-${item.linha}-${item.nome}-${item.motivo}`}
                      >
                        <td>{item.linha}</td>
                        <td>{item.nome || "—"}</td>
                        <td>{item.torre || "—"}</td>
                        <td>{item.unidade || "—"}</td>
                        <td className="mi-danger-text">
                          {item.motivo || "—"}
                        </td>
                        <td>{item.orientacao || item.motivo || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>

        <footer className="mi-morador-footer">
          <p>
            Os registros válidos serão processados. Pendências e divergências
            serão separadas para ajustes no CadastroMorador.
          </p>

          <div>
            <button
              type="button"
              className="mi-btn mi-btn-cancel"
              onClick={onClose}
              disabled={processando}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="mi-btn mi-btn-primary-outline"
              onClick={validarPdf}
              disabled={!arquivo || processando}
            >
              {processando ? (
                <Loader2 size={15} className="spin" />
              ) : (
                <ShieldCheck size={15} />
              )}
              Validar PDF
            </button>

            <button
              type="button"
              className="mi-btn mi-btn-primary"
              onClick={confirmarImportacao}
              disabled={!podeConfirmar}
            >
              {processando ? (
                <Loader2 size={15} className="spin" />
              ) : (
                <CheckCircle2 size={15} />
              )}
              Importar Válidos
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}