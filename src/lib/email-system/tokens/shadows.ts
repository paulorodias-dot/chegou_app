export const emailShadows = {
  /**
   * Container principal do e-mail.
   * Sombra discreta para criar profundidade sem pesar o layout.
   */
  containerLight: "0 12px 32px rgba(15, 23, 42, 0.08)",
  containerDark: "0 14px 36px rgba(0, 0, 0, 0.28)",

  /**
   * Cards internos.
   * Utilizados nos blocos de conteúdo, CTA, avisos e informações.
   */
  cardLight: "0 6px 18px rgba(15, 23, 42, 0.05)",
  cardDark: "0 6px 18px rgba(0, 0, 0, 0.20)",

  /**
   * Linha Premium de separação.
   * Cria uma leve sensação de profundidade entre conteúdo e rodapé.
   */
  dividerLight: "0 -6px 18px rgba(15, 23, 42, 0.04)",
  dividerDark: "0 -6px 18px rgba(0, 0, 0, 0.18)",
} as const;