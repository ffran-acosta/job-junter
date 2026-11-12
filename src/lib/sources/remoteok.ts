import { checkLocation } from "../scoring";
import { htmlToText } from "../text";
import { getJson, type JobSource, type RawJob } from "./types";

interface RemoteOkJob {
  id?: string | number;
  position?: string;
  company: string;
  tags: string[];
  description: string;
  location: string;
  url: string;
  date: string;
  salary_min: number;
  salary_max: number;
}

const TAGS = ["backend", "node", "typescript", "full stack"];

export const remoteok: JobSource = {
  id: "remoteok",
  name: "Remote OK",
  async fetchJobs() {
    const byId = new Map<string, RawJob>();
    for (const tag of TAGS) {
      // El primer elemento es el aviso legal, no una oferta.
      const data = await getJson<RemoteOkJob[]>(`https://remoteok.com/api?tag=${encodeURIComponent(tag)}`);
      for (const job of data) {
        if (!job.position || job.id === undefined || byId.has(String(job.id))) continue;
        const location = checkLocation(job.location);
        if (!location.eligible) continue;
        byId.set(String(job.id), {
          externalId: String(job.id),
          title: job.position,
          company: job.company,
          url: job.url,
          location: job.location || "Remoto",
          description: htmlToText(job.description),
          tags: job.tags,
          salary: job.salary_max ? `USD ${job.salary_min}–${job.salary_max} anual` : undefined,
          postedAt: new Date(job.date),
          warnings: location.warning ? [location.warning] : [],
        });
      }
    }
    return [...byId.values()];
  },
};
