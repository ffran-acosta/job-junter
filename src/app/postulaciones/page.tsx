import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { postponeFollowUp } from "../actions";
import { ApplicationStatus } from "@/generated/prisma/enums";
import { markStaleAsNoResponse, overdueWhere } from "@/lib/applications";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, STATUS_LABELS } from "@/lib/labels";

const PAGE_SIZE = 30;

export default function ApplicationsPage({ searchParams }: PageProps<"/postulaciones">) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Postulaciones</h1>
        <Link href="/papelera" className="text-sm text-muted underline">
          Papelera
        </Link>
      </div>
      <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
        <ApplicationList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ApplicationList({ searchParams }: Pick<PageProps<"/postulaciones">, "searchParams">) {
  await connection();
  const params = await searchParams;
  const status = Object.hasOwn(STATUS_LABELS, String(params.status))
    ? (params.status as ApplicationStatus)
    : undefined;
  const page = Math.max(1, Number(params.page) || 1);
  const href = (changes: { status?: ApplicationStatus; page?: number }) => {
    const query = new URLSearchParams();
    const next = { status, ...changes };
    if (next.status) query.set("status", next.status);
    if (next.page && next.page > 1) query.set("page", String(next.page));
    return `/postulaciones?${query}`;
  };

  const now = new Date();
  await markStaleAsNoResponse(now);
  const where = { deletedAt: null, status };
  const [applications, total, byStatus, interviewed, overdue, interviews] = await Promise.all([
    db.application.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        company: true,
        status: true,
        matchScore: true,
        appliedAt: true,
        followUpAt: true,
      },
    }),
    db.application.count({ where }),
    db.application.groupBy({ by: ["status"], where: { deletedAt: null }, _count: { _all: true } }),
    db.application.count({
      where: { deletedAt: null, OR: [{ interviewAt: { not: null } }, { status: { in: ["INTERVIEW", "OFFER"] } }] },
    }),
    db.application.findMany({
      where: overdueWhere(now),
      orderBy: { followUpAt: "asc" },
      take: 50,
      select: { id: true, title: true, company: true },
    }),
    db.application.findMany({
      where: { deletedAt: null, interviewAt: { gte: now } },
      orderBy: { interviewAt: "asc" },
      take: 20,
      select: { id: true, title: true, company: true, interviewAt: true },
    }),
  ]);

  const counts = Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])) as Partial<
    Record<ApplicationStatus, number>
  >;
  const count = (s: ApplicationStatus) => counts[s] ?? 0;
  const applied = byStatus.reduce((sum, s) => sum + s._count._all, 0) - count("DRAFT");
  const responded = count("INTERVIEW") + count("OFFER") + count("REJECTED");
  const pages = Math.ceil(total / PAGE_SIZE);
  const overdueIds = new Set(overdue.map((a) => a.id));

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Metric label="Postuladas" value={applied} />
        <Metric label="Con respuesta" value={responded} />
        <Metric label="Tasa de respuesta" value={applied ? `${Math.round((responded / applied) * 100)}%` : "—"} />
        <Metric label="Llegaron a entrevista" value={interviewed} />
        <Metric label="Ofertas" value={count("OFFER")} />
      </div>

      {interviews.length > 0 && (
        <div className="card flex flex-col gap-2 border-accent">
          <h2 className="font-medium">Próximas entrevistas</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {interviews.map((a) => (
              <li key={a.id}>
                <span className="font-medium">{formatDateTime(a.interviewAt)}</span> ·{" "}
                <Link href={`/postulaciones/${a.id}`} className="underline">
                  {a.title} · {a.company}
                </Link>{" "}
                ·{" "}
                <Link href={`/herramientas?kind=interview-prep&app=${a.id}`} className="text-muted underline">
                  Preparar entrevista
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {overdue.length > 0 && (
        <div className="card flex flex-col gap-2 border-amber-500">
          <h2 className="font-medium">Seguimientos pendientes ({overdue.length})</h2>
          <p className="text-sm text-muted">
            Pasó una semana sin novedades. Mandá un mensaje corto de seguimiento al recruiter.
          </p>
          <ul className="flex flex-col gap-1 text-sm">
            {overdue.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2">
                <Link href={`/postulaciones/${a.id}`} className="underline">
                  {a.title} · {a.company}
                </Link>
                <Link href={`/herramientas?kind=follow-up&app=${a.id}`} className="text-xs underline">
                  Generar seguimiento
                </Link>
                <form action={postponeFollowUp.bind(null, a.id)}>
                  <button type="submit" className="text-xs text-muted underline">
                    Ya hice el seguimiento (posponer 7 días)
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Estado:</span>
        {[undefined, ...Object.values(ApplicationStatus)].map((value) => (
          <Link
            key={value ?? "all"}
            href={href({ status: value, page: undefined })}
            className={value === status ? "badge border-accent text-accent" : "badge"}
          >
            {value ? `${STATUS_LABELS[value]} (${count(value)})` : "Todas"}
          </Link>
        ))}
      </div>

      {applications.length === 0 ? (
        <p className="card text-sm text-muted">
          {status ? (
            "No hay postulaciones con ese estado."
          ) : (
            <>
              Todavía no hay postulaciones.{" "}
              <Link href="/postular" className="underline">
                Creá la primera
              </Link>
              .
            </>
          )}
        </p>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-muted">
              <tr className="border-b border-border">
                <th className="p-3 font-normal">Puesto</th>
                <th className="p-3 font-normal">Estado</th>
                <th className="p-3 font-normal">Match</th>
                <th className="p-3 font-normal">Postulado</th>
                <th className="p-3 font-normal">Seguimiento</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0">
                  <td className="p-3">
                    <Link href={`/postulaciones/${a.id}`} className="font-medium hover:underline">
                      {a.title}
                    </Link>
                    <div className="text-muted">{a.company}</div>
                  </td>
                  <td className="p-3">{STATUS_LABELS[a.status]}</td>
                  <td className="p-3">{a.matchScore}</td>
                  <td className="p-3">{formatDate(a.appliedAt)}</td>
                  <td className={`p-3 ${overdueIds.has(a.id) ? "font-medium text-amber-600" : ""}`}>
                    {formatDate(a.followUpAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card flex flex-col gap-1 p-3">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-xl font-semibold">{value}</span>
    </div>
  );
}
