# Product Requirements Document — Sentire
**Version:** 1.0
**Date:** 2026-03-29
**Status:** Draft

---

## 1. Overview

### 1.1 Product Summary
Sentire is an intelligent, general-purpose incident detection and security event management system. It provides security teams with a centralized dashboard to monitor, review, and analyze video-based security events, track incident escalation timelines, and manage users and reports.

### 1.2 Problem Statement
Security operations teams managing multiple surveillance cameras face:
- Fragmented tooling for viewing, reviewing, and escalating incidents
- No standardized risk classification across events
- Lack of historical trend analysis to proactively reduce incidents
- Manual, error-prone report generation
- No audit trail of review activity per incident

### 1.3 Goals
- Provide a single-pane-of-glass view of all security events across locations
- Enable analysts to triage and review incidents quickly with timeline context
- Give managers actionable weekly/monthly trend data
- Allow admins to manage system users and media assets without developer involvement

### 1.4 Non-Goals (v1)
- Real-time video streaming or live camera feeds
- Integration with physical access control systems
- Mobile-native (iOS/Android) applications
- AI-based automatic incident classification (future)

---

## 2. Users & Roles

| Role | Description | Key Workflows |
|------|-------------|---------------|
| **Security Analyst** | Monitors and reviews incidents daily | Dashboard → Event Detail → Mark Reviewed |
| **Admin** | Manages system users and video assets | Admin Panel → User/Video CRUD |
| **Manager** | Tracks trends and generates reports | Statistics → Reports → Export |

---

## 3. Functional Requirements

### 3.1 Authentication
| ID | Requirement | Priority |
|----|-------------|----------|
| AUTH-1 | Users can log in with email and password | P0 |
| AUTH-2 | New users can register with full name, email, and password | P0 |
| AUTH-3 | All non-auth routes redirect to `/login` if unauthenticated | P0 |
| AUTH-4 | Users can log out from any page via the navigation header | P0 |

### 3.2 Dashboard
| ID | Requirement | Priority |
|----|-------------|----------|
| DASH-1 | Display summary KPI cards: High Risk, Pending Review, Reviewed Today, Total Events | P0 |
| DASH-2 | Show up to 3 critical (high-risk) incidents with their escalation timelines | P0 |
| DASH-3 | Display a searchable, filterable grid of all events | P0 |
| DASH-4 | Filter events by risk level (All / High / Medium / Low) | P0 |
| DASH-5 | Toggle to show only events with timeline data | P1 |
| DASH-6 | Grid adapts from 1 column (mobile) to 3 columns (desktop) | P1 |

### 3.3 Event Card (VideoCard)
| ID | Requirement | Priority |
|----|-------------|----------|
| CARD-1 | Display event thumbnail, title, location, timestamp, and risk badge | P0 |
| CARD-2 | Show a compact timeline preview bar reflecting escalation phases | P1 |
| CARD-3 | Clicking a card navigates to the full event detail view | P0 |

### 3.4 Event Detail View
| ID | Requirement | Priority |
|----|-------------|----------|
| DETAIL-1 | Show event video/preview area with metadata overlay | P0 |
| DETAIL-2 | Display full event description, location, date/time, risk level, and review status | P0 |
| DETAIL-3 | Render a full incident escalation timeline (low → medium → high) with timestamps and descriptions | P0 |
| DETAIL-4 | Allow analysts to mark an event as "Reviewed" | P0 |
| DETAIL-5 | Provide a "Download Report" action for the event | P1 |
| DETAIL-6 | Include a back-navigation control to the dashboard | P0 |

### 3.5 Incident Timeline
| ID | Requirement | Priority |
|----|-------------|----------|
| TL-1 | Display each timeline event with timestamp, risk level dot, and description | P0 |
| TL-2 | Render a gradient connector line visualizing escalation severity (green → yellow → red) | P1 |
| TL-3 | Flag the critical point in the timeline with a pulsing indicator | P1 |
| TL-4 | Show incident analysis summary: total duration, number of phases, critical point time | P1 |

### 3.6 Reports
| ID | Requirement | Priority |
|----|-------------|----------|
| RPT-1 | Display all events in a sortable table (Event ID, Location, Risk Level, Date/Time, Description) | P0 |
| RPT-2 | Search reports by event ID, location, or description | P0 |
| RPT-3 | Export reports to CSV | P1 |
| RPT-4 | Show summary stats: Total Reports, High Risk count, This Month count | P0 |

