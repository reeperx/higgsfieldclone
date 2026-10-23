# Vendo commerce-control UI

Updated 2026-10-23. This document describes Vendo's product workflow, visual
language, and route-by-route interface. It is the source of truth for UI work;
the screenshots in `docs/screens/` are project captures and should be refreshed
when a route's composition changes materially.

## Product premise

Vendo helps online sellers create, compare, organize, and publish product
imagery. The UI should feel like a small commerce production desk, not a general
AI model directory. Lead with jobs sellers recognize—listing sets, lifestyle
scenes, campaign variations, and short product films. Model names are controls
inside a workflow, not the main information architecture.

## Visual system

### Color and surfaces

| Role | Value | Use |
|---|---|---|
| Ink canvas | `#101711` | App canvas and page background |
| Forest panel | `#171F18` | Cards, forms, menus, and raised panels |
| Deep raise | `#202B22` | Hover surfaces and nested controls |
| Soft white | `#F2F4EC` | Primary text |
| Sage grey | `#B4C0B5` | Supporting copy and metadata |
| Forest | `#31583E` | Primary action and navigation selection |
| Sand | `#D8B26E` | Generate CTA, focus, and selected/active states only |
| Hairline | `rgba(242,244,236,.10)` | Quiet card and table boundaries |

Every route uses the dark forest/ink palette, including marketing, account,
library, and admin surfaces. Use forest for steady primary actions and reserve
sand for Generate and active states. Avoid full-page black gradients,
oversized all-caps display type, and glow-heavy glass effects.

### Typography and shape

- Space Grotesk display headings; readable sans-serif interface and body copy.
- Sentence case for headings, labels, navigation, and buttons.
- Restrained sage accents, generous margins, thin borders, and soft 20–28 px card
  corners.
- Use photography as product context, not a full-viewport background behind
  every headline.
- Keep controls compact and explicit; avoid model-brand badges as the primary
  visual hierarchy.

### Interaction and accessibility

- Preserve every existing generation, billing, library, auth, moderation, and
  account behavior while changing its presentation.
- Keep active states identifiable without color alone; retain visible focus
  outlines and keyboard-operable dialogs, tabs, filters, and menus.
- Display the generation price before submit. Do not move secrets, model paths,
  or billing authority into client code.
- Media previews and generated output remain stable while scrolling; loading,
  empty, error, and failed-generation states are deliberate parts of each page.
- The mobile navigation and workbench must remain usable at 390 px and narrower.

## Route-by-route inventory

| Route | Audience and job | Interface emphasis |
|---|---|---|
| `/` | New seller choosing where to start | Product-content promise, three concrete workflows, proof of saved/publishable work, direct entry to photo creation |
| `/image` | Seller creating a listing set or scene | Product inputs, guided prompt/settings, transparent cost, visible output history |
| `/video` | Seller making a short product film | Source image/video, duration and sound controls, cost, progress and clip history |
| `/audio` | Reserved for the first audio catalog entry | Same contained workspace, only shown when an audio model is available |
| `/effects` | Seller browsing repeatable art direction | Filterable looks grouped by outcome, product examples, “use this look” into the right workflow |
| `/effects/[slug]` | Seller evaluating one look | Large example, what it changes, compatible workflow, one clear use action |
| `/dashboard` | Signed-in seller deciding what to make next | 30-day production pulse, recent outputs, project shelves, and live credit balance |
| `/assets` | Signed-in seller organizing outputs | Projects and output library, filters, batch actions, stable virtualized gallery |
| `/projects/[id]` | Seller reviewing a campaign or listing batch | Project context, campaign assets, move/rename/delete actions, create-from-project path |
| `/community` | Seller seeking practical inspiration | Shared product campaigns, image/video filters, useful prompt and model details |
| `/g/[id]` | Visitor inspecting one shared example | Legible media, author and creation details, report and recreate actions |
| `/pricing` | Buyer comparing plans and packs | ZAR-first plan cards, credit economics, limits, cancellation/refund FAQ |
| `/login` | New or returning seller | Clear email-link sign-in, consent for sign-up, private account safety |
| `/login/check-email` | Seller finishing sign-in | Next steps, expiry window, support path |
| `/login/error` | Seller recovering from sign-in trouble | Human-readable reason and a retry path |
| `/account` | Seller checking credits and activity | Balance split, plan status, ledger, next useful action |
| `/account/billing` | Seller managing a paid plan | Billing state, portal, renewal/cancellation and top-up actions |
| `/admin` | Operator managing the service | Dense but readable operational tables, moderation, pricing, generations and users |
| `/legal/[doc]` | Customer reviewing draft policies | Accessible document navigation, explicit non-operative warning, no unverified legal promises |
| not-found and error states | Anyone recovering from a bad route or failure | Plain-language explanation and a useful route back into the product |

## Shared shell

- **Marketing:** wordmark, workflow navigation (“Product photos”, “Product
  video”, “Looks”, “Work gallery”, “Pricing”), account actions, and a dark
  editorial footer with support/legal links.
- **Studio:** the same dark navigation, no promotional banner, and a dedicated
  generation work area below it.
- **Signed-in pages:** the same navigation and account menu; the dashboard
  prioritizes seller activity and billing; do not constrain dense admin tables
  to the marketing content width.
- **Mobile:** a compact menu exposes the same destinations and account/library
  routes. No feature is desktop-only.

## Screenshot coverage

`scripts/screenshots.ts` refreshes desktop and mobile captures for the public
home, photo, video, looks, community, pricing, and sign-in routes. Use the local
test seller to inspect and capture `/assets`, `/projects/[id]`, and account
pages after UI changes; use a separate local admin to inspect `/admin`.
Captures must come from the local app and its own sample data. Do not capture
competitor interfaces or copy their token dumps into the repository.
