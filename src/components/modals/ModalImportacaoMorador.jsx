import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FolderOpen,
  Loader2,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";

import { supabase } from "../../services/supabase";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
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

function baixarModeloXLSXMorador() {
  const dados = [
    {
      "Torre/Bloco": "1",
      "Nome Torre/Bloco": "Madresilva",
      Unidade: "101",
      "Nome Completo do Responsável": "João da Silva Santos",
      DDI: "+55",
      "DDD + Número": "(11) 91234-5678",
      "E-mail": "joao.silva@email.com",
      Observações: "Modelo oficial Chegou!",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(dados);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "Moradores");
  XLSX.writeFile(wb, "modelo_importacao_moradores_chegou.xlsx");
}

function baixarDivergenciasXLSX(divergencias = []) {
  if (!divergencias.length) {
    toast("Nenhuma divergência para baixar.");
    return;
  }

  const dados = divergencias.map((item) => ({
    Linha: item.linha,
    "Nome do Responsável": item.nome,
    "Torre/Bloco": item.torre,
    AP: item.unidade,
    "E-mail": item.email,
    WhatsApp: item.telefone,
    Motivo: item.motivo,
    Orientação: item.orientacao || item.motivo,
  }));

  const ws = XLSX.utils.json_to_sheet(dados);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "Divergencias");
  XLSX.writeFile(wb, "divergencias_importacao_moradores.xlsx");
}

    function normalizarTextoMI(valor = "") {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    }

    function localizarTorrePreview(torres = [], torreInformada = "") {
    const alvo = normalizarTextoMI(torreInformada);

    return (
        torres.find((torre) => {
        const nome = normalizarTextoMI(torre.nome);
        const identificador = normalizarTextoMI(torre.identificador);

        return nome === alvo || identificador === alvo;
        }) || null
    );
    }

    function localizarPreCadastroPreview(preCadastros = [], torre = {}, unidade = "") {
    const torreNome = normalizarTextoMI(torre?.nome);
    const torreIdentificador = normalizarTextoMI(torre?.identificador);
    const unidadeNormalizada = normalizarTextoMI(unidade);

    return (
        preCadastros.find((item) => {
        if (["CANCELADO", "cancelado"].includes(item.status_cadastro)) {
            return false;
        }

        const mesmaUnidade = normalizarTextoMI(item.unidade) === unidadeNormalizada;

        const mesmaTorre =
            normalizarTextoMI(item.torre) === torreNome ||
            normalizarTextoMI(item.bloco) === torreNome ||
            normalizarTextoMI(item.torre) === torreIdentificador ||
            normalizarTextoMI(item.bloco) === torreIdentificador;

        return mesmaUnidade && mesmaTorre;
        }) || null
    );
    }

    function nomesIguaisPreview(a = "", b = "") {
    return normalizarTextoMI(a) === normalizarTextoMI(b);
    }

    function statusAprovadoPreview(item = {}) {
        return (
            ["APROVADO", "aprovado", "ativo"].includes(item.status_cadastro) ||
            ["conta_ativa"].includes(item.status_conta) ||
            ["conta_ativa", "aprovado"].includes(item.status_acompanhamento)
        );
    }

    function formatarTorreOficialMI(torre) {
        if (!torre) return "—";

        return [torre.nome, torre.identificador]
            .filter(Boolean)
            .join(" - ");
        }
    

