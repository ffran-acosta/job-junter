"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { answerQuestion, generateApplication, runTool, type ToolResult } from "@/lib/ai";
import { db } from "@/lib/db";
import { TOOL_LABELS, type ToolKind } from "@/lib/labels";
import { syncJobs, type SyncResult } from "@/lib/sources";
import { ApplicationStatus } from "@/generated/prisma/enums";

const FOLLOW_UP_DAYS = 7;

export async function syncJobsAction(): Promise<SyncResult[]> {
  const results = await syncJobs();
  refresh();
  return results;
}

export async function dismissJob(jobId: string) {
  await db.job.update({ where: { id: jobId }, data: { status: "DISMISSED" }, select: { id: true } });
  refresh();
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function createApplication(_prev: string | null, formData: FormData): Promise<string | null> {
  const jobId = text(formData, "jobId") || null;
  const input = {
    title: text(formData, "title"),
    company: text(formData, "company"),
    description: text(formData, "description"),
    questions: text(formData, "questions")
      .split("\n")
      .map((q) => q.trim())
      .filter(Boolean),
  };
  if (input.description.length < 100) {
    return "Pegá el texto completo de la oferta.";
  }

  let id: string;
  try {
    const result = await generateApplication(input);
    const data = {
      title: input.title || result.title,
      company: input.company || result.company,
      url: text(formData, "url") || null,
      source: text(formData, "source") || "manual",
      description: input.description,
      cvVariant: result.cvVariant,
      matchScore: result.matchScore,
      analysis: JSON.stringify({
        summary: result.summary,
        strengths: result.strengths,
        gaps: result.gaps,
        missingKeywords: result.missingKeywords,
        redFlags: result.redFlags,
      }),
      coverLetter: result.coverLetter,
      recruiterMessage: result.recruiterMessage,
      formAnswers: JSON.stringify(result.formAnswers),
    };
    const application = jobId
      ? await db.application.upsert({
          where: { jobId },
          create: { jobId, ...data },
          update: data,
          select: { id: true },
        })
      : await db.application.create({ data, select: { id: true } });
    if (jobId) {
      await db.job.update({ where: { id: jobId }, data: { status: "PREPARED" }, select: { id: true } });
    }
    id = application.id;
  } catch (error) {
    return `No se pudo generar: ${(error as Error).message}`;
  }
  redirect(`/postulaciones/${id}`);
}

export async function updateApplicationStatus(id: string, status: ApplicationStatus) {
  const now = new Date();
  const followUpAt = new Date(now.getTime() + FOLLOW_UP_DAYS * 24 * 60 * 60 * 1000);
  await db.application.update({
    where: { id },
    data: {
      status,
      ...(status === "APPLIED" && { appliedAt: now, followUpAt }),
      ...(status !== "APPLIED" && status !== "NO_RESPONSE" && { followUpAt: null }),
    },
    select: { id: true },
  });
  refresh();
}

export async function postponeFollowUp(id: string) {
  const followUpAt = new Date(Date.now() + FOLLOW_UP_DAYS * 24 * 60 * 60 * 1000);
  await db.application.update({ where: { id }, data: { followUpAt }, select: { id: true } });
  refresh();
}

export async function saveNotes(id: string, formData: FormData) {
  await db.application.update({ where: { id }, data: { notes: text(formData, "notes") }, select: { id: true } });
  refresh();
}

export async function askQuestion(id: string, _prev: string | null, formData: FormData): Promise<string | null> {
  const question = text(formData, "question");
  if (!question) return "Escribí la pregunta.";
  const application = await db.application.findUniqueOrThrow({
    where: { id },
    select: { title: true, company: true, description: true, formAnswers: true },
  });
  try {
    const answer = await answerQuestion({ ...application, questions: [] }, question);
    const answers = [...(JSON.parse(application.formAnswers) as object[]), { question, answer }];
    await db.application.update({ where: { id }, data: { formAnswers: JSON.stringify(answers) }, select: { id: true } });
  } catch (error) {
    return `No se pudo generar: ${(error as Error).message}`;
  }
  refresh();
  return null;
}

export async function saveAnswer(formData: FormData) {
  const question = text(formData, "question");
  const answer = text(formData, "answer");
  if (!question || !answer) return;
  await db.savedAnswer.create({ data: { question, answer }, select: { id: true } });
  refresh();
}

export async function deleteSavedAnswer(id: string) {
  await db.savedAnswer.delete({ where: { id }, select: { id: true } });
  refresh();
}

export type ToolState = { result: ToolResult; error?: never } | { error: string; result?: never } | null;

export async function runToolAction(_prev: ToolState, formData: FormData): Promise<ToolState> {
  const kind = text(formData, "kind");
  const input = text(formData, "text");
  if (!(kind in TOOL_LABELS)) return { error: "Elegí qué querés generar." };
  if (!input) return { error: "Pegá la oferta o el mensaje." };
  try {
    return { result: await runTool(kind as ToolKind, input, text(formData, "extra")) };
  } catch (error) {
    return { error: `No se pudo generar: ${(error as Error).message}` };
  }
}
