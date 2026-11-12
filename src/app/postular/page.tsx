import { Suspense } from "react";
import { GenerateForm } from "@/components/generate-form";
import { db } from "@/lib/db";

export default function NewApplicationPage({ searchParams }: PageProps<"/postular">) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Nueva postulación</h1>
        <p className="text-sm text-muted">
          Pegá la oferta (de LinkedIn o cualquier sitio). Se genera el análisis, la carta, las respuestas y el mensaje
          para el recruiter. Vos revisás y postulás a mano.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted">Cargando…</p>}>
        <PrefilledForm searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function PrefilledForm({ searchParams }: Pick<PageProps<"/postular">, "searchParams">) {
  const { jobId } = await searchParams;
  const job =
    typeof jobId === "string"
      ? await db.job.findUnique({
          where: { id: jobId },
          select: { id: true, title: true, company: true, url: true, source: true, description: true },
        })
      : null;
  return (
    <GenerateForm
      key={job?.id ?? "manual"}
      defaults={job ? { ...job, jobId: job.id } : {}}
    />
  );
}
