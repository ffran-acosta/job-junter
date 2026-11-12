"use client";

import { useActionState } from "react";
import { createApplication } from "@/app/actions";
import { SubmitButton } from "./submit-button";

export interface GenerateDefaults {
  jobId?: string;
  title?: string;
  company?: string;
  url?: string;
  source?: string;
  description?: string;
}

export function GenerateForm({ defaults }: { defaults: GenerateDefaults }) {
  const [error, action] = useActionState(createApplication, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="jobId" value={defaults.jobId ?? ""} />
      <input type="hidden" name="source" value={defaults.source ?? "manual"} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">
          Puesto
          <input name="title" required defaultValue={defaults.title} className="input" />
        </label>
        <label className="field">
          Empresa
          <input name="company" required defaultValue={defaults.company} className="input" />
        </label>
      </div>
      <label className="field">
        Link de la oferta (opcional)
        <input name="url" type="url" defaultValue={defaults.url} className="input" />
      </label>
      <label className="field">
        Descripción completa de la oferta
        <textarea
          name="description"
          required
          rows={14}
          defaultValue={defaults.description}
          placeholder="Pegá acá todo el texto de la oferta (LinkedIn, web de la empresa, etc.)"
          className="input font-mono text-sm"
        />
      </label>
      <label className="field">
        Preguntas del formulario (una por línea, opcional)
        <textarea
          name="questions"
          rows={5}
          placeholder={"¿Por qué querés trabajar con nosotros?\n¿Cuál es tu pretensión salarial?"}
          className="input text-sm"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <SubmitButton pendingText="Generando (puede tardar hasta un minuto)…">Generar postulación</SubmitButton>
      </div>
    </form>
  );
}
