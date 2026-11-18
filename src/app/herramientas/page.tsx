import { connection } from "next/server";
import { Suspense } from "react";
import { CopyButton } from "@/components/copy-button";
import { ToolForm } from "@/components/tool-form";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, STATUS_LABELS, TOOL_LABELS, type ToolKind } from "@/lib/labels";
import { CV_VARIANTS, loadPreferences } from "@/lib/profile";

export default function ToolsPage({ searchParams }: PageProps<"/herramientas">) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Herramientas</h1>
        <p className="text-sm text-muted">
          Para lo que no es una postulación completa: mails, mensajes, preparación de entrevistas. No se guarda nada.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
        <PrefilledToolForm searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
        <ProfileCard />
      </Suspense>
    </div>
  );
}

// Con ?kind=…&app=… arranca con la herramienta elegida y los datos de esa postulación cargados.
async function PrefilledToolForm({ searchParams }: Pick<PageProps<"/herramientas">, "searchParams">) {
  const { kind, app } = await searchParams;
  const application =
    typeof app === "string"
      ? await db.application.findUnique({
          where: { id: app },
          select: {
            id: true,
            title: true,
            company: true,
            url: true,
            status: true,
            description: true,
            appliedAt: true,
            interviewAt: true,
            notes: true,
          },
        })
      : null;
  const text = application
    ? [
        `Puesto: ${application.title}`,
        `Empresa: ${application.company}`,
        application.url && `Link: ${application.url}`,
        `Estado: ${STATUS_LABELS[application.status]}`,
        application.appliedAt && `Postulado el: ${formatDate(application.appliedAt)}`,
        application.interviewAt && `Entrevista: ${formatDateTime(application.interviewAt)}`,
        application.notes && `Notas del candidato:\n${application.notes}`,
      ]
        .filter(Boolean)
        .join("\n") + `\n\n${application.description}`
    : "";
  const defaultKind = typeof kind === "string" && kind in TOOL_LABELS ? (kind as ToolKind) : "email";
  return <ToolForm key={`${defaultKind}-${application?.id}`} defaultKind={defaultKind} defaultText={text} />;
}

async function ProfileCard() {
  await connection();
  const preferences = await loadPreferences().catch(() => "");
  // Solo las líneas "- Campo: valor" de primer nivel y con valor cargado.
  const fields = [...preferences.matchAll(/^- ([^:\n]+):[ \t]*(\S.*)$/gm)].map(([, key, value]) => ({ key, value }));

  return (
    <section className="card flex flex-col gap-3">
      <div>
        <h2 className="font-semibold">Datos para formularios</h2>
        <p className="text-sm text-muted">Salen de preferencias.md. Para los campos que se repiten en todos los formularios.</p>
      </div>
      <ul className="flex flex-col gap-2">
        {fields.map((f) => (
          <li key={f.key} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>
              <span className="text-muted">{f.key}:</span> {f.value}
            </span>
            <CopyButton text={f.value} />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2 text-sm">
        {CV_VARIANTS.map((v) => (
          <a key={v} href={`/cv/cv-${v}.pdf`} className="btn-secondary">
            CV {v} (PDF)
          </a>
        ))}
      </div>
    </section>
  );
}
