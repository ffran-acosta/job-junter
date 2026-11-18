import "server-only";
import { db } from "./db";

const DAY_MS = 24 * 60 * 60 * 1000;
const NO_RESPONSE_DAYS = 21;

// Postulaciones con el seguimiento vencido que siguen esperando respuesta.
export function overdueWhere(now: Date) {
  return {
    deletedAt: null,
    status: { in: ["APPLIED" as const, "NO_RESPONSE" as const] },
    followUpAt: { lte: now },
  };
}

// Pasa a "Sin respuesta" lo que lleva NO_RESPONSE_DAYS días en "Postulado" sin novedades.
export async function markStaleAsNoResponse(now: Date) {
  await db.application.updateMany({
    where: { status: "APPLIED", appliedAt: { lte: new Date(now.getTime() - NO_RESPONSE_DAYS * DAY_MS) } },
    data: { status: "NO_RESPONSE" },
  });
}
