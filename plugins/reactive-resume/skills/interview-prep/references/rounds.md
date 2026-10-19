# Round types, formats and AI policies

Contents

1. Mapping rounds to Reactive Resume interview fields
2. Round-by-round table
3. Recruiter screen checklist
4. Structured shapes for technical, design, product and case rounds
5. Take-home assignments
6. AI tools in interviews (as of 2026)
7. One-way video and AI interviewers
8. Sector rounds: teaching, healthcare, finance, sales

Evidence tags: **[O]** official employer, government or legal page; **[V]** vendor or practitioner blog (useful, often self-interested); **[C]** practitioner consensus without research behind it; **[U]** reported but not confirmed. Confirm format details with the recruiter, because they change by company, team and sometimes interviewer.

## 1. Mapping rounds to Reactive Resume interview fields

`kind` is one of `screening`, `technical`, `behavioral`, `onsite`, `other`; `audience` is one of `recruiter`, `hiring-manager`, `practitioner`, `panel`, `other`.

| Round                                    | `kind`                  | `audience`         |
| ---------------------------------------- | ----------------------- | ------------------ |
| Recruiter or HR screen                   | `screening`             | `recruiter`        |
| Hiring-manager conversation              | `behavioral` or `other` | `hiring-manager`   |
| Behavioural or competency round          | `behavioral`            | as scheduled       |
| Coding, system design, case, portfolio   | `technical`             | `practitioner`     |
| Panel                                    | as scheduled            | `panel`            |
| Full loop, onsite day, assessment centre | `onsite`                | `panel` or `other` |
| Executive or skip-level                  | `other`                 | `other`            |

## 2. Round-by-round table

| Round                                                | What is scored                                                                        | Prepare                                                                                                                                                                                                                              | Watch for                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Recruiter screen (20–30 min)                         | Motivation, basic fit, logistics                                                      | 60–90 s opener; why this company; pay answer; notice period; work authorisation; questions on rounds, formats, AI policy and timeline                                                                                                | Naming a number before knowing the range; vague "why us" |
| Hiring manager                                       | Can you solve their problems; depth on 2–3 projects; how you work                     | Top 3 requirements, each with a story; a rough first-90-days view; 3 questions about the team's problems                                                                                                                             | Generic answers that fit any team                        |
| Behavioural / competency                             | Past behaviour against a rubric                                                       | Story bank with probe layers                                                                                                                                                                                                         | "We" with no "I"; no result; stories over 3 min [C]      |
| Strengths-based (UK public sector, graduate schemes) | What energises the candidate; natural strengths                                       | Reflect beforehand on energising and draining tasks, with short examples [O]                                                                                                                                                         | Scripted-sounding answers                                |
| Live coding                                          | Problem solving, code quality, testing, communication                                 | Clarify → examples → simple solution → improve → test, narrating aloud; practise without AI unless told otherwise                                                                                                                    | Silent coding; skipping edge cases                       |
| AI-assisted coding                                   | Breaking down ambiguity; judging, verifying and fixing AI output; explaining the code | Practise in the company's environment; read unfamiliar code quickly; prompt narrowly, review the diff, test; say why you accept or reject AI output                                                                                  | Letting the AI drive; pasting code you can't explain     |
| System design [C]                                    | Requirements, trade-offs, scale, failure modes                                        | Requirements (functional and non-functional) → rough numbers → API → data model → high-level design → deep dive → bottlenecks and trade-offs                                                                                         | Drawing boxes before requirements                        |
| ML system design [C]                                 | Problem framing, metrics                                                              | Business goal → ML task → offline and online metrics → data and labels → features → baseline → evaluation → deployment and monitoring                                                                                                | No baseline; no online metric                            |
| Product sense / execution [V/C]                      | User empathy, prioritisation, metrics                                                 | Sense: users → pain points → prioritise → solutions → trade-offs → success metric. Execution: goal metric, guardrails, diagnosing a metric drop (internal or external, segment, funnel)                                              | Feature lists with no user or metric                     |
| Consulting case                                      | Structuring, maths, synthesis, communication                                          | Clarify the objective → issue tree → hypothesis → analyse data → quick maths → answer first. Ask whether the case is interviewer-led or candidate-led; it varies by firm [C]                                                         | Memorised frameworks; silence                            |
| Design portfolio review                              | Process, rationale, impact                                                            | 3–5 case studies, each with the problem, the user's own role, process, rejected alternatives, impact and learnings; show the messy middle [O-practitioner, Nielsen Norman Group]                                                     | A screenshot tour; hiding constraints                    |
| Design whiteboard challenge [C]                      | Thinking aloud under ambiguity                                                        | Clarify users, goals, constraints → flows before pixels → time-box → state trade-offs → how you'd validate                                                                                                                           | Polishing one screen                                     |
| Take-home                                            | Quality within a time cap; judgement                                                  | Section 5                                                                                                                                                                                                                            | Over-building past the cap                               |
| Presentation                                         | Structure, insight, handling questions                                                | Summary first; use about 70–80% of the slot and leave time for questions; prepare 5 hard questions [C]                                                                                                                               | Running over time                                        |
| Panel                                                | Same rubric, several scorers                                                          | Map each panellist's function to their likely concern; answer the person who asked, then include the others [C]                                                                                                                      | Playing only to the most senior person                   |
| Assessment centre or group exercise                  | Competencies across several exercises                                                 | Group tasks, in-tray exercises, presentations, tests and role plays scored against competencies; a weak exercise can be offset by a strong one; you're assessed throughout, including breaks; dry-run virtual set-ups [O, Prospects] | Dominating or vanishing; dwelling on a mistake           |
| One-way video / AI interviewer                       | Usually the content of transcribed answers                                            | Section 7                                                                                                                                                                                                                            | Treating it as less real than a live interview           |
| Executive / final [C]                                | Strategy, judgement, stakeholders, scale                                              | A view on the company's top 2–3 challenges; a 90-day outline; a hard trade-off story; references ready; a compensation stance                                                                                                        | Operational detail without strategy                      |
| Values / culture                                     | Behaviour against published values                                                    | One story per value [O for Bain and Amazon]                                                                                                                                                                                          | Reciting values without evidence                         |

