import { connection } from "next/server";
import { Suspense } from "react";
import { deleteSavedAnswer, saveAnswer } from "../actions";
import { CopyButton } from "@/components/copy-button";
import { SubmitButton } from "@/components/submit-button";
import { db } from "@/lib/db";

export default function SavedAnswersPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Respuestas guardadas</h1>
        <p className="text-sm text-muted">
          Se usan como referencia en cada postulación nueva para que las respuestas sean consistentes.
        </p>
      </div>
      <form action={saveAnswer} className="card flex flex-col gap-3">
        <label className="field">
          Pregunta
          <input name="question" required className="input" />
        </label>
        <label className="field">
          Respuesta
          <textarea name="answer" required rows={4} className="input text-sm" />
        </label>
        <div>
          <SubmitButton pendingText="Guardando…">Agregar</SubmitButton>
        </div>
      </form>
      <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
        <SavedAnswers />
      </Suspense>
    </div>
  );
}

async function SavedAnswers() {
  await connection();
  const answers = await db.savedAnswer.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, question: true, answer: true },
  });
  return (
    <ul className="flex flex-col gap-3">
      {answers.map((a) => (
        <li key={a.id} className="card flex flex-col gap-2">
          <p className="text-sm font-medium">{a.question}</p>
          <p className="whitespace-pre-wrap text-sm">{a.answer}</p>
          <div className="flex gap-2">
            <CopyButton text={a.answer} />
            <form action={deleteSavedAnswer.bind(null, a.id)}>
              <button type="submit" className="btn-secondary">
                Eliminar
              </button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
