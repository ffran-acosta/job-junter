import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { postponeFollowUp } from "../actions";
import { db } from "@/lib/db";
import { formatDate, STATUS_LABELS } from "@/lib/labels";

export default function ApplicationsPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold">Postulaciones</h1>
      <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
        <ApplicationList />
      </Suspense>
    </div>
  );
}

async function ApplicationList() {
  await connection();
  const now = new Date();
  const applications = await db.application.findMany({
    orderBy: { updatedAt: "desc" },
    take: 200,
    select: {
      id: true,
      title: true,
      company: true,
      status: true,
      matchScore: true,
      appliedAt: true,
      followUpAt: true,
    },
  });
  const overdue = applications.filter(
    (a) => a.followUpAt && a.followUpAt <= now && (a.status === "APPLIED" || a.status === "NO_RESPONSE"),
  );

  if (applications.length === 0) {
    return (
      <p className="card text-sm text-muted">
        Todavía no hay postulaciones.{" "}
        <Link href="/postular" className="underline">
          Creá la primera
        </Link>
        .
      </p>
    );
  }

  return (
    <>
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
                <td className={`p-3 ${overdue.includes(a) ? "font-medium text-amber-600" : ""}`}>
                  {formatDate(a.followUpAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
