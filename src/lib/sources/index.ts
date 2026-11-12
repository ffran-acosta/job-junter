import "server-only";
import { db } from "../db";
import { scoreJob } from "../scoring";
import { getonbrd } from "./getonbrd";
import { himalayas } from "./himalayas";
import { remoteok } from "./remoteok";
import { remotive } from "./remotive";

export const SOURCES = [remotive, remoteok, himalayas, getonbrd];
export const SOURCE_NAMES: Record<string, string> = Object.fromEntries(
  SOURCES.map((s) => [s.id, s.name]),
);

// Remotive pide no más de ~4 requests por día; 6 h cumple y es suficiente para el resto.
const MIN_INTERVAL_MS = 6 * 60 * 60 * 1000;

export interface SyncResult {
  source: string;
  status: "ok" | "skipped" | "error";
  count: number;
  message?: string;
}

export async function syncJobs(): Promise<SyncResult[]> {
  const syncs = await db.sourceSync.findMany();
  const lastSync = new Map(syncs.map((s) => [s.source, s.fetchedAt]));

  return Promise.all(
    SOURCES.map(async (source): Promise<SyncResult> => {
      const last = lastSync.get(source.id);
      if (last && Date.now() - last.getTime() < MIN_INTERVAL_MS) {
        return { source: source.name, status: "skipped", count: 0 };
      }
      try {
        const jobs = await source.fetchJobs();
        for (const job of jobs) {
          const { score, matched, warnings } = scoreJob(job.title, `${job.tags.join(" ")}\n${job.description}`);
          const data = {
            title: job.title,
            company: job.company,
            url: job.url,
            location: job.location,
            description: job.description,
            tags: JSON.stringify(job.tags),
            salary: job.salary ?? null,
            postedAt: job.postedAt ?? null,
            score,
            matched: JSON.stringify(matched),
            warnings: JSON.stringify([...job.warnings, ...warnings]),
          };
          await db.job.upsert({
            where: { source_externalId: { source: source.id, externalId: job.externalId } },
            create: { source: source.id, externalId: job.externalId, ...data },
            update: data,
            select: { id: true },
          });
        }
        await db.sourceSync.upsert({
          where: { source: source.id },
          create: { source: source.id, fetchedAt: new Date(), count: jobs.length },
          update: { fetchedAt: new Date(), count: jobs.length },
        });
        return { source: source.name, status: "ok", count: jobs.length };
      } catch (error) {
        return { source: source.name, status: "error", count: 0, message: (error as Error).message };
      }
    }),
  );
}
