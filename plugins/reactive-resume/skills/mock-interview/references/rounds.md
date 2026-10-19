# Round playbooks

Contents:

1. Level calibration
2. Difficulty
3. Recruiter screen
4. Hiring manager
5. Behavioral, with company lenses
6. Coding
7. AI-assisted coding
8. System design
9. Case (consulting)
10. Product sense
11. Panel
12. Mini-loop
13. UK strengths and timed one-way video
14. Voice mode
15. Stress round

Durations are practitioner norms unless a source is named. Text sessions have no clock, so count questions instead of minutes. Company practices change: phrase them "as of 2026" and suggest the user check the employer's own prep page when it matters.

## 1. Level calibration

What earns a 3 (Solid) depends on the level. Scope phrases follow Dropbox's public career framework; the UK Civil Service likewise writes its behaviour indicators per grade.

| Level               | Story scope that earns Solid                                           | Probe depth               | Evidence expected                                     |
| ------------------- | ---------------------------------------------------------------------- | ------------------------- | ----------------------------------------------------- |
| Intern or new grad  | Class, project, volunteer or part-time work; own tasks                 | L1–L2                     | Concrete actions; numbers welcome, not required       |
| Junior              | Defined tasks within a team                                            | L2                        | Some measure of outcome                               |
| Mid                 | Owns a project end to end; resolves ambiguity alone                    | L3                        | Before/after measure or honest range                  |
| Senior              | Leads cross-team work; influences without authority                    | L3–L4                     | Business impact, trade-offs, mentoring                |
| Staff and above     | Multi-team, multi-quarter direction; decides what to do as well as how | L4, plus a second example | Org-level outcomes, the hard choices, what was traded |
| Manager or director | Hiring, performance, team design, delivery through others              | L4                        | Team outcomes and people outcomes                     |
| Executive           | Strategy, P&L, transformation, board and stakeholder work              | L4                        | Financial and market results, reasons for the bet     |

Probe levels: **L1** ownership and context (your role, who else); **L2** action mechanics (what first, how you decided, what you rejected); **L3** evidence (how measured, before and after, how you know it was your action); **L4** reflection and counterfactual (what you would change, where you have used it since).

## 2. Difficulty

Difficulty is a separate setting from level.

| Difficulty | Probes per lead | Tone                | Extras                                                                 |
| ---------- | --------------- | ------------------- | ---------------------------------------------------------------------- |
| 1 Warm-up  | 1               | Warm, gives context | Planned probes only; easy rapport opener                               |
| 2 Standard | 2               | Neutral             | Planned probes plus one challenge                                      |
| 3 Hard     | 3–4             | Sceptical, precise  | Curveballs (second example, failure), time pressure, cuts off rambling |

When the user didn't choose a difficulty, start one step below the target and step up after a strong answer. A small virtual interview-training trial (adults with autism) unlocked harder tiers only after good performance at the easier one; borrow the idea when the user practises often. An explicit choice ("make it hard") stands.

## 3. Recruiter screen

5–6 questions (3 for a quick screen), about 20–30 minutes. Persona: warm recruiter. Competencies are fixed: Pitch, Motivation and fit, Logistics and pay alignment, plus one JD must-have checked lightly.

Bank:

- "Walk me through your background."
- "Why are you looking right now?"
- "What drew you to this role?"
- "What are you looking for in your next role?"
- Location, on-site days or relocation; notice period or start date.
- "Are you legally able to work in [country]? Will you need sponsorship?"
- "What are your salary expectations?"
- "Where are you in other processes?"
- "What questions do you have for me?"

Score a crisp pitch (past → present → why this role, with one or two proof points), motivation tied to the JD, logistics answered without hesitation, salary handled (a researched range, or a polite deferral), and concision. Rules on salary questions and salary history differ by jurisdiction: give no legal advice, and point the user to local rules if they ask. One or two light behavioral questions are fine.

