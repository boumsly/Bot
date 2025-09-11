# Chatbot AI multi-départements (Python + Node.js)

Ce projet propose une architecture Node.js (gateway/API) + Python (service AI) avec PostgreSQL.

## Démarrage rapide

1. Prérequis: Docker Desktop, Node.js LTS, Python 3.10+
2. Copier les fichiers d'environnement:
   - `infrastructure/env/.env.web.example` → `infrastructure/env/.env.web`
   - `infrastructure/env/.env.ai.example` → `infrastructure/env/.env.ai`
   - Ajuster les valeurs (clés API si IA cloud)
3. Lancer Postgres, web et ai:
```powershell
docker compose -f infrastructure/docker-compose.yml up -d --build
```
4. Appliquer migrations Prisma (si besoin en local):
```powershell
npm install --prefix apps/web
npx prisma generate --schema=apps/web/prisma/schema.prisma
npx prisma migrate dev --name init --schema=apps/web/prisma/schema.prisma
```

## Structure
- `apps/web`: API HTTP (Express), Prisma, routes `/api/session/*`
- `services/ai`: API FastAPI, endpoints `/next-question`, `/chat`
- `infrastructure`: docker-compose, env
- `docs`: architecture, notes

## Choix IA
- Par défaut, utiliser un provider cloud (OpenAI). 
- Basculer vers local (Ollama) en changeant `AI_PROVIDER` et la config du service AI.

## Commandes utiles
```powershell
# Web en local
npm install --prefix apps/web
$env:DATABASE_URL="postgres://postgres:postgres@localhost:5432/chatbot"
$env:PY_AI_BASE_URL="http://localhost:8000"
npm --prefix apps/web run dev

# AI en local
python -m venv .venv
. .venv/Scripts/Activate.ps1
pip install -r services/ai/requirements.txt
$env:AI_PROVIDER="openai" # ou "ollama"
uvicorn services.ai.main:app --reload --port 8000
```

## Points clés (fonctionnels)

- __Liste de questions unique__ pour tous les départements, déclarée dans `services/ai/questions.json` et servie séquentiellement.
- __Département conservé côté base__ via la session: chaque réponse (`Answer`) est liée à une `ChatSession` qui référence un `Department`.
- __Validations de réponses côté Web__: avant d'enregistrer une réponse, le web récupère la métadonnée de la question via l'AI (`GET /question/{key}`) et valide le type (ex: `number`) et contraintes (`min`, `max`).
- __Upsert de réponses__: une seule réponse par `(sessionId, questionKey)` grâce à une contrainte unique et un upsert côté API.

## Modèle de données (extrait Prisma)

- `Answer(id, sessionId, questionKey, value Json, createdAt)`
  - Contrainte unique: `(sessionId, questionKey)`
  - Relation: `Answer.sessionId → ChatSession.id → Department`

## Endpoints exposés

- Web (Express):
  - `POST /api/session/start` → `{ sessionId }`
  - `GET /api/session/:id` → détails session
  - `POST /api/session/:id/answer` → `{ nextQuestion: { nodeKey, questionText, type, validations }, done }`
  - `GET /api/session/:id/answers` → `{ sessionId, count, answers[] }`
  - `GET /api/department/:key/answers` → `{ department, count, answers[] }`

- AI (FastAPI):
  - `POST /next-question` → question suivante selon la liste partagée
  - `GET /question/{key}` → métadonnées d'une question (type, validations, etc.)
  - `POST /chat` → conversation libre avec le provider IA

## Éditer la liste des questions

 ```powershell
 docker restart chatbot_ai
 ```

## Tests e2e

  ```powershell
  # run par défaut
  powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\e2e.ps1"

  # forcer une réponse et une question précises
  powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\e2e.ps1" -Answer "42" -NodeKey "seniority"
  ```

## Déploiement Docker et ports

- `infrastructure/docker-compose.yml`
  - Postgres: host `55432` → container `5432`
  - Web: host `3300` → container `3000`
  - AI: host `8800` → container `8000`

## Reporting

- Par session: `GET /api/session/:id/answers`
- Par département: `GET /api/department/:key/answers`
- Utiliser ces endpoints pour l'export ou l'analytics (BI, dashboards, etc.).
