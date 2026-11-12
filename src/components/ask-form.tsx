"use client";

import { useActionState } from "react";
import { askQuestion } from "@/app/actions";
import { SubmitButton } from "./submit-button";

export function AskForm({ applicationId }: { applicationId: string }) {
  const [error, action] = useActionState(askQuestion.bind(null, applicationId), null);
  return (
    <form action={action} className="flex flex-col gap-2">
      <textarea name="question" rows={2} placeholder="Otra pregunta del formulario…" className="input text-sm" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <SubmitButton pendingText="Respondiendo…" className="btn-secondary">
          Responder pregunta
        </SubmitButton>
      </div>
    </form>
  );
}
