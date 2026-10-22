---
version: 6.0.0
name: Reactive Resume · Desk & Paper
description: A warm, quiet interface around bright paper. Moss green marks primary actions, selection, and progress. Light and dark themes keep document paper white.
colors:
  light:
    bg: "#F8F7F3"
    surface: "#FEFDFC"
    raised: "#FFFFFF"
    sunken: "#F0EFEB"
    line: "#DFDEDA"
    line-2: "#C5C4BE"
    ink: "#1C1B15"
    ink-2: "#4F4D47"
    ink-3: "#6D6C65"
    accent: "#337344"
    accent-hover: "#206133"
    on-accent: "#F7FEF8"
    accent-soft: "#DCF2DF"
    accent-text: "#195C2E"
    danger: "#BA3630"
    danger-soft: "#FFE7E4"
    danger-text: "#A92321"
    warn: "#D29922"
    warn-soft: "#FCEDCD"
    warn-text: "#81520A"
    info-soft: "#E0F1FF"
    info-text: "#1D5B92"
  dark:
    bg: "#100F0C"
    surface: "#171613"
    raised: "#1F1E1A"
    sunken: "#0B0A08"
    line: "#2C2B27"
    line-2: "#494843"
    ink: "#EFEEEB"
    ink-2: "#BCBAB5"
    ink-3: "#979590"
    accent: "#6FC082"
    accent-hover: "#83D494"
    on-accent: "#07150A"
    accent-soft: "#1A3520"
    accent-text: "#8FD89E"
    danger: "#D9544B"
    danger-soft: "#47211D"
    danger-text: "#FDA297"
    warn: "#E4B750"
    warn-soft: "#3E2D10"
    warn-text: "#EFCC83"
    info-soft: "#192F46"
    info-text: "#9DC9F7"
  paper: "#FFFFFF"
  stages:
    saved: "#908C7F"
    applied: "#5590CC"
    screening: "#00A0A6"
    interview: "#AF8433"
    offer: "#579F68"
    closed: "#C67067"
typography:
  display: { fontFamily: Newsreader, fontSize: 44px, lineHeight: 48px, fontWeight: 500, letterSpacing: -0.01em }
  title: { fontFamily: Newsreader, fontSize: 30px, lineHeight: 36px, fontWeight: 500 }
  sheet-title: { fontFamily: Newsreader, fontSize: 22px, lineHeight: 28px, fontWeight: 500 }
  heading: { fontFamily: Hanken Grotesk, fontSize: 20px, lineHeight: 28px, fontWeight: 600 }
  section-heading: { fontFamily: Hanken Grotesk, fontSize: 17px, lineHeight: 24px, fontWeight: 600 }
  label: { fontFamily: Hanken Grotesk, fontSize: 15px, lineHeight: 22px, fontWeight: 600 }
  field-label: { fontFamily: Hanken Grotesk, fontSize: 12px, lineHeight: 16px, fontWeight: 500 }
  body: { fontFamily: Hanken Grotesk, fontSize: 15px, lineHeight: 24px, fontWeight: 400 }
  ui: { fontFamily: Hanken Grotesk, fontSize: 14px, lineHeight: 20px, fontWeight: 400 }
  small: { fontFamily: Hanken Grotesk, fontSize: 13px, lineHeight: 18px, fontWeight: 400 }
  caption: { fontFamily: Hanken Grotesk, fontSize: 12px, lineHeight: 16px, fontWeight: 500 }
  mono: { fontFamily: JetBrains Mono, fontSize: 12px, lineHeight: 16px, fontWeight: 500 }
rounded:
  sm: 6px
  md: 8px
  lg: 10px
  xl: 12px
  2xl: 16px
  3xl: 18px
  4xl: 24px
  full: 999px
spacing: [4, 8, 12, 16, 24, 32, 48, 64]
motion:
  quick: 120ms
  standard: 200ms
  emphasized: 320ms
  easing: cubic-bezier(0.2, 0.8, 0.2, 1)
  exit: 70% of the entering duration
  movement-easing: cubic-bezier(0.77, 0, 0.175, 1)
