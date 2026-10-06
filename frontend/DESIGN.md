# SSDCVE Design System

Trust-blue authority with achievement-gold accents. Swiss minimalism carries
the layout; editorial serif appears only in display moments. This file is the
source of truth; tokens live in `src/index.css` and `tailwind.config.js`.

## Palette

| Token | Light | Dark | Role |
|---|---|---|---|
| Primary trust blue | #0369A1 | sky #38BDFC | All text, links, buttons, interactive states |
| Secondary sky | #0EA5E9 | #0EA5E9 | Decorative fill only, never text or interactive |
| Accent gold | #A16207 | #D9A441 | Large or bold text, seals, accents |
| Background | #F0F9FF | navy #0A1826 | Page base, never pure white in light theme |
| Card | #FFFFFF | #10273A | Surface for cards, popovers, dialogs |
| Ink | #0C4A6E | #F0F9FF | Foreground text on background |
| Muted fill / muted text | #E7EFF5 / #475569 | card navy / light muted | Subtle surfaces and supporting text |
| Border / input | #BAE6FD | navy border | Boundaries and inputs |
| Destructive | #DC2626 | lighter red | Errors and destructive actions |

## Measured contrast ratios

Light on background #F0F9FF: primary #0369A1 5.57:1 (passes text),
gold #A16207 4.62:1 (passes, near the line), secondary #0EA5E9 2.6:1
(fails text, decorative only), destructive #DC2626 4.53:1 (passes,
standard sizes only), muted foreground 7.03:1 (passes).
Dark on navy/card: gold 7.97 / 6.80, sky 8.41 / 7.17 (all pass strongly).

## Usage rules

- Secondary is decorative-fill only: chart areas, illustration, large
  graphic blocks. Never body text, never icons that carry meaning, never
  interactive boundaries or focus states.
- Primary carries every text and interactive state. When in doubt, use primary.
- Gold is for large or bold text, result seals, and small accents. Never
  small body copy or form labels.
- Destructive stays at standard text sizes for errors and confirmations.
  Never de-emphasized small print for destructive meaning.
- Status is always word-labeled, never color alone.

## Typography

- Inter (`font-sans`) everywhere: body, headings, tables, forms, buttons.
  Tracking tight on headings. Tabular numerals for data.
- Playfair Display (`font-display`) is display only: landing hero,
  result seals, empty-state titles. Never body copy, tables, or forms.
- Monospace only for credential numbers, hashes, and values users copy.

## Radius, shadow, motion

- Radius: xl cards, lg controls (`--radius: 0.625rem`).
- Shadows: custom soft shadows only, no `shadow-md`.
- Motion: 200 to 250ms ease-out hovers. Skeleton shimmer is the only loop.
  Motion runs on state change only (tab switches, dialog open and close,
  theme toggle). Honor `prefers-reduced-motion`.

## Icons

Lucide icons only, one stroke weight per surface. No emoji icons in UI.

## Copy rules

- No em dashes in any user-facing string. Use commas, colons, or periods.
- No leak tokens in UI strings: no raw UUIDs, ports, URL paths, status
  codes, hashes, or crypto jargon in prose. Technical fields (content hash,
  transaction hash, check names) appear as labeled values with short plain
  word tooltips, while surrounding prose stays jargon free.
- Dates are UTC explicit. Errors use `role="alert"`. Loading uses
  skeletons with `aria-busy`.
