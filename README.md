# Job Hunter

App local para preparar postulaciones a trabajos remotos sin automatizar ni tocar LinkedIn: vos copiás la oferta, la app genera el material y vos postulás a mano.

- **Ofertas**: trae ofertas de Remotive, Remote OK, Himalayas y Get on Board (APIs públicas), filtra las abiertas a Argentina/LATAM y las ordena por coincidencia con tu stack.
- **Nueva postulación**: a partir de la oferta pegada genera análisis de match, CV recomendado, carta de presentación, respuestas del formulario, mensaje para el recruiter, keywords faltantes y señales de alerta. Se puede pegar la página entera del formulario (LinkedIn, Greenhouse, Lever, etc.): detecta puesto, empresa y preguntas.
- **Postulaciones**: seguimiento por estado, con recordatorio de seguimiento 7 días después de postular.
- **Herramientas**: mail de postulación (con asunto), carta, nota de LinkedIn, respuesta a recruiters, seguimiento, agradecimiento, preparación de entrevista, pretensión salarial y ajustes del CV. Incluye una ficha con los datos fijos de `preferencias.md` para copiar en formularios.
- **Respuestas guardadas**: banco de respuestas que se reutiliza en las próximas generaciones.
- **CVs**: `/cv/cv-es-backend.html` (y las otras variantes) sirve los CVs de `../CV`; `/cv/cv-es-backend.pdf` los genera como PDF con Chromium headless (puppeteer), respetando el `@page` de `cv.css`.

## Configuración

La IA corre con la CLI de Claude Code (`claude -p`), o sea con tu suscripción de Claude: no hace falta API key. Tenés que tener `claude` instalado, en el PATH y con la sesión iniciada.

```powershell
pnpm install
Copy-Item .env.example .env
pnpm prisma migrate dev
pnpm dev
```

Completá `preferencias.md` (disponibilidad, tabla de salarios por seniority, etc.): la IA lo usa para responder lo que el CV no cubre.

## Variables

| Variable | Descripción |
| --- | --- |
| `CLAUDE_MODEL` | Modelo de Claude Code (por defecto `sonnet`) |
| `CV_DIR` | Carpeta con los CVs (por defecto `../CV`) |
| `DATABASE_URL` | Base SQLite (por defecto `file:./dev.db`) |
