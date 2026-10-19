# Reactive Resume MCP recipes

Tool sequences and JSON Patch recipes for tailoring inside Reactive Resume. Use only when the Reactive Resume MCP server is connected. Read before writing, show the user a before/after, and get a yes before every change. Tool input names for `api_*` tools are generated from the app's API; confirm them with `tools/list` if a call is rejected.

## Contents

1. Choosing a path
2. Path A: application with a linked resume
3. Path A-quick: AI summary rewrite
4. Path B: no application
5. Already submitted
6. JSON Patch recipes
7. Errors and edge cases

## 1. Choosing a path

`read_application {id}` first (find the id with `list_applications`, paging with `offset` until no `nextOffset` comes back, matching on company and role). Then:

| `resumeId` | `jobDescription` | `sentResumeVersionId` | Path                                                                                         |
| ---------- | ---------------- | --------------------- | -------------------------------------------------------------------------------------------- |
| present    | present          | empty                 | A (full) or A-quick (summary only, AI)                                                       |
| empty      | any              | empty                 | Choose a base with `list_resumes`, then A: the copy links itself because no resume is linked |
| any        | empty            | empty                 | Get the JD first (below), then A or B                                                        |
| any        | any              | present               | Already submitted (section 5)                                                                |

**Missing JD:** if the application has a `sourceUrl`, call `api_applications_ai_parse_posting {input: <url>}` (read-only, works without AI). On 422 `POSTING_UNREADABLE`, ask the user to paste the text. Show the parsed `jobDescription` and `requirements`, and on a yes save them with `update_application {id, jobDescription, requirements}`. `requirements` from the parser are a starting list; still build your own table.

## 2. Path A: application with a linked resume

1. `read_resume {id: resumeId}`: the base. Never patch it for tailoring; the only master edit is the optional "Facts learned" patch at hand-off (step 12).
2. `api_rest_match_resume {id: resumeId, jobDescription}`: deterministic, no AI. `found` terms help the evidence map. `missing` holds up to 35 terms, many of them generic phrases: use it to check your table, and ask only about missing terms that match a weight-2 or weight-3 row, inside the normal batch of at most 5. Never add a missing term without a confirmed answer.
3. Run the conversation: knockouts, table, gap questions, planned changes, before/after, yes.
4. `api_documents_copy_for_job {resumeId, applicationId, name}` → the copy's id. Name: `{Company} — {Role} — YYYY-MM-DD` (the tool accepts up to 100 characters; keep it under ~60 so it reads well in lists).
5. `read_application {id}` again. The copy became the application's resume only if no sent version exists and either no resume was linked or the stage is `saved`. If `resumeId` is still the base, ask, then `update_application {id, resumeId: <copy id>}`. Once the application points at the copy, tell the user: "Application X now uses the copy '{name}'; your original is unchanged."
6. `read_resume {id: <copy id>}` → keep `updatedAt` from structuredContent.
7. `apply_resume_patch {id: <copy id>, operations, expectedUpdatedAt}` with the recipes in section 6. One patch per logical group is fine; all ops in a call succeed or fail together.
8. `api_rest_check_resume {id: <copy id>}`: list its findings one line each (contact, dates, layout, headings, writing). Fix layout and date errors the approved plan already covers; ask before any wording change.
9. Optional, with consent: `score_application_match {id}` (AI; overwrites the saved score). Compare its `gaps` with your table; if it lists a gap you missed, ask the user about it. Don't optimise for the number.
10. Optional: `add_application_note {id, text}` such as "Tailored resume: Acme — Data Analyst — 2026-10-09. Open gaps: Snowflake (nice-to-have)."
11. Optional letter: see cover-letter.md, section 7.
12. Optional facts learned (SKILL.md step 10): `read_resume` on the master for a fresh `updatedAt`, show the new facts as a separate before/after, and on a yes `apply_resume_patch` on the master. Add only facts the user confirmed, in their words.

Leave the stage alone. The sent version is recorded when the user marks the application Applied with the copy linked (job-application-manager skill).

## 3. Path A-quick: AI summary rewrite

Preconditions: linked resume, JD, no sent version, an enabled AI provider, and the user's consent to send the resume and JD to it.

