import { checkLocation } from "../scoring";
import { htmlToText } from "../text";
import { getJson, type JobSource, type RawJob } from "./types";

interface RemotiveResponse {
  jobs: {
    id: number;
    url: string;
    title: string;
    company_name: string;
    tags: string[];
    publication_date: string;
    candidate_required_location: string;
    salary: string;
    description: string;
  }[];
}

export const remotive: JobSource = {
  id: "remotive",
  name: "Remotive",
  async fetchJobs() {
    const data = await getJson<RemotiveResponse>(
      "https://remotive.com/api/remote-jobs?category=software-dev",
    );
    return data.jobs.flatMap((job): RawJob[] => {
      const location = checkLocation(job.candidate_required_location);
      if (!location.eligible) return [];
      return [
        {
          externalId: String(job.id),
          title: job.title,
          company: job.company_name,
          url: job.url,
          location: job.candidate_required_location || "Remoto",
          description: htmlToText(job.description),
          tags: job.tags,
          salary: job.salary || undefined,
          postedAt: new Date(job.publication_date),
          warnings: location.warning ? [location.warning] : [],
        },
      ];
    });
  },
};
