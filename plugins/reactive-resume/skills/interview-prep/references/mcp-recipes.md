# Reactive Resume MCP recipes for interview prep

Contents

1. Before the first call
2. Find the application and the round
3. What the interviewer received
4. Stories, facts and earlier workspace output
5. Gap terms for predicted objections
6. Log, reschedule or cancel a round
7. Save facts
8. Save stories
9. Save questions to ask
10. Attach prep notes to the round
11. Log the debrief
12. Hand off to the web app
13. Errors

Placeholders in angle brackets come from earlier reads. Parity tools (`api_*`) get their input schemas from the API at runtime: confirm field names in `tools/list` before the first call.

## 1. Before the first call

- Read before writing. At the end of a block, show the user everything you will save and get one yes for the batch; ask separately for stage changes and anything that overwrites or deletes.
- None of the recipes below need an AI provider. Tools that do (`score_application_match`, `draft_application_message`, `tailor_resume_for_application`, `autofill_application_from_job`) send the resume and posting to the user's provider; ask before using them, and carry on without them if they fail with "No AI provider is configured".
- Never delete an application from this skill. `delete_application` is permanent.

## 2. Find the application and the round

```
list_applications {status: "interview", limit: 100, offset: 0}   # no match? drop status; repeat with offset = nextOffset until it is null
read_application {id: "<applicationId>"}
```

Match on company and role; if several match (two roles at one company), ask which. From the record use: `company`, `role`, `status`, `jobDescription`, `requirements`, `resumeId`, `sentResumeVersionId`, `contacts`, `notes`, and the `activity` timeline. Interview entries look like:

```
{id: "<entryId>", at: "2026-10-13T10:00:00+02:00", type: "interview", kind: "onsite",
 audience: "panel", durationMinutes: 300, timezone: "Europe/Berlin",
 location: "Video loop, links to follow", participants: [{name, role, profileUrl?}], notes: "…"}
```

Convert `at` to the user's own timezone when you report it, and say both times. If you don't know the user's timezone, ask once; never assume the server's or the interview's timezone is theirs. If `jobDescription` is empty, ask the user to paste the posting (or read it with `api_applications_ai_parse_posting {input: <url or text>}`; a 422 `POSTING_UNREADABLE` means ask for pasted text) and offer to save it with `update_application {id, jobDescription}` after a yes.

## 3. What the interviewer received

```
api_resume_list_versions {resumeId: "<resumeId>"}                      # versions of kind "sent" carry the company as their name
api_resume_get_version {resumeId: "<resumeId>", versionId: "<sentResumeVersionId>"}
```

- With no `sentResumeVersionId`, read the linked resume with `read_resume {id: "<resumeId>"}` and ask the user whether that is what they sent.
- If the user attached a PDF made elsewhere (`resumeFileName` is set), ask them to paste its text; treat the file link as private.
- Use this version for predicted questions about resume claims; it is what the interviewer is holding.

## 4. Stories, facts and earlier workspace output

```
api_career_stories {applicationId: "<applicationId>"}     # shared stories plus this application's
api_career_stories {applicationId: null}                  # shared stories only (no application yet)
api_career_facts {applicationId: "<applicationId>"}       # shared facts plus this application's
api_career_saved_items {applicationId: "<applicationId>", kind: "briefing"}   # also "practice", "debrief", "fit"
api_career_workspace {applicationId: "<applicationId>"}   # includes the saved questions to ask
```

- Saved items marked `outdated` were built from data that has since changed; mention them but don't rely on them.
- A briefing or debrief from the web app is AI output, not evidence. Use it for themes; check every claim against the user's stories and facts.
- A story flagged after a linked fact was corrected is left out of the app's coaching until saved again; re-check it with the user before using it.

## 5. Gap terms for predicted objections

```
api_rest_match_resume {id: "<resumeId>", jobDescription: "<posting text>"}
```

Deterministic, no AI. Returns `found` and `missing` terms. Turn important `missing` terms into likely objection questions ("Have you worked with X?") and prepare an honest answer for each. It's a term match, not a judgement of fit; don't report it as a score.

It reads the resume as it is now, not the sent version. If `sentResumeVersionId` exists and the resume changed since, check each important `missing` or `found` term against the sent version's text (section 3) before turning it into a predicted objection.

