# Cover letters for a tailored application

When to write one, how to build it from the requirement table, what to cut, and a worked example.

## Contents

1. Do letters still matter?
2. Write or skip
3. Template
4. Phrases to avoid
5. Worked example
6. Review checklist
7. Saving it in Reactive Resume
8. Sources

## 1. Do letters still matter?

- Before AI writing tools were common, tailored letters appeared to help and generic ones much less (a single 2019–2020 vendor field experiment, before LLMs; treat its effect size as unreliable).
- Since 2023 the signal has weakened. On a large freelance platform, the hiring premium for tailored proposals disappeared once LLMs arrived. After an AI letter tool launched, the link between letter tailoring and callbacks fell by about half, and employers leaned on work history instead. In two field experiments, LLM-polished standard sections did not raise interview invitations, and recruiters who knew LLMs were in use valued well-written human letters more.
- Time spent **editing** AI drafts correlated with hiring success. Hiring managers are split on AI help: many accept it for proofreading, a minority reject anything that looks fully AI-generated (commissioned survey, opt-in panel).

**Rule:** the value of a letter now lies in specific, verifiable, non-standard content: a concrete story, a number, a real reason for this team. Draft from the user's facts, then ask them to add or rewrite at least one line in their own voice. Never add deliberate typos to look human.

## 2. Write or skip

| Situation                                                                  | Do                                            |
| -------------------------------------------------------------------------- | --------------------------------------------- |
| Required, or there is an upload field labelled "cover letter"              | Write a tailored one                          |
| Career change, relocation, employment gap, or a stretch on a weight-3 must | Write it: the letter is where the bridge goes |
| Referral, small company, senior role, named hiring manager                 | Write it                                      |
| Optional, high-volume portal, nothing to add beyond the resume             | Skip, or 120–180 words at most                |
| Posting says "no cover letters"                                            | Skip                                          |

## 3. Template

150–300 words; shorter when the evidence is thin. Never pad to reach a length. Use the hiring manager's name if the user knows it; otherwise a plain greeting ("Dear Growth team" or "Dear hiring team").

1. **Hook (2–3 sentences).** The role, a specific reason tied to the team's problem (from the hidden-requirements read), and one line of proof.
2. **Evidence paragraph 1.** The top weight-3 requirement → a short story (situation, what the user did, the result with a number or honest range) → why it transfers.
3. **Evidence paragraph 2.** The second requirement, same pattern. A third only at the Deep tier.
4. **Bridge (optional, one sentence).** The main gap, stated honestly with the closest real evidence: "Snowflake would be new to me; I have already moved one warehouse from Redshift to BigQuery."
5. **Close.** Next step and any logistics (availability, relocation, on-site days). No pleading, no summary of the letter.

Don't repeat resume bullets word for word; tell the story behind one of them.

## 4. Phrases to avoid

A practitioner heuristic, not research. These read as generic or machine-written:

"I am writing to express my interest", "I am thrilled/excited to apply", "passionate about", "proven track record", "results-driven", "dynamic/fast-paced environment", "leverage my skills", "I believe I would be a great fit", "in today's rapidly evolving landscape", "delve", "tapestry", "synergy", strings of three adjectives, and a closing paragraph that restates the letter.

Test each sentence: could it appear in any candidate's letter to any company? If yes, make it specific or cut it.

## 5. Worked example

Inputs: the Data Analyst, Growth example from SKILL.md, after the user's answers. Answering the two letter questions in the same batch, the user also said: they read the company's public post about rebuilding its experimentation platform; before the weekly review, test ideas were picked by whoever argued loudest, and now they are ranked against the five KPIs; they can start in November.

> Dear Growth team,
>
> Your post about rebuilding the experimentation platform caught my eye, because that is the work I do at Acme Subscriptions: choosing which tests to run and analysing the results.
>
> At Acme I defined five funnel KPIs with our Product and Marketing leads, then built the weekly SQL and Tableau review we use to choose about ten A/B tests a quarter; I size and analyse about half of them myself. Before that, test ideas were picked by whoever argued loudest; now they are ranked against the same five KPIs.
>
> Behind that review sit the roughly 40 dbt models I built on BigQuery, which cut the dashboard refresh from about six hours to 45 minutes. Snowflake would be new to me, but the modelling work carries over directly.
>
> I can be in the Austin office three days a week and could start in November. I'd welcome a conversation about where the platform is headed.
>
> [Your name]

Then ask: "Which line sounds least like you? Rewrite it in your own words, or tell me what you'd say and I'll fit it in."

About 155 words: two evidence paragraphs are enough. Every fact above came from the resume or the user's answers, with the user's own verbs ("choose", "size and analyse", not "run" or "lead"). If the user had not described the before-state ("whoever argued loudest"), that sentence would have to be asked for or dropped, never invented.

## 6. Review checklist

- [ ] Every claim traces to the resume or a user answer.
- [ ] Each evidence paragraph maps to a weight-3 row in the table.
- [ ] At most one gap sentence, and it is honest.
- [ ] No phrase from section 4; no copied JD sentences.
- [ ] 150–300 words (under 180 for an optional portal letter), with nothing added to reach a length.
- [ ] The user has edited or approved at least one line in their own voice.
- [ ] Company, role and hiring-manager names spelled as in the posting.

## 7. Saving it in Reactive Resume

With the MCP server connected (skip otherwise):

- **Write it yourself (preferred):** `create_cover_letter {name, content, applicationId, resumeId, layout: "structured", recipientCompany, recipientName}`. `content` is body HTML only (`<p>` paragraphs); the structured layout adds the greeting and sign-off itself, so leave those out of `content`. With `applicationId`, the letter becomes the application's letter only if it has none yet; otherwise, with the user's agreement and before the application is marked Applied, link it with `update_application {id, coverLetterId}`.
- **AI draft:** `draft_application_message {id, kind: "cover-letter"}` sends the resume and application to the user's AI provider (ask first), writes 250–350 words (longer than this skill's target, so trim while reviewing) and saves a letter named "{company} — {role}". Review it against the table and section 6, then fix it with `update_cover_letter {id, expectedRevision, …}` after reading the current `revision` with `read_cover_letter`.
- Neither tool sends anything to an employer. Never say the letter was sent.

## 8. Sources

- ResumeGo cover-letter field experiment, 2019–2020 (vendor, pre-LLM).
- Galdin & Silbert 2025 (arXiv 2511.08785); Tuck School summary.
- Cui, Dias & Ye 2025 (arXiv 2509.25054).
- Abbas Nejad et al., Journal of Labor Economics, in press 2026 (Tilburg).
- TopResume AI in hiring survey, 2025 (n=600, commissioned).
- Wiles, Munyikwa & Horton, Management Science 2025 (writing assistance).
- Cal State LA, Tailoring cover letters.