marketing:
  brand: { name: NextRole AI, credit: "Built on Reactive Resume", mark: "N tile, accent fill, Manrope 800" }
  typography:
    headline: { fontFamily: Manrope, fontWeight: 800, letterSpacing: -0.045em, fontSize: "clamp(32px, 4.4vw, 68px)" }
    hero: { fontFamily: Manrope, fontWeight: 800, fontSize: "clamp(44px, 6.2vw, 104px)", lineHeight: 0.95 }
    lead: { fontFamily: DM Sans, fontSize: "16–19px", lineHeight: 1.55 }
    label: { fontFamily: DM Sans, fontSize: 11.5px, fontWeight: 700, letterSpacing: 0.1em, textTransform: uppercase }
    paper: { fontFamily: Newsreader, use: "demo resume and cover letter pages only" }
    wordmark: { fontFamily: Manrope, fontSize: 22cqw, lineHeight: 0.84, fontWeight: 800, letterSpacing: -0.065em }
  colors:
    receipt: "#FDFCF8"
    bulb-glass: "oklch(0.95 0.11 92)"
    bulb-filament: "oklch(0.7 0.16 60)"
    keyword-highlight: "oklch(0.9 0.06 280)"
  motion:
    pull-easing: cubic-bezier(0.3, 1.7, 0.5, 1)
---

## Overview

Reactive Resume uses “Desk & Paper”: a warm, quiet interface around a bright resume or letter. Low-contrast surfaces, thin rules, and a moss-green accent keep attention on the document.

This reference covers the current app and homepage. Implementation details live in the source files named below; [REDESIGN_PLAN.md](REDESIGN_PLAN.md) records the redesign milestones and deviations from the original handoff.

Five principles guide decisions:

1. **The page is the interface.** Keep the live document visible while editing. Selecting a supported block opens its fields.
2. **One obvious next step.** Each app view has one primary action. Reserve accent fills for that action, selection, and progress.
3. **Nothing is lost.** Edits autosave, reversible changes offer undo, and confirmations are reserved for irreversible actions.
4. **Detail on demand.** Make defaults useful; put advanced controls one disclosure deeper.
5. **AI proposes, you decide.** Show AI edits as reviewable proposals before applying them.

Resume templates retain their Pokémon names, fonts, and palettes. App typography and control styling do not dictate template appearance.

## Tokens

`packages/ui/src/styles/globals.css` defines light tokens on `:root` and dark overrides on `.dark`. OKLCH values are authoritative; the front matter lists approximate sRGB equivalents. Tailwind exposes semantic utilities such as `bg-bg`, `bg-surface`, `border-line`, `text-ink`, and `bg-accent`.

- **Surfaces:** `bg` for the app desk; `surface` for panels and cards; `raised` for menus, dialogs, and inputs; `sunken` for wells, tracks, and the page canvas.
- **Text:** `ink` for primary text, `ink-2` for secondary text, and `ink-3` for metadata and placeholders. Use no lighter text token, and check contrast on tinted backgrounds.
- **Signals:** `danger` for errors and irreversible actions; `warn` for issues to review; `info-soft` and `info-text` for neutral guidance. Success uses `accent-soft` and `accent-text`.
- **Overlays:** `hover` and `press` are translucent interaction states; `scrim` and `scrim-sheet` dim the background behind layers.
- **Paper:** `--paper` remains white in both themes. Switching the app theme must not invert documents.
- **Stages:** `stage-saved`, `stage-applied`, `stage-screening`, `stage-interview`, `stage-offer`, and `stage-closed` identify application stages. Use small dots or stepper bars beside stage names.

Use semantic tokens in app code. Legacy names such as `background`, `foreground`, `primary`, `muted`, and `sidebar-*` are no longer defined.

## Typography

The front matter records the app type scale. Field labels use the separate `field-label` size.

- **Newsreader:** page, dialog, and sheet titles; empty-state headlines; large statistics. Use `font-display`.
- **Hanken Grotesk:** functional UI and body text. Use `font-sans` or `font-ui`.
- **JetBrains Mono:** shortcuts, URLs, slugs, filenames, counts, and section eyebrows. Use `font-mono`.
- Field labels are 12px, medium weight, in `ink-2`, with a 6px gap above the control. Group eyebrows are 12px, semibold, uppercase, in `ink-3`, with 0.02em tracking.
- Touch inputs use at least 16px text to prevent iOS zoom.
- Fonts are self-hosted through `@fontsource-variable`.