export default function ModalImportacaoMorador({
  aberto,
  onClose,
  perfil,
  condominio,
  torres = [],
  preCadastros = [],
  onImportacaoConcluida,
}) {
  const inputRef = useRef(null);

  const [arquivo, setArquivo] = useState(null);
  const [linhas, setLinhas] = useState([]);
  const [validado, setValidado] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [resumo, setResumo] = useState(RESUMO_INICIAL);
  const [preview, setPreview] = useState([]);
  const [divergencias, setDivergencias] = useState([]);

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

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [aberto, processando, onClose]);

  useEffect(() => {
    if (!aberto) {
      setArquivo(null);
      setLinhas([]);
      setValidado(false);
      setProcessando(false);
      setResumo(RESUMO_INICIAL);
      setPreview([]);
      setDivergencias([]);
    }
  }, [aberto]);

  if (!aberto) return null;

  async function lerArquivoSelecionado(file) {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("Selecione um arquivo XLSX válido.");
      return;
    }

    try {
      setProcessando(true);
      setArquivo(file);
      setValidado(false);
      setPreview([]);
      setDivergencias([]);
      setResumo(RESUMO_INICIAL);

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const primeiraAba = workbook.SheetNames[0];
      const sheet = workbook.Sheets[primeiraAba];

      const json = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: false,
      });

      setLinhas(json);

      toast.success(`${json.length} linha(s) carregada(s).`);
    } catch (error) {
      console.error("Erro ao ler XLSX:", error);
      toast.error("Não foi possível ler o arquivo XLSX.");
    } finally {
      setProcessando(false);
    }
  }

  function handleDrop(event) {
    event.preventDefault();

    if (processando) return;

    const file = event.dataTransfer.files?.[0];
    lerArquivoSelecionado(file);
  }

  function handleDragOver(event) {
    event.preventDefault();
  }

  async function validarArquivo() {
    if (!arquivo || linhas.length === 0) {
      toast.error("Selecione um arquivo XLSX antes de validar.");
      return;
    }

    try {
        setProcessando(true);

        const { data: preCadastrosAtuais, error: erroPreCadastros } = await supabase
            .from("pre_cadastro_moradores")
            .select("*")
            .eq("condominio_id", perfil?.condominio_id);

        if (erroPreCadastros) throw erroPreCadastros;

        const preCadastrosReferencia = preCadastrosAtuais || preCadastros;

        /*
            Nesta V1, a validação visual usa uma prévia local simples.
            A validação definitiva e persistência ocorrem no service ao confirmar.
        */

        const amostra = linhas.slice(0, 80).map((linha, index) => {
            const nome =
                linha["Nome Completo do Responsável"] ||
                linha["Nome"] ||
                linha["Responsável"] ||
                "";

            const torre =
                linha["Nome Torre/Bloco"] ||
                linha["Torre/Bloco"] ||
                linha["Torre"] ||
                "";

            const unidade =
                linha["Unidade"] ||
                linha["Apartamento"] ||
                linha["AP"] ||
                "";

            const email =
                linha["E-mail"] ||
                linha["Email"] ||
                "";

            const telefone =
                linha["DDD + Número"] ||
                linha["WhatsApp"] ||
                linha["Telefone"] ||
                "";

            const temBasico = torre && unidade && nome && email && telefone;

            if (!temBasico) {
                return {
                linha: index + 2,
                torre,
                unidade,
                nome,
                email,
                telefone,
                resultado: "DIVERGENCIA",
                motivo: "Campos obrigatórios pendentes.",
                orientacao: "Revise torre, unidade, nome, e-mail e WhatsApp.",
                };
            }

            const torreEncontrada = localizarTorrePreview(torres, torre);

            if (!torreEncontrada) {
                return {
                linha: index + 2,
                torre,
                unidade,
                nome,
                email,
                telefone,
                resultado: "DIVERGENCIA",
                motivo: "TORRE_NAO_ENCONTRADA",
                orientacao: "Revise a torre/bloco conforme cadastro oficial.",
                };
            }

            const existente = localizarPreCadastroPreview(
                preCadastrosReferencia,
                torreEncontrada,
                unidade
            );

            if (!existente) {
                return {
                linha: index + 2,
                torre: formatarTorreOficialMI(torreEncontrada),
                unidade,
                nome,
                email,
                telefone,
                resultado: "CRIAR",
                motivo: "Novo pré-cadastro será criado.",
                orientacao: "Nenhum cadastro ativo encontrado para esta unidade.",
                };
            }

            if (statusAprovadoPreview(existente)) {
                return {
                linha: index + 2,
                torre: formatarTorreOficialMI(torreEncontrada),
                unidade,
                nome,
                email,
                telefone,
                resultado: "DIVERGENCIA",
                motivo: "UNIDADE_COM_MORADOR_APROVADO",
                orientacao: "Use Gestão > Unidades e Vínculos.",
                };
            }

            if (nomesIguaisPreview(existente.nome, nome)) {
                return {
                linha: index + 2,
                torre: formatarTorreOficialMI(torreEncontrada),
                unidade,
                nome,
                email,
                telefone,
                resultado: "ATUALIZAR",
                motivo: "Torre + Unidade + Nome iguais. Contato será atualizado.",
                orientacao: "A confirmação atualizará e-mail, WhatsApp e observações.",
                };
            }

            return {
                linha: index + 2,
                torre: formatarTorreOficialMI(torreEncontrada),
                unidade,
                nome,
                email,
                telefone,
                resultado: "DIVERGENCIA",
                motivo: "UNIDADE_COM_NOME_DIFERENTE",
                orientacao: "A unidade possui outro nome vinculado. Revise manualmente.",
            };
        });

      const divergenciasLocais = amostra.filter(
        (item) => item.resultado === "DIVERGENCIA"
      );

        setResumo({
            total: linhas.length,
            criar: amostra.filter((item) => item.resultado === "CRIAR").length,
            atualizar: amostra.filter((item) => item.resultado === "ATUALIZAR").length,
            divergencias: divergenciasLocais.length,
            });

      setPreview(amostra);
      setDivergencias(divergenciasLocais);
      setValidado(true);

      toast.success("Arquivo validado para prévia.");
    } catch (error) {
      console.error("Erro ao validar arquivo:", error);
      toast.error("Não foi possível validar o arquivo.");
    } finally {
      setProcessando(false);
    }
  }
    async function confirmarImportacao() {
    if (!arquivo || linhas.length === 0) {
      toast.error("Selecione um arquivo XLSX antes de importar.");
      return;
    }

    try {
      setProcessando(true);

        const { data: preCadastrosAtuais, error: erroPreCadastros } = await supabase
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

      setPreview(resultados.slice(0, 80));
      setDivergencias(divergenciasImportacao);
      setValidado(true);

      if (resultado?.divergencias > 0) {
        toast("Importação concluída com divergências.");
      } else {
        toast.success("Importação concluída com sucesso.");
      }

      await onImportacaoConcluida?.(resultado);
    } catch (error) {
      console.error("Erro ao confirmar importação:", error);
      toast.error(error.message || "Erro ao importar moradores.");
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
              <FileSpreadsheet size={28} />
              <span>XLSX</span>
            </div>

            <div>
              <h2>Importação de Moradores XLSX</h2>
              <p>Importe moradores em lote através de planilha Excel.</p>
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
              <h3>Seleção de Arquivo</h3>
            </div>

            <div className="mi-upload-row">
              <div
                className="mi-upload-box"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <UploadCloud size={33} />
                <p>Arraste o arquivo XLSX aqui</p>
                <small>ou</small>

                <button
                  type="button"
                  className="mi-btn mi-btn-light"
                  onClick={() => inputRef.current?.click()}
                  disabled={processando}
                >
                  <FolderOpen size={15} />
                  Selecionar Arquivo
                </button>

                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx"
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
                      <FileSpreadsheet size={26} />
                    </div>

                    <div>
                      <strong>{textoArquivo.nome}</strong>
                      <span>{textoArquivo.tamanho}</span>
                      <p>{textoArquivo.linhas} linhas encontradas</p>
                    </div>
                  </>
                ) : (
                  <div className="mi-file-empty">
                    <strong>Nenhum arquivo selecionado</strong>
                    <span>Selecione ou arraste um arquivo XLSX.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mi-card-actions">
              <button
                type="button"
                className="mi-btn mi-btn-light"
                onClick={baixarModeloXLSXMorador}
                disabled={processando}
              >
                <Download size={15} />
                Baixar Modelo XLSX
              </button>

              <span className="mi-model-note">
                Modelo oficial da planilha
              </span>
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
                <span>Total Linhas</span>
                <small>100% do arquivo</small>
              </div>

              <div className="mi-summary-card criar">
                <CheckCircle2 size={30} />
                <strong>{resumo.criar}</strong>
                <span>Criar</span>
                <small>
                  {resumo.total
                    ? `${((resumo.criar / resumo.total) * 100).toFixed(2)}% do total`
                    : "0% do total"}
                </small>
              </div>

              <div className="mi-summary-card atualizar">
                <ShieldCheck size={30} />
                <strong>{resumo.atualizar}</strong>
                <span>Atualizar</span>
                <small>
                  {resumo.total
                    ? `${((resumo.atualizar / resumo.total) * 100).toFixed(2)}% do total`
                    : "0% do total"}
                </small>
              </div>

              <div className="mi-summary-card divergencia">
                <AlertTriangle size={30} />
                <strong>{resumo.divergencias}</strong>
                <span>Divergências</span>
                <small>
                  {resumo.total
                    ? `${((resumo.divergencias / resumo.total) * 100).toFixed(2)}% do total`
                    : "0% do total"}
                </small>
              </div>
            </div>
          </article>
        </section>

        <section className="mi-morador-card mi-preview-card">
          <div className="mi-card-head-row">
            <div className="mi-section-title">
              <span>3</span>
              <h3>Prévia da Importação</h3>
            </div>

            <div className="mi-legend">
              <span><i className="criar" /> Criar</span>
              <span><i className="atualizar" /> Atualizar</span>
              <span><i className="divergencia" /> Divergência</span>
              <span><i className="ignorar" /> Ignorar</span>
            </div>
          </div>

          <div className="mi-table-wrap">
            <table className="mi-table">
              <thead>
                <tr>
                  <th>Linha</th>
                  <th>Torre / Bloco</th>
                  <th>AP</th>
                  <th>Nome do Responsável</th>
                  <th>WhatsApp</th>
                  <th>E-mail</th>
                  <th>Resultado</th>
                  <th>Motivo</th>
                </tr>
              </thead>

              <tbody>
                {preview.length === 0 ? (
                  <tr>
                    <td colSpan="8">
                      Selecione e valide um arquivo para visualizar a prévia.
                    </td>
                  </tr>
                ) : (
                  preview.map((item) => (
                    <tr key={`${item.linha}-${item.email}-${item.nome}`}>
                      <td>{item.linha}</td>
                      <td>{item.torre || "—"}</td>
                      <td>{item.unidade || "—"}</td>
                      <td>{item.nome || "—"}</td>
                      <td>{item.telefone || "—"}</td>
                      <td>{item.email || "—"}</td>
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
                  ))
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
                    <strong>
                    {possuiProcessaveis
                        ? "Divergências separadas para tratativa"
                        : "Importação sem registros válidos"}
                    </strong>
                    <p>
                    {possuiProcessaveis
                        ? "Os registros válidos poderão ser importados. As divergências serão registradas para análise posterior."
                        : "Todas as linhas possuem divergência. Ajuste o arquivo ou baixe o relatório antes de continuar."}
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
                onClick={() => baixarDivergenciasXLSX(divergencias)}
                disabled={processando}
              >
                <Download size={15} />
                Baixar Divergências (XLSX)
              </button>
            </div>

            <div className="mi-table-wrap small">
              <table className="mi-table">
                <thead>
                  <tr>
                    <th>Linha</th>
                    <th>Nome do Responsável</th>
                    <th>Torre / Bloco</th>
                    <th>AP</th>
                    <th>Motivo</th>
                    <th>Orientação</th>
                  </tr>
                </thead>

                <tbody>
                  {divergencias.slice(0, 8).map((item) => (
                    <tr key={`div-${item.linha}-${item.nome}-${item.motivo}`}>
                      <td>{item.linha}</td>
                      <td>{item.nome || "—"}</td>
                      <td>{item.torre || "—"}</td>
                      <td>{item.unidade || "—"}</td>
                      <td className="mi-danger-text">{item.motivo || "—"}</td>
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
                {resumo.divergencias > 0 && possuiProcessaveis
                    ? "Os registros válidos serão processados normalmente. As divergências serão registradas para tratativas."
                    : "Ao confirmar a importação, os registros serão criados/atualizados e as divergências serão registradas para tratativas."}
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
              onClick={validarArquivo}
              disabled={!arquivo || processando}
            >
              {processando ? <Loader2 size={15} className="spin" /> : <ShieldCheck size={15} />}
              Validar Arquivo
            </button>

            <button
              type="button"
              className="mi-btn mi-btn-primary"
              onClick={confirmarImportacao}
              disabled={!podeConfirmar}
            >
              {processando ? <Loader2 size={15} className="spin" /> : <CheckCircle2 size={15} />}
              {resumo.divergencias > 0 && possuiProcessaveis
                ? "Importar Válidos"
                : "Confirmar Importação"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}