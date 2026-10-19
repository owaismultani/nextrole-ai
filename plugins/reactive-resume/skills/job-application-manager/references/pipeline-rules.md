# Pipeline rules: stages, clock, tags, offers, regional notes

Detail behind SKILL.md §2, §3 and §6. Laws and platform behaviour change: phrase them "as of 2026" and verify when a decision depends on one.

## Contents

1. Stage edge cases
2. Logging interviews
3. The status clock, with reasons
4. What each sent message does to the record
5. Tags, sources and contact types
6. Offer stage in detail
7. Regional and legal notes
8. Sources

## 1. Stage edge cases

| Case                                                | Do                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| An agency recruiter submitted the user              | One record for the end employer. Source `agency`; add the agency recruiter as a contact. Note which agency submitted, and ask the user before agreeing to a second agency for the same role, since duplicate submissions can cause fee disputes.                                                                                        |
| A recruiter reached out and a call is booked        | Create at `screening` with the real date; source `recruiter-inbound`.                                                                                                                                                                                                                                                                   |
| Several roles at one company                        | One record per role, each with its own documents. Note shared contacts on each. Recruiters can usually see every application, so keep it to the roles the user genuinely fits (convention, not research).                                                                                                                               |
| Re-applying after an earlier rejection              | A new record. Leave the old one closed; its sent documents stay fixed.                                                                                                                                                                                                                                                                  |
| Internal move at the current employer               | Same pipeline; source `internal`.                                                                                                                                                                                                                                                                                                       |
| Logging an application after the fact with history  | Create it at `applied` with the real applied date, then step it through each later stage it reached, each with its real date, ending at the current one. The history then holds the applied date and the furthest stage the funnel needs. If the user only remembers the current stage, record that and note "earlier history unknown". |
| The user applied, then the posting vanished         | Keep the stage; postings often come down once enough applicants arrive. The clock still applies.                                                                                                                                                                                                                                        |
| Hiring freeze, role "on hold"                       | Keep the stage, tag `on-hold`, follow up in 3–4 weeks. If it stays frozen past day 45, propose `no-response`.                                                                                                                                                                                                                           |
| Rejected, then contacted again for a different role | New record for the new role; note the link to the old one.                                                                                                                                                                                                                                                                              |
| Offer accepted, then the start date or terms change | Keep `closed` / `accepted`; log a note with the new written terms.                                                                                                                                                                                                                                                                      |

Use exactly one stage per record. A record is never "rejected and interviewing" at once; if a second role opens, that is a second record.

## 2. Logging interviews

Record every round, including recruiter screens, so the weekly review sees what is coming and interview-prep has the details.

| What it is                               | `kind`     | `audience`      |
| ---------------------------------------- | ---------- | --------------- |
| Recruiter or HR call                     | screening  | recruiter       |
| Hiring-manager conversation              | behavioral | hiring-manager  |
| Coding, system design, case, portfolio   | technical  | practitioner    |
| Panel or loop on one day                 | onsite     | panel           |
| AI-led or one-way async video interview  | other      | other           |
| Presentation, work trial, reference call | other      | whoever attends |

Capture: exact start time with timezone, length, location or link, participants with roles (needed for one thank-you per interviewer), and anything the employer said to prepare. AI and async interviews are now common (Greenhouse reported in May 2026 that 63% of surveyed US job seekers had faced one), so record them as rounds too.

After each round, ask the user three things and log them: what the next step is and when they'll hear; who they met (names and roles); one thing that went well and one to change. The third feeds interview-prep or mock-interview if installed.

## 3. The status clock, with reasons

Defaults the user can change. Business days skip weekends; ask about public holidays only if the date lands near one.

| Stage and silence                       | Action                                                                                                                                            | Why                                                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| applied, day 10                         | With a named contact, draft one follow-up. Without one, don't message the ATS.                                                                    | Reactive Resume flags "No reply in n days" at 10 days. A note through an ATS adds little.                          |
| applied, day 21, tier A                 | Second channel: hiring manager or an employee intro.                                                                                              | Referred and sourced candidates are far more likely to reach interview.                                            |
| applied, day 45                         | Propose `closed` / `no-response`; it reopens if they reply.                                                                                       | Median time to first interview was about 23 days in 2025 tracker data; the 75th percentile was more than 2 months. |
| screening or interview, past their date | Status check 2 business days after their date.                                                                                                    | Practitioner convention anchored to typical decision times.                                                        |
| screening or interview, no date given   | Status check at 7 business days.                                                                                                                  | Same.                                                                                                              |
| after a status check, no reply          | Second status check 5 business days later.                                                                                                        | Same.                                                                                                              |
| after the second status check, no reply | Propose `closed` / `no-response` 10 business days later.                                                                                          | In Huntr's 2025 survey, nearly 90% of candidates had been ghosted after an interview at least occasionally.        |
| saved, 14+ days (not `target-company`)  | Ask: apply or drop? Delete never-applied rows only after confirmation.                                                                            | Stale saved rows clutter the board and the stats.                                                                  |
| offer                                   | Follow-up = the next step, 2 business days before the written deadline when time allows, never after it; the deadline goes in the follow-up note. | Missing it can lose the offer.                                                                                     |