## 6. Log, reschedule or cancel a round

Schedule (after a yes):

```
add_application_interview {
  id: "<applicationId>",
  at: "2026-10-13T10:00:00+02:00",
  kind: "behavioral",
  audience: "hiring-manager",
  durationMinutes: 45,
  timezone: "Europe/Berlin",
  location: "Google Meet (link in the invite)",
  participants: [{name: "Dana Ruiz", role: "Engineering Manager"}],
  notes: ""
}
```

- `kind`: `screening`, `technical`, `behavioral`, `onsite`, `other`. `audience`: `recruiter`, `hiring-manager`, `practitioner`, `panel`, `other`. Usual mapping: recruiter screen → `screening` + `recruiter`; hiring manager → `behavioral` or `other` + `hiring-manager`; coding, design or case → `technical` + `practitioner`; panel → `audience: "panel"`; full loop or assessment centre → `onsite`. rounds.md has the full table.
- `at` needs an offset; `timezone` is an IANA name, not an offset. `durationMinutes` 5–1440. `location` ≤ 500 characters, `notes` ≤ 5000. Up to 20 participants with a name, an optional role and an optional public `https` profile link; store nothing else about them.
- Scheduling doesn't move the stage. When the first round of a kind happens and the application is still earlier, propose `update_application {id, status: "screening"}` (recruiter call) or `{status: "interview"}` (anything later), with a yes first.

Reschedule: `update_application_interview {id: "<applicationId>", entryId: "<entryId>", at: "<new time with offset>"}`. Only the fields you send change. Cancel: `delete_application_timeline_entry {id: "<applicationId>", entryId: "<entryId>"}` after confirming, since it also pauses the app's scheduled briefings for that round.

## 7. Save facts

Facts are short, single claims the user stated or confirmed, kept for coaching and drafting. Save them before the story they support, because a story needs at least one linked fact for the web app's coach to use it (section 8).

```
api_career_save_fact {
  applicationId: null,
  text: "Owned the billing cut-over plan and wrote the rollback runbook; team of four engineers",
  category: "accomplishment",
  source: {kind: "manual", id: "<fresh UUID>", quote: "I owned the cut-over plan and wrote the rollback runbook; four engineers."}
}
```

Save "About 40k subscriptions." as its own fact, with its own fresh id.

- `category`: `accomplishment`, `experience`, `skill` or `preference`. `text` ≤ 2000.
- `source.kind: "manual"`: the quote is the user's own words from one answer, verbatim; never paraphrase into the quote or join separate answers with an ellipsis.
- `source.id` must be unique per fact and never empty or reused (the web app uses a random UUID). The server blocks saves by source kind and id, so a shared id lets one forgotten, excluded or corrected fact block every later manual save.
- A null result means that source was earlier forgotten, excluded or corrected, or the same fact already exists; respect that and don't retry it.
- Never save practice answers, interview guesses or AI briefing content as facts. After a debrief, save only what the user confirms actually happened.

## 8. Save stories

Map the card to the stored fields. The probe layer and runtime aren't stored fields; keep them in the prep pack.

```
api_career_save_story {
  applicationId: null,
  title: "Billing cut-over before the contract ended",
  situation: "Last year, in-house billing for about 40k subscriptions had to move to Stripe before the old vendor contract ended.",
  task: "I owned the cut-over plan for a team of four engineers.",
  action: "I wrote the cut-over plan and the rollback runbook. In week one I spotted about 300 double charges in the reconciliation report, paused the job and added idempotency keys; the team refunded affected customers the same day.",
  result: "All ~40k subscriptions moved before the contract ended; no double charges after the fix.",
  reflection: "I'd bring finance in at planning; they found the reconciliation gap late.",
  tags: ["LP: Deliver Results", "failure and recovery", "LP: Dive Deep"],
  factIds: ["<factId from section 7>", "<second factId>"]
}
```

