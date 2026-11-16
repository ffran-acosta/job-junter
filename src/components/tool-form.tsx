"use client";

import { useActionState } from "react";
import { runToolAction } from "@/app/actions";
import { TOOL_LABELS } from "@/lib/labels";
import { CopyButton } from "./copy-button";
import { SubmitButton } from "./submit-button";

export function ToolForm() {
  const [state, action] = useActionState(runToolAction, null);
  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="card flex flex-col gap-3">
        <label className="field">
          Qué querés generar
          <select name="kind" className="input" defaultValue="email">
            {Object.entries(TOOL_LABELS).map(([kind, label]) => (
              <option key={kind} value={kind}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Oferta, mensaje o contexto
          <textarea
            name="text"
            required
            rows={12}
            placeholder="Pegá la oferta, el mensaje del recruiter o lo que tengas (de cualquier sitio)"
            className="input font-mono text-sm"
          />
        </label>
        <label className="field">
          Indicaciones extra (opcional)
          <input
            name="extra"
            placeholder="Ej: el recruiter se llama Laura, tono más informal, en inglés"
            className="input"
          />
        </label>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <div>
          <SubmitButton pendingText="Generando…">Generar</SubmitButton>
        </div>
      </form>

      {state?.result && (
        <div className="card flex flex-col gap-3">
          {state.result.subject && (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm">
                <span className="font-medium">Asunto:</span> {state.result.subject}
              </p>
              <CopyButton text={state.result.subject} label="Copiar asunto" />
            </div>
          )}
          <p className="whitespace-pre-wrap text-sm">{state.result.body}</p>
          <div>
            <CopyButton text={state.result.body} label="Copiar texto" />
          </div>
        </div>
      )}
    </div>
  );
}
