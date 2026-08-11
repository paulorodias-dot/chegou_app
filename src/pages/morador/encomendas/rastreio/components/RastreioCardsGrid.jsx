import RastreioCard from "./RastreioCard";

export default function RastreioCardsGrid({
  items,
  onAcompanhar,
  onEditar,
  onExcluir,
}) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <section
      className="rastreio-cards-grid"
      aria-label="Lista de rastreios"
    >
      {items.map((item) => (
        <RastreioCard
          key={item.id ?? item.codigo}
          rastreio={item}
          onAcompanhar={onAcompanhar}
          onEditar={onEditar}
          onExcluir={onExcluir}
        />
      ))}
    </section>
  );
}