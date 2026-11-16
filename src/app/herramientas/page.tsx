import { connection } from "next/server";
import { Suspense } from "react";
import { CopyButton } from "@/components/copy-button";
import { ToolForm } from "@/components/tool-form";
import { CV_VARIANTS, loadPreferences } from "@/lib/profile";

export default function ToolsPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Herramientas</h1>
        <p className="text-sm text-muted">
          Para lo que no es una postulación completa: mails, mensajes, preparación de entrevistas. No se guarda nada.
        </p>
      </div>
      <ToolForm />
      <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
        <ProfileCard />
      </Suspense>
    </div>
  );
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
