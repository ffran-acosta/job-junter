import { readFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";
import { CV_DIR, CV_VARIANTS } from "@/lib/profile";

const FILES: Record<string, string> = {
  "cv.css": "text/css; charset=utf-8",
  ...Object.fromEntries(CV_VARIANTS.map((v) => [`cv-${v}.html`, "text/html; charset=utf-8"])),
};

const PDFS = new Set(CV_VARIANTS.map((v) => `cv-${v}.pdf`));

export async function GET(request: Request, { params }: RouteContext<"/cv/[file]">) {
  const { file } = await params;
  if (PDFS.has(file)) return renderPdf(new URL(`/cv/${file.replace(/\.pdf$/, ".html")}`, request.url));

  const contentType = FILES[file];
  if (!contentType) return new Response("No encontrado", { status: 404 });
  return new Response(await readFile(path.join(CV_DIR, file)), { headers: { "Content-Type": contentType } });
}

async function renderPdf(htmlUrl: URL) {
  const browser = await puppeteer.launch();
  try {
    const page = await browser.newPage();
    await page.goto(htmlUrl.href, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({ printBackground: true, preferCSSPageSize: true });
    const filename = `${(await page.title()) || path.basename(htmlUrl.pathname, ".html")}.pdf`;
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } finally {
    await browser.close();
  }
}