- **Scope.** Stories about the user's past are usually shared (`applicationId: null`) so every application can use them. Use the application's ID only for a story that should stay with one application.
- **Required:** `title` (1–200), `situation`, `task` (each 1–4000), `action` (1–6000). `result` and `reflection` (≤ 4000) may be `""`; leave `result` empty when the outcome can't be supported rather than writing a guess.
- **Tags:** up to 20, each up to 100 characters; keep at most 3 primary competency tags per story (framework tags included). Use the same competency words across stories so the bank stays searchable.
- **factIds:** up to 30; at least one is needed for the web app's Prepare, Practise and assistant to use the story. Each must be an active fact visible in the same scope; shared stories may link shared facts only. If the user declines to save facts, tell them the story will show in Knowledge but the web coach won't use it.
- **Replace, don't patch.** To edit, read the story, then send its `id` with every field. Anything you leave out is lost.
- **Duplicates.** Check the existing list for the same episode before saving a new one; improve the existing card instead.
- Deleting (`api_career_delete_story {id}`) only when the user asks.

## 9. Save questions to ask

```
api_career_workspace {applicationId: "<applicationId>"}          # read current.questions
api_career_save_workspace {
  applicationId: "<applicationId>",
  questions: [...current.questions, {text: "What does great look like at 90 days?", origin: "interview-prep"}],
  expected: {questions: <current.questions exactly as read>}
}
```

- Send the whole list: existing questions plus the new ones, without duplicates. At most 20; each `text` ≤ 400 characters, `origin` ≤ 60.
- `expected` must hold the previous value of every key you change. A conflict means someone edited it elsewhere: read again, merge, and retry once.

## 10. Attach prep notes to the round

Optional, after a yes. `notes` replaces the old value, so read the entry's current notes and append:

```
update_application_interview {
  id: "<applicationId>", entryId: "<entryId>",
  notes: "<existing notes>\n\nPrep (interview-prep, 9 Oct): stories: Billing cut-over; Onboarding redesign; Vendor dispute. Ask: 90-day success; why the role is open. Risk: no Kubernetes; answer: ECS experience, learning plan."
}
```

Keep it under 5000 characters: story titles and question stems, not full cards.

## 11. Log the debrief

```
add_application_note {
  id: "<applicationId>",
  date: "2026-10-13",
  text: "Debrief: hiring-manager round, Dana Ruiz (Engineering Manager). Happened: asked about a hard deadline (Billing cut-over; two follow-ups on the rollback), and a disagreement with a manager (no story ready; answer felt mixed). Said a decision by 20 Oct. Observation (guess): rollback depth seemed to interest her. Next: mine a disagreement story before the panel; thank-you owed to Dana."
}
```

- Keep "happened" separate from "observation (guess)", and never write a guess about the outcome as fact.
- Alternatively put the same text on the round itself with `update_application_interview {notes}` (section 10 rules).
- Next round known: `add_application_interview` (section 6). Stage change: `update_application` after a yes.
- Facts the user confirms: section 7. New or improved stories from the debrief: section 8.
- Thank-you notes aren't a `draft_application_message` kind (it only does `cover-letter` and `follow-up`); write them in chat or hand off to job-application-manager. Never say a message was sent until the user says so, then log `Sent: thank-you to <name>` as a note.

## 12. Hand off to the web app

These are web-only (Applications → the application → Open workspace), so suggest them rather than trying to reproduce their saved output: generating the AI Prepare briefing, spoken Practise with recordings, the Debrief review, the Fit check and the Messages reader. They use the user's own AI provider.

Briefing schedules are not web-only. Read them with `api_career_schedules`; set one only after a yes, because scheduled runs use the user's AI provider and can email them:

```
api_career_save_schedule {
  kind: "prepare", applicationId: "<applicationId>", interviewId: "<entryId>",
  lead: "24h",                      # or "2h", "morning"
  nextRunAt: "2026-10-12T10:00:00+02:00",   # the server recomputes it from the interview time and lead
  timezone: "Europe/Berlin",
  enabled: true, email: false
}
```

## 13. Errors

| Error                  | Do                                                                           |
| ---------------------- | ---------------------------------------------------------------------------- |
| `NOT_FOUND`            | List again for valid IDs; the entry or story may have been deleted           |
| 409 / `CONFLICT`       | Read again, recompute or merge, retry once                                   |
| `BAD_REQUEST` on facts | A linked fact isn't active or visible in that scope; drop it or change scope |
| 429                    | Rate limited; wait before retrying                                           |
| `BAD_GATEWAY`          | The user's AI provider failed (AI tools only)                                |
| 403 on a resume        | The resume is locked; reading still works                                    |
