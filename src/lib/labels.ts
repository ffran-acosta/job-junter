import type { ApplicationStatus } from "@/generated/prisma/enums";

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  DRAFT: "Borrador",
  APPLIED: "Postulado",
  INTERVIEW: "Entrevista",
  OFFER: "Oferta",
  REJECTED: "Rechazado",
  NO_RESPONSE: "Sin respuesta",
};

export const TOOL_LABELS = {
  email: "Mail de postulación",
  "cover-letter": "Carta de presentación",
  "linkedin-note": "Nota de conexión en LinkedIn",
  "recruiter-reply": "Responder a un recruiter",
  "follow-up": "Mail de seguimiento",
  "thank-you": "Agradecimiento post entrevista",
  "interview-prep": "Preparar entrevista",
  salary: "Pretensión salarial",
  "cv-tailor": "Ajustar CV a la oferta",
} as const;
export type ToolKind = keyof typeof TOOL_LABELS;

export function formatDate(date: Date | null): string {
  return date ? date.toLocaleDateString("es-AR", { day: "2-digit", month: "short" }) : "—";
}
