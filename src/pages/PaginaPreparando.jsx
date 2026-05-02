function PaginaPreparando({ titulo }) {
  return (
    <section className="preparing-page">
      <div className="preparing-card">
        <div className="preparing-icon">🚧</div>

        <h1>{titulo}</h1>

        <p>
          Estamos preparando o seu Chegou! para entregar uma experiência completa,
          segura e inteligente.
        </p>

        <small>Este módulo será liberado em breve.</small>
      </div>
    </section>
  )
}

export default PaginaPreparando