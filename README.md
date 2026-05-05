# ProdPulse Production Management System 
 
ProdPulse is a specialized Production Tracking System (PTS) designed to monitor and optimize industrial workflows in real-time. This project was developed as a comprehensive solution for the "Analysis and Design of Information Systems" course (4th Semester) at the Department of Management Science and Technology (DMST), Athens University of Economics and Business.

**URL:** https://detfolio.dmst.aueb.gr/students2024/chrimilonaki/inetpub/index.html
*(Login required)*
 
---
 
## Overview
 
The system provides a digital bridge between the factory floor and management. It replaces traditional, manual reporting and informal estimates with an interactive interface that tracks machine activity, justifies downtime, and generates real-time Key Performance Indicators (KPIs) for the manufacturing line of PEBRO. It connects Machine Operators, the Technical Director, the Production Manager, and Executive Manager through a unified portal, enabling real-time visibility into production progress.
 
---
 
## User Roles & Login Credentials
 
| Role | Greek Term | Responsibilities | Test Password |
|---|---|---|---|
| Machine Operator | Χειριστής Μηχανημάτων | Logs production sessions, pauses, and completions |`operator123`|
| Autonomous Machine Operator | Χειριστής Αυτόνομων Μηχανημάτων | Programs unattended machine runs, Enters results retroactively |`operator123`|
| Technical Director | Τεχνικός Διευθυντής | Responds to malfunction alerts, Manages Repair History |`technical123`|
| Production Manager | Διευθυντής Παραγωγής | Monitors live production flow, Accesses Work History |`production123`|
| CEO | Διευθύνων Σύμβουλος | Reviews high-level KPIs dashboard | `ceo123` |
 
---

### Key Features
 
- Track Production Flow: Real-time logging of production starts, pauses, and completions.
- Downtime Justification: Mandatory categorization of delays to identify bottlenecks.
- Autonomous Operation Support: Special workflows for unmonitored shifts (Setup & Retroactive Entry).
- Technical Management: Automated malfunction alerts and maintenance history tracking.
- Executive Dashboard: Real-time KPIs (Productivity, Scrap Rate, Downtime Costs) for high-level decision-making.

---

## Data Model
 
All data lives in `localStorage` under the key `pebroPTS_v1` as a JSON object with four collections:
 
| Key | Contents |
|---|---|
| `malfunctions` | All malfunction records with status, repair times, costs, and operator info |
| `productionEntries` | Completed (and incomplete/logged-out) production sessions |
| `activeProductions` | Currently running sessions, updated every second |
| `pendingAutoWork` | A single pending autonomous run (null when none) |
| `completedAutoWork` | Historical autonomous operation records |
 
The page reloads state from `localStorage` on window focus, keeping multiple open tabs in sync.
 
---
 
## Validation Rules
 
| Field | Rule |
|---|---|
| Order number | Exactly 6 digits, numeric only |
| Pieces | Positive integer |
| Estimated time per piece | Integer between 3 and 30 seconds |
| Repair cost | Number ≥ 0 required |
| Collaboration cost | Number ≥ 0 (required only if external partner is checked) |
| Malfunction category | Non-empty text |
| Malfunction resolution | Non-empty text |
| Autonomous end time | Required on retroactive entry |
| Autonomous actual pieces | Required on retroactive entry, if below target, justification is mandatory |
 
---
 
## Tech Stack
 
- HTML, CSS, JavaScript
- `localStorage` for cross-role, cross-tab state persistence
- `setInterval` for live updates
- Responsive layout via CSS Grid and Flexbox

---

## Contributors
- Christina Mylonaki
- Chrysanthi Intouna
- Aliki Galeridou
- Despoina Petrogianni 

*Developed for academic purposes - 2026*
