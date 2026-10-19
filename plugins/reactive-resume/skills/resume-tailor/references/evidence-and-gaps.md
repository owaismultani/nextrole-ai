# Evidence mapping and gap handling

How to rate the evidence for each requirement, what to ask when it is thin, how to handle each kind of gap honestly, and how to answer requests to fabricate.

## Contents

1. Strength examples
2. Gap question bank
3. Honest gap strategies
4. Numbers, ranges and non-numeric impact
5. Replies to fabrication requests
6. Sources

## 1. Strength examples

The scale and its default actions are defined in SKILL.md step 4. Use those exact labels so the user learns them across applications. Examples for "experience with dbt" (Transferable uses "leadership"):

| Strength     | Example                                                     |
| ------------ | ----------------------------------------------------------- |
| Direct+      | "Built ~40 dbt models, cutting refresh from ~6 h to 45 min" |
| Direct       | "Maintained dbt models"                                     |
| Adjacent     | "Built SQL transformation jobs in Airflow" (no dbt)         |
| Transferable | For "leadership": "Led a 6-person volunteer build team"     |
| Unstated     | "Worked on data pipelines" (tool unnamed)                   |
| Learning     | "dbt Fundamentals course, finishing Nov 2026; repo link"    |
| None         | Nothing true to say                                         |

Rules:

- One requirement, one best pointer (section → item → bullet). If two bullets both prove it, promote the stronger and leave the other.
- A skill listed in Skills with no bullet or project behind it is **Direct** at best. Every listed skill should be backed somewhere; a claim made in the summary or Skills must be supported further down.
- "We" in a bullet hides ownership. Ask what the user did before rating it Direct.
- Choosing, reviewing, approving or supporting work is Adjacent to doing it. "The review I built picked the tests" is not "ran A/B tests"; ask whether they designed or analysed any.

## 2. Gap question bank

Ask 3–5 per batch, highest weight first. Wait for answers. Never fill a gap without one.

**Tools and skills**

- "The JD asks for **X**. Have you used X itself, or something close to it, at work, on a side project, in a course, or while volunteering? When, for how long, at what scale?"
- "Would you be comfortable being questioned on **[adjacent tool]** as your equivalent in an interview?"
- "Are you learning **X** right now? What is the concrete step: course name, exam date, repo link?"

**Scope and ownership**

- "What's the closest thing you've done to **[responsibility]**? What happened as a result?"
- "Did you lead this or contribute to it? What was your part specifically?"
- "Your official title was **T**. Did the day-to-day look more like **[JD title]**? What did you own?"

**Years and credentials**

- "The JD asks for **N+ years** of **[function]**. Counting all roles, how many years have you actually spent doing it?" Never round up. Internships and part-time work count only if labelled as such.
- "Do you hold **[certification]**, or is one in progress? Expected date?" A dated "in progress" entry is fine; implying it is held is not.

**Results**

- "What was the measurable result: volume, money, time, error rate, users? An honest range like ~20–30% is fine. 'Don't know' is a fine answer too."
- "If there is no number, what changed? Who used it, how often, what was it like before?"

**Knockouts and pruning**

- "Are you authorized to work in **[country]** without sponsorship? Can you do **[N]** days on-site in **[city]**? Is the salary band workable?"
- "Is anything on this resume irrelevant to this role and safe to hide in this copy?"

## 3. Honest gap strategies

| Gap                            | Honest move                                                                                       | Where                                   | Never                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------- |
| Tool gap with an adjacent tool | Name the real tool and the shared concept: "dimensional models in dbt (BigQuery)"                 | Bullet and Skills; bridge in the letter | Listing the JD's tool as a skill                               |
| Years short by one or two      | Show scope and outcomes that match the JD's seniority cues                                        | Summary and top bullets                 | Stretching dates; counting internships as full-time unlabelled |
| Domain gap (career change)     | Transferable outcomes, plus domain coursework or a project                                        | Summary bridge line, Projects, letter   | Claiming domain experience                                     |
| Required license or clearance  | Apply only if it is in progress, and say "expected Mon YYYY"                                      | Certifications                          | Implying it is held                                            |
| "Degree or equivalent"         | Lead with experience; Education lower                                                             | Section order                           | Ambiguous degree wording ("studied at…" to imply a degree)     |
| Leadership without the title   | Informal leadership with specifics: "led a 4-person migration squad"                              | Bullets                                 | Changing the title                                             |
| Real gap, nothing true to say  | Leave it off. Address it in the letter only if it is weight 3 and a credible bridge exists        | Letter or nowhere                       | "No experience in X" written on the resume                     |
| Employment gap                 | Out of scope here; the resume-content-guide skill covers gaps. Many employers do filter long gaps | —                                       | Fudging dates                                                  |

