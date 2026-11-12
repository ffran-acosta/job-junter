import { htmlToText } from "../text";
import { getJson, type JobSource, type RawJob } from "./types";

interface GetOnBoardResponse {
  data: {
    id: string;
    links: { public_url: string };
    attributes: {
      title: string;
      description: string | null;
      functions: string | null;
      desirable: string | null;
      remote: boolean;
      remote_modality: "fully_remote" | "remote_local" | "hybrid" | "no_remote";
      min_salary: number | null;
      max_salary: number | null;
      published_at: number;
      company: { data: { attributes: { name: string } } };
    };
  }[];
  meta: { total_pages: number };
}

const PAGES = 2;

export const getonbrd: JobSource = {
  id: "getonbrd",
  name: "Get on Board",
  async fetchJobs() {
    const jobs: RawJob[] = [];
    for (let page = 1; page <= PAGES; page++) {
      const data = await getJson<GetOnBoardResponse>(
        `https://www.getonbrd.com/api/v0/categories/programming/jobs?per_page=100&page=${page}&expand=%5B%22company%22%5D`,
      );
      for (const job of data.data) {
        const a = job.attributes;
        if (!a.remote) continue;
        const local = a.remote_modality === "remote_local";
        jobs.push({
          externalId: job.id,
          title: a.title,
          company: a.company.data.attributes.name,
          url: job.links.public_url,
          location: local ? "Remoto (países limitados)" : "Remoto",
          description: htmlToText([a.description, a.functions, a.desirable].filter(Boolean).join("\n")),
          tags: [],
          salary: a.max_salary ? `USD ${a.min_salary ?? ""}–${a.max_salary} mensual` : undefined,
          postedAt: new Date(a.published_at * 1000),
          warnings: local ? ["Remoto local: puede requerir residencia en otro país"] : [],
        });
      }
      if (page >= data.meta.total_pages) break;
    }
    return jobs;
  },
};
