# Examples

Every number and name here comes from a fictional user's reply, shown as "User said". They illustrate how facts flow from answer to bullet. Never reuse them, or anything like them, for a real user.

## Contents

1. Before and after pairs
2. Walkthrough: ICU nurse with "no numbers" (no MCP)
3. Walkthrough: rewriting a whole experience section over MCP
4. Walkthrough: team credit
5. Walkthrough: confidential figures
6. Walkthrough: a fabrication request
7. Walkthrough: fast path

## 1. Before and after pairs

| Field                | Before                                         | User said                                                                                                                                                                         | After                                                                                                                                                              | Form                       |
| -------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| Software             | Worked on CI pipeline improvements.            | "Builds went from 22 to 9 minutes after I rewrote the dependency cache. About 40 engineers use it."                                                                               | Cut CI build time from 22 to 9 minutes for about 40 engineers by rewriting the dependency cache                                                                    | XYZ                        |
| Nursing              | Responsible for patient care on surgical ward. | "28-bed surgical ward. I led the daily falls huddles. Falls with injury went from 5 a quarter to 1 a quarter over the year, but a lot changed on the ward."                       | Led daily falls-prevention huddles on a 28-bed surgical ward, contributing to a drop in falls with injury from 5 to 1 a quarter over a year                        | Own action + unit result   |
| Teaching             | Taught Year 10 maths.                          | "Three classes, about 85 kids. I added weekly retrieval quizzes. Pass rate went 61% to 78% compared with last year's cohort."                                                     | Introduced weekly retrieval quizzes across 3 Year 10 maths classes (about 85 students); pass rate rose from 61% to 78% against the previous cohort                 | Action + cohort comparison |
| Retail               | Helped with inventory.                         | "I ran the weekly counts. Shrink stayed under the store target four quarters in a row."                                                                                           | Ran weekly stock counts; store shrink stayed below target for 4 straight quarters                                                                                  | Action + store result      |
| Warehouse            | Picked and packed orders.                      | "About 180 picks an hour, site average is 140. Accuracy was 99.8% on my scorecard."                                                                                               | Averaged about 180 picks an hour at 99.8% accuracy (site average: 140)                                                                                             | Scope + comparison         |
| Customer support     | Answered customer tickets.                     | "About 60 a day. I wrote 25 help articles. Repeat contacts went down, no idea by how much."                                                                                       | Resolved about 60 tickets a day and wrote 25 help-centre articles on the most repeated questions                                                                   | Scope                      |
| Sales                | Managed accounts in the Midwest.               | "112% of quota in FY24, 14 new logos, 2nd of 11 reps."                                                                                                                            | Closed 112% of FY24 quota with 14 new accounts, ranking 2nd of 11 reps                                                                                             | XYZ                        |
| Marketing            | Ran email campaigns.                           | "Revenue numbers are confidential. List tripled in a year; click-through went from 2.1% to 3.4%."                                                                                 | Tripled the email list in a year and lifted click-through from 2.1% to 3.4%                                                                                        | Result (no revenue)        |
| Finance              | Did month-end close.                           | "Close went from 8 to 5 days. Three entities adopted my reconciliation template."                                                                                                 | Shortened month-end close from 8 to 5 days with a reconciliation template adopted by 3 entities                                                                    | XYZ                        |
| Recruiting           | Recruited engineers.                           | "23 hires in 2024. Time to fill on my roles went from 52 to 38 days."                                                                                                             | Filled 23 engineering roles in 2024 and cut average time to fill from 52 to 38 days                                                                                | XYZ                        |
| Executive assistant  | Managed executive calendars.                   | "Three VPs. I organised two offsites of 120 people, both under budget."                                                                                                           | Managed calendars for 3 VPs; organised two 120-person offsites, both under budget                                                                                  | Scope                      |
| Research             | Conducted experiments in lab.                  | "I designed the assay and ran about 300 samples. I'm co-first author."                                                                                                            | Designed an assay and ran about 300 samples for a co-first-authored paper in [journal]                                                                             | Scope                      |
| Trades               | Did electrical work.                           | "40-plus house rewires, never failed an inspection, trained two apprentices."                                                                                                     | Completed 40+ residential rewires with zero failed inspections; trained 2 apprentices                                                                              | Scope + quality            |
| Hospitality          | Greeted guests.                                | "Hosted Fri/Sat nights, about 250 covers, kept waits under the 20-minute target."                                                                                                 | Seated about 250 covers a night on Fridays and Saturdays, keeping quoted waits under 20 minutes                                                                    | Scope + target             |
| Team credit          | Launched the new mobile app.                   | "Team of six. I built offline sync. Crash-free sessions went 97% to 99.5%."                                                                                                       | As 1 of 6 engineers on the new mobile app, built offline sync; crash-free sessions rose from 97% to 99.5%                                                          | Team result + own part     |
| Executive            | Oversaw operations.                            | "$80M P&L, three plants, 600 staff. Operating margin up 4 points in two years."                                                                                                   | Ran an $80M P&L across 3 plants and 600 staff; raised operating margin 4 points in 2 years                                                                         | Scope + XYZ                |
| Military to civilian | Was a training officer.                        | "I was one of three officers picked to redesign the training program for a few thousand Marines and sailors. Qualification pass rate went from 71% to 85% in one training cycle." | One of 3 officers selected to redesign [program] training for [N],000 Marines and sailors; unit qualification pass rate rose from 71% to 85% in one training cycle | Selection + unit result    |

