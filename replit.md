# Overview

This is a multi-department AI chatbot system built with a hybrid Node.js/Python architecture. The application conducts automated interviews by asking department-specific questions about AI transformation needs, collecting responses, and providing conversational AI capabilities. It features a web-based interface, session management, and comprehensive data persistence for analytics and reporting.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Static Web Interface**: Vanilla HTML/CSS/JavaScript served from Express static middleware
- **Modern UI Design**: Gradient-based dark theme with Inter font family
- **Real-time Interaction**: Fetch-based API communication with typing indicators and responsive design
- **Multiple Views**: Main questionnaire interface (`index.html`) and administrative reporting interface (`answers.html`)

## Backend Architecture
- **Hybrid Microservices**: Node.js gateway service communicating with Python AI service via HTTP REST
- **Node.js Web Service** (`apps/web`):
  - Express.js server with TypeScript
  - Handles HTTP routing, session management, and database operations
  - Acts as API gateway between frontend and Python AI service
  - Manages authentication via Passport.js with SAML strategy support
- **Python AI Service** (`services/ai`):
  - FastAPI-based service handling AI operations
  - Pluggable AI provider system (OpenAI, Ollama)
  - Question flow management with shared JSON configuration
  - Chat completion and question generation endpoints

## Data Architecture
- **PostgreSQL Database**: Primary data store with Prisma ORM
- **Core Entities**:
  - Departments: Organizational units (HR, Sales, Marketing, etc.)
  - ChatSessions: User interaction sessions linked to departments
  - Messages: Conversational history with role-based storage
  - Answers: Structured question responses with JSON values
  - Users: Optional user management for authenticated sessions
- **Data Relationships**: Sessions belong to departments, messages and answers belong to sessions

## Authentication & Authorization
- **SAML Integration**: Enterprise SSO support via `@node-saml/passport-saml`
- **Session Management**: Express-session with cookie-based persistence
- **Optional Authentication**: System supports both authenticated and anonymous usage patterns

## AI Provider Architecture
- **Provider Abstraction**: Base provider interface allowing multiple AI backends
- **OpenAI Provider**: Primary cloud-based AI integration using OpenAI Chat Completions API
- **Ollama Provider**: Local AI model support for on-premise deployments
- **Configuration-Driven**: AI provider selection via environment variables

## Question Flow System
- **Shared Question Set**: All departments use the same questions from `questions.json`
- **Sequential Processing**: Questions are presented in predetermined order regardless of department
- **Flexible Response Types**: Support for open text, numeric, and validated input types
- **Department-Aware Storage**: Responses are linked to departments for analytics while using unified questions

# External Dependencies

## Third-Party Services
- **OpenAI API**: Primary AI provider for chat completions and question generation
- **SAML Identity Provider**: Enterprise authentication integration (configurable)

## Databases
- **PostgreSQL**: Primary relational database for structured data storage
- **Prisma ORM**: Database abstraction layer with migration management

## Infrastructure Dependencies
- **Docker Compose**: Container orchestration for development and deployment
- **Node.js Runtime**: JavaScript execution environment (LTS version required)
- **Python Runtime**: Python 3.10+ for AI service execution
- **Ollama** (Optional): Local AI model serving for on-premise deployments

## Key NPM Packages
- **Express.js**: Web framework and HTTP server
- **Passport.js**: Authentication middleware with SAML strategy
- **Axios**: HTTP client for service-to-service communication
- **Prisma**: Database ORM and migration toolkit
- **TypeScript**: Static typing for Node.js development

## Key Python Packages
- **FastAPI**: Modern web framework for AI service API
- **OpenAI**: Official client library for OpenAI API integration
- **Pydantic**: Data validation and settings management
- **Uvicorn**: ASGI server for FastAPI applications
- **httpx**: Async HTTP client for external service communication