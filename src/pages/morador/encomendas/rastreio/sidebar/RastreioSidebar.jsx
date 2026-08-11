import RastreioEncomendasResumoCard from "./RastreioEncomendasResumoCard";
import RastreioPortariaOrientacaoCard from "./RastreioPortariaOrientacaoCard";
import RastreioComoFuncionaCard from "./RastreioComoFuncionaCard";

export default function RastreioSidebar({
  perfil,
  onNavigate,
}) {
  return (
    <aside
      className="rastreio-sidebar"
      aria-label="Informações sobre suas encomendas"
    >
      <RastreioEncomendasResumoCard
        perfil={perfil}
        onNavigate={onNavigate}
      />

      <RastreioPortariaOrientacaoCard />

      <RastreioComoFuncionaCard />
    </aside>
  );
}