Every word in an After must trace to the User said column; anything else becomes a question.

Notes on these:

- **Nursing:** "contributing to" because it's a ward result with several causes. Write "which cut…" only if the user can say why the huddles drove it. Report falls with injury, not total falls.
- **Teaching and retail:** the action and the result sit side by side, with no "by…", because the user reported a sequence, not a cause. Teaching keeps "against the previous cohort" because cohorts differ.
- **Customer support:** repeat contacts fell, but the user can't link the drop to the articles; ask before claiming it. "Repeat contacts fell after the articles launched" works only if the user confirms the timing.
- **Marketing:** ask how they grew the list before adding a method. Prefer click-through to open rate: open rates have been unreliable since Apple Mail Privacy Protection (2021).
- **Executive assistant:** confirm the user organised the offsites, not just attended or booked them.
- **Military:** "redesign", not "lead the redesign": the user said they were picked, not that they led. Use "lead" only if the user says they led it. `[N],000` stays until the user gives the figure or accepts "several thousand"; `[program]` until they name it.
- **Research:** `[journal]` stays until the user names it; the bullet isn't finished.

## 2. Walkthrough: ICU nurse with "no numbers" (no MCP)

**User:** "I am an ICU nurse, I don't have numbers like business people do."

**Agent:** "Nursing has plenty of concrete facts; they just look different: the unit, how sick your patients are, what you're trusted to run, who you train, and quality work. First: what kind of ICU, and how many beds?"

Then one question at a time:

| Question                                   | User said                                                                                             |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| What kind of ICU, how many beds?           | "Cardiothoracic, 24 beds. Usually 1:2, 1:1 for fresh post-op hearts."                                 |
| Which therapies or devices do you manage?  | "CRRT, IABP, Impella. I'm CCRN certified."                                                            |
| Have you precepted anyone or taken charge? | "Six new grads over three years. I'm charge about one shift a week."                                  |
| Any quality project, committee or audit?   | "I'm on the CLABSI working group. Our unit went a full year without a CLABSI, but that was everyone." |
| What did you do in the working group?      | "I did the weekly dressing audits on nights and taught the new bundle at huddles."                    |

**Review table** (current role, so ongoing scope is in present tense):

| #   | Rewrite                                                                                                                                                      | Facts and source                                       | Still needed |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | ------------ |
| 1   | Care for 1–2 critically ill patients per shift in a 24-bed cardiothoracic ICU, including fresh post-op heart patients and patients on CRRT, IABP and Impella | unit, beds, ratio, devices `stated`                    | None         |
| 2   | Ran weekly night-shift central-line dressing audits and taught the new CLABSI bundle at huddles; the unit went 12 months without a CLABSI                    | own actions `stated`; unit result `stated`, unit-level | None         |
| 3   | Precepted 6 new-graduate nurses over 3 years; take charge about one shift a week                                                                             | `stated`                                               | None         |

Notes: bullet 2 says "the unit", not "reduced CLABSI", because the user said it was a team result. CCRN belongs in the certifications section, not in a bullet. No patient details appear anywhere.

## 3. Walkthrough: rewriting a whole experience section over MCP

**User:** "Rewrite all the bullets in my experience section." (Software engineer, Reactive Resume connected.)

1. `list_resumes` returns one resume; it is public and unlocked. `read_resume {id}` shows three experience items:
   - `items/0`: Globex, with `roles/0` Senior Software Engineer (current) and `roles/1` Software Engineer. Each role has its own description; the item's own description is empty.
   - `items/1`: Acme, one role, 4 bullets.
   - `items/2`: Initech, one role, 3 bullets, ended 6 years ago.
