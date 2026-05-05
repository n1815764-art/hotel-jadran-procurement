# CLAUDE CODE PROMPT: Requisition Submission Form

## Context

Department heads at Hotel Jadran (Chef, Housekeeping, IT, Maintenance, Bar) need a way to submit exceptional purchase requests — items that aren't being auto-handled by WF08's daily par-level scan, or items needed in higher-than-normal quantities for upcoming events.

The backend already supports this end-to-end:
- `POST /webhook/requisition` (WF03) — accepts the requisition, normalizes, writes to `Requisition_Log`, calls WF04
- WF04 — Kimi K2.5 validates and routes to APPROVE / REDUCE / REJECT / FLAG
- WF06 — creates the PO and runs the tiered approval flow

**What's missing is the requester-facing form.** Today, exceptional requests happen verbally or over WhatsApp. We're replacing that with a form that's genuinely simpler and faster than typing an email.

## The design principle that drives every decision

The form has to do mental work the user would otherwise do themselves. If we just ask "what do you want, how much, why?" we've built a worse version of email. Every field should either be pre-filled, suggested, or skippable.

Five requirements that flow from this:

1. **Item picker, not free-text typing** — searchable dropdown over the inventory master in BCS
2. **AI-suggested quantity** the moment an item is picked, with one-tap accept
3. **Auto-reorder pre-check** — if WF08 already has this covered, tell the user before they finish the form
4. **Inline budget context** — show line cost as % of department's remaining monthly budget
5. **Justification optional** — only required if Kimi flags it later

## Where it lives

A new route group sibling to `(dashboard)` and `(receiving)`:

```
app/(requisition)/zahtjev/page.tsx
app/(requisition)/layout.tsx
```

The `(requisition)` layout is independent — no shared sidebar, no dashboard chrome. Tablet-optimized layout because the form will get used from kitchen/housekeeping tablets, not desks.

The route should also be reachable from the receiving tablet app via a "Novi zahtjev" button on its home screen. Modify `app/(receiving)/prijem/page.tsx` to add this entry point — sits alongside the existing receiving actions, navigates to `/zahtjev`. Same codebase, same data layer, just exposed from both entry points.

**Theme: dark.** Apply the existing `theme-dark` class to the `(requisition)` layout. Match the dashboard and receiving app for visual consistency — high-contrast dark theme works fine in kitchens and storage rooms with bright lighting (the receiving app already validates this assumption). Do not introduce a new light theme.

**Staff selector pattern.** A simple dropdown of known staff names — Vasilije, Biljana, Filip, etc., with department shown alongside the name. No PIN, no password, no auth. Persists the selection in localStorage for the session. This is its own pattern — do not reference or copy the receiving app's flow if it differs.

## UI flow (one screen, progressive reveal)

The form is a single screen that progressively reveals fields as the user fills them in. Each section appears only after the previous one is complete, so it never looks intimidating on first load.

### Section 1 — Tko šalje zahtjev (Who is requesting)

Two fields:
- **Staff name** — dropdown of known staff (Vasilije/Kuhinja, Biljana/Domaćinstvo, Filip/IT, etc.)
- **Department** — auto-fills from the staff selection; editable in case someone is requesting on behalf of another department

Both are skipped on visits 2+ in the same session (localStorage).

### Section 2 — Što treba (What is needed)

Reveals after Section 1 is complete.

**Item picker** — a single search input. As the user types (BCS), filter the inventory master. Show item name + warehouse subtitle + current stock. Tapping an item locks it in and triggers Section 3.

The search should match BCS partials, including diacritics-insensitive (typing "piletina" should match "pileća prsa", "piletina"). Use a `String.prototype.normalize('NFD').replace(/[\u0300-\u036f]/g, '')` pattern on both the query and the item names before comparison.

If the requester needs an item that's not in the inventory master (genuine new SKU), there's a small link below the search: "Artikal nije na listi? →". Clicking switches the picker into free-text mode with a note that new items take longer to process and may be flagged. Don't make this prominent — 95% of requests should be for known items.

### Section 3 — The smart context block (the heart of the form)

Reveals immediately after item selection. Three things happen in parallel as soon as the item is locked in:

**3a. Auto-reorder pre-check (top of the block, full width):**

Query the inventory and recent PO data to determine: is this item below reorder_point AND is there no pending auto-reorder PO for it AND will WF08 catch it on its next 6 AM run?

Render one of three states:

