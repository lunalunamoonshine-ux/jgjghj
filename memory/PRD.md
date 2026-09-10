# HK Bar POS — PRD

## Original problem statement
Brownfield hardening of an existing HK bar POS (React CRA + FastAPI + MongoDB, repo: bellybeeroperations-png/posrepotry). Live POS runs on-prem LAN only; owner gets a read-only cloud reporting mirror (push-only, no inbound hole). Gap backlog: printer routing, ingredient inventory, card terminal, split/merge, clock-in/HR, cloud mirror, deployment cleanup. Later extended with floorplan upgrades, ops rituals, QR self-ordering, darts ledger, and audit chain.

## User personas (role hierarchy, server-enforced)
- **Owner (godmode)**: Steph (666), Mandy (888), platform owner lunalunamoonshine@gmail.com (9999) — everything incl. financial-record deletes (audit-chained)
- **Admin / Manager / Asst Manager**: admin@belly.com (0000), Cindy (111), Mavis (222), Shrey (333), Kat (555) — all read/write EXCEPT deleting financial records (403)
- **Cashier**: payments, open/close orders, members/loyalty, discounts (no account assigned yet)
- **Front of House**: John (777) — orders (no payments), tables, waitlist, reservations, members, KDS bump
- **Kitchen & Maintenance**: Ayi (999) — KDS bump, 86 board, inventory restock/wastage
- **Guest**: QR menu at `/m/{tableId}`, no auth, order + FPS pay-at-seat
- Enforcement: `role_write_guard` middleware (write allowlists per restricted role) + `MANAGER_ROLES`/`require_manager`/`require_owner` in deps.py; demo staff deactivated

## Architecture
- Backend: FastAPI modular routers (orders, tables, kegs, printers, inventory, mirror, audit, tournaments) + server.py core (auth, shifts, CRM, public QR)
- Frontend: React CRA, Tailwind, dark neon HK-bar theme, left-rail nav
- DB: MongoDB local; mirror DB `hkpos_cloud_mirror` for the cloud service
- Cloud mirror: separate FastAPI on :8002 (`/app/cloud/cloud_server.py`, supervisor program `cloud`), API-key gated, read-only
- Printing: server-side ESC/POS job routing — SIMULATION mode (printer `online` flag) until hardware lands

## Implemented (2026-09-10)
- **Gap backlog v2**: printer routing (drink→bar/food→kitchen/receipt, retry+alerts), ingredient inventory (BOM, auto-deduct on paid sale, negative guard, restock/wastage, usage report), card terminal pluggable interface (manual fallback, 402 without approval), PIN-login auto clock-in + per-staff hours/payroll in Reports, cloud mirror sync (auto 120s + manual), HK seeds kept
- **Floorplan**: round/rect tables, corner-drag resize, per-table color (border/fill/both) with palette
- **Ops rituals**: void with reason codes + manager PIN (fired items → auto wastage), voids audit log, spot count + variance report, purchase suggestions (par×2−hand), end-of-night wastage walkthrough on clock-out
- **QR self-ordering**: guest cart → pending_confirm → KDS "Confirm & Fire" → prints tickets
- **FPS pay-at-seat**: guest bill view + "I've paid" request → staff confirm/reject in KDS → settles through full payment path (stock, receipt, audit)
- **Darts tournament ledger**: sign-ups, entry-fee collection (cash/octopus/fps), prize pool, pool-guarded payouts, close; all txs hash-chained
- **Immutable audit chain (19.01)**: append-only SHA-256 hash chain over payments/voids/tournament txs; `/api/audit/verify` walks the chain; Audit page with verify button
- **Cloud mirror v2**: pre-shift briefing (low stock/86'd/events), owner alerts, revenue trend chart

## Testing
- iteration_18: 20/20 backend + full frontend pass (all 7 gap features)
- Post-batch curl E2E: tournaments (collect/payout/pool-guard), FPS pay-at-seat (bill→request→confirm→settle), audit verify (chain valid), QR order flow via Playwright

## Mocked/simulated (by design)
ESC/POS printing (simulation until hardware), card terminal (manual fallback, no vendor docs), Octopus/FPS guest pay (staff-confirmed), Stripe preauth (test mode)

## Backlog (prioritized)
- P0: real python-escpos Network() dispatch when printers arrive; card terminal vendor API when model/docs known; nightly mongodump cron + UPS checklist
- P1: 19.15 PDPO export/erase, 16.06 screening compliance log, 16.07 CASH/ACES log, 19.05 halal/veg tags, 17.04 packaging recovery, 18.01/18.02 merch SKUs, 19.14 bulk void-undo
- P2: 5.02 bracket-linked tabs, 5.03 fantasy wallet, 5.04 sponsorship credits, 5.05/19.09 TV signage push (WebSocket), 19.10 2FA push approvals (Telegram), 17.01 WeChat Mini Program, 18.04 voucher liability, 15.x analytics studies
- NOT doing: 19.08 captive portal (UniFi handles it), full offline sync (LAN-only by design)
