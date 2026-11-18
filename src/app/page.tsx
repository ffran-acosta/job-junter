import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { dismissJob } from "./actions";
import { SyncButton } from "@/components/sync-button";
import { overdueWhere } from "@/lib/applications";
import { db } from "@/lib/db";
import type { Seniority } from "@/generated/prisma/enums";
import { formatDate, linkedinSearchUrl, SENIORITY_LABELS, STATUS_LABELS } from "@/lib/labels";
import { SOURCE_NAMES } from "@/lib/sources";

const PAGE_SIZE = 30;

// Para comparar empresas entre fuentes: "Acme, Inc." y "acme" son la misma.
function companyKey(company: string): string {
  return company
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|gmbh|s\.?a|s\.?r\.?l|corp|co)\b\.?/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export default function FeedPage({ searchParams }: PageProps<"/">) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Ofertas remotas</h1>
          <p className="text-sm text-muted">
            Abiertas a Argentina / LATAM, por coincidencia con tu stack o por fecha.
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
  await connection();
  const params = await searchParams;
  const minScore = Number(params.min ?? 20);
  const page = Math.max(1, Number(params.page ?? 1));
  const seniority = Object.hasOwn(SENIORITY_LABELS, String(params.s)) ? (params.s as Seniority) : undefined;
  const recent = params.order === "recent";
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const where = {
    status: "NEW" as const,
    score: { gte: minScore },
    seniority,
    ...(q && { OR: [{ title: { contains: q } }, { company: { contains: q } }, { tags: { contains: q } }] }),
  };
  const href = (changes: Record<string, string | number | undefined>) => {
    const query = { min: minScore, s: seniority, order: recent ? "recent" : undefined, q: q || undefined, ...changes };
    const search = new URLSearchParams(
      Object.entries(query).flatMap(([k, v]) => (v === undefined ? [] : [[k, String(v)]])),
    );
    return `/?${search}`;
  };

  const [jobs, total] = await Promise.all([
    db.job.findMany({
      where,
      orderBy: recent
        ? [{ postedAt: { sort: "desc", nulls: "last" } }, { score: "desc" }]
        : [{ score: "desc" }, { postedAt: "desc" }],
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
        seniority: true,
        matched: true,
        warnings: true,
      },
    }),
    db.job.count({ where }),
  ]);
  const pages = Math.ceil(total / PAGE_SIZE);
  const [applications, overdue] = await Promise.all([
    db.application.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 1000,
      select: { id: true, company: true, title: true, status: true },
    }),
    db.application.count({ where: overdueWhere(new Date()) }),
  ]);
  const appliedByCompany = new Map(applications.map((a) => [companyKey(a.company), a]));

  return (
    <>
      {overdue > 0 && (
        <Link href="/postulaciones" className="card border-amber-500 text-sm hover:underline">
          Tenés {overdue} {overdue === 1 ? "seguimiento pendiente" : "seguimientos pendientes"} →
        </Link>
      )}
      <form action="/" className="flex gap-2">
        <input type="hidden" name="min" value={minScore} />
        {seniority && <input type="hidden" name="s" value={seniority} />}
        {recent && <input type="hidden" name="order" value="recent" />}
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Buscar por puesto, empresa o tecnología"
          className="input flex-1 text-sm"
        />
        <button type="submit" className="btn-secondary">
          Buscar
        </button>
      </form>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">{total} ofertas · puntaje mínimo:</span>
        {[0, 20, 40, 60].map((value) => (
          <Link
            key={value}
            href={href({ min: value, page: undefined })}
            className={value === minScore ? "badge border-accent text-accent" : "badge"}
          >
            {value}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Seniority:</span>
        {[undefined, ...(Object.keys(SENIORITY_LABELS) as Seniority[])].map((value) => (
          <Link
            key={value ?? "all"}
            href={href({ s: value, page: undefined })}
            className={value === seniority ? "badge border-accent text-accent" : "badge"}
          >
            {value ? SENIORITY_LABELS[value] : "Todos"}
          </Link>
        ))}
        <span className="ml-auto text-muted">Orden:</span>
        <Link href={href({ order: undefined, page: undefined })} className={recent ? "badge" : "badge border-accent text-accent"}>
          Puntaje
        </Link>
        <Link href={href({ order: "recent", page: undefined })} className={recent ? "badge border-accent text-accent" : "badge"}>
          Más nuevas
        </Link>
      </div>
      {jobs.length === 0 && (
        <p className="card text-sm text-muted">No hay ofertas. Tocá «Buscar ofertas nuevas» o bajá el puntaje mínimo.</p>
      )}
      <ul className="flex flex-col gap-3">
        {jobs.map((job) => {
          const matched = JSON.parse(job.matched) as string[];
          const warnings = JSON.parse(job.warnings) as string[];
          const previous = appliedByCompany.get(companyKey(job.company));
          return (
            <li key={job.id} className="card flex flex-col gap-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <a href={job.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                    {job.title}
                  </a>
                  <p className="text-sm text-muted">
                    {job.company} · {job.location} · {formatDate(job.postedAt)}
                    {job.seniority !== "UNKNOWN" && ` · ${SENIORITY_LABELS[job.seniority]}`}
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
              {previous && (
                <p className="text-xs text-accent">
                  Ya tenés una postulación a {previous.company}:{" "}
                  <Link href={`/postulaciones/${previous.id}`} className="underline">
                    {previous.title}
                  </Link>{" "}
                  ({STATUS_LABELS[previous.status]})
                </p>
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
                <a
                  href={linkedinSearchUrl(job.title, job.company)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                >
                  Buscar en LinkedIn
                </a>
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
          {page > 1 && <Link href={href({ page: page - 1 })}>← Anterior</Link>}
          <span className="text-muted">
            Página {page} de {pages}
          </span>
          {page < pages && <Link href={href({ page: page + 1 })}>Siguiente →</Link>}
        </div>
      )}
    </>
  );
}