1. `tailor_resume_for_application {id}` → `{resumeId, name}`. It makes a private copy named "Tailored — {company} · {role}", adds the `tailored` tag, rewrites **only the summary**, relinks the application to the copy and adds the timeline note "AI tailored a resume: {name}". The original is unchanged.
2. `read_resume {id: <new resumeId>}` and check the new summary claim by claim against the base resume. Remove or rewrite anything not supported, with `apply_resume_patch`.
3. Continue with Path A steps 6–11 for headline, bullets, skills and layout.

Don't use it after the application has a recorded sent resume: the relink fails after the copy is made, leaving an orphan copy.

## 4. Path B: no application

1. `list_resumes` (optionally `tags`, `sort`) → choose the base with the user → `read_resume {id}`.
2. Conversation as in Path A.
3. `duplicate_resume {id, name, tags}`. Keep the name under ~60 characters so it stays readable in lists; `tags` replaces the default (the original's tags), so send the full list, for example the original tags plus `tailored`.
   The copy is private: duplicates don't inherit `isPublic`.
4. Patch and check as in Path A steps 6–8.
5. Offer to create the application record. The job-application-manager skill handles intake and duplicates; without it, `create_application {company, role, status: "saved", jobDescription, resumeId: <copy id>}` after checking `list_applications` for an existing record.

## 5. Already submitted

`sentResumeVersionId` means the documents were recorded when the application moved to Applied or later. `resumeId` can no longer change; `coverLetterId` is also locked once `sentCoverLetterVersionId` is set.

- To see exactly what was sent: `api_resume_get_version {resumeId, versionId: <sentResumeVersionId from read_application>}`. To browse history: `api_resume_list_versions {resumeId}`; versions of kind `sent` are named after the company.
- Tailoring now can't change what the employer has. Offer instead: a Path B copy for interview prep or a similar future role, or a handoff to interview-prep or mock-interview with the requirement table.

## 6. JSON Patch recipes

Rules for every patch:

- Paths come from the copy you just read. Indices shift after `remove`, `move` and `add`; compute each op against the array as it stands after the previous op.
- Put a `test` op before edits that depend on an index, so a stale read fails cleanly instead of editing the wrong item.
- Rich text is HTML (`<p>`, `<ul>`/`<li>`, `<strong>`, `<em>`), never Markdown. Bullets are stored as `<ul><li><p>…</p></li></ul>`.
- Hide with `hidden: true`. Don't `remove` items from the copy unless the user asks.
- New items need every field, a fresh UUID `id` and `hidden: false`. Every `website` field is an object.
- Write `dates`, not `period` or `date`; the server rewrites the text from `dates`. Tailoring shouldn't touch dates anyway.

**Headline**

```json
[
  { "op": "test", "path": "/basics/headline", "value": "Analyst" },
  { "op": "replace", "path": "/basics/headline", "value": "Marketing Analyst · SQL, dbt and A/B testing" }
]
```

**Summary** (also `replace` `/summary/hidden` with `false` if the section was hidden). Every phrase must map to the resume or a user answer; this one uses only the Acme answers from SKILL.md.

```json
[
  {
    "op": "replace",
    "path": "/summary/content",
    "value": "<p>Marketing analyst since 2021. Defines funnel KPIs with Product and Marketing leads, sizes and analyses ~5 A/B tests a quarter chosen in a weekly SQL and Tableau review, and built ~40 dbt models on BigQuery that cut dashboard refresh from ~6 h to 45 min.</p>"
  }
]
```

**Reorder and rephrase bullets in one role.** Replace the whole description with the new order. For an entry with several roles, the path is `/sections/experience/items/{i}/roles/{j}/description`.

```json
[
  { "op": "test", "path": "/sections/experience/items/0/company", "value": "Acme Subscriptions" },
  {
    "op": "replace",
    "path": "/sections/experience/items/0/description",
    "value": "<ul><li><p>Defined 5 funnel KPIs with Product and Marketing leads and built the weekly SQL and Tableau review used to choose ~10 A/B tests a quarter; sized and analysed about half of them.</p></li><li><p>Built ~40 dbt models on BigQuery, cutting dashboard refresh from ~6 h to 45 min.</p></li><li><p>Onboarded 2 interns.</p></li></ul>"
  }
]
```

**Hide an item or a section**

```json
[
  { "op": "test", "path": "/sections/projects/items/3/name", "value": "Recipe app" },
  { "op": "replace", "path": "/sections/projects/items/3/hidden", "value": true },
  { "op": "replace", "path": "/sections/interests/hidden", "value": true }
]
```

**Reorder skills (or projects).** `move` removes then inserts. Don't reorder experience or education items; keep them reverse-chronological.

```json
[
  { "op": "test", "path": "/sections/skills/items/3/name", "value": "dbt" },
  { "op": "move", "from": "/sections/skills/items/3", "path": "/sections/skills/items/0" }
]
```

**Use the JD's wording for a skill the user has**

```json
[
  { "op": "test", "path": "/sections/skills/items/2/name", "value": "Postgres" },
  { "op": "replace", "path": "/sections/skills/items/2/name", "value": "PostgreSQL (Postgres)" }
]
```

To add a keyword to an item, append rather than replace, so the user's existing keywords stay:

```json
[
  { "op": "test", "path": "/sections/skills/items/0/keywords", "value": ["SQL", "BigQuery"] },
  { "op": "add", "path": "/sections/skills/items/0/keywords/-", "value": "dbt" }
]
```

**Add a skill the user confirmed and a bullet backs**

```json
[
  {
    "op": "add",
    "path": "/sections/skills/items/0",
    "value": {
      "id": "<new UUID>",
      "hidden": false,
      "icon": "",
      "iconColor": "",
      "name": "A/B testing",
      "proficiency": "",
      "level": 0,
      "keywords": []
    }
  }
]
```

`level` 0 hides the level graphic, which suits portal applications; keep the user's existing levels unless they agree to change them.

**Section order.** Reorder the IDs already in the page's `main` list; keep every ID. Here Experience moves above Education.

```json
[
  {
    "op": "test",
    "path": "/metadata/layout/pages/0/main",
    "value": ["profiles", "summary", "education", "experience", "projects", "volunteer", "references"]
  },
  {
    "op": "replace",
    "path": "/metadata/layout/pages/0/main",
    "value": ["profiles", "summary", "experience", "education", "projects", "volunteer", "references"]
  }
]
```

To lift a section such as `certifications` out of the sidebar, remove its ID from `sidebar` and insert it into `main` in the same patch, so it appears exactly once.

**One-column layout.** Per page: read `/metadata/layout/pages/{n}`, test both `main` and `sidebar` against the values you read, then write `main` as the current main IDs followed by the sidebar IDs (reordered if useful), empty `sidebar` and set `fullWidth`. Every ID appears exactly once, so nothing drops off the page (custom-section UUIDs included).

```json
[
  {
    "op": "test",
    "path": "/metadata/layout/pages/0/main",
    "value": ["profiles", "summary", "experience", "education", "projects", "volunteer"]
  },
  { "op": "test", "path": "/metadata/layout/pages/0/sidebar", "value": ["skills", "certifications", "languages"] },
  {
    "op": "replace",
    "path": "/metadata/layout/pages/0/main",
    "value": [
      "profiles",
      "summary",
      "experience",
      "skills",
      "certifications",
      "education",
      "projects",
      "volunteer",
      "languages"
    ]
  },
  { "op": "replace", "path": "/metadata/layout/pages/0/sidebar", "value": [] },
  { "op": "replace", "path": "/metadata/layout/pages/0/fullWidth", "value": true }
]
```

Check the exported PDF afterwards. If the template still reads poorly in one column, ask the user whether to switch templates (the resume-builder skill lists them).

**Anything else** (certifications, custom sections, other item types): read `resume://_meta/schema` for the exact shape before writing. An in-progress credential must read as in progress, never as held.

## 7. Errors and edge cases

| Situation                                          | Do                                                                                                              |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 409 `RESUME_VERSION_CONFLICT`                      | `read_resume` again, recompute indices, show the user any change that affects the plan, resend                  |
| A `test` op fails                                  | The copy differs from what you read; read again and rebuild the operations                                      |
| 403 `RESUME_LOCKED`                                | Ask before `unlock_resume`; offer `lock_resume` again when done                                                 |
| "Recorded submitted documents cannot be replaced…" | The application already has sent versions; see section 5                                                        |
| "No AI provider is configured"                     | Skip AI tools; every core step works without them. `open_account_settings` returns a link to settings           |
| NOT_FOUND                                          | List records again for valid IDs                                                                                |
| 429                                                | Rate limited; wait, then retry once                                                                             |
| BAD_GATEWAY                                        | The AI provider failed; continue without AI or try later                                                        |
| `download_resume_pdf`                              | The signed URL expires after 10 minutes and works for anyone holding it; give it only to the user               |
| User asks to make the copy public                  | `update_resume {id, isPublic: true}` returns `shareUrl`; public resumes change immediately on every later patch |
