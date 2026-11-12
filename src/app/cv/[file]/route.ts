import { readFile } from "node:fs/promises";
import path from "node:path";
import { CV_DIR, CV_VARIANTS } from "@/lib/profile";

const FILES: Record<string, string> = {
  "cv.css": "text/css; charset=utf-8",
  ...Object.fromEntries(CV_VARIANTS.map((v) => [`cv-${v}.html`, "text/html; charset=utf-8"])),
};

export async function GET(_request: Request, { params }: RouteContext<"/cv/[file]">) {
  const { file } = await params;
  const contentType = FILES[file];
  if (!contentType) return new Response("No encontrado", { status: 404 });
  return new Response(await readFile(path.join(CV_DIR, file)), { headers: { "Content-Type": contentType } });
}
