import "server-only";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { z } from "zod";
import { db } from "./db";
import type { ToolKind } from "./labels";
import { CV_VARIANTS, loadCvTexts, loadPreferences } from "./profile";

// Usa la CLI de Claude Code (`claude -p`), así corre con la suscripción y no con créditos de la API.
const MODEL = process.env.CLAUDE_MODEL ?? "sonnet";

const AdditionSchema = z.object({
  label: z.string().describe("Qué dato falta, corto (ej: 'Pretensión salarial')"),
  sentence: z.string().describe("Oración lista para sumar al texto, con ___ donde va el dato"),
});
export type Addition = z.infer<typeof AdditionSchema>;
const additions = z
  .array(AdditionSchema)
  .describe("Datos que no están en el CV ni en las preferencias y mejorarían el texto; vacío si no falta nada");

export const ApplicationSchema = z.object({
  title: z.string().describe("Puesto, tal como figura en la oferta"),
  company: z.string().describe("Empresa que contrata; 'Sin especificar' si no aparece"),
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
  coverLetterAdditions: additions,
  recruiterMessage: z.string().describe("Mensaje corto (máx. 600 caracteres) para el recruiter, en el idioma de la oferta"),
  recruiterMessageAdditions: additions,
  formAnswers: z.array(z.object({ question: z.string(), answer: z.string(), additions })),
});
export type GeneratedApplication = z.infer<typeof ApplicationSchema>;

const INSTRUCTIONS = `Sos un asistente que prepara postulaciones laborales para el candidato cuyos CVs, preferencias y respuestas guardadas vienen en el mensaje. Busca su primer o siguiente trabajo remoto como desarrollador backend / fullstack y se postula a cualquier seniority. Respondé solo con el JSON pedido.

Reglas:
- Nunca inventes experiencia, empresas, métricas, títulos ni tecnologías que no estén en el CV o en las preferencias. Si algo falta, no lo inventes.
- Los textos se copian y se envían tal cual: nunca escribas placeholders, corchetes ni huecos ([COMPLETAR], [nombre], ___, XXX). Si falta un dato, redactá el texto completo sin él y proponelo aparte en el campo de additions como una oración opcional con ___ donde va el dato.
- Escribí en el idioma de la oferta. Tono profesional, directo y humano; sin frases genéricas ("soy apasionado", "me encantaría formar parte") ni exageraciones.
- Carta de presentación: 180 a 280 palabras, 3 o 4 párrafos. Conectá 2 o 3 requisitos concretos de la oferta con experiencia concreta del CV. Si pide más años de los que tiene, compensá con lo que construyó en producción, sin mencionar la falta de años.
- Respuestas de formulario: concisas y listas para pegar. Si una pregunta del banco de respuestas guardadas coincide, reutilizá esa respuesta adaptándola.
- Pretensión salarial: usá la tabla de referencia de las preferencias según el seniority que pida la oferta (si no lo dice, inferilo de los años de experiencia requeridos) y la moneda/modalidad de contratación. Dá un número concreto, no un rango amplio.
- Las gaps son requisitos que el CV no cubre. Sé honesto: el objetivo es que el candidato llegue preparado.`;

async function buildContext(): Promise<string> {
  const [cvs, preferences, saved] = await Promise.all([
    loadCvTexts(),
    loadPreferences().catch(() => "(sin preferencias cargadas)"),
    db.savedAnswer.findMany({ select: { question: true, answer: true }, orderBy: { createdAt: "asc" }, take: 100 }),
  ]);
  const cvBlock = CV_VARIANTS.map((v) => `<cv variant="${v}">\n${cvs[v]}\n</cv>`).join("\n\n");
  const savedBlock = saved.length
    ? saved.map((s) => `P: ${s.question}\nR: ${s.answer}`).join("\n\n")
    : "(vacío)";
  return `<cvs>\n${cvBlock}\n</cvs>\n\n<preferencias>\n${preferences}\n</preferencias>\n\n<respuestas_guardadas>\n${savedBlock}\n</respuestas_guardadas>`;
}

interface CliResult {
  is_error: boolean;
  result?: string;
  structured_output?: unknown;
}