## Iconography

App icons use **Phosphor** (regular weight) through `Icon` from `@reactive-resume/ui/components/icon`. `Icon` takes the glyph's Phosphor name (`x`, `gear-six`, `magnifying-glass`), the same names the [Phosphor catalog](https://phosphoricons.com) and resume icons use. To use another glyph, add it to the `icons` map in that file.

Use 20px icons on desktop and 24px on touch interfaces. Regular weight is the default; reserve filled app icons for selected navigation. Marketing illustrations may use filled icons, such as the GitHub star.

Pair icons with text. Back, close, more, undo/redo, history, assistant, and zoom controls may use `IconButton`, which requires an accessible label and supplies a tooltip with an optional shortcut. `Icon` is decorative (`aria-hidden`) and sized by its font size, so containers can resize it with `text-*`. Directional arrows, chevrons, undo, and redo mirror in RTL layouts.

Icons inside resumes use Phosphor names stored in resume data, drawn by the Phosphor web font; they remain separate from app icons.

## Space, shape, and elevation

- **Spacing:** use the 4px scale in the front matter. Cards typically have 16px padding, panels 16–24px, mobile pages 16px margins, and desktop pages 32–40px margins.
- **Radius:** 6px for chips and small buttons; 8px for inputs and controls; 10px for list items; 12px for cards and menus; 16px for dialogs; 18px for mobile sheets. Use `rounded-full` for pills; `rounded-4xl` is 24px where needed.
- **Elevation:** `shadow-e1` for cards; `shadow-e2` for menus and popovers; `shadow-e3` for dialogs, sheets, and toasts; `shadow-page` for editor paper.
- **Controls:** button heights are 28px (`sm`), 36px (`default`), and 44px (`lg`). Icon button sizes range from 28px to 44px. Inputs grow from 36px to 44px on touch devices; `touch-target` expands smaller controls' hit areas to at least 44×44px.
- **Layout variables:** `--editor-bar: 56px`, `--editor-panel: 400px`, `--app-sidebar: 240px`, `--sheet-share: 440px`, `--sheet-detail: 480px`, and `--assistant: 400px`.

## Motion

| Token                 | Duration | Use                                                    |
| --------------------- | -------- | ------------------------------------------------------ |
| `duration-quick`      | 120ms    | Hover, press, toggles, checkboxes, and focus           |
| `duration-standard`   | 200ms    | Menus, popovers, expansion, content swaps, and dialogs |
| `duration-emphasized` | 320ms    | Sheets, toasts, and the assistant column               |

- Entering and changing state use `ease-enter` (`cubic-bezier(0.2, 0.8, 0.2, 1)`). Exits take 70% of the entry duration.
- Sliding indicators, reordering, and settling use `ease-in-out-strong` (`cubic-bezier(0.77, 0, 0.175, 1)`). Swipe-dismissed bottom sheets use `ease-drawer`.
- Keep app motion brief and purposeful. Small entrance fades, status transitions, and the mobile tab indicator's spring are supported. Loading placeholders stay still; document reflow is never animated. Keyboard mode switches are instant.
- Reduced motion sets duration tokens to 1ms and collapses CSS transitions and animations. Status spinners continue turning.
- `apps/web/src/libs/motion.ts` mirrors CSS timings. `MotionConfig reducedMotion="user"` and `followReducedMotion()` make Motion animations respect the preference.

The homepage has separate motion rules below.

## Components

Generic primitives live in `packages/ui/src/components`, using Base UI and cmdk for the command palette. Feature-specific UI belongs in its owning `apps/web` feature.

