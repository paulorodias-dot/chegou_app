import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
} from "lucide-react";

import "./DateRangePickerPremium.css";

const ATALHOS = [
  { id: "hoje", label: "Hoje", dias: 0 },
  { id: "ontem", label: "Ontem", dias: -1 },
  { id: "7", label: "7 dias", dias: 7 },
  { id: "15", label: "15 dias", dias: 15 },
  { id: "30", label: "30 dias", dias: 30 },
  { id: "90", label: "90 dias", dias: 90 },
  { id: "personalizado", label: "Personalizado", dias: null },
];

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatarISO(data) {
  return data.toISOString().slice(0, 10);
}

function criarDataLocal(iso) {
  if (!iso) return null;
  const [ano, mes, dia] = iso.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

function formatarDataBR(iso) {
  if (!iso) return "—";

  const data = criarDataLocal(iso);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(data);
}

function calcularPeriodoPorAtalho(atalhoId) {
  const hoje = new Date();

  if (atalhoId === "hoje") {
    const data = formatarISO(hoje);
    return { inicio: data, fim: data };
  }

  if (atalhoId === "ontem") {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const data = formatarISO(ontem);
    return { inicio: data, fim: data };
  }

  const dias = Number(atalhoId || 30);
  const inicio = new Date();

  inicio.setDate(hoje.getDate() - dias + 1);

  return {
    inicio: formatarISO(inicio),
    fim: formatarISO(hoje),
  };
}

function limitarPeriodo({ inicio, fim }) {
  const hoje = hojeISO();

  let dataInicio = inicio || calcularPeriodoPorAtalho("30").inicio;
  let dataFim = fim || hoje;

  if (dataFim > hoje) dataFim = hoje;
  if (dataInicio > dataFim) dataInicio = dataFim;

  const inicioDate = criarDataLocal(dataInicio);
  const fimDate = criarDataLocal(dataFim);

  const diffDias = Math.ceil((fimDate - inicioDate) / 86400000) + 1;

  if (diffDias > 365) {
    const novoInicio = new Date(fimDate);
    novoInicio.setDate(novoInicio.getDate() - 364);
    dataInicio = formatarISO(novoInicio);
  }

  return {
    inicio: dataInicio,
    fim: dataFim,
  };
}

function obterDiasMes(dataBase) {
  const ano = dataBase.getFullYear();
  const mes = dataBase.getMonth();

  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);

  const dias = [];

  const inicioSemana = primeiroDia.getDay();

  for (let i = inicioSemana; i > 0; i -= 1) {
    dias.push({
      data: new Date(ano, mes, 1 - i),
      foraMes: true,
    });
  }

  for (let dia = 1; dia <= ultimoDia.getDate(); dia += 1) {
    dias.push({
      data: new Date(ano, mes, dia),
      foraMes: false,
    });
  }

  while (dias.length % 7 !== 0) {
    const ultimo = dias[dias.length - 1].data;
    const proximo = new Date(ultimo);
    proximo.setDate(ultimo.getDate() + 1);

    dias.push({
      data: proximo,
      foraMes: true,
    });
  }

  return dias;
}