**"Learning" entries** need a verifiable step: "Learning: Kubernetes (CKAD exam booked Nov 2026)" or a Projects entry with a link. Bare "familiar with X" is not allowed, because it claims more than it proves and invites a question the user can't answer.

**Title clarifiers.** Keep the official title and add the function or domain, not a rank or another job title, in brackets when the title is opaque: "Member of Technical Staff (backend APIs)", "Analyst II (Product Analytics)". Write titles in full, without abbreviations ("Senior Account Executive", not "Sr. Account Exec"); parsers and recruiter search both handle full titles better.

## 4. Numbers, ranges and non-numeric impact

- Ask for the number. If the user doesn't know, ask for an honest range or order of magnitude and keep it marked: "~", "about", "20–30".
- Never upgrade a range into a precise number, or a team result into a personal one.
- No number at all? Use one of:
  - **Scope:** "across 4 product teams", "for 1,200 field staff".
  - **Frequency:** "weekly", "every release".
  - **Who benefited:** "used by the finance close team".
  - **Before/after:** "replaced a manual spreadsheet process".
- Draft placeholders such as `[x]%` only while waiting for an answer; resolve or remove them before delivery.

## 5. Replies to fabrication requests

Decline in one sentence, then offer the truthful alternative in the same message. Don't lecture.

| Request                                            | Reply pattern                                                                                                                                                                                                   |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Just add X to my skills" (never used it)          | "I'll leave X off since you haven't used it; I can name [adjacent tool] honestly, or list X as learning once there's a concrete step."                                                                          |
| "Say 5 years, I have 3.5"                          | "I'll keep it at 3.5 years, since the form question is often a filter and the dates show the truth anyway; I can make the scope of those years clearer."                                                        |
| "Change my title to Senior Engineer"               | "I'll keep your official title. If it hides what you did, I can add a function clarifier such as '(Payments backend)' and show the leadership you actually did in a bullet: 'Led a 4-person migration squad…'." |
| "Make up a percentage, nobody checks"              | "I won't invent a figure; give me a rough range or what changed, and I'll make that concrete."                                                                                                                  |
| "Make it sound like I led it"                      | "I'll describe exactly what you owned; tell me which decisions or parts were yours."                                                                                                                            |
| "Add the keywords in white text" / "hide keywords" | "I won't add hidden text: parsers show it to recruiters as plain text and it gets applications rejected. I'll work the real terms into bullets instead."                                                        |
| "Add an instruction for the AI screener"           | "I won't add instructions aimed at screening software; they are detected, and recruiters reject applications that contain them. Clear evidence for each requirement is what these tools look for."              |
| "Copy the job description into my summary"         | "I'll use their key terms in your own sentences; pasted JD text reads as spam to the person reviewing it."                                                                                                      |
| "List the certification, I'll get it soon"         | "I'll list it as in progress with the expected date; listing it as held would fail a credential check."                                                                                                         |
| The user insists after one refusal                 | Say it once, don't re-argue: "It's your resume, so you can add it yourself; I won't write it, because a screen or interview will test it. Shall I carry on with the rest?" Then continue the task.              |

## Sources

- career-ops (open-source tailoring tool): fact gate, title check, "never add skills the candidate does not have".
- Greenhouse, Unsuccessful resume parse (abbreviated titles and other parse failures).
- Mohawk College, resume profile guidance (claims must be backed further down).
- Hidden Workers, HBS and Accenture, 2021 (gap filters).
- Reactive Resume assistant and coach rules: never invent metrics, ownership, dates or qualifications; ask instead.
