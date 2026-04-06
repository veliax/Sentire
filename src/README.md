# Sentire System

An Intelligent General Purpose Incident Detection System built with React, TypeScript, and Vite.

## Getting Started

```bash
npm install
npm run dev
```

The development server runs at http://localhost:3000.

## Project Structure

```
src/
├── components/
│   ├── common/      # Reusable primitives (ImageWithFallback)
│   ├── layout/      # DashboardLayout with responsive sidebar
│   ├── shared/      # Domain components (VideoCard, RiskBadge, IncidentTimeline, TimelinePreview)
│   └── ui/          # shadcn/ui base components
├── context/         # AppContext — global auth and app state
├── pages/           # Route-level page components
├── router/          # ProtectedRoute
├── lib/             # Mock data
├── styles/          # Global CSS variables
└── types/           # TypeScript types
```

## Tech Stack

- React 18 + TypeScript
- Vite (build tool)
- React Router v6 (routing)
- Tailwind CSS + shadcn/ui (styling)
- Recharts (charts)
- Lucide React (icons)
