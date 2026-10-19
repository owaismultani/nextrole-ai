# Plain tracker: Markdown or CSV, no app needed

How to run the pipeline with nothing but conversation and, where the agent can write files, a CSV. The same columns move into Reactive Resume later with `import_applications`.

## Contents

1. Where the tracker lives
2. Columns
3. Example
4. Stage log
5. Starting from a pile (worked example)
6. Spreadsheet formulas for the review
7. Moving into Reactive Resume

## 1. Where the tracker lives

| Agent can write files (Claude Code, Cursor, Codex)                                                                                                          | Chat only (Claude.ai, ChatGPT-style)                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `job-search/applications.csv` plus an append-only `job-search/stage-log.md`. Read both at the start of each session; show the changed rows after each edit. | A Markdown table. Reprint only the changed rows after each update, and the full table at the end of a session so the user can save it and paste it back next time. Offer the CSV version for a spreadsheet. |

Ask before creating files, and keep them out of anything the user publishes or commits: the tracker holds contact details and pay figures.

## 2. Columns

| Column            | Values                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| `id`              | 1, 2, 3… never reused                                                                                              |
| `company`, `role` | As written in the posting                                                                                          |
| `location`        | City, country, or `Remote (region)`                                                                                |
| `salary`          | As posted or as told, with currency and period (`€85–100k/yr`); blank if unknown                                   |
| `source`          | `referral`, `company-site`, `linkedin`, `indeed`, `recruiter-inbound`, `agency`, `networking`, `internal`, `other` |
| `tier`            | `A`, `B`, `C`                                                                                                      |
| `tags`            | Semicolon-separated: `referral;tailored;remote`                                                                    |
| `stage`           | `saved`, `applied`, `screening`, `interview`, `offer`, `closed`                                                    |
| `furthest_stage`  | The highest stage ever reached (never `closed`); update it whenever the stage moves forward                        |
| `closed_reason`   | Only when closed: `accepted`, `not-selected`, `withdrew`, `accepted-other`, `no-response`                          |
| `applied_on`      | `YYYY-MM-DD`; blank if not applied or unknown                                                                      |
| `last_contact_on` | Last time the employer said anything (`YYYY-MM-DD`)                                                                |
| `follow_up_on`    | Next action date (`YYYY-MM-DD`); every open row has one                                                            |
| `next_action`     | One short imperative: `Nudge J. Rao`, `Prep panel`, `Decide offer`                                                 |
| `resume_version`  | The exact file or version sent: `Sam_Lee_Acme_2026-10-02.pdf`                                                      |
| `cover_letter`    | File name, or blank                                                                                                |
| `contacts`        | Semicolon-separated `Name (Role, type, email)`                                                                     |
| `url`             | Posting link                                                                                                       |
| `notes`           | Free text; mark approximations ("applied date approximate")                                                        |

Keep the posting text itself in a separate file per job (`job-search/postings/7-acme.md`) when you can, because links die.

**Search brief.** Five lines at the top of the Markdown tracker, or in `job-search/brief.md`: target roles; locations or remote; pay floor with currency and period; deal-breakers; hours per week for the search. Leave out what the user doesn't know.

**Networking contacts** (no posting yet): `job-search/contacts.csv` with `name, company, role, relationship, last_contact_on, next_step, follow_up_on, notes`. The weekly review lists rows whose `follow_up_on` is due. In Reactive Resume these become `saved` records tagged `target-company` (mcp-recipes.md §9).

## 3. Example

```csv
id,company,role,location,salary,source,tier,tags,stage,furthest_stage,closed_reason,applied_on,last_contact_on,follow_up_on,next_action,resume_version,cover_letter,contacts,url,notes
1,Acme,Senior Backend Engineer,Remote (EU),€85–100k/yr,company-site,A,tailored,applied,applied,,2026-09-22,,2026-10-13,Message hiring manager (day 21),Sam_Lee_Acme_2026-09-22.pdf,,"J. Rao (Talent Acquisition, Recruiter, jrao@acme.example)",https://jobs.example.com/123,
2,Globex,Data Platform Engineer,Berlin,,recruiter-inbound,B,,interview,interview,,2026-09-24,2026-10-01,2026-10-12,Prep onsite Tue 13 Oct,Sam_Lee_Backend_v3.pdf,,"Lena Vogt (Talent Partner, Recruiter, )",https://globex.example/jobs/88,Onsite 13 Oct 10:00 CEST
3,Foo Ltd,Platform Engineer,London,,linkedin,C,,applied,applied,,2026-08-21,,2026-10-09,Propose close (no-response),Sam_Lee_Backend_v3.pdf,,,https://foo.example/careers/4,Applied date approximate
```

The same rows as a Markdown table, trimmed to the columns that matter in chat:

| id  | company | role                    | tier | stage     | applied    | last contact | follow-up  | next action                     |
| --- | ------- | ----------------------- | ---- | --------- | ---------- | ------------ | ---------- | ------------------------------- |
| 1   | Acme    | Senior Backend Engineer | A    | applied   | 2026-09-22 |              | 2026-10-13 | Message hiring manager (day 21) |
| 2   | Globex  | Data Platform Engineer  | B    | interview | 2026-09-24 | 2026-10-01   | 2026-10-12 | Prep onsite Tue 13 Oct          |
| 3   | Foo Ltd | Platform Engineer       | C    | applied   | 2026-08-21 |              | 2026-10-09 | Propose close (no-response)     |

## 4. Stage log

Append one line per stage change; never edit old lines. It is what makes `furthest_stage` and response times checkable.

```
2026-09-22 | 1 | saved → applied
2026-10-01 | 2 | applied → screening
2026-10-06 | 2 | screening → interview
```