async function parse<T extends z.ZodType>(schema: T, task: string): Promise<z.infer<T>> {
  const prompt = `${await buildContext()}\n\n${task}`;
  const args = [
    "-p",
    "--safe-mode",
    "--tools",
    "",
    "--no-session-persistence",
    "--model",
    MODEL,
    "--output-format",
    "json",
    "--system-prompt",
    INSTRUCTIONS,
    "--json-schema",
    // Claude Code no acepta el draft 2020-12 que zod genera por defecto.
    JSON.stringify(z.toJSONSchema(schema, { target: "draft-7" })),
  ];

  const output = await new Promise<string>((resolve, reject) => {
    // cwd neutro para que no cargue el CLAUDE.md ni la config de este repo.
    const child = spawn("claude", args, { cwd: tmpdir() });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk));
    child.on("error", (error) => reject(new Error(`No se pudo ejecutar la CLI de Claude Code: ${error.message}`)));
    child.on("close", (code) =>
      code === 0 ? resolve(stdout) : reject(new Error(stderr.trim() || stdout.trim() || `claude salió con código ${code}`)),
    );
    child.stdin.end(prompt);
  });

  const result = JSON.parse(output) as CliResult;
  if (result.is_error || result.structured_output === undefined) {
    throw new Error(result.result || "Claude Code no devolvió una respuesta válida.");
  }
  return schema.parse(result.structured_output);
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
    : "(ninguna aparte)";
  return parse(
    ApplicationSchema,
    `<oferta>\nPuesto: ${job.title || "(detectalo del texto)"}\nEmpresa: ${job.company || "(detectala del texto)"}\n\n${job.description}\n</oferta>\n\n<preguntas_del_formulario>\n${questions}\n</preguntas_del_formulario>\n\nEl texto de la oferta puede ser la página entera copiada (menús, botones, formulario incluidos): ignorá lo que no sea la oferta. Para formAnswers respondé las preguntas de arriba y también las preguntas abiertas del formulario que aparezcan en el texto pegado (no las de datos personales como nombre, email o teléfono). Si no hay ninguna, respondé las 5 preguntas más probables para esta oferta (por ejemplo: por qué esta empresa, pretensión salarial, disponibilidad, experiencia con la tecnología principal, un proyecto del que esté orgulloso).`,
  );
}

const AnswerSchema = z.object({ answer: z.string(), additions });

export function answerQuestion(job: JobInput, question: string): Promise<z.infer<typeof AnswerSchema>> {
  return parse(
    AnswerSchema,
    `<oferta>\nPuesto: ${job.title}\nEmpresa: ${job.company}\n\n${job.description}\n</oferta>\n\nRespondé esta pregunta del formulario de postulación, lista para pegar:\n${question}`,
  );
}

export const ToolResultSchema = z.object({
  subject: z.string().describe("Asunto del mail; vacío si el texto no es un mail"),
  body: z.string().describe("Texto final, listo para copiar y pegar"),
  additions,
});
export type ToolResult = z.infer<typeof ToolResultSchema>;

const TOOL_TASKS: Record<ToolKind, string> = {
  email:
    "Escribí un mail de postulación para enviar con el CV adjunto. Asunto claro con el puesto y el nombre del candidato. Cuerpo de 120 a 200 palabras: por qué encaja (2 o 3 puntos concretos del CV contra la oferta), mención del CV adjunto, link a GitHub/LinkedIn y cierre con disponibilidad para hablar. Indicá al final del cuerpo qué variante de CV adjuntar entre corchetes.",
  "cover-letter":
    "Escribí una carta de presentación siguiendo las reglas de carta de presentación. Sin asunto.",
  "linkedin-note":
    "Escribí una nota de invitación a conectar en LinkedIn para alguien de la empresa o el recruiter. Máximo 300 caracteres en total. Sin asunto.",
  "recruiter-reply":
    "El texto es un mensaje que recibió el candidato (de un recruiter o empresa). Escribí la respuesta: respondé lo que pregunta, mostrá interés si la propuesta encaja con las preferencias (o declinala con cortesía si claramente no encaja) y proponé el siguiente paso. Si es un mail, incluí asunto (Re: …).",
  "follow-up":
    "Escribí un mail breve de seguimiento de una postulación enviada hace una semana o más sin respuesta. 60 a 100 palabras, sin sonar insistente, aportando un dato nuevo de valor (un proyecto o habilidad relevante del CV). Con asunto.",
  "thank-you":
    "Escribí un mail de agradecimiento después de una entrevista. 80 a 140 palabras: agradecé, retomá un tema concreto de la entrevista si aparece en el texto (si no, cerrá sin mencionarlo y proponé en additions una oración sobre el tema que se habló) y reafirmá el interés. Con asunto.",
  "interview-prep":
    "Prepará al candidato para la entrevista de esta oferta. En body: 1) 8 a 10 preguntas probables (técnicas y de comportamiento) con una respuesta sugerida basada solo en el CV, 2) cómo encarar las gaps de la oferta, 3) 5 preguntas para hacerle a la empresa. Usá títulos y listas en texto plano. Sin asunto.",
  salary:
    "Escribí la respuesta a la pregunta por pretensión salarial para esta oferta, usando la tabla de referencia de las preferencias según seniority, moneda y modalidad. Dá un número concreto y una frase que deje abierta la negociación por el paquete total. Sin asunto, salvo que el texto sea un mail.",
  "cv-tailor":
    "Sugerí ajustes al CV más adecuado para esta oferta, sin inventar nada: qué variante usar, un resumen/perfil reescrito (3 o 4 líneas), qué bullets reordenar o reformular (mostrá el texto nuevo) y qué keywords de la oferta agregar donde sean ciertas. Sin asunto.",
};

export function runTool(kind: ToolKind, text: string, extra: string): Promise<ToolResult> {
  return parse(
    ToolResultSchema,
    `<texto>\n${text}\n</texto>\n\n${extra ? `<indicaciones_del_candidato>\n${extra}\n</indicaciones_del_candidato>\n\n` : ""}Tarea: ${TOOL_TASKS[kind]}\nEscribí en el idioma del texto pegado salvo que las indicaciones digan otra cosa.`,
  );
}
