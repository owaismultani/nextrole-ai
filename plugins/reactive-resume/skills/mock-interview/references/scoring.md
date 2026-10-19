# Scoring

Contents:

1. Scales and labels
2. Answer-craft rubric: non-story variant
3. Writing competency anchors
4. Coding rubric
5. System design rubric
6. Case rubric
7. Product sense rubric
8. Problem-solving hint ladder and ceilings
9. Interviewer vote
10. Failure modes and how to spot them
11. Length norms
12. Calibration pair
13. Staying honest and handling pushback

## 1. Scales and labels

All ratings use 1–4 with no midpoint, which reduces the central-tendency error that structured-interview guides warn about. Score each dimension separately to limit the halo effect.

| Score | Competency label | Meaning                                        |
| ----- | ---------------- | ---------------------------------------------- |
| 1     | Not yet shown    | Evidence absent, or contradicts the competency |
| 2     | Partly shown     | Some evidence; important parts missing         |
| 3     | Solid            | Clear evidence at the expected level           |
| 4     | Strong           | Clear evidence above the expected level        |

Not scores: **Not attempted** (skipped), **Not reached** (ended early), **Insufficient evidence** (answered, but nothing to rate), **n/a** (dimension doesn't apply).

Every rating needs a quote from the user. No quote, no rating.

## 2. Answer-craft rubric: non-story variant

The answer-craft rubric, the Result rule (a basis, not precision) and the vote rule live in SKILL.md steps 5 and 6, and that copy is canonical. This file adds only the non-story variant, competency anchors and the technical rubrics.

**Non-story answers** (pitch, motivation, logistics, salary): rate Structure, Specificity, Relevance and Concision; Ownership and Result are n/a.

| Dimension   | 3 looks like                                                                       |
| ----------- | ---------------------------------------------------------------------------------- |
| Structure   | Pitch runs past → present → why this role; motivation answers lead with the reason |
| Specificity | One or two concrete proof points (a result, a scope, a named project)              |
| Relevance   | Ties to the JD's must-haves, not a recital of the whole career                     |
| Concision   | Within the norm in section 11; the first sentence carries the point                |

## 3. Writing competency anchors

Write four behavioural anchors per JD competency before the session, at the target level. Each anchor describes what the user did, not traits.

**Resolving conflict**

1. Avoided or escalated the conflict, or blamed the other party.
2. Resolved it with someone else's help; own role unclear.
3. Sought out the other view, found common ground, reached an outcome.
4. Resolved a high-stakes disagreement, kept the relationship, and changed a process so it wouldn't recur.

**Ownership**

1. Did assigned tasks; handed problems upward.
2. Fixed own part; noticed wider problems but didn't act.
3. Owned an outcome end to end, including unglamorous parts.
4. Owned an outcome beyond their remit, and left a lasting fix or mechanism.

**Data-driven decisions**

1. Decided on opinion; no data mentioned.
2. Used data someone else prepared; little interpretation.
3. Gathered or analysed the data, drew a conclusion, acted on it.
4. Framed the question, chose the measure, acted, and checked the result against a baseline.

**Handling ambiguity**

1. Waited for direction, or went ahead on unchecked assumptions.
2. Asked for clarity; progress depended on others.
3. Defined the goal and "done", checked assumptions with the right people, delivered.
4. Turned an unclear mandate into a plan others adopted, and adjusted as facts arrived.

**Leading people (manager)**

1. Avoided the issue, or acted without talking to the person.
2. Addressed it late or only through formal process.
3. Gave clear, timely feedback and support; reached a fair outcome.
4. As 3, plus changed hiring, onboarding or team design so the problem became rarer.

## 4. Coding rubric

Four dimensions, adapted from a widely used public rubric (Tech Interview Handbook).

| Dimension            | 1                                  | 2                            | 3                                                 | 4                                                                       |
| -------------------- | ---------------------------------- | ---------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------- |
| Communication        | Silent or unclear; doesn't explain | Explains when asked          | Thinks aloud; explains approach before coding     | Clear throughout; checks in with the interviewer at decision points     |
| Problem solving      | No workable approach               | Approach with major hints    | Workable approach, minor hints; states complexity | Optimal or well-justified approach, no major hints; compares trade-offs |
| Technical competency | Code doesn't express the approach  | Many bugs or language misuse | Mostly correct, readable code                     | Clean, idiomatic, correct on traced cases                               |
| Testing              | No testing                         | Tests only the given example | Tests edge cases when prompted                    | Proposes and traces edge cases unprompted; finds own bugs               |

Correctness is reported as "passes traced cases X/Y (traced by hand)".

## 5. System design rubric

| Dimension                     | 3 (Solid) looks like                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| Requirements                  | Top functional requirements and quantified non-functional ones, asked for, not assumed |
| High-level design             | A working end-to-end design that meets the requirements                                |
| Trade-offs                    | Names alternatives and why one was chosen (consistency, cost, latency)                 |
| Deep dives and prioritisation | Spends time on the riskiest parts; handles failure and scale questions                 |
| Communication                 | Structured, keeps the interviewer oriented                                             |

Level shifts the bar: for mid level, a working design with prompted improvements is a 3; for senior, leading the deep dives unprompted is a 3; for staff, also challenging requirements and naming organisational trade-offs.

## 6. Case rubric

| Dimension                         | 3 (Solid) looks like                                                 |
| --------------------------------- | -------------------------------------------------------------------- |
| Structure                         | A tailored, mutually exclusive structure, not a memorised framework  |
| Analysis and maths                | Correct calculations, stated aloud; sanity-checks the result         |
| Business intuition and creativity | Plausible hypotheses; reads exhibits for the "so what"               |
| Synthesis and communication       | A clear recommendation with reasons, risks and next steps in 30–60 s |

## 7. Product sense rubric

| Dimension              | 3 (Solid) looks like                                                  |
| ---------------------- | --------------------------------------------------------------------- |
| User focus             | Picks one segment and justifies it; pain points grounded in that user |
| Business sense         | Links the problem to company goals and strategy                       |
| Solutions and taste    | Several distinct ideas; chooses one with reasons; a coherent MVP      |
| Metrics and trade-offs | One primary metric plus guardrails; names what was cut                |
| Communication          | Structured; manages time to reach the MVP                             |

## 8. Problem-solving hint ladder and ceilings

For coding, system design, case and product rounds. Each rung caps the Problem solving (or equivalent) score for that problem.

| Rung | Hint                                                                     | Ceiling |
| ---- | ------------------------------------------------------------------------ | ------- |
| 0    | Restate a constraint the user missed                                     | 4       |
| 1    | Point at a property ("What do you notice about the input being sorted?") | 4       |
| 2    | Name a technique family ("Could a hash map help?")                       | 3       |
| 3    | Give a concrete step ("Store complements as you scan")                   | 2       |
| 4    | Walk through the approach, then move to a follow-up                      | 1       |

For behavioral rounds, use the three-rung ladder in SKILL.md; hints don't cap scores there, but a hinted competency can't support a Strong Yes.

## 9. Interviewer vote

A four-level vote modelled on Greenhouse's overall recommendation (definitely not / no / yes / strong yes). Greenhouse also offers "no decision"; this skill leaves it out on purpose to force a call (a design choice, not research). The rules, confidence levels, the skipped-must-have case and the mini-loop combination are in SKILL.md step 6. The vote describes this mock's evidence, never the real outcome.

## 10. Failure modes and how to spot them

| Failure             | How to spot it                                       | Feedback line                                         |
| ------------------- | ---------------------------------------------------- | ----------------------------------------------------- |
| Rambling            | Over the length norm, or context above ~40% of words | "Lead with the action. Cut context to two sentences." |
| No result           | Ends on an action                                    | "Close with what changed."                            |
| "We" without "I"    | "We" outnumbers "I" two to one in the action part    | "Name your moves. Credit the team once."              |
| Hypothetical        | "would", "usually", "always"                         | "Pick one real time."                                 |
| Negativity          | Blame language, no self-reflection                   | "Own your part, then say what you changed."           |
| No numbers          | Zero quantities anywhere                             | "Give a rough range, a timeframe or a count."         |
| Too thin            | Under ~90 typed words for a story                    | "Add the how: two or three concrete steps."           |
| Over-rehearsed      | Generic phrasing, same lines across answers          | "Tell it like a story, not a resume line."            |
| Wrong story         | Off-competency                                       | "Map your stories to competencies before the day."    |
| Confidential detail | Client names, internal figures                       | "Anonymise: 'a large US retailer'."                   |

## 11. Length norms

No research sets an ideal answer length; these are practitioner heuristics. Typed proxies assume roughly 130–150 spoken words a minute, then run about 20% shorter than that conversion, because typed answers carry no filler or restarts. When the user gives a time for a spoken answer, judge it against the Spoken column.

| Answer type              | Spoken            | Typed         |
| ------------------------ | ----------------- | ------------- |
| Behavioral story         | 1.5–2 min (3 max) | 150–350 words |
| "Tell me about yourself" | 1–2 min           | 150–250 words |
| Recruiter-screen answers | 30–90 s           | 60–150 words  |
| Case recommendation      | 30–60 s           | 75–150 words  |

For non-story answers, Concision anchors: 1 = more than twice the norm or a one-liner; 2 = noticeably long or thin; 3 = within the norm; 4 = within the norm with the point in the first sentence.

A popular split for STAR answers (about 20% situation, 10% task, 60% action, 10% result, from MIT's career office) is a guide, not a rule.

## 12. Calibration pair

**Question:** "Tell me about a time you delivered under a tight deadline."

**Weak answer:** "We had a big launch, everyone worked really hard and we got it done. Communication was key."
Scores: Structure 2 · Specificity 1 · Ownership 1 · Result 1 · Relevance 2 · Concision 1 (too short).

**Probe:** "What was the launch, and what did you personally do in the final week?"

**Strong answer (every fact supplied by the user in probes):** "Our payments vendor slipped two weeks before the checkout launch. I owned the integration. I split the work into what could ship on the old API, agreed a feature-flagged rollout with the PM, and paired with QA every night. We launched on the date with two of three payment methods and added the third nine days later. Since then I put vendor milestones on our risk register."
Scores: 4 · 4 · 4 · 4 · 3 · 4. Relevance is 3 because it isn't yet tied to the target role.

## 13. Staying honest and handling pushback

Language models are measurably more positive about text when the user says they wrote it, and often change a correct judgement when asked "Are you sure?". In a mock interview the user always wrote the answer, so:

- Write the evidence (quotes) before the score; judges that do this show less bias.
- Compare with the anchors, not with the previous answer or the user's effort.
- If most dimensions are 4, re-check them.
- If the user points to something they did say that you missed, re-read the answer, and correct the score if they're right.
- On pushback without such evidence, keep the score and name what would change it: "On what you said, Result is a 2, because the answer ended at 'we escalated it'. Tell me what happened after the escalation in a retry and I'll score that."
- Facts the user adds after the answer go into a retry, scored against the anchors. They don't change the original score, because a real interviewer only hears what was said. A number, scope or role bigger than the first telling needs a source before it scores or appears in a model answer (SKILL.md, Stay honest item 3).
