"use client";

import { useState } from "react";
import type { Addition } from "@/lib/ai";
import { CopyButton } from "./copy-button";
import { SubmitButton } from "./submit-button";

// Las frases completadas van antes del último párrafo (saludo/firma) si el texto tiene varios; si no, al final.
function withAdditions(text: string, sentences: string[]): string {
  if (sentences.length === 0) return text;
  const extra = sentences.join(" ");
  const paragraphs = text.split(/\n\s*\n/);
  if (paragraphs.length < 3) return `${text}\n\n${extra}`;
  return [...paragraphs.slice(0, -1), extra, paragraphs.at(-1)].join("\n\n");
}

export function GeneratedText({
  text,
  additions = [],
  save,
  children,
}: {
  text: string;
  additions?: Addition[];
  save?: (formData: FormData) => Promise<void>;
  children?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<string[]>(() => additions.map(() => ""));
  const filled = additions.flatMap((a, i) => {
    const value = values[i]?.trim();
    if (!value) return [];
    return [a.sentence.includes("___") ? a.sentence.replace("___", value) : `${a.sentence} ${value}`];
  });

  if (editing && save) {
    return (
      <form
        action={async (formData) => {
          await save(formData);
          setEditing(false);
        }}
        className="flex flex-col gap-2"
      >
        <textarea name="text" defaultValue={text} rows={Math.min(20, text.split("\n").length + 3)} className="input text-sm" />
        <div className="flex gap-2">
          <SubmitButton pendingText="Guardando…">Guardar</SubmitButton>
          <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
            Cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
      {additions.length > 0 && (
        <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3">
          <p className="text-xs text-muted">
            Datos opcionales: el texto ya se puede enviar así. Lo que completes se suma al copiar.
          </p>
          {additions.map((a, i) => (
            <label key={i} className="field font-normal">
              <span className="text-xs text-muted">
                {a.label} · «{a.sentence}»
              </span>
              <input
                value={values[i] ?? ""}
                onChange={(e) => setValues((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
                className="input text-sm"
              />
            </label>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <CopyButton text={withAdditions(text, filled)} label={filled.length ? "Copiar todo" : "Copiar"} />
        {save && (
          <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
            Editar
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