## 3. Recruiter screen checklist

Questions to expect: tell me about yourself; why this company; why are you leaving; what are you looking for; salary expectations (and, where lawful, current pay: see answers.md); notice period or start date; work authorisation and sponsorship; location, remote or office days; other processes and timeline.

Facts to have ready: notice period, earliest start date, work authorisation, location constraints, the range the user is targeting, and any planned time off. Questions to ask: the number and type of rounds, who the user will meet, the timeline, how the role is levelled, the budgeted range, whether AI tools or notes are allowed, and how to request accommodations.

## 4. Structured shapes for technical, design, product and case rounds

These are practice structures, not scripts. Deep drills (timed problems, design sessions, cases with data) belong in mock-interview if installed.

- **Project walkthrough** (hiring manager or practitioner): the problem and why it mattered; the constraints; the user's part versus the team's; the key decision and the alternatives; what broke; the result and its source; what they'd do differently. Prepare two, of different kinds.
- **Coding narration:** restate the problem; confirm inputs, outputs and edge cases; give a simple approach first, then improve it; test with examples out loud.
- **System design pacing:** spend the first few minutes on requirements and rough numbers before any diagram; check with the interviewer before going deep on one component.
- **Product sense:** pick one user segment and say why; prioritise pain points explicitly; tie the solution to a success metric and a guardrail.
- **Metric drop:** confirm the definition and the time window; check for data or tracking problems; split internal and external causes; segment (platform, region, cohort); walk the funnel.
- **Case:** answer first, then the support; state each number and the arithmetic aloud.

## 5. Take-home assignments

