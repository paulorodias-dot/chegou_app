export function formatInvitationValidity(days: number): string {
  const normalizedDays = Number.isFinite(days)
    ? Math.max(1, Math.trunc(days))
    : 1;

  return normalizedDays === 1
    ? "Este convite é válido por 1 dia."
    : `Este convite é válido por ${normalizedDays} dias.`;
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function normalizeRecipientName(
  name: string,
  fallback = "Morador",
): string {
  const normalizedName = String(name || "")
    .replace(/\s+/g, " ")
    .trim();

  return normalizedName || fallback;
}

export function normalizeCondominiumName(
  name: string,
  fallback = "seu condomínio",
): string {
  const normalizedName = String(name || "")
    .replace(/\s+/g, " ")
    .trim();

  return normalizedName || fallback;
}