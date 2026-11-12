export interface RawJob {
  externalId: string;
  title: string;
  company: string;
  url: string;
  location: string;
  description: string;
  tags: string[];
  salary?: string;
  postedAt?: Date;
  warnings: string[];
}

export interface JobSource {
  id: string;
  name: string;
  fetchJobs: () => Promise<RawJob[]>;
}

export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { "User-Agent": "job-hunter-local/0.1", Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${url} respondió ${res.status}`);
  return (await res.json()) as T;
}
