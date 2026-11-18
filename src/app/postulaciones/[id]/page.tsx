import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  deleteApplication,
  restoreApplication,
  saveAnswer,
  saveInterview,
  saveNotes,
  updateApplicationDetails,
  updateApplicationStatus,
  updateApplicationText,
  updateFormAnswer,
} from "../../actions";
import { AskForm } from "@/components/ask-form";
import { GeneratedText } from "@/components/generated-text";
import { SubmitButton } from "@/components/submit-button";
import { ApplicationStatus } from "@/generated/prisma/enums";
import type { Addition, GeneratedApplication } from "@/lib/ai";
import { db } from "@/lib/db";
import {
  formatDate,
  formatDateTime,
  linkedinSearchUrl,
  STATUS_LABELS,
  TOOL_LABELS,
  toDateTimeLocal,
  type ToolKind,
} from "@/lib/labels";

type Analysis = Pick<GeneratedApplication, "summary" | "strengths" | "gaps" | "missingKeywords" | "redFlags">;
// Las postulaciones anteriores a las "additions" no las tienen.
type FormAnswer = Omit<GeneratedApplication["formAnswers"][number], "additions"> & { additions?: Addition[] };
type StoredAdditions = { coverLetter?: Addition[]; recruiterMessage?: Addition[] };

const RELATED_TOOLS: ToolKind[] = ["follow-up", "interview-prep", "thank-you", "recruiter-reply"];

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
      linkedinUrl: true,
      status: true,
      cvVariant: true,
      matchScore: true,
      analysis: true,
      coverLetter: true,
      recruiterMessage: true,
      formAnswers: true,
      additions: true,
      appliedAt: true,
      followUpAt: true,
      interviewAt: true,
      notes: true,
      deletedAt: true,
    },
  });
  if (!app) notFound();

  const analysis = JSON.parse(app.analysis) as Analysis;
  const formAnswers = JSON.parse(app.formAnswers) as FormAnswer[];
  const additions = JSON.parse(app.additions) as StoredAdditions;
  const cvFile = `cv-${app.cvVariant}`;

  return (
    <div className="flex flex-col gap-5">
      {app.deletedAt && (
        <div className="card flex flex-wrap items-center justify-between gap-2 border-amber-500 text-sm">
          <span>Esta postulación está en la papelera.</span>
          <form action={restoreApplication.bind(null, app.id)}>
            <SubmitButton pendingText="Restaurando…" className="btn-secondary">
              Restaurar
            </SubmitButton>
          </form>
        </div>
      )}

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
            {" · "}
            {app.linkedinUrl ? (
              <a href={app.linkedinUrl} target="_blank" rel="noreferrer" className="underline">
                LinkedIn
              </a>
            ) : (
              <a href={linkedinSearchUrl(app.title, app.company)} target="_blank" rel="noreferrer" className="underline">
                Buscar en LinkedIn
              </a>
            )}
            {" · "}Postulado: {formatDate(app.appliedAt)} · Seguimiento: {formatDate(app.followUpAt)}
            {app.interviewAt && ` · Entrevista: ${formatDateTime(app.interviewAt)}`}
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
        <h2 className="font-medium">Seguimiento y entrevista</h2>
        <div className="flex flex-wrap gap-2">
          {RELATED_TOOLS.map((kind) => (
            <Link key={kind} href={`/herramientas?kind=${kind}&app=${app.id}`} className="btn-secondary">
              {TOOL_LABELS[kind]}
            </Link>
          ))}
        </div>
        <form action={saveInterview.bind(null, app.id)} className="flex flex-wrap items-end gap-2">
          <label className="field">
            Fecha y hora de la entrevista
            <input type="datetime-local" name="interviewAt" defaultValue={toDateTimeLocal(app.interviewAt)} className="input" />
          </label>
          <SubmitButton pendingText="Guardando…" className="btn-secondary">
            Guardar fecha
          </SubmitButton>
        </form>
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="font-medium">Análisis</h2>
        <p className="text-sm">{analysis.summary}</p>
        <p className="text-sm">
          CV a enviar:{" "}
          <a href={`/cv/${cvFile}.pdf`} className="font-medium underline">
            Descargar PDF
          </a>{" "}
          <span className="text-muted">
            ({cvFile} ·{" "}
            <a href={`/cv/${cvFile}.html`} target="_blank" rel="noreferrer" className="underline">
              ver HTML
            </a>
            )
          </span>
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

      <section className="card flex flex-col gap-2">
        <h2 className="font-medium">Carta de presentación</h2>
        <GeneratedText
          text={app.coverLetter}
          additions={additions.coverLetter}
          save={updateApplicationText.bind(null, app.id, "coverLetter")}
        />
      </section>

      <section className="card flex flex-col gap-2">
        <h2 className="font-medium">Mensaje para el recruiter</h2>
        <GeneratedText
          text={app.recruiterMessage}
          additions={additions.recruiterMessage}
          save={updateApplicationText.bind(null, app.id, "recruiterMessage")}
        />
      </section>

      <section className="card flex flex-col gap-4">
        <h2 className="font-medium">Respuestas del formulario</h2>
        {formAnswers.map((qa, i) => (
          <div key={i} className="flex flex-col gap-2 border-b border-border pb-4 last:border-0">
            <p className="text-sm font-medium">{qa.question}</p>
            <GeneratedText text={qa.answer} additions={qa.additions} save={updateFormAnswer.bind(null, app.id, i)}>
              <form action={saveAnswer}>
                <input type="hidden" name="question" value={qa.question} />
                <input type="hidden" name="answer" value={qa.answer} />
                <SubmitButton pendingText="Guardando…" className="btn-secondary">
                  Guardar en el banco
                </SubmitButton>
              </form>
            </GeneratedText>
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

      <details className="card">
        <summary className="cursor-pointer font-medium">Editar datos de la postulación</summary>
        <form action={updateApplicationDetails.bind(null, app.id)} className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="field">
            Puesto
            <input name="title" required defaultValue={app.title} className="input" />
          </label>
          <label className="field">
            Empresa
            <input name="company" required defaultValue={app.company} className="input" />
          </label>
          <label className="field">
            Link de la oferta
            <input name="url" type="url" defaultValue={app.url ?? ""} className="input" />
          </label>
          <label className="field">
            Link de LinkedIn donde te postulaste
            <input name="linkedinUrl" type="url" defaultValue={app.linkedinUrl ?? ""} className="input" />
          </label>
          <div>
            <SubmitButton pendingText="Guardando…">Guardar datos</SubmitButton>
          </div>
        </form>
      </details>

      {!app.deletedAt && (
        <form action={deleteApplication.bind(null, app.id)}>
          <SubmitButton pendingText="Moviendo…" className="btn-secondary text-red-600">
            Mover a la papelera
          </SubmitButton>
        </form>
      )}
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
