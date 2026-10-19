# Reactive Resume patch recipes

Contents:

1. Rules for every patch
2. Personal details
3. Hiding sections and items
4. Skill and language levels
5. Reordering sections
6. Switching to a single column
7. Merging a repeated employer into roles
8. Adding a career-break entry
9. Converting for another country
10. Adding a declaration or consent clause
11. Verifying and recovering

All recipes go through `apply_resume_patch {id, operations, expectedUpdatedAt}`. Paths and shapes were checked against the resume schema as of 2026; when a shape here doesn't match what `read_resume` returns, trust the data and the `resume://_meta/schema` resource over this file.

## 1. Rules for every patch

- Get a yes first, after showing the user the before and after in plain language.
- Read before writing: `read_resume {id}`, and take `updatedAt` for `expectedUpdatedAt`.
- Work on a copy for country versions and heavy cuts: `duplicate_resume {id, name}`, then `read_resume` on the copy.
- Find indices in the data you just read, and guard every index-based change with a `test` on a field that identifies the item (company, school, name). If the order changed, the whole patch fails instead of touching the wrong item.
- Prefer `"hidden": true` to `remove`. Custom fields (`basics.customFields[]`) have no hidden flag, so on a copy they are removed.
- Write `dates` objects (`{"start": "2022-03", "end": null, "present": true}`); the server rewrites `period` and `date` text from them on every save, so text-only edits are lost.
- Descriptions are HTML: `<p>…</p>`, or `<ul><li><p>…</p></li></ul>` for bullets. Never Markdown.
- New items are complete: a fresh UUID `id`, `"hidden": false`, and every `website` as `{"url": "", "label": "", "inlineLink": false}`.
- Operations run in order, all or nothing. Use `-` to append to an array and a number to insert at that index.
- Use `add` for optional fields that may be missing (`/metadata/page/dateFormat`, `/metadata/stylesheet`); a `replace` on a missing path fails the whole patch, and `add` also replaces an existing value.
- Only write text the user supplied or approved. Rewriting "42 Oak St, Columbus OH 43210" to "Columbus, OH" is fine; adding a figure they didn't give is not.

## 2. Personal details

```json
[
  { "op": "replace", "path": "/picture/hidden", "value": true },
  { "op": "test", "path": "/basics/location", "value": "42 Oak St Apt 3, Columbus OH 43210" },
  { "op": "replace", "path": "/basics/location", "value": "Columbus, OH" },
  { "op": "test", "path": "/basics/customFields/0/text", "value": "DOB 11 Feb 2003" },
  { "op": "remove", "path": "/basics/customFields/0" }
]
```

When removing several custom fields, remove from the highest index down so earlier removals don't shift later paths.