- Confirm in writing the time cap, the deadline and the AI policy. Some employers bar AI on take-homes unless they say otherwise (Anthropic's candidate guidance is one published example [O]).
- Stay inside the cap; note what you'd do with more time instead of doing it.
- Include a README with assumptions, trade-offs, what you'd do next and how to run the tests.
- Rehearse a live walkthrough and a live extension ("now add X"), since many employers discuss the take-home in a later round.
- Treat any request to install unknown software, run a supplied binary or clone a repository with suspicious setup scripts as a possible scam. job-application-manager has the full scam checks.

## 6. AI tools in interviews (as of 2026)

Policies differ by company, sometimes by round and even by interviewer. Never infer one employer's policy from another's.

| Employer               | Reported policy                                                                                                                                               | Source                                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canva                  | Expects AI coding assistants in technical interviews for some engineering roles; a pilot AI-assisted coding round replaced a fundamentals screen (June 2025)  | [O] https://www.canva.dev/blog/engineering/yes-you-can-use-ai-in-our-interviews/                                                                                  |
| Meta                   | Some coding candidates get an AI assistant (reported July 2025). A vendor reports it replaces one of two onsite coding rounds, with a classic round remaining | [O-press] https://www.404media.co/meta-is-going-to-let-job-candidates-use-ai-during-coding-tests/; [V] https://www.hellointerview.com/blog/meta-ai-enabled-coding |
| Anthropic              | AI is fine for preparation; no AI in live interviews or take-homes unless indicated; don't use AI to invent experiences                                       | [O] https://www.anthropic.com/candidate-ai-guidance                                                                                                               |
| Amazon, Google, others | Reports in 2025 of disqualification for AI use in interviews and of a return to some in-person rounds                                                         | [U]                                                                                                                                                               |

A small vendor test of audio-only mock interviews found interviewers didn't notice candidates using ChatGPT, which is part of why employers are moving to custom problems, in-person rounds and explicit AI rules. That finding is never a reason to cheat.

Agent rules:

1. Default assumption: no AI help during any live or timed assessment unless the invitation says otherwise.
2. If the policy is unclear, draft one line for the recruiter: "Are AI coding assistants permitted in the technical rounds, and if so, which tools?"
3. If AI is allowed, drill the workflow aloud: read the code → state a plan → prompt narrowly → review the output → test → explain the trade-offs.
4. Refuse to help with hidden real-time assistance (overlays, tools listening to the call). It is deception and can lead to a rescinded offer.

## 7. One-way video and AI interviewers

- **What is scored.** HireVue stopped using facial analysis in 2020 (announced January 2021) and says its models assess the transcribed content of answers, with tone and pauses as minor factors [O-press]. Its candidate pages say there is no facial recognition, assessments usually have 5–8 questions over 20–30 minutes (set aside 45), there is a practice question, you can resume after a dropout from the same link, light should be in front of you, and you needn't worry about looking at the camera [O-vendor, as of 2026]. Accommodations go through the recruiter, and neurodivergent candidates may be able to get questions in advance.
- **Prepare** content and structure: name the competency, the specific action and the result in 1–2 minutes. Practise with a timer in a quiet room. Don't coach eye-contact tricks.
- **Conversational AI voice interviewers** spread during 2025. Prepare the same way, and ask whether a human reviews the result.
- **Candidate rights** (as of 2026; verify the current status before citing):
  - Illinois Artificial Intelligence Video Interview Act: notice, an explanation and consent before AI analysis; limits on sharing; deletion on request. https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=4015&ChapterID=68
  - New York City Local Law 144: automated employment decision tools need a bias audit within the past year, and candidates get notice 10 business days before use. https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page
  - Colorado: a federal court blocked enforcement of the 2024 AI Act (SB 24-205) in April 2026, and SB 26-189, signed in May 2026, replaced it from 1 January 2027. Employers must give notice before using automated decision tools for hiring and a disclosure after an adverse outcome; the attorney general's rules are still pending. https://www.mcdermottlaw.com/insights/colorado-ai-law-in-flux-comprehensive-replacement-bill-signed-after-federal-court-blocks-predecessors-enforcement/
  - EU AI Act: AI that filters applications or evaluates candidates is high-risk under Annex III. The artificialintelligenceact.eu timeline lists 2 December 2027 for these obligations (originally 2 August 2026); verify the current date before citing. https://artificialintelligenceact.eu/annex/3/ and https://artificialintelligenceact.eu/implementation-timeline/

## 8. Sector rounds: teaching, healthcare, finance, sales

- **Teaching demo lesson [O, UK Teaching Vacancies].** Ask about the class, learners with special educational needs, the equipment, and how to send materials (USB sticks are often not allowed). Keep the plan simple: an engaging start, checkpoints for understanding, a review at the end, differentiation; bring three printed copies of the plan; adapt live.
- **Teaching panel [O].** Expect safeguarding questions such as what you'd do if a learner told you something worrying; know the safeguarding guidance that applies (in England, Keeping Children Safe in Education). Bring ID, right-to-work and qualification documents if asked.
- **Nursing and healthcare [O].** NHS values-based recruitment uses values interviews, role plays, written scenarios and assessment centres. Map stories to the six NHS values; rehearse prioritisation and deteriorating-patient scenarios with escalation in SBAR (Situation, Background, Assessment, Recommendation); know the limits of your scope of practice; prepare a safeguarding answer.
- **Finance technicals [C].** How the three statements link; walk through a DCF; comparables; LBO basics; enterprise versus equity value; a current deal or market view. Expect a follow-up on every answer, so understand rather than memorise.
- **Sales role play [C].** Ask 3–5 discovery questions before pitching; handle objections by acknowledging, clarifying, responding and confirming; always ask for a next step.

## Sources

- OPM structured interviews: https://www.opm.gov/policy-data-oversight/assessment-and-selection/structured-interviews/
- Sackett, Zhang, Berry & Lievens (2022), revised selection validities (structured interviews ranked top): https://doi.org/10.1037/apl0000994
- Maurer et al. (2001), coaching and interview performance: https://doi.org/10.1037/0021-9010.86.4.709
- Bain interviewing: https://www.bain.com/careers/hiring-process/interviewing/
- BCG case preparation: https://careers.bcg.com/global/en/case-interview-preparation
- Prospects, assessment centres: https://www.prospects.ac.uk/careers-advice/interview-tips/assessment-centres
- Nielsen Norman Group, UX portfolios: https://www.nngroup.com/articles/ux-design-portfolios/
- UK Teaching Vacancies, interview lesson: https://teaching-vacancies.service.gov.uk/jobseeker-guides/get-help-applying-for-your-teaching-role/prepare-for-a-teaching-job-interview-lesson
- UK Teaching Vacancies, teaching interviews: https://teaching-vacancies.service.gov.uk/jobseeker-guides/get-help-applying-for-your-teaching-role/how-to-approach-a-teaching-job-interview
- NHS Employers, values-based recruitment: https://www.nhsemployers.org/articles/values-based-recruitment
- IHI SBAR tool: https://www.ihi.org/library/tools/sbar-tool-situation-background-assessment-recommendation
- SHRM on HireVue ending facial analysis: https://www.shrm.org/topics-tools/news/talent-acquisition/hirevue-discontinues-facial-analysis-screening
- HireVue candidate FAQ and tips: https://www.hirevue.com/candidates/faq and https://www.hirevue.com/candidates/interview-tips
- interviewing.io on AI cheating in technical interviews: https://interviewing.io/blog/how-hard-is-it-to-cheat-with-chatgpt-in-technical-interviews
