function ComingSoon({ titulo = 'Estamos preparando o seu Chegou!' }) {
  return (
    <section className="coming-page">
      <div className="coming-card">
        <div className="coming-icon">🚧</div>
        <h1>{titulo}</h1>
        <p>
          Este módulo está sendo preparado para entregar uma experiência completa,
          segura e inteligente para sua operação.
        </p>
      </div>
    </section>
  )
}

export default ComingSoon