- **Buttons:** `primary`, `secondary`, `ghost`, `danger`, and `link`. `loading` adds a spinner, sets `aria-busy`, and blocks activation. Use a progress label such as “Preparing…”.
- **Inputs:** `raised` background and `line-2` border; focus adds an accent border and a 3px `accent-soft` ring. Invalid fields use danger styling. Show errors after blur or submission, with an icon and a specific remedy.
- **Switches:** prefer `SwitchRow` so the label is part of the target. Checkboxes are 18px with a 5px radius; radios are 18px with an 8px accent dot.
- **Segments and tabs:** use `SegmentedControl` for 2–4 options in a radio group. Use `Tabs` to switch panels; set `TabsList variant="line"` for underline tabs.
- **Menus:** 12px radius and 36px items. Size popups for their content and trigger; put destructive items last, after a separator.
- **Layers:** menus and popovers provide lightweight choices; sheets hold tasks beside the document and use the bottom variant on mobile; dialogs hold decisions. Use `AlertDialog` for destructive confirmation and name what cancel keeps.
- **Toasts:** one visible at a time, bottom center, with `bg-ink` and `text-bg`. The default timeout is six seconds; `timeout: 0` keeps a toast visible. Undo is an optional underlined action.
- **Alerts:** `info`, `success`, `warn`, and `error`; only the error variant adds `role="alert"` by default.
- **Empty states:** a 22px Newsreader headline, concise 14px body text, and a primary action. Add a secondary action only when useful.

## Accessibility

Target WCAG 2.2 AA:

- Show a 2px accent focus outline with a 2px gap on `:focus-visible`. Inputs use their border and soft ring instead.
- Provide at least 24px pointer targets and 44px touch targets. Every drag operation needs keyboard and menu alternatives.
- Pair color signals with text; add icons where they clarify status.
- Trap focus in modal sheets and dialogs. Escape closes the top layer; closing returns focus to its trigger.
- Announce save state and routine feedback politely. Reserve assertive announcements for errors that need immediate attention.

## Themes

The shared `theme` cookie stores `light`, `dark`, or `system` (the default). System mode follows `prefers-color-scheme` live. `ThemeProvider` manages the `.dark` class on `<html>`; an inline script in `apps/web/index.html` applies it before first paint. The homepage uses this same preference.

## Internationalization

- Translate user-facing text and accessible labels through Lingui (`t`, `msg`, or `<Trans>`). Catalogs live in `apps/web/locales`.
- UI primitives receive translated labels as props, such as `closeLabel`; they do not depend on Lingui.
- Supported locales come from `packages/utils/src/locale.ts`. The root route updates `<html lang>` and `<html dir>` and passes direction to Base UI's `DirectionProvider`.
- Prefer logical properties and utilities (`ps`, `pe`, `ms`, `me`, `start`, `end`, `inset-s`, `inset-e`).
- Allow 30–50% text expansion; avoid fixed widths for translated labels.

## Marketing site

The public homepage in `apps/web/src/features/homepage` presents **NextRole AI**, built on Reactive Resume. It uses the app's tokens, themes and components' visual language: cards, chips and stage dots as the app draws them. Documents on paper keep Newsreader; everything else uses the app's families. `landing.css` holds only what the page adds: the receipt font, the theme cord's and language list's animations, and a few utilities.

### Story

One scroll-driven story: "Your next role, found and prepared."

| #   | Section   | Shows                                                                                                   |
| --- | --------- | ------------------------------------------------------------------------------------------------------- |
| 00  | Hero      | The Overview on a morning: the search runs, a role lands, its drafts get written, an interview appears. |
| 01  | Baseline  | The baseline resume on paper, setup's checklist ticking off, then facts and a story.                    |
| 02  | Discover  | One run told openly: results, already known, rejected and why, then the roles kept.                     |
| 03  | Prepare   | The tailored copy with matched phrases lit, the cover letter, and the review panel.                     |
| 04  | Your turn | The board the visitor moves themselves, a follow-up draft, interview prep and the coach.                |
| 05  | Builder   | The resume builder underneath: a fan of templates and the editor's features.                            |
| 06  | Control   | The eight pipeline steps, the last two marked "Yours", and six promises.                                |

Then Numbers, Languages, Support, Questions, Closing and the footer.