export default function DateRangePickerPremium({
  value,
  dataInicio,
  dataFim,
  onChange,
  label = "Período",
  persistKey,
  disabled = false,
}) {
  const inicial = useMemo(() => {
    const base =
      value ||
      {
        inicio: dataInicio,
        fim: dataFim,
      };

    return limitarPeriodo({
      inicio: base?.inicio,
      fim: base?.fim,
    });
  }, [value, dataInicio, dataFim]);

  const [aberto, setAberto] = useState(false);
  const [abrirParaCima, setAbrirParaCima] = useState(false);
  const [alinhamento, setAlinhamento] = useState("");

  const [atalhoAtivo, setAtalhoAtivo] = useState("30");
  const [periodoTemp, setPeriodoTemp] = useState(inicial);
  const [mesVisivel, setMesVisivel] = useState(() => criarDataLocal(inicial.fim) || new Date());

  const wrapperRef = useRef(null);

  const periodoFinal = limitarPeriodo({
    inicio: value?.inicio || dataInicio || inicial.inicio,
    fim: value?.fim || dataFim || inicial.fim,
  });

  const diasSelecionados =
    Math.ceil((criarDataLocal(periodoFinal.fim) - criarDataLocal(periodoFinal.inicio)) / 86400000) + 1;

  useEffect(() => {
    if (!persistKey) return;

    const salvo = localStorage.getItem(persistKey);

    if (!salvo) return;

    try {
      const periodoSalvo = limitarPeriodo(JSON.parse(salvo));
      onChange?.(periodoSalvo);
    } catch {
      localStorage.removeItem(persistKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistKey]);

  useEffect(() => {
    function handleClickFora(event) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target)) {
        setAberto(false);
      }
    }

    function handleEsc(event) {
      if (event.key === "Escape") setAberto(false);
    }

    document.addEventListener("mousedown", handleClickFora);
    window.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickFora);
      window.removeEventListener("keydown", handleEsc);
    };
  }, []);

  function calcularPosicaoPopover() {
    if (!wrapperRef.current) return;

    const rect = wrapperRef.current.getBoundingClientRect();

    const larguraPopover = 390;
    const margemTela = 12;

    const centroBotao = rect.left + rect.width / 2;
    const metadePopover = larguraPopover / 2;

    const passaEsquerda = centroBotao - metadePopover < margemTela;
    const passaDireita = centroBotao + metadePopover > window.innerWidth - margemTela;

    setAbrirParaCima(false);

    if (passaEsquerda) {
      setAlinhamento("align-left");
    } else if (passaDireita) {
      setAlinhamento("align-right");
    } else {
      setAlinhamento("");
    }
  }

  function aplicarPeriodo(periodo) {
    const periodoSeguro = limitarPeriodo(periodo);

    if (persistKey) {
      localStorage.setItem(persistKey, JSON.stringify(periodoSeguro));
    }

    onChange?.(periodoSeguro);
  }

  function selecionarAtalho(atalho) {
    setAtalhoAtivo(atalho.id);

    if (atalho.id === "personalizado") return;

    const periodo = calcularPeriodoPorAtalho(atalho.id);

    setPeriodoTemp(periodo);
    setMesVisivel(criarDataLocal(periodo.fim));
    aplicarPeriodo(periodo);
    setAberto(false);
  }

  function selecionarDia(iso) {
    if (iso > hojeISO()) return;

    const atual = periodoTemp || periodoFinal;

    if (!atual.inicio || (atual.inicio && atual.fim)) {
      setPeriodoTemp({
        inicio: iso,
        fim: "",
      });
      return;
    }

    const novoPeriodo =
      iso < atual.inicio
        ? { inicio: iso, fim: atual.inicio }
        : { inicio: atual.inicio, fim: iso };

    setPeriodoTemp(limitarPeriodo(novoPeriodo));
  }

  function aplicarPersonalizado() {
    if (!periodoTemp.inicio || !periodoTemp.fim) return;

    aplicarPeriodo(periodoTemp);
    setAberto(false);
  }

  const diasMes = obterDiasMes(mesVisivel);
  const tituloMes = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(mesVisivel);

  return (
    <div className={["drp", alinhamento].filter(Boolean).join(" ")} ref={wrapperRef}>
      <label className="drp-label">{label}</label>

      <button
        type="button"
        className="drp-trigger"
        onClick={() => {
          if (disabled) return;
          setPeriodoTemp(periodoFinal);
          setMesVisivel(criarDataLocal(periodoFinal.fim) || new Date());
          calcularPosicaoPopover();
          setAberto((atual) => !atual);
        }}
        disabled={disabled}
      >
        <CalendarDays size={16} />
        <span>
          <strong>
            {atalhoAtivo === "30" ? "Últimos 30 dias" : `${formatarDataBR(periodoFinal.inicio)} → ${formatarDataBR(periodoFinal.fim)}`}
          </strong>
          <small>{diasSelecionados} dias selecionados</small>
        </span>
      </button>

      {aberto ? (
        <div className="drp-popover drp-floating">
          <div className="drp-popover-head">
            <div>
              <strong>Selecionar período</strong>
              <span>Filtro padrão Premium do Sistema Chegou!</span>
            </div>

            <button type="button" onClick={() => setAberto(false)}>
              <X size={16} />
            </button>
          </div>

          <div className="drp-shortcuts">
            {ATALHOS.map((atalho) => (
              <button
                key={atalho.id}
                type="button"
                className={atalhoAtivo === atalho.id ? "active" : ""}
                onClick={() => selecionarAtalho(atalho)}
              >
                {atalho.id === "personalizado" ? (
                  <SlidersHorizontal size={14} />
                ) : (
                  <CalendarDays size={14} />
                )}
                {atalho.label}
              </button>
            ))}
          </div>

          <div className="drp-fields">
            <div>
              <span>De</span>
              <strong>{formatarDataBR(periodoTemp.inicio)}</strong>
            </div>

            <div>
              <span>Até</span>
              <strong>{formatarDataBR(periodoTemp.fim)}</strong>
            </div>
          </div>

          <div className="drp-calendar">
            <div className="drp-calendar-head">
              <button
                type="button"
                onClick={() =>
                  setMesVisivel((old) => new Date(old.getFullYear(), old.getMonth() - 1, 1))
                }
              >
                <ChevronLeft size={16} />
              </button>

              <strong>{tituloMes}</strong>

              <button
                type="button"
                onClick={() =>
                  setMesVisivel((old) => new Date(old.getFullYear(), old.getMonth() + 1, 1))
                }
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="drp-weekdays">
              <span>DOM</span>
              <span>SEG</span>
              <span>TER</span>
              <span>QUA</span>
              <span>QUI</span>
              <span>SEX</span>
              <span>SÁB</span>
            </div>

            <div className="drp-days">
              {diasMes.map(({ data, foraMes }) => {
                const iso = formatarISO(data);
                const inicio = periodoTemp.inicio;
                const fim = periodoTemp.fim;

                const isInicio = iso === inicio;
                const isFim = iso === fim;
                const isPeriodo = inicio && fim && iso > inicio && iso < fim;
                const isFuturo = iso > hojeISO();

                return (
                  <button
                    key={iso}
                    type="button"
                    className={[
                      foraMes ? "muted" : "",
                      isInicio ? "start" : "",
                      isFim ? "end" : "",
                      isPeriodo ? "range" : "",
                      isFuturo ? "disabled" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={isFuturo}
                    onClick={() => selecionarDia(iso)}
                  >
                    {data.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="drp-footer">
            <button
              type="button"
              className="ghost"
              onClick={() => {
                const padrao = calcularPeriodoPorAtalho("30");
                setAtalhoAtivo("30");
                setPeriodoTemp(padrao);
                aplicarPeriodo(padrao);
                setAberto(false);
              }}
            >
              Limpar
            </button>

            <button type="button" className="secondary" onClick={() => setAberto(false)}>
              Cancelar
            </button>

            <button type="button" className="primary" onClick={aplicarPersonalizado}>
              Aplicar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}