2. **Triage, in one message:** "I read all 4 roles. Globex Senior: 1 keep, 2 sharpen, 2 to mine (about 4 questions). Globex SWE: 1 keep, 2 to mine, focused on what earned the promotion (about 2). Acme: 2 sharpen, 2 to mine (about 3). Initech: 6 years old, so I'd cut it to 1–2 bullets with no questions. What roles are you targeting? Your resume is public, so saved changes show on your shared page straight away: edit this resume, or a copy? I can also save a restore point first." User: "Staff-level backend. This one, and yes to the restore point."
3. `api_resume_create_version {resumeId, name: "Before bullet rewrite"}`. Staff-level puts cross-team influence and reliability first.
4. Mine `items/0/roles/0` first (current, most relevant). Titles, dates and current bullets come from `read_resume`; the numbers already on the resume go to the user as one batch: "Which of these could you explain in an interview, and where does each come from?" Then 2–3 questions per message, no more than 6 for the role.
5. Show the role's table with one readback line under it. User: "Looks good, but make bullet 2 shorter and drop 'spearheaded'." Agent shortens it and shows it again; the user says "yes". Agent: "Keeping bullets short and no 'spearheaded' for the other roles."
6. Patch that role only:

   ```json
   {
     "id": "<resume id>",
     "expectedUpdatedAt": "<updatedAt from read_resume>",
     "operations": [
       { "op": "test", "path": "/sections/experience/items/0/roles/0/id", "value": "<role id from read_resume>" },
       {
         "op": "replace",
         "path": "/sections/experience/items/0/roles/0/description",
         "value": "<ul><li><p>Approved bullet one</p></li><li><p>Approved bullet two</p></li><li><p>Approved bullet three</p></li></ul>"
       }
     ]
   }
   ```

7. The patch returns the full resume with a new `updatedAt`; use it as `expectedUpdatedAt` for the next role.
8. Repeat for `roles/1` (1–3 bullets on what earned the promotion, nothing repeated from the senior role) and Acme. Trim Initech as agreed in triage.
9. Finish by showing all saved bullets, offering `api_rest_check_resume {id}`, listing anything still needed with where to find it, and asking whether to save the confirmed achievements to Career Knowledge for interview prep.

If a patch fails with a version conflict, read again, find each target by its `id` (indexes may have moved), show the user anything that changed, and retry.

## 4. Walkthrough: team credit

**Before:** "Migrated the company to Kubernetes."

**Agent:** "Who else worked on the migration, and what part was yours?"

**User said:** "Platform team of 5. I wrote the deployment templates and moved the 30 services my squad owned. The whole migration cut hosting costs about 30%, from the finance report."

**After:** "Wrote deployment templates for the platform team's Kubernetes migration and moved 30 squad-owned services; the migration cut hosting costs about 30%". The ledger records the cost figure as `doc:finance report`. The cost result belongs to the team, and the sentence makes that clear by giving it to "the migration".

## 5. Walkthrough: confidential figures

**Before:** "Closed $4.2M deal with a major bank."

**Agent:** "Is the client name or the deal value public?"

**User said:** "Neither. I hit 118% of quota that year, 2nd of 14."

**After:** "Closed an enterprise banking deal and reached 118% of annual quota, ranking 2nd of 14 reps". A size descriptor such as "seven-figure" goes in only if the user says that level of detail is allowed, and a sector ("banking") only if it doesn't identify the client.

## 6. Walkthrough: a fabrication request

**User:** "Just say I increased sales by 30%. Nobody checks."

**Agent:** "I can't put in a number you can't back up; offers do get pulled over misstatements. What do you know for sure: did sales go up at all, and what did you change?"

**User said:** "I don't know the number. I redid the product pages and the manager said sales picked up."

**After:** "Rewrote [N] product pages with [what changed]" (ask for both). Leave the sales lift out: "sales picked up" is the manager's impression, and nothing shows the pages caused it. If the user finds a sales report, revisit.

## 7. Walkthrough: fast path

**User:** "Here are my 4 bullets, just make them better, I don't have time for questions." (pastes duty-style bullets, one of them "Responsible for processing invoices for the finance team.")

1. Rewrite all four using only what's there. Each gets a **finished** version with no placeholders, and a **stronger** version where a number would help:
   - Finished: "Processed invoices for the finance team"
   - Stronger (needs your answers to Q1 and Q2): "Processed about [N] invoices a week for the finance team at [error rate]"
2. Send one batch of at most 5 questions (template in question-bank.md §10).
3. Say clearly that the finished versions can be pasted now and the stronger ones wait on answers. Nothing with a placeholder goes into a resume.
