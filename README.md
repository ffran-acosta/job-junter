# Job Hunter

App local para preparar postulaciones a trabajos remotos sin automatizar ni tocar LinkedIn: vos copiás la oferta, la app genera el material y vos postulás a mano.

- **Ofertas**: trae ofertas de Remotive, Remote OK, Himalayas y Get on Board (APIs públicas), filtra las abiertas a Argentina/LATAM y las ordena por coincidencia con tu stack.
- **Nueva postulación**: a partir de la oferta pegada genera análisis de match, CV recomendado, carta de presentación, respuestas del formulario, mensaje para el recruiter, keywords faltantes y señales de alerta (Claude API).
- **Postulaciones**: seguimiento por estado, con recordatorio de seguimiento 7 días después de postular.
- **Respuestas guardadas**: banco de respuestas que se reutiliza en las próximas generaciones.
- **CVs**: `/cv/cv-es-backend.html` (y las otras variantes) sirve los CVs de `../CV` para imprimirlos a PDF.

## Configuración

```powershell
npm install
Copy-Item .env.example .env   # completar ANTHROPIC_API_KEY
npx prisma migrate dev
npm run dev
```

Completá `preferencias.md` (pretensión salarial, disponibilidad, etc.): la IA lo usa para responder lo que el CV no cubre.

## Variables

| Variable | Descripción |
| --- | --- |
| `ANTHROPIC_API_KEY` | API key de Claude |
| `CLAUDE_MODEL` | Modelo (por defecto `claude-sonnet-5-5`) |
| `CV_DIR` | Carpeta con los CVs (por defecto `../CV`) |
| `DATABASE_URL` | Base SQLite (por defecto `file:./dev.db`) |
