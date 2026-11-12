import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { db } from "./db";
import { CV_VARIANTS, loadCvTexts, loadPreferences } from "./profile";

const client = new Anthropic();
const MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-5-5";

export const ApplicationSchema = z.object({
  matchScore: z.number().int().describe("0 a 100: qué tan bien encaja el perfil con la oferta"),
  summary: z.string().describe("2-3 oraciones: veredicto y si vale la pena postularse"),
  strengths: z.array(z.string()).describe("Requisitos de la oferta que el candidato cumple, con evidencia del CV"),
  gaps: z.array(
    z.object({
      requirement: z.string(),
      howToAddress: z.string().describe("Cómo cubrirlo honestamente en la carta o la entrevista"),
    }),
  ),
  cvVariant: z.enum(CV_VARIANTS).describe("Qué CV enviar: idioma de la oferta y foco backend o fullstack"),
  missingKeywords: z.array(z.string()).describe("Palabras clave de la oferta que no aparecen en el CV elegido"),
  redFlags: z.array(z.string()).describe("Señales de alerta de la oferta; vacío si no hay"),
  coverLetter: z.string().describe("Carta de presentación en el idioma de la oferta"),
  recruiterMessage: z.string().describe("Mensaje corto (máx. 600 caracteres) para el recruiter, en el idioma de la oferta"),
  formAnswers: z.array(z.object({ question: z.string(), answer: z.string() })),
});
export type GeneratedApplication = z.infer<typeof ApplicationSchema>;

const INSTRUCTIONS = `Sos un asistente que prepara postulaciones laborales para el candidato descripto abajo. Busca su primer o siguiente trabajo remoto como desarrollador backend / fullstack y se postula a cualquier seniority.

Reglas:
- Nunca inventes experiencia, empresas, métricas, títulos ni tecnologías que no estén en el CV o en las preferencias. Si algo falta, escribí [COMPLETAR: qué falta] para que el candidato lo complete.
- Escribí en el idioma de la oferta. Tono profesional, directo y humano; sin frases genéricas ("soy apasionado", "me encantaría formar parte") ni exageraciones.
- Carta de presentación: 180 a 280 palabras, 3 o 4 párrafos. Conectá 2 o 3 requisitos concretos de la oferta con experiencia concreta del CV. Si pide más años de los que tiene, compensá con lo que construyó en producción, sin mencionar la falta de años.
- Respuestas de formulario: concisas y listas para pegar. Si una pregunta del banco de respuestas guardadas coincide, reutilizá esa respuesta adaptándola.
- Para formAnswers, respondé las preguntas que mande el usuario. Si no manda ninguna, respondé las 5 preguntas más probables para esta oferta (por ejemplo: por qué esta empresa, pretensión salarial, disponibilidad, experiencia con la tecnología principal, un proyecto del que esté orgulloso).
- Las gaps son requisitos que el CV no cubre. Sé honesto: el objetivo es que el candidato llegue preparado.`;

async function buildSystem(): Promise<Anthropic.Beta.BetaTextBlockParam[]> {
  const [cvs, preferences, saved] = await Promise.all([
    loadCvTexts(),
    loadPreferences().catch(() => "(sin preferencias cargadas)"),
    db.savedAnswer.findMany({ select: { question: true, answer: true }, orderBy: { createdAt: "asc" }, take: 100 }),
  ]);
  const cvBlock = CV_VARIANTS.map((v) => `<cv variant="${v}">\n${cvs[v]}\n</cv>`).join("\n\n");
  const savedBlock = saved.length
    ? saved.map((s) => `P: ${s.question}\nR: ${s.answer}`).join("\n\n")
    : "(vacío)";

  return [
    // Bloque estable (instrucciones + CVs) cacheado; lo que cambia seguido va después.
    { type: "text", text: `${INSTRUCTIONS}\n\n<cvs>\n${cvBlock}\n</cvs>`, cache_control: { type: "ephemeral" } },
    {
      type: "text",
      text: `<preferencias>\n${preferences}\n</preferencias>\n\n<respuestas_guardadas>\n${savedBlock}\n</respuestas_guardadas>`,
    },
  ];
}

async function parse<T extends z.ZodType>(schema: T, userContent: string, maxTokens: number) {
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: maxTokens,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: await buildSystem(),
    messages: [{ role: "user", content: userContent }],
    output_config: { format: betaZodOutputFormat(schema) },
  });
  if (response.stop_reason === "refusal") throw new Error("El modelo rechazó generar esta respuesta.");
  if (!response.parsed_output) throw new Error(`Respuesta inválida del modelo (stop_reason: ${response.stop_reason}).`);
  return response.parsed_output;
}

export interface JobInput {
  title: string;
  company: string;
  description: string;
  questions: string[];
}

export function generateApplication(job: JobInput): Promise<GeneratedApplication> {
  const questions = job.questions.length
    ? job.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")
    : "(ninguna: inferí las más probables)";
  return parse(
    ApplicationSchema,
    `<oferta>\nPuesto: ${job.title}\nEmpresa: ${job.company}\n\n${job.description}\n</oferta>\n\n<preguntas_del_formulario>\n${questions}\n</preguntas_del_formulario>`,
    16000,
  );
}

const AnswerSchema = z.object({ answer: z.string() });

export async function answerQuestion(job: JobInput, question: string): Promise<string> {
  const { answer } = await parse(
    AnswerSchema,
    `<oferta>\nPuesto: ${job.title}\nEmpresa: ${job.company}\n\n${job.description}\n</oferta>\n\nRespondé esta pregunta del formulario de postulación, lista para pegar:\n${question}`,
    4000,
  );
  return answer;
}
