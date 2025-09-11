# Architecture – Chatbot AI multi-départements (Python + Node.js)

Cette documentation décrit l’architecture technique de l’application: un chatbot qui pose des questions orientées selon le département (RH, Vente, Marketing, etc.) et enregistre toutes les interactions en base.

## Objectifs

- Poser des questions dynamiques selon le département choisi.
- Sauvegarder toutes les questions/réponses avec horodatage et métadonnées, et lier chaque réponse au département.
- Architecture mixte Node.js (UI + API publiques) et Python (service AI).
- Extensible: nouveaux départements, flows, modèles IA cloud/local.

## Vue d’ensemble

- `apps/web` (Node/Express): API publiques, DB via Prisma, gateway vers Python.
- `services/ai` (FastAPI/Python): endpoints `/next-question`, `/question/{key}`, `/chat`, providers IA, logique de flow.
- `db` (PostgreSQL): départements, sessions, messages, réponses.
- Communication Node ⇄ Python: HTTP/REST, évoluable vers gRPC.

## Schéma de données (PostgreSQL – implémenté)

- `Department(id, key unique, name, createdAt)`
- `User(id, email?, createdAt)`
- `ChatSession(id, userId?, departmentId, status, createdAt, updatedAt)`
- `Message(id, sessionId, role, content, meta?, createdAt)`
- `Answer(id, sessionId, questionKey, value Json, createdAt)`
  - Contrainte unique: `(sessionId, questionKey)`

## API – Contrats

Côté Node (front → Node):
- POST /api/session/start → { sessionId }
- GET /api/session/:id → { session, messages, currentNode? }
- POST /api/session/:id/answer → { nextQuestion: { nodeKey, questionText, type, validations }, done }
- GET /api/session/:id/answers → { sessionId, count, answers[] }
- GET /api/department/:key/answers → { department, count, answers[] }

Côté Python (Node → Python):
- POST /next-question → { nodeKey, questionText, type, validations, done }
- GET /question/{key} → métadonnées de la question (type, validations)
- POST /score-answer (optionnel) → { valid, error?, normalizedAnswer? }
- POST /chat → { reply, meta }

## Logique de flow (unifiée)

- La liste des questions est __commune__ à tous les départements, et chargée depuis `services/ai/questions.json`.
- Le service AI ignore le département pour l’ordre des questions (séquentiel), mais Node persiste les réponses par session, liée au `Department`.

## Validation des réponses (côté Web)

- Pour `POST /api/session/:id/answer`, si `nodeKey` est fourni:
  - Web récupère `GET /question/{key}` côté AI pour obtenir `type` et `validations`.
  - Implémenté: `type=number` avec `min`/`max`.
  - En cas d’échec: retourne 400 avec un code d’erreur (`invalid_type_number`, `number_below_min`, …).
  - En cas de succès: enregistre `Message` et __upsert__ `Answer` sur `(sessionId, questionKey)`.

## IA: Cloud vs Local

- Cloud (OpenAI/Azure/Anthropic): qualité et vitesse de mise en route. Recommandé pour démarrer.
- Local (Ollama): confidentialité/coûts/latence locale, demande plus de gestion.
- Choix via une abstraction de provider IA dans `services/ai/providers/`.

## Structure de dépôt (monorepo)

.
├─ apps/
│  └─ web/                 # Next.js + Prisma
│     ├─ app/ or pages/
│     ├─ pages/api/
│     ├─ components/
│     ├─ lib/
│     └─ prisma/
├─ services/
│  └─ ai/                  # FastAPI
│     ├─ main.py
│     ├─ providers/
│     ├─ models/
│     └─ questions.json
├─ infrastructure/
│  ├─ docker-compose.yml
│  └─ env/
└─ shared/

## Sécurité

- Minimiser les PII, chiffrer en transit (HTTPS) et reposer sur un Postgres managé en prod.
- Logs JSON sans secrets, possibilité de droit à l’oubli.

## Roadmap

- Phase 1: Skeleton + DB + endpoints de base + flow unifié via questions.json.
- Phase 2: Provider IA abstrait (OpenAI par défaut), stockage complet Q/R, validations côté web.
- Phase 3: Reporting par département et session (endpoints ajoutés), export.
- Phase 4: RAG (si besoin), backoffice de gestion de questions/validations, analytics.
- Phase 5: IA locale (Ollama) via variable d’env.