Log sent messages in `notes` or in the stage log with a `Sent:` prefix: `2026-10-09 | 2 | Sent: thank-you to Lena Vogt`.

## 5. Starting from a pile (worked example)

User: "Help me track my applications, I don't use any app." Ask them to paste whatever they have, one line per job, in any order and format.

**Input:**

```
acme backend eng - applied sep 22 on their site, no reply
Globex data platform, recruiter called me 10/1, onsite next tue
initech - offer!! deadline 16th
foo ltd applied like 7 weeks ago via linkedin
saw a cool role at Hooli, haven't applied
```

**Output** (today Fri 9 Oct 2026): the normalised rows, then one question batch.

| id  | company | role             | stage     | furthest  | applied     | follow-up  | next action                                |
| --- | ------- | ---------------- | --------- | --------- | ----------- | ---------- | ------------------------------------------ |
| 1   | Acme    | Backend Engineer | applied   | applied   | 2026-09-22  | 2026-10-13 | Day 21: second channel if tier A           |
| 2   | Globex  | Data Platform    | interview | interview | ?           | 2026-10-12 | Prep onsite Tue 13 Oct                     |
| 3   | Initech | ?                | offer     | offer     | ?           | 2026-10-14 | Decide (deadline 16 Oct); expedite others? |
| 4   | Foo Ltd | ?                | applied   | applied   | ~2026-08-21 | 2026-10-09 | Day 49: propose close as no-response       |
| 5   | Hooli   | ?                | saved     | saved     |             | 2026-10-12 | Get posting link; decide apply or drop     |

> A few gaps, answer any you know:
>
> 1. Initech: which role, is the offer in writing, and what time on 16 Oct does it expire?
> 2. Globex onsite: exact time and timezone, and who you'll meet?
> 3. Resume per job, in one line (e.g. "1–2 Backend v3, 4 Generic"); file names are fine.
> 4. Top targets? List the numbers; the rest default to B.
> 5. Hooli: can you paste the posting or link?

Notes on the output: open records come first in the questions, each question covers several rows, and the batch stops at 5 (for 20 jobs, leave the rest blank and fill them in the first weekly review); "next tue" became a concrete date; "like 7 weeks ago" was kept as an approximation and marked (`~` in chat, "applied date approximate" in `notes` in the CSV, since `~` breaks date formulas); nothing unknown was guessed; the offer goes to the top of the next review.

## 6. Spreadsheet formulas for the review

With the column order in §2 (A `id` … L `applied_on`, M `last_contact_on`, N `follow_up_on`, I `stage`, J `furthest_stage`), in Google Sheets or Excel:

| Measure                        | Formula (row 2)                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Days since employer contact    | `=IF(OR(I2="closed",I2="saved",AND(L2="",M2="")),"",TODAY()-IF(M2="",L2,M2))`                                                   |
| Follow-up due                  | `=AND(N2<>"",N2<=TODAY(),I2<>"closed")`                                                                                         |
| Sent (whole sheet)             | `=COUNTIF(J2:J,"applied")+COUNTIF(J2:J,"screening")+COUNTIF(J2:J,"interview")+COUNTIF(J2:J,"offer")`                            |
| Responses (reached screening+) | `=COUNTIF(J2:J,"screening")+COUNTIF(J2:J,"interview")+COUNTIF(J2:J,"offer")`                                                    |
| Interviews                     | `=COUNTIF(J2:J,"interview")+COUNTIF(J2:J,"offer")`                                                                              |
| Offers                         | `=COUNTIF(J2:J,"offer")`                                                                                                        |
| Responses from referrals       | `=COUNTIFS(F2:F,"referral",J2:J,"screening")+COUNTIFS(F2:F,"referral",J2:J,"interview")+COUNTIFS(F2:F,"referral",J2:J,"offer")` |

Open-ended ranges such as `J2:J` are Google Sheets syntax; in Excel use a fixed range such as `J2:J1000`. Sent counts by `furthest_stage`, so rows with an unknown applied date still count. Report counts below about 30 (weekly-review.md §2).

## 7. Moving into Reactive Resume

When the user connects the Reactive Resume MCP server, offer to import. Show the first three mapped rows and get a yes first; the server doesn't check for duplicates, so list existing applications and skip matches.

| Tracker column                               | `import_applications` item field                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------- |
| `company`, `role`                            | `company`, `role` (required)                                                          |
| `location`, `salary`, `source`               | same names                                                                            |
| `url`                                        | `sourceUrl` (http or https only; drop anything else)                                  |
| `stage`                                      | `status`                                                                              |
| `closed_reason`                              | `closedReason` (only when `status` is `closed`)                                       |
| date the current stage began (last log line) | `stageEnteredAt` (`YYYY-MM-DD`)                                                       |
| `tier` and `tags`                            | `tags`: an array, e.g. `["tier-a", "tailored"]`                                       |
| `follow_up_on`, `next_action`                | `followUpAt` (ISO 8601 with offset, e.g. `2026-10-13T09:00:00+02:00`), `followUpNote` |
| `contacts`                                   | `contacts`: `[{name, role, type, email, phone}]`; email must be valid or `""`         |
| `notes`, `applied_on`, stage history         | `notes`                                                                               |
| `resume_version`, `cover_letter`             | not importable by file name; link later (mcp-recipes.md §3)                           |

Caveats:

- Import creates one stage entry per row, so the history before the current stage is lost and the funnel would undercount. For rows whose `furthest_stage` is beyond their current stage (e.g. closed after an interview), create them one by one at `applied` and step them forward instead (pipeline-rules.md §1). Import the rest in one call.
- Up to 500 items per call.
- Imported rows don't record a sent resume version. Linking a resume afterwards to a row at applied or later records the resume as it is at that moment, which may not match what was sent; attach the original PDF instead when the user has it.
