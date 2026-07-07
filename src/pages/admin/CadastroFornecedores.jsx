// src/pages/admin/CadastroFornecedores.jsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";

import { supabase } from "../../services/supabase";

import FornecedorHeader from "../../components/admin/fornecedores/FornecedorHeader";
import FornecedorKpis from "../../components/admin/fornecedores/FornecedorKpis";
import FornecedorFiltros from "../../components/admin/fornecedores/FornecedorFiltros";
import FornecedorTabela from "../../components/admin/fornecedores/FornecedorTabela";
import FornecedorDrawer from "../../components/admin/fornecedores/FornecedorDrawer";
import ModalFornecedor from "../../components/admin/fornecedores/ModalFornecedor";
import FornecedorSidebar from "../../components/admin/fornecedores/FornecedorSidebar";

import {
  buildInitialFornecedorForm,
  isValidCNPJBasic,
  isValidCPF,
  maskDocument,
  normalizeFornecedorPayload,
  onlyDigits,
} from "../../components/admin/fornecedores/fornecedor-utils";

import "./CadastroFornecedores.css";

const DEFAULT_PAGE_SIZE = 10;

function resolverCondominioId(perfil) {
  return (
    perfil?.condominio_id ||
    perfil?.condominioId ||
    perfil?.condominio?.id ||
    perfil?.suporte_condominio_id ||
    null
  );
}

