import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { htmlToText } from "./text";

export const CV_VARIANTS = ["es-backend", "es-fullstack", "en-backend", "en-fullstack"] as const;
export type CvVariant = (typeof CV_VARIANTS)[number];

export const CV_DIR = path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.CV_DIR ?? "../CV");

export async function loadCvTexts(): Promise<Record<CvVariant, string>> {
  const entries = await Promise.all(
    CV_VARIANTS.map(async (variant) => {
      const html = await readFile(path.join(CV_DIR, `cv-${variant}.html`), "utf8");
      return [variant, htmlToText(html)] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<CvVariant, string>;
}

export function loadPreferences(): Promise<string> {
  return readFile(path.join(/* turbopackIgnore: true */ process.cwd(), "preferencias.md"), "utf8");
}