Copy must match what the product does. The system prepares drafts and stops; it never applies or sends anything in the visitor's name. AI features use the visitor's own key, and discovery needs a web search connection. Say both plainly.

### Brand and type

- **Mark:** an "N" in an accent tile beside the "NextRole" wordmark and an "AI" badge, as in the app's sidebar (`Brand` in `ui.tsx`). The header and footer use it; the footer and hero credit Reactive Resume.
- **Headlines:** Manrope 800 with tight tracking (`headlineClass`). Emphasis is a phrase in `accent-text`, not italics.
- **Body:** DM Sans (`leadClass`). **Labels:** 11.5px uppercase DM Sans at weight 700 (`labelClass`).
- **Paper:** the demo resume (`sheet.tsx`) and cover letter use `--font-serif-display`, so documents stay in Newsreader.
- **Wordmark:** "Next" in `ink` and "Role" in `accent-text`, Manrope 800 at 22cqw, rising out of a masked container as the footer enters. Decorative (`aria-hidden`).

### Controls

- One primary CTA, "Set up your search", in the header, hero and closing section, linking to `/dashboard/overview`. Pills in DM Sans 600 at 38px, 54px and 56px.
- Scene navigation appears from 1240px: a pill per scene, `accent-soft` with `accent-text` when active.
- The GitHub link appears from 1024px with a live compact star count; the accessible name carries the full count.
- The theme control is the fixed pull cord at the top end corner (92px at rest, 112px on hover, 124px during a pull, 450ms spring). It toggles the shared theme after 170ms and sways every seven seconds until first pulled. The bulb glows in dark mode.

### Motion

Pinned scenes contain a sticky `100svh` stage. Scroll progress is `p = clamp(0, −top / max(1, height − viewportHeight), 1)`; `scroll.ts` writes it to `--p` through one animation-frame-throttled scroll listener. Each pinned scene also has step thresholds (`SCENE_STEPS`); React hears only the step, and `Reveal` fades and lifts content in when its step arrives. Unpinned sections (the template fan, the pipeline line, the footer wordmark) derive motion from `--p` in CSS.

| Scene     | Below 900px | From 900px |
| --------- | ----------- | ---------- |
| Hero      | 200vh       | 240vh      |
| Baseline  | 260vh       | 300vh      |
| Discover  | 280vh       | 320vh      |
| Prepare   | 280vh       | 320vh      |
| Your turn | 280vh       | 320vh      |

The background is a dot grid in `line`, fading down the screen, under a soft accent wash; dark mode adds an accent glow that follows the cursor. All of it is decorative.

Reduced motion sets every scene to its end state and lets pinned sections take their content's height. Scroll scrubbing, the cord's sway and the count animations stop. The Languages rotation has a pause control and stays still with reduced motion.

Below 900px each pinned scene shows only its caption's first paragraph and drops secondary cards so the stage fits; short viewports (`short:`, under 720px tall) hide more.

### Content and delivery

- Prerender the homepage and public ATS checker per locale at build time through `prerender.tsx` and `apps/web/vite.config.ts`. The app is a client-rendered SPA; `apps/server/src/static/web.ts` serves the generated HTML and adds canonical, Open Graph, `hreflang`, and structured data. Keep headings and body copy in the initial HTML.
- Include title and description metadata and `SoftwareApplication` structured data with a zero-price offer.
- Use one `h1`, section headings, landmarks, and a skip link. Animated character treatments expose the complete string once to assistive technology. Nothing relies on hover alone.
- Translate copy, accessible labels, and demo resume text through Lingui. Names and addresses may stay literal; the Languages display intentionally preserves native words and language names. Allow text expansion and RTL layouts.

## Do and don't

- **Do** make the primary action obvious and reserve accent for actions and state.
- **Do** keep text readable and pair color signals with words.
- **Do** provide empty, loading, error, and success states; keep loading placeholders at their final size.
- **Don't** introduce arbitrary app colors or palette classes such as `amber-600`; use semantic tokens.
- **Don't** use Newsreader for small functional app text. Homepage prose follows its separate type rules.
- **Don't** confirm reversible actions; offer undo.
- **Don't** omit `data-slot` on UI primitives; styles and tests rely on it.
