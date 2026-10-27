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
  brand: { name: NextRole AI, credit: "Built on Reactive Resume", mark: "N tile, accent fill" }
  theme: "dark only; tokens namespaced nr- in landing.css"
  typography:
    display:
      { fontFamily: Bricolage Grotesque Variable, fontWeight: 800, fontStretch: "78–85%", letterSpacing: -0.03em }
    hero: { fontSize: "clamp(54px, 8vw, 128px)", lineHeight: 0.86 }
    headline: { fontSize: "clamp(38px, 4.8vw, 70px)", lineHeight: 0.92 }
    body: { fontFamily: Geist Variable, fontSize: "16–18px", lineHeight: 1.62 }
    kicker: { fontFamily: Geist Mono Variable, fontSize: 12px, letterSpacing: 0.1em, textTransform: uppercase }
    paper: { fontFamily: Newsreader, use: "the tailored-resume excerpt only" }
  colors:
    void: "#04050B"
    ink: "#F1F2FF"
    ink-2: "#B6BAD6"
    ink-3: "#8C92B4"
    accent: "#B3A6FF"
    on-accent: "#110D2B"
    spectrum: ["#6BE4FF", "#B3A6FF", "#FF7AD9", "#FFC46B"]
  field: { points: "22,000 (9,000 below 900px)", formations: 10, pixelRatio: "≤ 2 (≤ 1.5 on phones)" }
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

The public homepage in `apps/web/src/features/homepage` presents **NextRole AI**, built on Reactive Resume. It is a dark world of its own, separate from the app's tokens: `landing.css` defines `nr-` colours, three landing font families and a few utilities (`nr-pane`, `nr-spectrum`, `nr-veil`, `nr-fallback`). It stays dark whatever the app theme; there is no theme switch on the page.

### Story

"A career team that works while you sleep." The product is sold as a crew of six specialists (Scout, Writer, Editor, Coach, Tracker, Advisor) that prepare everything and leave each decision to the visitor.

| Stage | Section              | Copy                                                                | Field formation                                      |
| ----- | -------------------- | ------------------------------------------------------------------- | ---------------------------------------------------- |
| 0     | Hero, Crew           | The promise; the six specialists and what each hands you            | A three-armed galaxy (the job market) around a core  |
| 1     | Know you             | Facts, five-part stories, preferences, import                       | A crystal lattice, facts gathered at its joints      |
| 2     | Scout                | Eleven job boards, followed companies, web search; Fit              | A terrain of postings swept by a scan ring           |
| 3     | Write                | Tailored resume, cover letter and answers; accuracy guards          | Three resume pages, each with its own phrases lit    |
| 4     | Studio               | The Reactive Resume builder: templates, fonts, ATS check, assistant | A curved wall, one page per template                 |
| 5     | Coach                | Briefings, practice aloud, debriefs                                 | A sphere that ripples like a voice, with sound rings |
| 6     | Track                | Board, calendar, insights, recruiter replies, offers                | Board columns in the app's stage colours             |
| 7     | Everywhere           | iPhone and Android, languages, MCP, WebMCP, APIs                    | A globe with one light per language, and an orbit    |
| 8     | Rules, Tour, Pricing | Six promises; the recorded tour; free, not freemium                 | A protective ring, dimmed behind the copy            |
| 9     | Finale               | "Your next role is out there. Send the crew."                       | The N mark                                           |

Copy must match what the product does. The system prepares drafts and stops; it never applies or sends anything in the visitor's name. AI features use the visitor's own key. Figures come from the code where they can (`templateSchema`, `localeSchema`); example figures in panes are labelled as fictional.

### Brand and type

- **Mark:** an "N" in an accent tile beside the "NextRole" wordmark and an "AI" badge (`Brand` in `ui.tsx`).
- **Headlines:** Bricolage Grotesque 800, condensed with `font-stretch`, tight tracking (`headlineClass`). One phrase per headline at most takes `nr-spectrum`, the page's only decorative type treatment.
- **Body:** Geist (`leadClass`). **Kickers and metadata:** Geist Mono, uppercase for kickers (`kickerClass`, `monoClass`).
- **Paper:** the tailored-resume excerpt keeps Newsreader (`font-serif-display`), so documents still read as documents.

### Controls

- One primary action, "Start free", in the header, hero and finale, linking to `/dashboard/overview`. Secondary actions are glass (`GhostLink`).
- The header is a floating glass bar with the section links (from 900px), the live GitHub star count (from 1024px) and "Start free".
- The journey rail lists the seven acts at the start edge from 1320px and marks the current one.
- The tour's chapters are buttons that seek the video.

### The particle field

`stage.tsx` renders a fixed, decorative canvas and imports `scene.ts` (three.js) after the page has painted. `formations.ts` builds ten formations of the same point count from a seeded generator, so the field looks the same on every visit. `progress.ts` turns the `[data-stage]` sections into a continuous stage: a section holds its stage for its first half and blends into the next over its second, unless the next section shares its stage.

- One `Points` draw call. The vertex shader morphs between the current pair of formations with a per-point delay and a mid-flight burst, ripples the coach's sphere and sweeps the scout's scan ring; colours blend with the positions. An iridescent fresnel core sits inside formations with a centre.
- Each stage has a pose (position beside its copy, rotation, scale, core, dim, nebula colours); poses mirror in RTL. Phones centre the field above the copy at a smaller scale.
- Rendering stops while the tab is hidden. Without WebGL, or if the context is lost, `nr-fallback` paints a still gradient instead.
- Reduced motion: the field jumps to each stage's pose with no drift, spin or pointer parallax; CSS animations stop and smooth scrolling is off.

### Assets

- **Tour:** `public/landing/tour.{webm,mp4}` with `tour-poster.webp`, recorded from the real app on a seeded, fictional account (`tooling/landing/record-tour.ts`). No sound. Chapters in `closing.tsx` must match the recording's timings.

### Content and delivery

- Prerender the homepage and public ATS checker per locale at build time through `prerender.tsx` and `apps/web/vite.config.ts`. `apps/server/src/static/web.ts` serves the generated HTML and adds canonical, Open Graph, `hreflang`, and `SoftwareApplication` structured data with a zero-price offer and a feature list. Keep headings and body copy in the initial HTML.
- Use one `h1`, section headings, landmarks and a skip link.
- Translate copy and accessible labels through Lingui. Names of fictional people, companies and job boards stay literal. Allow text expansion and RTL layouts.

## Do and don't

- **Do** make the primary action obvious and reserve accent for actions and state.
- **Do** keep text readable and pair color signals with words.
- **Do** provide empty, loading, error, and success states; keep loading placeholders at their final size.
- **Don't** introduce arbitrary app colors or palette classes such as `amber-600`; use semantic tokens.
- **Don't** use Newsreader for small functional app text. Homepage prose follows its separate type rules.
- **Don't** confirm reversible actions; offer undo.
- **Don't** omit `data-slot` on UI primitives; styles and tests rely on it.
