const CORE: Record<string, RegExp> = {
  NestJS: /\bnest\.?js\b|\bnestjs\b/i,
  "Node.js": /\bnode(\.?js)?\b/i,
  TypeScript: /\btypescript\b/i,
  PostgreSQL: /\bpostgres(ql)?\b/i,
  "Next.js": /\bnext\.?js\b/i,
  React: /\breact(\.?js)?\b/i,
  Prisma: /\bprisma\b/i,
};

const SECONDARY: Record<string, RegExp> = {
  Express: /\bexpress(\.?js)?\b/i,
  Fastify: /\bfastify\b/i,
  "REST APIs": /\brest(ful)?\b/i,
  SQL: /\bsql\b/i,
  Docker: /\bdocker\b/i,
  AWS: /\baws\b|\bamazon web services\b/i,
  Jest: /\bjest\b/i,
  Playwright: /\bplaywright\b/i,
  JavaScript: /\bjavascript\b/i,
  Tailwind: /\btailwind\b/i,
  "LLMs / IA": /\bllms?\b|\blangchain\b|\blanggraph\b|\bai agents?\b|\bagentes de ia\b|\bopenai\b|\banthropic\b/i,
  "CI/CD": /\bci\/cd\b|\bgithub actions\b/i,
  MongoDB: /\bmongo(db)?\b/i,
  MySQL: /\bmysql\b/i,
};

const GOOD_TITLE = /back[\s-]?end|full[\s-]?stack|node|nest|typescript|software (engineer|developer)|desarrollador|developer|programador|web/i;
const OTHER_STACK_TITLE = /\b(java|\.net|c#|php|ruby|rails|golang|go developer|python|django|vue|angular|android|ios|swift|kotlin|flutter|salesforce|sap|unity|c\+\+|rust|scala|elixir|devops|sre)\b/i;
const NOT_DEV_TITLE = /\b(sales|marketing|designer|illustrator|recruiter|support|assistant|account|manager|head of|data scientist|analyst|writer|qa manual)\b/i;

export interface Score {
  score: number;
  matched: string[];
  warnings: string[];
}

export function scoreJob(title: string, body: string): Score {
  const text = `${title}\n${body}`;
  const coreMatched = Object.keys(CORE).filter((k) => CORE[k].test(text));
  const secondaryMatched = Object.keys(SECONDARY).filter((k) => SECONDARY[k].test(text));
  const warnings: string[] = [];

  let score = coreMatched.length * 12 + secondaryMatched.length * 3;
  if (GOOD_TITLE.test(title)) score += 15;
  if (OTHER_STACK_TITLE.test(title) && !coreMatched.some((k) => CORE[k].test(title))) score -= 30;
  if (NOT_DEV_TITLE.test(title)) score -= 40;

  const years = [...text.matchAll(/(\d{1,2})\s*\+?\s*(?:years|year|años|anos)/gi)]
    .map((m) => Number(m[1]))
    .filter((n) => n > 0 && n < 20);
  const maxYears = years.length ? Math.max(...years) : 0;
  if (maxYears >= 5) warnings.push(`Pide ${maxYears}+ años: postulate igual si el stack coincide`);
  if (/\b(senior|sr\.?|lead|staff|principal)\b/i.test(title)) {
    warnings.push("Puesto senior: apostá a la experiencia en producción");
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    matched: [...coreMatched, ...secondaryMatched],
    warnings,
  };
}

const LATAM_OK = /worldwide|anywhere|global|americas|latam|latin america|south america|argentina|lat\.?am/i;

export function checkLocation(location: string): { eligible: boolean; warning?: string } {
  const loc = location.trim();
  if (!loc || /^remote$/i.test(loc)) {
    return { eligible: true, warning: "Ubicación no especificada: verificá que acepten Argentina" };
  }
  return { eligible: LATAM_OK.test(loc) };
}