Employer-side medians, for context: about 34–35 days from opening to hire (Ashby, 2025–26), longer at small startups without a recruiter (about 62 days). Candidate-side, time to first offer lengthened from 57 to 83 days over 2025 (Huntr). Searches are long; tell the user so when silence worries them.

Post-application etiquette (guidance, not research): at most one follow-up, only to a named person, 7–10 business days after applying. No phone calls unless the posting invites them.

## 4. What each sent message does to the record

Apply these only after the user confirms the message went out.

| Message                       | Stage / closed reason                                                                                                        | Next follow-up                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Networking or information ask | none; add the contact (type "Networking"); with no posting, a `saved` record tagged `target-company` or a `contacts.csv` row | +5–7 business days, once                                                                        |
| Referral ask, they said yes   | none; note "Referred by X"; tag `referral`                                                                                   | ask whether to apply first or wait for their submission                                         |
| Post-application follow-up    | none                                                                                                                         | none further; the clock takes over                                                              |
| Thank-you                     | none                                                                                                                         | their decision date + 2 business days                                                           |
| Status check                  | none                                                                                                                         | first: +5 business days for a second check; second: +10 business days, then propose no-response |
| Expedite request              | none; tag `expedite-requested`                                                                                               | before the competing offer's deadline                                                           |
| Reply to a rejection          | closed / not-selected                                                                                                        | optional reminder to reconnect in 3–6 months                                                    |
| Withdrawal                    | closed / withdrew (or accepted-other)                                                                                        | none                                                                                            |
| Offer accepted                | closed / accepted; propose accepted-other for all other open ones                                                            | none                                                                                            |
| Offer declined                | closed / withdrew or accepted-other                                                                                          | none                                                                                            |
| Extension request             | stays offer                                                                                                                  | the next step before the new deadline; update the deadline in the note                          |

Log every one as a note: `Sent: thank-you to Dana Ruiz (hiring manager), email`. Log replies as `Received: …`.

## 5. Tags, sources and contact types

Tags are free text with no normalisation, so "Remote" and "remote" are different tags. Before adding any, list the existing ones and reuse their spelling. Suggested set:

| Tag                              | Meaning                                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------------------- |
| `tier-a`, `tier-b`, `tier-c`     | Effort tier (SKILL.md §1)                                                                |
| `referral`                       | Someone referred the user                                                                |
| `tailored`                       | A tailored resume copy was sent                                                          |
| `remote`, `hybrid`, `visa`       | Constraints worth filtering on                                                           |
| `ghost-risk`, `suspected-scam`   | Intake flags                                                                             |
| `expedite-requested`, `deadline` | Offer juggling                                                                           |
| `on-hold`, `rescinded`           | Process states the stage enum doesn't cover                                              |
| `target-company`                 | A networking target with no posting yet; skipped by the 14-day saved rule and the funnel |

Set `source` from one fixed list so per-channel stats work: `referral`, `company-site`, `linkedin`, `indeed`, `recruiter-inbound`, `agency`, `networking`, `internal`, `other`. Add a board name only if the user applies there often.

Contact `type` labels: "Recruiter", "Hiring Manager", "Referral", "Interviewer", "Agency Recruiter", "Networking". A contact needs a name; email may be empty.

## 6. Offer stage in detail

**Deadlines.** Always get the deadline in writing. NACE's guidance (reviewed 2026) sets no minimum but calls one to two weeks common for graduate offers and up to two months reasonable when converting an intern, says shorter windows "can constitute undue pressure", and asks employers to be open to reasonable requests for more time. Markets with long notice periods (Germany, India, the UK) push start dates out and often keep processes open longer; no hard data.

**Exploding offers** (under about a week, or a bonus that shrinks the longer you wait): thank them, state real enthusiasm, ask for a specific later date with a true reason, and suggest a middle date. If they refuse, decide on what you know.

**Juggling.** First ask whether the user wants the offer in hand and which open processes they would pick over it. The day an offer lands, tell only those: "I've received an offer with a decision deadline of <date>. I'm very interested in <role> at <Company>; is there any way to speed up your process?" Say "first choice" to at most one company, and only if true. Tag them `expedite-requested`.