### 3.7 Statistics
| ID | Requirement | Priority |
|----|-------------|----------|
| STAT-1 | Display KPI summary cards (total events, high-risk, response time, resolution rate) | P0 |
| STAT-2 | Render a weekly trend line chart showing Total Events and High Risk Events | P0 |
| STAT-3 | Filter chart by location (All / Building A / B / C / Parking Lot / Main Entrance) | P1 |
| STAT-4 | Show performance metrics: avg response time, resolution rate, camera operational % | P1 |

### 3.8 Admin Panel
| ID | Requirement | Priority |
|----|-------------|----------|
| ADMIN-1 | Users tab: list all users with name, email, role, join date | P0 |
| ADMIN-2 | Users tab: search users by name or email | P0 |
| ADMIN-3 | Users tab: delete a user with confirmation dialog | P0 |
| ADMIN-4 | Videos tab: list all video events with title, location, date, risk, review status | P0 |
| ADMIN-5 | Videos tab: search videos by title or location | P0 |
| ADMIN-6 | Videos tab: delete a video event with confirmation dialog | P0 |
| ADMIN-7 | Display summary counts: Total Users, Admins, Regular Users; Total Videos, Reviewed, Pending | P1 |

---

## 4. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Dashboard loads within 2 seconds on a modern browser |
| **Responsiveness** | All pages are usable on viewports from 375px (mobile) to 1920px (desktop) |
| **Accessibility** | Interactive elements are keyboard-navigable; color is not the sole risk indicator |
| **Security** | All routes except `/login` and `/register` are protected; no sensitive data in localStorage |
| **Maintainability** | Components are typed with TypeScript; shared UI uses shadcn/ui |

---

## 5. Data Models

### VideoEvent
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `title` | string | Human-readable event name |
| `location` | string | Camera/zone label |
| `riskLevel` | `'low' \| 'medium' \| 'high'` | Severity classification |
| `timestamp` | Date | Event detection time |
| `description` | string | Narrative summary |
| `thumbnailUrl` | string | Preview image URL |
| `videoUrl` | string | Video asset URL |
| `reviewed` | boolean | Review status |
| `timeline` | TimelineEvent[] | Optional escalation sequence |

### TimelineEvent
| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | Date | Phase detection time |
| `riskLevel` | RiskLevel | Severity at this phase |
| `description` | string | What was observed |
| `imageUrl` | string? | Optional evidence image |

### User
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `fullName` | string | Display name |
| `email` | string | Login email |
| `role` | `'admin' \| 'user'` | Access level |
| `joinedDate` | Date | Account creation date |

### Report
| Field | Type | Description |
|-------|------|-------------|
| `eventId` | string | Reference to VideoEvent |
| `location` | string | Event location |
| `riskLevel` | RiskLevel | Event severity |
| `date` | Date | Report date |
| `description` | string | Summary |

---

## 6. Routes

| Path | Access | Page |
|------|--------|------|
| `/login` | Public | Login form |
| `/register` | Public | Registration form |
| `/dashboard` | Protected | Event monitoring grid + KPIs |
| `/dashboard/event/:id` | Protected | Full event detail + timeline |
| `/reports` | Protected | Searchable/exportable report table |
| `/statistics` | Protected | Trend charts + performance metrics |
| `/admin` | Protected | User and video management |
| `*` | — | Redirect to `/login` |

---

## 7. UX & Design Principles

- **Dark theme** with mauve/purple accent palette for reduced eye strain in 24/7 SOC environments
- **Color-coded risk** — Red (high), Yellow (medium), Green (low) — consistent across all surfaces
- **Glassmorphism** cards with `backdrop-blur` for visual hierarchy in dense data views
- **Destructive actions** (delete user, delete video) always require a confirmation dialog
- **Progressive disclosure** — timeline previews in cards expand to full timelines in detail view

---

## 8. Future Scope (v2+)

| Feature | Description |
|---------|-------------|
| Live Camera Feed | Real-time RTSP/HLS stream integration |
| AI Triage | ML-based automatic risk classification on ingest |
| Notifications | Email/SMS/push alerts for high-risk events |
| Audit Log | Immutable record of all review and admin actions |
| Multi-tenant | Organization-scoped data isolation |
| Role-based Access | Granular permissions beyond admin/user |
| Mobile App | React Native companion for on-the-go review |
| SSO | SAML/OIDC integration for enterprise auth |
