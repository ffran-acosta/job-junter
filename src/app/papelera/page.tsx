import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { purgeApplication, restoreApplication, restoreJob } from "../actions";
import { SubmitButton } from "@/components/submit-button";
import { db } from "@/lib/db";
import { formatDate, STATUS_LABELS } from "@/lib/labels";
import { SOURCE_NAMES } from "@/lib/sources";

export default function TrashPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Papelera</h1>
        <p className="text-sm text-muted">Postulaciones borradas y ofertas descartadas. Se pueden restaurar.</p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
        <Trash />
      </Suspense>
    </div>
  );
}

async function Trash() {
  await connection();
  const [applications, jobs] = await Promise.all([
    db.application.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      take: 100,
      select: { id: true, title: true, company: true, status: true, deletedAt: true },
    }),
    db.job.findMany({
      where: { status: "DISMISSED" },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, title: true, company: true, url: true, source: true, score: true },
    }),
  ]);

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Postulaciones ({applications.length})</h2>
        {applications.length === 0 && <p className="card text-sm text-muted">No hay postulaciones borradas.</p>}
        <ul className="flex flex-col gap-2">
          {applications.map((a) => (
            <li key={a.id} className="card flex flex-wrap items-center justify-between gap-2 text-sm">
              <div>
                <Link href={`/postulaciones/${a.id}`} className="font-medium hover:underline">
                  {a.title}
                </Link>
                <div className="text-muted">
                  {a.company} · {STATUS_LABELS[a.status]} · borrada el {formatDate(a.deletedAt)}
                </div>
              </div>
              <div className="flex gap-2">
                <form action={restoreApplication.bind(null, a.id)}>
                  <SubmitButton pendingText="Restaurando…" className="btn-secondary">
                    Restaurar
                  </SubmitButton>
                </form>
                <form action={purgeApplication.bind(null, a.id)}>
                  <SubmitButton pendingText="Borrando…" className="btn-secondary text-red-600">
                    Borrar definitivamente
                  </SubmitButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Ofertas descartadas ({jobs.length})</h2>
        {jobs.length === 0 && <p className="card text-sm text-muted">No hay ofertas descartadas.</p>}
        <ul className="flex flex-col gap-2">
          {jobs.map((job) => (
            <li key={job.id} className="card flex flex-wrap items-center justify-between gap-2 text-sm">
              <div>
                <a href={job.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                  {job.title}
                </a>
                <div className="text-muted">
                  {job.company} · puntaje {job.score} · vía {SOURCE_NAMES[job.source]}
                </div>
              </div>
              <form action={restoreJob.bind(null, job.id)}>
                <SubmitButton pendingText="Restaurando…" className="btn-secondary">
                  Volver al feed
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
