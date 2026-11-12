import { notFound } from "next/navigation";
import { Suspense } from "react";
import { saveAnswer, saveNotes, updateApplicationStatus } from "../../actions";
import { AskForm } from "@/components/ask-form";
import { CopyButton } from "@/components/copy-button";
import { SubmitButton } from "@/components/submit-button";
import { ApplicationStatus } from "@/generated/prisma/enums";
import type { GeneratedApplication } from "@/lib/ai";
import { db } from "@/lib/db";
import { formatDate, STATUS_LABELS } from "@/lib/labels";

type Analysis = Pick<GeneratedApplication, "summary" | "strengths" | "gaps" | "missingKeywords" | "redFlags">;

export default function ApplicationPage({ params }: PageProps<"/postulaciones/[id]">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
      <ApplicationDetail params={params} />
    </Suspense>
  );
}

async function ApplicationDetail({ params }: Pick<PageProps<"/postulaciones/[id]">, "params">) {
  const { id } = await params;
  const app = await db.application.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      company: true,
      url: true,
      status: true,
      cvVariant: true,
      matchScore: true,
      analysis: true,
      coverLetter: true,
      recruiterMessage: true,
      formAnswers: true,
      appliedAt: true,
      followUpAt: true,
      notes: true,
    },
  });
  if (!app) notFound();

  const analysis = JSON.parse(app.analysis) as Analysis;
  const formAnswers = JSON.parse(app.formAnswers) as GeneratedApplication["formAnswers"];
  const cvFile = `cv-${app.cvVariant}.html`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{app.title}</h1>
          <p className="text-sm text-muted">
            {app.company}
            {app.url && (
              <>
                {" · "}
                <a href={app.url} target="_blank" rel="noreferrer" className="underline">
                  Ver oferta
                </a>
              </>
            )}
            {" · "}Postulado: {formatDate(app.appliedAt)} · Seguimiento: {formatDate(app.followUpAt)}
          </p>
        </div>
        <span className="badge text-base font-semibold">Match {app.matchScore}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.values(ApplicationStatus).map((status) => (
          <form key={status} action={updateApplicationStatus.bind(null, app.id, status)}>
            <button
              type="submit"
              className={status === app.status ? "btn" : "btn-secondary"}
              disabled={status === app.status}
            >
              {STATUS_LABELS[status]}
            </button>
          </form>
        ))}
      </div>

      <section className="card flex flex-col gap-3">
        <h2 className="font-medium">Análisis</h2>
        <p className="text-sm">{analysis.summary}</p>
        <p className="text-sm">
          CV a enviar:{" "}
          <a href={`/cv/${cvFile}`} target="_blank" rel="noreferrer" className="font-medium underline">
            {cvFile}
          </a>{" "}
          <span className="text-muted">(abrilo e imprimí a PDF con Ctrl+P)</span>
        </p>
        <List title="Fortalezas" items={analysis.strengths} />
        {analysis.gaps.length > 0 && (
          <div className="text-sm">
            <h3 className="font-medium">Brechas y cómo cubrirlas</h3>
            <ul className="mt-1 flex list-disc flex-col gap-1 pl-5">
              {analysis.gaps.map((g) => (
                <li key={g.requirement}>
                  <span className="font-medium">{g.requirement}:</span> {g.howToAddress}
                </li>
              ))}
            </ul>
          </div>
        )}
        {analysis.missingKeywords.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 text-sm">
            <span className="font-medium">Keywords que faltan en el CV:</span>
            {analysis.missingKeywords.map((k) => (
              <span key={k} className="badge">
                {k}
              </span>
            ))}
          </div>
        )}
        {analysis.redFlags.length > 0 && <List title="⚠ Señales de alerta" items={analysis.redFlags} />}
      </section>

      <TextSection title="Carta de presentación" text={app.coverLetter} />
      <TextSection title="Mensaje para el recruiter" text={app.recruiterMessage} />

      <section className="card flex flex-col gap-4">
        <h2 className="font-medium">Respuestas del formulario</h2>
        {formAnswers.map((qa, i) => (
          <div key={i} className="flex flex-col gap-2 border-b border-border pb-4 last:border-0">
            <p className="text-sm font-medium">{qa.question}</p>
            <p className="whitespace-pre-wrap text-sm">{qa.answer}</p>
            <div className="flex gap-2">
              <CopyButton text={qa.answer} />
              <form action={saveAnswer}>
                <input type="hidden" name="question" value={qa.question} />
                <input type="hidden" name="answer" value={qa.answer} />
                <SubmitButton pendingText="Guardando…" className="btn-secondary">
                  Guardar en el banco
                </SubmitButton>
              </form>
            </div>
          </div>
        ))}
        <AskForm applicationId={app.id} />
      </section>

      <section className="card flex flex-col gap-2">
        <h2 className="font-medium">Notas</h2>
        <form action={saveNotes.bind(null, app.id)} className="flex flex-col gap-2">
          <textarea name="notes" rows={4} defaultValue={app.notes} className="input text-sm" />
          <div>
            <SubmitButton pendingText="Guardando…" className="btn-secondary">
              Guardar notas
            </SubmitButton>
          </div>
        </form>
      </section>
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="text-sm">
      <h3 className="font-medium">{title}</h3>
      <ul className="mt-1 flex list-disc flex-col gap-1 pl-5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function TextSection({ title, text }: { title: string; text: string }) {
  return (
    <section className="card flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">{title}</h2>
        <CopyButton text={text} />
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
    </section>
  );
}
