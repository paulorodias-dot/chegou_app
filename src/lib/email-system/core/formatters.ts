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

export function normalizeTextForComparison(
  value: string,
): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

export function condominiumNameAlreadyContainsType(
  condominiumName: string,
): boolean {
  const normalizedName =
    normalizeTextForComparison(
      condominiumName,
    );

  return /^(condominio|cond\.?)\b/.test(
    normalizedName,
  );
}

export function formatCondominiumReference(
  condominiumName: string,
): string {
  const normalizedName = String(
    condominiumName || "",
  )
    .replace(/\s+/g, " ")
    .trim();

  if (!normalizedName) {
    return "do seu condomínio";
  }

  if (
    condominiumNameAlreadyContainsType(
      normalizedName,
    )
  ) {
    return `do ${normalizedName}`;
  }

  return `do condomínio ${normalizedName}`;
}

export function formatInvitationValidity(
  days: number,
): string {
  const normalizedDays = Number.isFinite(
    days,
  )
    ? Math.max(1, Math.trunc(days))
    : 1;

  return normalizedDays === 1
    ? "Este convite é válido por 1 dia."
    : `Este convite é válido por ${normalizedDays} dias.`;
}