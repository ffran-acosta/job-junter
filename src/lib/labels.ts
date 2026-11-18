import type { ApplicationStatus, Seniority } from "@/generated/prisma/enums";

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  DRAFT: "Borrador",
  APPLIED: "Postulado",
  INTERVIEW: "Entrevista",
  OFFER: "Oferta",
  REJECTED: "Rechazado",
  NO_RESPONSE: "Sin respuesta",
};

export const SENIORITY_LABELS: Record<Seniority, string> = {
  TRAINEE: "Trainee",
  JUNIOR: "Junior",
  SEMI_SENIOR: "Semi Senior",
  SENIOR: "Senior",
  UNKNOWN: "Sin especificar",
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

export function formatDateTime(date: Date | null): string {
  return date
    ? date.toLocaleString("es-AR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : "—";
}

// Valor para <input type="datetime-local">, en la hora local del servidor (que es la misma PC).
export function toDateTimeLocal(date: Date | null): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function linkedinSearchUrl(title: string, company: string): string {
  return `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(`${title} ${company}`)}`;
}