**Sequencing** (coaching convention, not research): when the user controls timing, book lower-preference interviews first as real practice, and tell preferred employers the true timeline early so offers can land close together.

**References.** Before final rounds, ask each referee's permission, tell them the role and what it values, and warn them a call may come. Never list someone who hasn't agreed.

**Rescinds.** About 11% of Huntr's 2025 survey respondents had an offer withdrawn, for any reason; it isn't a rate for negotiating. Until the user accepts, keep other processes moving: offers do get rescinded. Once they accept, withdraw from the rest promptly; continuing to interview after accepting misleads those employers (UC Berkeley Career Engagement). If contingencies (background check, references, right-to-work) worry them, they can ask the new employer how long the checks take before signing. If an offer is rescinded: don't post publicly; ask the recruiter about other roles on the team and whom to contact; check whether a resignation can be reversed; if discrimination is suspected, suggest an employment lawyer.

**Accepting.** Reply in writing restating title, base pay, start date, location and any negotiated terms; ask for an updated written offer if terms changed; ask about next steps (paperwork, checks). Then close every other open application as `accepted-other` after the user confirms, draft the withdrawals and cancel pending interviews. Offer short thank-you notes to everyone who helped (referrers, contacts, references): thanks makes helpers more willing to help again (messages.md §1).

**Reneging.** Advise strongly against it. Recruiters move between firms; universities can sanction students (NACE describes outcomes from no action up to loss of on-campus recruiting access); contracts may claw back signing or relocation bonuses; UK and German contracts can carry notice periods even before the start date. Don't give legal conclusions; tell the user to read their contract. If they still decide to renege: do it immediately, by phone or video first and then in writing, apologise, blame no one, offer to repay any bonus, and don't post about it.

**Comparing offers.** Keep each offer's currency and pay period; never convert with invented rates or add uncertain equity to a total; unknown amounts are unknown, not zero. Evaluation, comparison and negotiation belong to offer-negotiation if installed; otherwise SKILL.md §6 has a light version.

## 7. Regional and legal notes

Verify each before quoting it to a user; this is a 2026 snapshot.

- **Ontario, Canada (from 1 Jan 2026, 25+ employees):** employers must tell interviewed applicants whether a decision has been made within 45 days of the last interview, and keep records for 3 years. Postings must state whether a vacancy currently exists, disclose AI used in screening, include pay or a capped range, and must not require "Canadian experience". General recruitment campaigns, internal-only postings and work done entirely outside Ontario are exempt.
- **EU Pay Transparency Directive (2023/970):** where national law has transposed it, applicants are entitled to the starting pay or range before the interview (or otherwise in time to negotiate), and employers may not ask about pay history. Member states had to transpose it by 7 June 2026; implementation is uneven, so check the country.
- **US pay-range posting laws:** among them CA, CO, HI, IL, MD, MA, MN, NJ, NY, VT, WA, DC, New York City and Cleveland; Virginia from 1 July 2026, Maine from about late July 2026, Connecticut postings from 1 October 2026; Columbus (2027) and Delaware (2027) announced. Several also require giving the range on request. A missing range in a covered jurisdiction is a usable flag and a reasonable question.
- **US salary-history bans:** 22 states and about 24 localities as of April 2026, including Virginia from 1 July 2026. Michigan and Wisconsin pre-empt local bans rather than banning the question. Most bans let the candidate volunteer their history.
- **Thank-you notes and post-application follow-ups:** a strong US norm, less expected in the UK, much of continental Europe and Japan. Their effect on outcomes is unproven.
- **When to close as ghosted:** no standard exists. Ontario's 45 days is the only legal anchor found.

## 8. Sources

- Reactive Resume source: application stages and closed reasons (`packages/schema/src/applications/data.ts`); "No reply in n days" after 10 days (`apps/web/src/features/applications/next-step.ts`).
- Ashby Talent Trends: EMEA and AMER recruiter productivity; startup hiring; offer acceptance rates; candidate experience surveys.
- Huntr, 2025 annual job search trends report (self-reported tracker data and a December 2025 survey, n=1,049).
- Greenhouse newsroom, May 2026, AI interviews.
- NACE advisory opinions: setting reasonable deadlines for job offers; rescinded and deferred offers; case study on reneging.
- UC Berkeley Career Engagement: decision time; negotiating guidelines; delayed or rescinded offers.
- Ontario, Your guide to the Employment Standards Act: publicly advertised job postings.
- European Commission, EU action on equal pay (Directive 2023/970).
- HR Dive trackers: salary-history bans (updated April 2026); pay-transparency posting laws (updated May 2026).