Adding an opt-in field for a German or Swiss version (only with the user's words):

```json
{
  "op": "add",
  "path": "/basics/customFields/-",
  "value": {
    "id": "<new-uuid>",
    "icon": "",
    "text": "Staatsangehörigkeit: US; Aufenthaltstitel: Blaue Karte EU",
    "link": ""
  }
}
```

## 3. Hiding sections and items

```json
[
  { "op": "replace", "path": "/sections/references/hidden", "value": true },
  { "op": "replace", "path": "/sections/interests/hidden", "value": true },
  { "op": "replace", "path": "/summary/hidden", "value": true },
  { "op": "test", "path": "/sections/experience/items/5/company", "value": "Acme Corp" },
  { "op": "replace", "path": "/sections/experience/items/5/hidden", "value": true }
]
```

Section names under `/sections/`: `profiles`, `experience`, `education`, `projects`, `skills`, `languages`, `interests`, `awards`, `certifications`, `publications`, `volunteer`, `references`.

## 4. Skill and language levels

To hide every skill and language level indicator at once, use the global switch; it needs no index and no `test`:

```json
{ "op": "replace", "path": "/metadata/design/level/type", "value": "hidden" }
```

Prefer it when the advice is "no dots anywhere". To hide only some, set the item's `level` to 0 and keep or set a text level instead:

```json
[
  { "op": "test", "path": "/sections/skills/items/0/name", "value": "Python" },
  { "op": "replace", "path": "/sections/skills/items/0/level", "value": 0 },
  { "op": "test", "path": "/sections/languages/items/1/language", "value": "English" },
  { "op": "replace", "path": "/sections/languages/items/1/level", "value": 0 },
  { "op": "replace", "path": "/sections/languages/items/1/fluency", "value": "C1 (fluent)" }
]
```

The fluency text must be the user's own assessment.

## 5. Reordering sections

The page layout lives in `/metadata/layout/pages/{n}/main` and `/metadata/layout/pages/{n}/sidebar`, arrays of section IDs (built-in names, or UUIDs for custom sections). Test the current array, then replace it with the same IDs in the new order:

```json
[
  {
    "op": "test",
    "path": "/metadata/layout/pages/0/main",
    "value": ["summary", "experience", "education", "projects"]
  },
  {
    "op": "replace",
    "path": "/metadata/layout/pages/0/main",
    "value": ["summary", "education", "projects", "experience"]
  }
]
```

Never drop an ID while reordering; a section missing from the layout doesn't print.

## 6. Switching to a single column

The app's Check flags a two-column layout when printed sections sit in a sidebar. A full-width page prints no sidebar at all; any section left in `sidebar` disappears from the PDF. For each page, in one patch: `test` the current `main` and `sidebar`, replace `main` with the main IDs plus every sidebar ID in the order you want, replace `sidebar` with `[]`, then set `fullWidth` to `true`. Never set `fullWidth` without moving the sidebar IDs first.

```json
[
  { "op": "test", "path": "/metadata/layout/pages/0/main", "value": ["summary", "experience", "projects"] },
  { "op": "test", "path": "/metadata/layout/pages/0/sidebar", "value": ["skills", "education", "languages"] },
  {
    "op": "replace",
    "path": "/metadata/layout/pages/0/main",
    "value": ["summary", "experience", "projects", "education", "skills", "languages"]
  },
  { "op": "replace", "path": "/metadata/layout/pages/0/sidebar", "value": [] },
  { "op": "replace", "path": "/metadata/layout/pages/0/fullWidth", "value": true }
]
```

Run `api_rest_check_resume` afterwards and look for SECTION_MISSING_FROM_LAYOUT, then look at the PDF; a template's visual design may still need a different template for a clean single column.

## 7. Merging a repeated employer into roles

Suppose items 1 and 2 are both Acme: "Senior Analyst" (2020-06 to 2023-08) and "Analyst" (2018-01 to 2020-05). Keep item 1, move both titles into its `roles`, widen its dates, and hide item 2:

```json
[
  { "op": "test", "path": "/sections/experience/items/1/company", "value": "Acme" },
  { "op": "test", "path": "/sections/experience/items/2/company", "value": "Acme" },
  {
    "op": "replace",
    "path": "/sections/experience/items/1/roles",
    "value": [
      {
        "id": "<new-uuid-1>",
        "position": "Senior Analyst",
        "period": "",
        "dates": { "start": "2020-06", "end": "2023-08", "present": false },
        "description": "<ul><li><p>(item 1's existing bullets)</p></li></ul>"
      },
      {
        "id": "<new-uuid-2>",
        "position": "Analyst",
        "period": "",
        "dates": { "start": "2018-01", "end": "2020-05", "present": false },
        "description": "<ul><li><p>(item 2's existing bullets)</p></li></ul>"
      }
    ]
  },
  {
    "op": "replace",
    "path": "/sections/experience/items/1/dates",
    "value": { "start": "2018-01", "end": "2023-08", "present": false }
  },
  { "op": "replace", "path": "/sections/experience/items/1/description", "value": "" },
  { "op": "replace", "path": "/sections/experience/items/2/hidden", "value": true }
]
```

Copy the existing descriptions verbatim. The entry's own `position` prints above its roles unless it repeats a role's position, so set it to the latest title or to `""`. A role with no `position` doesn't print.

## 8. Adding a career-break entry

Insert it at the index that keeps reverse-chronological order. The label and bullets come from the user's own words.

```json
{
  "op": "add",
  "path": "/sections/experience/items/2",
  "value": {
    "id": "<new-uuid>",
    "hidden": false,
    "company": "Career break",
    "position": "Family caregiving",
    "location": "",
    "period": "",
    "dates": { "start": "2019-03", "end": "2021-06", "present": false },
    "website": { "url": "", "label": "", "inlineLink": false },
    "description": "<ul><li><p>[What the user did in this period, in their words, e.g. a course with its year]</p></li></ul>",
    "roles": []
  }
}
```

Leave `description` as `""` if the user gave nothing; never fill it with an example. An entry needs `company` to print; "Career break" fills it.

## 9. Converting for another country

Page settings, on the copy:

| Field                       | Values                                                 | Typical choice                                                               |
| --------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `/metadata/page/format`     | `a4`, `letter`, `free-form`                            | `letter` for the US and Canada, `a4` elsewhere                               |
| `/metadata/page/locale`     | A locale string such as `en-US`, `en-GB`, `de-DE`      | The target market's language; translates default headings                    |
| `/metadata/page/dateFormat` | `short` (Mar 2022), `long`, `numeric` (03/2022), `iso` | `short` to avoid 03/04 ambiguity; `numeric` is common in German-speaking CVs |

Germany → US on a copy, combining recipes:

```json
[
  { "op": "replace", "path": "/metadata/page/format", "value": "letter" },
  { "op": "replace", "path": "/metadata/page/locale", "value": "en-US" },
  { "op": "add", "path": "/metadata/page/dateFormat", "value": "short" },
  { "op": "replace", "path": "/picture/hidden", "value": true },
  { "op": "test", "path": "/basics/customFields/1/text", "value": "Staatsangehörigkeit: deutsch" },
  { "op": "remove", "path": "/basics/customFields/1" },
  { "op": "test", "path": "/basics/customFields/0/text", "value": "geb. 14.03.1990" },
  { "op": "remove", "path": "/basics/customFields/0" },
  { "op": "replace", "path": "/sections/references/hidden", "value": true },
  { "op": "replace", "path": "/sections/interests/hidden", "value": true }
]
```

Section titles typed by hand (for example `/sections/experience/title` set to "Berufserfahrung") override the locale's headings; replace them with English titles the user approves. Then hand bullet rewriting to resume-bullet-writer if available, or ask for the result behind each duty.

## 10. Adding a declaration or consent clause

For Indian public-sector and government applications, or the Polish and Italian clauses (countries.md, section 4). A custom section of type `summary` holds the text, and its ID must also be added to the page layout or it won't print.

```json
[
  {
    "op": "add",
    "path": "/customSections/-",
    "value": {
      "id": "<new-section-uuid>",
      "type": "summary",
      "title": "Declaration",
      "icon": "",
      "columns": 1,
      "hidden": false,
      "keepTogether": true,
      "startOnNewPage": false,
      "items": [
        {
          "id": "<new-item-uuid>",
          "hidden": false,
          "content": "<p>I hereby declare that the information above is true to the best of my knowledge.</p>"
        }
      ]
    }
  },
  { "op": "add", "path": "/metadata/layout/pages/0/main/-", "value": "<new-section-uuid>" }
]
```

Use the last page's index in the layout path so the clause prints at the end. Place, date and signature lines, if the user wants them, go in the same content as plain text they supply.

## 11. Verifying and recovering

- After patching: `read_resume` on the edited resume, then `api_rest_check_resume`; report what changed and any new findings.
- To show the result: `download_resume_pdf` returns a signed URL valid for 10 minutes that works for anyone holding it; give it to the user only, never paste it anywhere shared.
- Every MCP patch is saved as an "AI edit" version. `api_resume_list_versions` and `api_resume_get_version` show earlier versions if the user wants to compare or undo.
- Errors: 409 `RESUME_VERSION_CONFLICT` means read again and recompute; 403 `RESUME_LOCKED` means ask the user before `unlock_resume`; a failed `test` means the data changed, so re-read and rebuild the patch; NOT_FOUND means list resumes again for a valid ID.
