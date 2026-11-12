import Link from "next/link";
import { Suspense } from "react";
import { dismissJob } from "./actions";
import { SyncButton } from "@/components/sync-button";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/labels";
import { SOURCE_NAMES } from "@/lib/sources";

const PAGE_SIZE = 30;

export default function FeedPage({ searchParams }: PageProps<"/">) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Ofertas remotas</h1>
          <p className="text-sm text-muted">
            Abiertas a Argentina / LATAM, ordenadas por coincidencia con tu stack.
          </p>
        </div>
        <SyncButton />
      </div>
      <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
        <JobList searchParams={searchParams} />
      </Suspense>
      <p className="text-xs text-muted">
        Ofertas obtenidas de Remotive, Remote OK, Himalayas y Get on Board. Cada oferta enlaza a su publicación
        original.
      </p>
    </div>
  );
}

async function JobList({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const params = await searchParams;
  const minScore = Number(params.min ?? 20);
  const page = Math.max(1, Number(params.page ?? 1));
  const where = { status: "NEW" as const, score: { gte: minScore } };

  const [jobs, total] = await Promise.all([
    db.job.findMany({
      where,
      orderBy: [{ score: "desc" }, { postedAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        source: true,
        title: true,
        company: true,
        url: true,
        location: true,
        salary: true,
        postedAt: true,
        score: true,
        matched: true,
        warnings: true,
      },
    }),
    db.job.count({ where }),
  ]);
  const pages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">{total} ofertas · puntaje mínimo:</span>
        {[0, 20, 40, 60].map((value) => (
          <Link
            key={value}
            href={`/?min=${value}`}
            className={value === minScore ? "badge border-accent text-accent" : "badge"}
          >
            {value}
          </Link>
        ))}
      </div>
      {jobs.length === 0 && (
        <p className="card text-sm text-muted">No hay ofertas. Tocá «Buscar ofertas nuevas» o bajá el puntaje mínimo.</p>
      )}
      <ul className="flex flex-col gap-3">
        {jobs.map((job) => {
          const matched = JSON.parse(job.matched) as string[];
          const warnings = JSON.parse(job.warnings) as string[];
          return (
            <li key={job.id} className="card flex flex-col gap-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <a href={job.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                    {job.title}
                  </a>
                  <p className="text-sm text-muted">
                    {job.company} · {job.location} · {formatDate(job.postedAt)}
                    {job.salary && ` · ${job.salary}`}
                  </p>
                </div>
                <span className="badge font-semibold">{job.score}</span>
              </div>
              {matched.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {matched.map((m) => (
                    <span key={m} className="badge">
                      {m}
                    </span>
                  ))}
                </div>
              )}
              {warnings.map((w) => (
                <p key={w} className="text-xs text-amber-600">
                  ⚠ {w}
                </p>
              ))}
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/postular?jobId=${job.id}`} className="btn">
                  Preparar postulación
                </Link>
                <form action={dismissJob.bind(null, job.id)}>
                  <button type="submit" className="btn-secondary">
                    Descartar
                  </button>
                </form>
                <span className="ml-auto text-xs text-muted">
                  vía{" "}
                  <a href={job.url} target="_blank" rel="noreferrer" className="underline">
                    {SOURCE_NAMES[job.source]}
                  </a>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      {pages > 1 && (
        <div className="flex items-center gap-3 text-sm">
          {page > 1 && <Link href={`/?min=${minScore}&page=${page - 1}`}>← Anterior</Link>}
          <span className="text-muted">
            Página {page} de {pages}
          </span>
          {page < pages && <Link href={`/?min=${minScore}&page=${page + 1}`}>Siguiente →</Link>}
        </div>
      )}
    </>
  );
}