- **Already covered (green):**
  > ✓ Već u rasporedu — auto-narudžba sutra ujutro u 6:00. Količina: 30 kg (na osnovu zauzetosti i pareva).
  
  Below this, two buttons: **"Dodaj dodatnu količinu"** (continue with form, treats request as additive over what's already coming) and **"Nije potrebno, hvala"** (closes form with a friendly confirmation, no submission). The second button is the most common path and should feel like a win, not a dead end — green checkmark, "Sve je u redu, sistem to već radi," done.

- **Below reorder point but not in auto-reorder schedule (amber):**
  > ⚠ Stanje nisko ({current_stock} {unit}, ispod reorder točke), ali nije u rasporedu auto-narudžbe. Vaš zahtjev će kreirati PO.
  
  Form continues normally.

- **Stock healthy, regular request (neutral):**
  > Trenutno stanje: {current_stock} {unit}. Par nivo: {par_level} {unit}.
  
  Form continues normally.

**3b. AI quantity suggestion (left side of block, below pre-check):**

Call the new `/api/suggest-quantity` Next.js route (see backend section below). Render:

> AI predlaže: **30 kg**
> _Zauzetost 87% sljedećih 7 dana, vjenčanje subota (120 pax)._

One-tap **"Prihvati 30 kg"** button that fills the quantity field. The user can also type their own quantity in a separate input below — both paths work.

If the API call fails or times out, hide the AI suggestion silently and just show the manual quantity input. Don't surface API errors to the requester — they shouldn't have to care.

**3c. Budget context (right side of block, below pre-check):**

The moment a quantity is in the field (whether AI-accepted or manually typed), live-compute the line cost and budget impact:

> Cijena: **165,00 €**
> Budžet maja ({department}): **78%** iskorišteno · ostalo **2.420,00 €**
> Ova narudžba: **6,8%** preostalog budžeta

Color cue on the percentage: green if <50% of remaining, amber 50–80%, red >80%. **Never block submission** based on budget — this is information, not a gate. WF04 and the approval tiers handle gating.

Source budget data from the existing GL Account Mapping table (it has `budget_monthly` per department/category) and sum month-to-date PO totals from the PO_Log filtered to the same department + GL.

### Section 4 — Hitnost i obrazloženje (Urgency and justification)

Reveals after a quantity is set.

**Urgency** — three radio buttons: Standardno (default), Hitno (within 48h), Vrlo hitno (within 24h, requires justification). Pre-selected to Standardno.

**Obrazloženje (justification)** — a single text area, **optional by default**, with placeholder text like "Opciono — npr. 'za vjenčanje subota'." Becomes required only if Vrlo hitno is selected, or if the quantity exceeds the AI suggestion by more than 50% (in which case the field expands and the placeholder changes to "Količina znatno iznad preporuke — molimo objasnite.").

Don't gate normal-quantity requests behind a justification field. WF04 will FLAG and request more detail if needed.

### Section 5 — Submit

A single full-width primary button: **"Pošalji zahtjev"**.

On submit:
- Call `dataService.submitRequisition(...)` (existing method — see data layer section)
- Disable the button immediately, show a small spinner inline
- On success: replace the form with a confirmation screen
- On failure: re-enable the button, surface the error inline above it, keep all field values

### Section 6 — Confirmation screen

Replaces the form on successful submit. Shows:

> ✓ Zahtjev poslan
> 
> {requisition_id}
> 
> {Item name} — {qty} {unit}
> 
> Sistem provjerava zahtjev. Dobit ćete obavijest u Slacku kad bude obrađen (obično pod 30 sekundi).
>
> [Pošalji još jedan zahtjev]   [Završi]

## Data layer

### Existing — extend, do not replace

`DataService` already has `submitRequisition()` with the webhook POST wired in the Airtable implementation. **Do not create a new `requisition-service.ts`.**

Extend the existing input type with three new fields:

```typescript
{
  // ...existing fields...
  item_id: string;
  ai_suggested_quantity?: number;
  ai_suggestion_accepted?: boolean;
}
```

The existing `submitRequisition()` must pass `requisition_id` through verbatim (the form generates it client-side as `REQ-{YYYY}-{6-digit-random}` so the confirmation screen can show it immediately). If the current implementation generates its own ID server-side, change it to accept and pass through the client-provided one.

The new fields are forward-compatible with WF03 — they'll be ignored if WF04 doesn't read them yet. Adding read logic to WF04 is a separate change.

### New methods on `DataService`

```typescript
// Pre-check: is this item already covered by upcoming auto-reorder?
checkAutoReorderStatus(item_id: string): Promise<{
  covered: boolean;
  scheduled_date?: string;
  scheduled_quantity?: number;
  reasoning?: string;  // BCS
}>;

// Get budget context for a department
getDepartmentBudget(department: string): Promise<{
  monthly_budget: number;
  spent_mtd: number;
  remaining: number;
  pct_used: number;
}>;
```

Implement both for `SampleDataService` and the live Airtable service.

**Inventory for the picker** uses the existing `getInventory()` returning `InventoryItem[]`. Do not introduce a new picker-specific type. The form filters/displays the existing fields.

### AI quantity suggestion — new Next.js API route

Create `app/api/suggest-quantity/route.ts`. Reuse the env var pattern from the existing `/api/chatbot` route — same `MOONSHOT_CHATBOT_API_KEY`, same fetch shape against the Moonshot endpoint.

Request body shape:
```typescript
{
  item_id: string;
  item_name: string;
  department: string;
  current_stock: number;
  par_level: number;
  unit: string;
}
```

Response shape:
```typescript
{
  suggested_quantity: number;
  reasoning: string;  // BCS
}
```

Inside the route: build a Kimi prompt that includes the item context, occupancy forecast (read from sample/Airtable as appropriate), and any upcoming events. Use `thinking: { type: "disabled" }` for clean JSON output, same as other Kimi nodes in the system. Parse `response.choices[0].message.content` and strip code fences before JSON parsing.

If the Kimi call fails or returns malformed output, return a deterministic fallback: `suggested_quantity = max(par_level - current_stock, 0) + ceil(par_level * 0.2)`, with reasoning = `"Preporuka na osnovu pareva (AI nedostupan)."`. The form should never know whether it got real AI or fallback — both are valid responses.

The form calls this route via plain `fetch('/api/suggest-quantity', ...)` — no service file needed for this single endpoint.

## Webhook payload (matches WF03's existing shape, extended)

```json
{
  "requisition_id": "REQ-2026-847291",
  "item_name": "Pileća prsa",
  "item_id": "PROT-001",
  "quantity_requested": 30,
  "unit": "kg",
  "department": "Kuhinja",
  "urgency": "standard",
  "requester": "Vasilije",
  "justification": "...",
  "ai_suggested_quantity": 30,
  "ai_suggestion_accepted": true,
  "submitted_at": "2026-04-25T14:30:00+02:00"
}
```

## Validation

- Staff name and department: required
- Item: required (either picker selection or free-text-with-confirmation)
- Quantity: required, positive number, max 4 decimal places
- Urgency: required (defaults to standard)
- Justification: required only if Vrlo hitno OR quantity > AI suggestion × 1.5

All validation errors render inline under the offending field, in BCS, on submit attempt — not on every keystroke.

## Receiving app entry point

Modify `app/(receiving)/prijem/page.tsx` to add a "Novi zahtjev" button on the home screen. Place it alongside the existing receiving actions (don't replace anything). Tapping navigates to `/zahtjev`. The button should be visually consistent with the existing receiving app buttons — same dark theme, same large touch targets, same typography.

This gives staff a single tablet that handles both incoming deliveries and outgoing requests. No new device, no new app to learn.

## Sample data needs

`SampleDataService` needs:
- A representative inventory list (15+ items across departments) with realistic BCS names, par levels, current stock — most of this should already exist
- 2–3 mock auto-reorder schedules so `checkAutoReorderStatus` has both "covered" and "not covered" responses to demonstrate
- Department budgets keyed off the existing GL mapping
- For local dev without Moonshot API access: the `/api/suggest-quantity` route's fallback path covers this — no separate mock needed

## Out of scope

- Editing or canceling a submitted requisition (handled in Zoran's review flow if WF04 returns REDUCE)
- Multi-item requisitions (one item per request — WF04 expects this)
- Photo attachments (relevant only for receiving)
- Real-time validation feedback before submit (reveal-as-you-go is enough)
- A "request history" view for requesters (Slack notifications cover this; if needed later, it's its own page)
- Modifying WF04 to read the new `ai_suggested_quantity` / `ai_suggestion_accepted` fields (forward-compatible; ignored harmlessly until WF04 catches up)

## Architectural consistency

- Tablet-first responsive (works at 768–1024px primary, scales up cleanly to desktop, scales down to phone)
- Dark theme via `theme-dark` class on the `(requisition)` layout — matches dashboard and receiving app
- Large touch targets (min 48px) on every interactive element
- BCS for everything user-facing; English only in code, comments, types
- `formatEUR` from `lib/utils.ts` for every amount string (suffix `€`, hr-HR locale)
- No new npm dependencies
- No login, no auth — staff dropdown + localStorage is sufficient for the trusted environment

## What "done" looks like

A chef on a kitchen tablet can:
1. Tap their name in the staff dropdown (or skip it, already remembered)
2. Type "pil" and pick "Pileća prsa"
3. See "Already covered, auto-order tomorrow at 6 AM, 30 kg" → tap "Nije potrebno, hvala" → done in 8 seconds

Or, if it's a real request:
1. Tap their name
2. Type "pil" and pick "Pileća prsa"
3. See "Stock low, not in auto-order schedule" + AI suggestion of 30 kg
4. Tap "Prihvati 30 kg"
5. See "6.8% of remaining May budget"
6. Skip justification (standard urgency)
7. Tap "Pošalji zahtjev" → confirmation in <1 second → done in 15 seconds

Both flows have to be faster and lower-friction than opening email and typing a sentence. That's the bar.
