import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { markStaleAsNoResponse, overdueWhere } from "@/lib/applications";
import { db } from "@/lib/db";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Job Hunter",
  description: "Ofertas remotas, cartas y respuestas generadas a partir de tus CVs",
};

const NAV = [
  { href: "/", label: "Ofertas" },
  { href: "/postular", label: "Nueva postulación" },
  { href: "/postulaciones", label: "Postulaciones" },
  { href: "/herramientas", label: "Herramientas" },
  { href: "/respuestas", label: "Respuestas guardadas" },
  { href: "/papelera", label: "Papelera" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b border-border bg-card">
          <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-sm">
            <span className="font-semibold">Job Hunter</span>
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="text-muted hover:text-foreground">
                {item.label}
                {item.href === "/postulaciones" && (
                  <Suspense>
                    <OverdueBadge />
                  </Suspense>
                )}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}

async function OverdueBadge() {
  await connection();
  const now = new Date();
  await markStaleAsNoResponse(now);
  const count = await db.application.count({ where: overdueWhere(now) });
  if (count === 0) return null;
  return (
    <span className="ml-1 rounded-full bg-amber-500 px-1.5 text-xs font-medium text-white" title="Seguimientos pendientes">
      {count}
    </span>
  );
}
