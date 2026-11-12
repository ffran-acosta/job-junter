import type { ApplicationStatus } from "@/generated/prisma/enums";

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  DRAFT: "Borrador",
  APPLIED: "Postulado",
  INTERVIEW: "Entrevista",
  OFFER: "Oferta",
  REJECTED: "Rechazado",
  NO_RESPONSE: "Sin respuesta",
};

export function formatDate(date: Date | null): string {
  return date ? date.toLocaleDateString("es-AR", { day: "2-digit", month: "short" }) : "—";
}
