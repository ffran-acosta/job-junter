"use client";

import { useActionState } from "react";
import { syncJobsAction } from "@/app/actions";
import type { SyncResult } from "@/lib/sources";
import { SubmitButton } from "./submit-button";

export function SyncButton() {
  const [results, action] = useActionState<SyncResult[] | null>(syncJobsAction, null);
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <SubmitButton pendingText="Buscando ofertas…">Buscar ofertas nuevas</SubmitButton>
      {results && (
        <ul className="text-xs text-muted text-right">
          {results.map((r) => (
            <li key={r.source}>
              {r.source}:{" "}
              {r.status === "ok"
                ? `${r.count} ofertas elegibles`
                : r.status === "skipped"
                  ? "actualizada hace menos de 6 h"
                  : `error (${r.message})`}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
