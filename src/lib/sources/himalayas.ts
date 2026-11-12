import { htmlToText } from "../text";
import { getJson, type JobSource, type RawJob } from "./types";

interface HimalayasResponse {
  jobs: {
    guid: string;
    title: string;
    companyName: string;
    applicationLink: string;
    locationRestrictions: string[];
    categories: string[];
    description: string;
    minSalary: number | null;
    maxSalary: number | null;
    currency: string | null;
    salaryPeriod: string | null;
    pubDate: number;
  }[];
}

const QUERIES = ["nestjs", "node", "typescript", "next.js", "backend", "full stack"];

export const himalayas: JobSource = {
  id: "himalayas",
  name: "Himalayas",
  async fetchJobs() {
    const byId = new Map<string, RawJob>();
    for (const q of QUERIES) {
      // country=AR devuelve solo ofertas que aceptan candidatos desde Argentina.
      const data = await getJson<HimalayasResponse>(
        `https://himalayas.app/jobs/api/search?q=${encodeURIComponent(q)}&country=AR`,
      );
      for (const job of data.jobs) {
        if (byId.has(job.guid)) continue;
        const restrictions = job.locationRestrictions;
        byId.set(job.guid, {
          externalId: job.guid,
          title: job.title,
          company: job.companyName,
          url: job.applicationLink,
          location:
            restrictions.length === 0
              ? "Worldwide"
              : restrictions.length > 5
                ? "LATAM"
                : restrictions.join(", "),
          description: htmlToText(job.description),
          tags: job.categories.map((c) => c.replaceAll("-", " ")),
          salary: job.maxSalary
            ? `${job.currency ?? "USD"} ${job.minSalary}–${job.maxSalary} ${job.salaryPeriod ?? ""}`.trim()
            : undefined,
          postedAt: new Date(job.pubDate * 1000),
          warnings: [],
        });
      }
    }
    return [...byId.values()];
  },
};