## 4. Hiring manager

5 questions, about 45 minutes. Persona: hiring manager.

Mix one resume deep-dive, 2–3 behavioral questions on the JD's must-haves, one situational question ("A stakeholder wants X by Friday and it isn't feasible. What do you do?"), "What would your first 90 days look like?", "How do you like to be managed?", and time for the user's questions. Score scope against level, judgement and ownership.

## 5. Behavioral

3 lead questions (about 25 minutes), 4–5 for a full round (45–60 minutes), each drilled 2–3 levels deep (deeper for senior roles). Map competencies to questions: ownership, conflict, failure, ambiguity, influence without authority, prioritisation, customer focus, learning.

Company lenses (as of 2026; check the employer's own page):

- **Amazon.** Every candidate is assessed against the Leadership Principles with behavioral questions. Tag each question with a principle (list in question-bank.md). Amazon asks for "I" when describing your own part, welcomes failure stories, and says interviewers will dig for detail. A loop has 2–7 interviewers at 45–60 minutes each, sometimes including a Bar Raiser from another team.
- **Google.** Structured questions on role-related knowledge (behavioral), problem solving (hypotheticals) and leadership, with predetermined follow-ups and shared rubrics. Thought process matters more than one right answer; no brainteasers. Some roles are back to in-person interviews.
- **UK Civil Service.** The advert names the behaviours being assessed; the indicators differ by grade. STAR is recommended for behaviour questions. Strengths questions are different: see section 13.

## 6. Coding

One problem plus 1–2 follow-ups, about 45 minutes. Persona: technical deep-diver or neutral engineer.

1. Write an original problem with deliberate gaps (input bounds, duplicates, empty input) so clarifying questions earn credit. Famous problems reward memorisation, and AI tools solve them; interviewing.io recommends custom questions for that reason.
2. Solve it yourself first: a reference solution, its complexity, and 4–5 edge cases.
3. Let the user clarify, outline an approach, write code, test it and state complexity. Never reveal the solution during the problem; help only through the hint ladder in scoring.md. At the end, show your reference solution and compare it with theirs (SKILL.md step 5).
4. Evaluate without running anything: trace the user's own example, then empty input, one element, duplicates or negatives, and the largest size. Check off-by-one errors, mutating a collection while iterating it, null handling, claimed versus actual complexity, and the semantics of the language they used.
5. Report "passes traced cases 4/5 (traced by hand, not executed)", never "correct".
6. If a code-execution tool exists, run tests only when the real format allows it (a shared editor with a run button), and in realistic mode keep the results for the debrief unless the user runs them.

Follow-ups: "What if the input doesn't fit in memory?", "Can you do it in one pass?", "How would you test this in production?"

## 7. AI-assisted coding

Offer this only when the target employer runs it. As of 2026, Canva says it has expected AI tools in technical interviews since mid-2025, and Meta has reportedly piloted an AI-enabled coding round since late 2025 (secondary source). These rounds assess decomposition, critical review of AI output, verification and judgement, not prompt writing.

Simulation: give the user a messy multi-part spec plus a short block of plausible "AI-generated" code that contains 2–3 real defects (an off-by-one error, a missed edge case, an unsafe assumption). Score how they read it, test it, find the defects and explain trade-offs.

## 8. System design

One prompt worked through in phases, 45–60 minutes:

| Phase                                                                  | Rough time |
| ---------------------------------------------------------------------- | ---------- |
| Functional requirements (top 3) and 3–5 quantified non-functional ones | ~5 min     |
| Core entities                                                          | ~2 min     |
| API                                                                    | ~5 min     |
| Data flow (optional)                                                   | ~5 min     |
| High-level design                                                      | 10–15 min  |
| Deep dives                                                             | ~10 min    |

- Give scale numbers only when asked; asking is part of the signal.
- Deep-dive probes: "What happens when this node dies?", "What about a hot key?", "How stale can reads be?", "Where is the bottleneck at 10× traffic?"
- Level: a junior or mid-level candidate should deliver a working design, and the interviewer may point out improvements. A senior candidate should drive the deep dives and the trade-offs unprompted. Staff and above should also question the requirements.
- Text format: let the user describe components as a list or a simple diagram in plain text.

## 9. Case (consulting)

One case, 3–5 numbered questions, 30–45 minutes. Run it interviewer-led by default; some firms run candidate-led cases, so ask which the user expects (firm formats are not verified here).

1. Give the prompt and ask for a structure.
2. Show exhibit 1 as a Markdown table and ask what it says.
3. Ask a maths question.
4. Run a brainstorm ("What else could explain the drop?").
5. Ask for a 30–60 second recommendation.

Compute the answer key for every exhibit and calculation before you show it, and check it twice. BCG says a case has no single right answer and looks at logic, clarity, business intuition and creativity. For Bain, add a fit segment; Bain says it asks every candidate for a role the same fit questions.

## 10. Product sense

One prompt, about 30–35 minutes of content plus follow-ups. Phases: clarify the goal, state a strategy, pick one user segment, list three or more pain points and prioritise them, offer three or more solutions (one ambitious), define an MVP, then follow up on metrics and trade-offs. Running out of time before the MVP is a frequent failure (practitioner observation), so give one time warning ("About ten minutes left").

## 11. Panel

2–3 labelled personas, for example `[Priya, Hiring Manager]`, `[Sam, Senior Engineer]`, `[Lee, Product Partner]`. Each owns different competencies and keeps a separate scorecard. Only one persona speaks per turn; hand over naturally ("Sam, did you want to pick up on that?"). At the end, each persona rates alone, then the report shows where they disagree. This follows OPM's structured-interview practice: individual ratings first, then discussion of discrepancies.

## 12. Mini-loop

Two rounds back to back, such as two behavioral questions followed by system design for "technical plus behavioral". Use a different persona label for each segment and a short in-character hand-over ("Thanks. Next you'll meet Sam for the technical part."). Write one report with a section and a vote per segment; the combined vote is the lower of the two (SKILL.md step 6).

## 13. UK strengths and timed one-way video

- **UK strengths questions** are rapid-fire ("What energises you?", "Do you prefer starting or finishing tasks?"). The Civil Service says they have no right or wrong answers and asks candidates not to rehearse them. Don't STAR-coach these. Score authenticity, specificity and energy, and keep answers short.
- **Timed one-way video or AI screen.** Fixed preparation and answer time, no follow-ups. State the limits ("30 seconds to think, 2 minutes to answer"), give no probes, and use a word limit in text (about 300 words for 2 minutes).

## 14. Voice mode

When the conversation is spoken:

- Interviewer turns: no Markdown, at most two sentences, about 15 seconds. Read exhibits slowly or offer them as text.
- Length targets, converted at roughly 150 words a minute (an approximate figure for conversational English): recruiter answers 30–90 s; "tell me about yourself" 60–120 s; behavioral 90 s–2 min (3 min at most); case recommendation 30–60 s. These are heuristics.
- Comment on pace or filler words only when you have timing data or the raw transcript. Speech recognition drops fillers and mishears jargon, so confirm technical terms before marking them wrong.
- Spoken commands: "pause", "repeat that", "hint", "skip", "feedback", "end the interview".
- Don't comment on appearance, voice quality or accent.

## 15. Stress round

Opt-in only. Pressure comes from tight time limits, sceptical follow-ups, interrupting rambling and challenging numbers; never insults or hostility. OPM recommends a quiet, non-threatening setting for valid interviews, so present stress mode as resilience practice, not as realism. If the user seems genuinely upset, stop, step out of the role and check in.

The **awkward-question drill** (also opt-in) has the interviewer ask one improper question, such as about family plans, then coaches a calm redirect to job-relevant ground. Examples are in question-bank.md.