export default function CadastroFornecedores({ perfil }) {
  const condominioId = useMemo(() => resolverCondominioId(perfil), [perfil]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [consultaInfo, setConsultaInfo] = useState("");

  const [modalFocusSignal, setModalFocusSignal] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({});

  const [kpis, setKpis] = useState(null);
  const [fornecedores, setFornecedores] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [situacoes, setSituacoes] = useState([]);

  const [pesquisa, setPesquisa] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("TODAS");
  const [situacaoFiltro, setSituacaoFiltro] = useState("TODOS");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedFornecedor, setSelectedFornecedor] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("novo");
  const [form, setForm] = useState(() => buildInitialFornecedorForm());

  const loadCategorias = useCallback(async () => {
    const { data, error: categoriasError } = await supabase
      .from("fornecedor_categorias")
      .select("id,nome,codigo,descricao,ordem,ativo")
      .eq("ativo", true)
      .order("ordem", { ascending: true });

    if (categoriasError) throw categoriasError;
    setCategorias(data || []);
  }, []);

  const loadSituacoes = useCallback(async () => {
    const { data, error: situacoesError } = await supabase
      .from("fornecedor_situacoes")
      .select("id,codigo,nome,descricao,cor,ordem,ativo")
      .eq("ativo", true)
      .order("ordem", { ascending: true });

    if (situacoesError) throw situacoesError;
    setSituacoes(data || []);
  }, []);

  const loadKpis = useCallback(async () => {
    if (!condominioId) return;

    const { data, error: kpisError } = await supabase
      .from("vw_fornecedores_condominio_kpis")
      .select("*")
      .eq("condominio_id", condominioId)
      .maybeSingle();

    if (kpisError) throw kpisError;

    setKpis(
      data || {
        total_fornecedores: 0,
        fornecedores_ativos: 0,
        em_homologacao: 0,
        suspensos: 0,
        descredenciados: 0,
        categorias_utilizadas: 0,
        com_acesso_portal_futuro: 0,
      }
    );
  }, [condominioId]);

  const loadFornecedores = useCallback(async () => {
    if (!condominioId) return;

    const { data, error: fornecedoresError } = await supabase
      .from("vw_fornecedores_condominio_listagem")
      .select("*")
      .eq("condominio_id", condominioId)
      .order("atualizado_em", { ascending: false });

    if (fornecedoresError) throw fornecedoresError;
    setFornecedores(data || []);
  }, [condominioId]);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      if (!condominioId) {
        setError("Não foi possível identificar o condomínio deste acesso.");
        setKpis(null);
        setFornecedores([]);
        return;
      }

      await Promise.all([
        loadCategorias(),
        loadSituacoes(),
        loadKpis(),
        loadFornecedores(),
      ]);
    } catch (loadError) {
      console.error("Erro ao carregar fornecedores:", loadError);
      setError("Não foi possível carregar os fornecedores agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [condominioId, loadCategorias, loadSituacoes, loadKpis, loadFornecedores]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const fornecedoresFiltrados = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase();

    return fornecedores.filter((item) => {
      const buscaOk =
        !termo ||
        [
          item.nome_fantasia,
          item.razao_social,
          item.nome_completo,
          item.documento,
          item.responsavel_nome,
          item.responsavel_email,
          item.responsavel_whatsapp,
          item.email_local,
          item.categoria_principal,
          item.cidade,
          item.estado,
        ]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(termo));

      const situacaoOk =
        situacaoFiltro === "TODOS" || item.situacao === situacaoFiltro;

      const categoriaOk =
        categoriaFiltro === "TODAS" ||
        item.categoria_principal_codigo === categoriaFiltro;

      return buscaOk && situacaoOk && categoriaOk;
    });
  }, [fornecedores, pesquisa, situacaoFiltro, categoriaFiltro]);

  const totalPages = Math.max(1, Math.ceil(fornecedoresFiltrados.length / pageSize));

  const fornecedoresPaginados = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return fornecedoresFiltrados.slice(start, start + pageSize);
  }, [fornecedoresFiltrados, page, pageSize, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [pesquisa, categoriaFiltro, situacaoFiltro, pageSize]);

  function handleChangeForm(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function resetModal() {
    setModalMode("novo");
    setForm(buildInitialFornecedorForm());

    setFormError("");
    setConsultaInfo("");

    setFieldErrors({});
  }

  function handleNovoFornecedor() {
    resetModal();
    setModalOpen(true);
  }

  function handleCloseModal() {
    setModalOpen(false);
    resetModal();
  }

  function handleOpenDrawer(fornecedor) {
    setSelectedFornecedor(fornecedor);
    setDrawerOpen(true);
  }

  function handleCloseDrawer() {
    setSelectedFornecedor(null);
    setDrawerOpen(false);
  }

  function limparFormularioParaNovaConsulta(tipoDocumento, documentoDigitado) {
    setForm((prev) => ({
      ...buildInitialFornecedorForm(),
      tipo_documento: tipoDocumento,
      documento: maskDocument(tipoDocumento, documentoDigitado),
    }));
  }

  function preencherDadosConsultados(dados, tipoDocumento, documentoDigitado) {
    setForm((prev) => ({
      ...prev,
      tipo_documento: tipoDocumento,
      documento: maskDocument(tipoDocumento, documentoDigitado),

      razao_social: dados?.razao_social || "",
      nome_fantasia: dados?.nome_fantasia || "",
      nome_completo: dados?.nome_completo || "",

      situacao_receita: dados?.situacao_receita || "",
      natureza_juridica: dados?.natureza_juridica || "",
      porte: dados?.porte || "",
      cnae_principal: dados?.cnae_principal || "",
      cnae_secundarios: dados?.cnae_secundarios || [],

      cep: dados?.cep || "",
      logradouro: dados?.logradouro || "",
      numero: dados?.numero || "",
      complemento: dados?.complemento || "",
      bairro: dados?.bairro || "",
      cidade: dados?.cidade || "",
      estado: dados?.estado || "",

      telefone_receita: dados?.telefone_receita || "",
      email_receita: dados?.email_receita || "",
      dados_receita: dados?.dados_receita || {},
    }));
  }

  async function handleConsultarDocumento() {
    setFormError("");
    setConsultaInfo("");

    const tipoDocumento = form.tipo_documento;
    const documento = onlyDigits(form.documento);

    if (tipoDocumento === "CPF" && !isValidCPF(documento)) {
      setFormError("CPF inválido. Verifique os números informados.");
      return;
    }

    if (tipoDocumento === "CNPJ" && !isValidCNPJBasic(documento)) {
      setFormError("CNPJ inválido. Informe os 14 números.");
      return;
    }

    limparFormularioParaNovaConsulta(tipoDocumento, documento);

    try {
      const { data, error: consultaInternaError } = await supabase.rpc(
        "rpc_buscar_entidade_por_documento",
        {
          p_tipo_documento: tipoDocumento,
          p_documento: documento,
        }
      );

      if (consultaInternaError) throw consultaInternaError;

      const entidade = Array.isArray(data) ? data[0] : null;

      if (entidade) {
        preencherDadosConsultados(
          {
            razao_social: entidade.razao_social,
            nome_fantasia: entidade.nome_fantasia,
            nome_completo: entidade.nome_completo,
            cidade: entidade.cidade,
            estado: entidade.estado,
          },
          tipoDocumento,
          documento
        );

        setConsultaInfo(
          "Cadastro encontrado na Base Central. Os dados foram preenchidos automaticamente."
        );

        return;
      }

      if (tipoDocumento === "CPF") {
        setConsultaInfo(
          "CPF válido. Continue preenchendo os dados do prestador."
        );
        return;
      }

      const { data: edgeData, error: edgeError } = await supabase.functions.invoke(
        "consultar-cnpj",
        {
          body: {
            cnpj: documento,
            condominio_id: condominioId,
          },
        }
      );

      if (edgeError) {
        setConsultaInfo(
          "Não encontramos os dados automaticamente. Você pode continuar preenchendo manualmente."
        );
        return;
      }

      if (edgeData?.dados_normalizados) {
        preencherDadosConsultados(
          edgeData.dados_normalizados,
          tipoDocumento,
          documento
        );

        setConsultaInfo(
          edgeData?.mensagem || "Dados preenchidos automaticamente."
        );

        return;
      }

      if (edgeData?.error) {
        setConsultaInfo(edgeData.error);
        return;
      }

      setConsultaInfo(
        "Não encontramos os dados automaticamente. Você pode continuar preenchendo manualmente."
      );
    } catch (consultaError) {
      console.error("Erro ao consultar documento:", consultaError);
      setFormError("Não foi possível consultar este documento agora.");
    }
  }

  function validateForm() {
    const documento = onlyDigits(form.documento);
    const errors = {};

    if (form.tipo_documento === "CPF" && !isValidCPF(documento)) {
      errors.documento = "CPF inválido.";
    }

    if (form.tipo_documento === "CNPJ" && !isValidCNPJBasic(documento)) {
      errors.documento = "CNPJ inválido.";
    }

    if (form.tipo_documento === "CNPJ" && !form.razao_social.trim()) {
      errors.razao_social = "Informe a razão social.";
    }

    if (form.tipo_documento === "CPF" && !form.nome_completo.trim()) {
      errors.nome_completo = "Informe o nome completo.";
    }

    if (!form.responsavel_nome.trim()) {
      errors.responsavel_nome = "Informe o responsável.";
    }

    if (!form.categoria_ids.length) {
      errors.categoria_ids = "Selecione uma categoria.";
    }

    if (!form.categoria_principal_id) {
      errors.categoria_principal_id = "Selecione a categoria principal.";
    }

    setFieldErrors(errors);

    const firstError = Object.values(errors)[0];
    return firstError || "";
  }

  async function handleSalvarFornecedor() {
    setFormError("");

    const validationMessage = validateForm();
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    if (!condominioId) {
      setFormError("Não foi possível identificar o condomínio deste acesso.");
      return;
    }

    try {
      setSaving(true);

      const payload = normalizeFornecedorPayload({
        form,
        condominioId,
      });

      const { error: saveError } = await supabase.rpc(
        "rpc_cadastrar_fornecedor_condominio_v1",
        payload
      );

      if (saveError) throw saveError;

      setForm(buildInitialFornecedorForm());
      setConsultaInfo("Fornecedor salvo com sucesso. Você pode cadastrar outro fornecedor.");
      setFormError("");
      setModalFocusSignal((prev) => prev + 1);

      await loadAll();
    } catch (saveError) {
      console.error("Erro ao salvar fornecedor:", saveError);

      setFormError(
        "Não foi possível salvar este fornecedor agora. Revise os dados e tente novamente."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="cad-fornecedores-page">
      <main className="cad-fornecedores-main">
        <FornecedorHeader onNovoFornecedor={handleNovoFornecedor} />

        {error && (
          <section className="cad-fornecedores-alert">
            <AlertCircle size={18} />
            <div>
              <strong>Atenção</strong>
              <p>{error}</p>
            </div>

            <button
              type="button"
              className="btn-premium-secondary"
              onClick={loadAll}
            >
              <RefreshCcw size={15} />
              Recarregar
            </button>
          </section>
        )}

        <FornecedorKpis kpis={kpis} />

        <FornecedorFiltros
          pesquisa={pesquisa}
          onPesquisaChange={setPesquisa}
          categoriaFiltro={categoriaFiltro}
          onCategoriaChange={setCategoriaFiltro}
          situacaoFiltro={situacaoFiltro}
          onSituacaoChange={setSituacaoFiltro}
          categorias={categorias}
          situacoes={situacoes}
        />

        <FornecedorTabela
          loading={loading}
          fornecedores={fornecedoresPaginados}
          situacoes={situacoes}
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onOpenDrawer={handleOpenDrawer}
        />
      </main>

      <FornecedorSidebar kpis={kpis} />

      <FornecedorDrawer
        open={drawerOpen}
        fornecedor={selectedFornecedor}
        situacoes={situacoes}
        onClose={handleCloseDrawer}
      />

      <ModalFornecedor
        open={modalOpen}
        mode={modalMode}
        form={form}
        formError={formError}
        consultaInfo={consultaInfo}
        saving={saving}
        categorias={categorias}
        situacoes={situacoes}
        focusSignal={modalFocusSignal}
        fieldErrors={fieldErrors}
        onClose={handleCloseModal}
        onChange={handleChangeForm}
        onSetForm={setForm}
        onConsultarDocumento={handleConsultarDocumento}
        onSalvar={handleSalvarFornecedor}
      />
    </div>
  );
}