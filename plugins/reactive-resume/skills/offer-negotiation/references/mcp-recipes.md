# Reactive Resume MCP recipes for offer negotiation

Contents

1. Before the first call
2. Find the offer-stage applications
3. Read saved offer terms
4. Offer terms waiting in a read employer message
5. Criteria and evidence for the asks
6. Follow-up, deadline tag and stage
7. Log each negotiation step
8. Accepting or declining
9. Hand off to the web app
10. Errors

Placeholders in angle brackets come from earlier reads. Parity tools (`api_*`) build their input schemas from the API at runtime: confirm field names in `tools/list` before the first call in a session.

## 1. Before the first call

- Read before writing. Show the exact text or change, get a yes, write, then report what changed.
- Nothing here needs an AI provider. Never call the AI tools (`draft_application_message`, `score_application_match`, `tailor_resume_for_application`) for negotiation work: they don't cover it, and they send data to the user's provider.
- Never send, accept or decline anything for the user. Records change only after the user says what happened.
- Never delete applications or saved offers from this skill. `delete_application` is permanent; `api_career_delete_saved_item` only on an explicit request.

## 2. Find the offer-stage applications

```
list_applications {status: "offer", limit: 100, offset: 0}   # repeat with offset = nextOffset until it is null
```

No match? List without `status` and match on company and role: a recruiter may have called with an offer before the stage moved. Confirm with the user when more than one record matches. Then:

```
read_application {id: "<id>"}
```

Use `company`, `role`, `location`, `salary` (the posted pay, as text), `contacts` (the recruiter's name), `notes`, `activity` (earlier `Sent:` and `Received:` notes), `followUpAt`, `followUpNote` and `tags`.

## 3. Read saved offer terms

```
api_career_saved_items {applicationId: "<id>", kind: "offer"}   # one application, newest first
api_career_saved_items {kind: "offer"}                          # every saved offer, across applications
```

Each item looks like:

```
{
  id, applicationId, title: "Acme · Written offer", createdAt, outdated,
  application: {company: "Acme", role: "Senior Engineer"},
  data: {
    kind: "offer", version: "written",            # or "verbal"
    currency: "USD", period: "year",              # period: hour | month | year
    base: 185000, variable: 18500,                # null = unknown, never zero
    variableConditions: "10% target, company and individual multipliers",
    equity: "160,000 USD in RSUs over 4 years",   # free text, not a cash value
    location: "Seattle", officeDays: 3,           # 0 = fully remote; null = unknown
    leave: "", learning: null, other: "",
    respondBy: "2026-10-16T17:00:00-07:00"        # or null
  }
}
```

- Several items per application are normal (a verbal offer, then the written one, then revised terms). Use the newest unless the user names another; compare versions only to show what changed.
- The schema has no fields for sign-on, level, notice or covenants. They appear in `other` if at all, so ask the user or read the letter.
- `outdated: true` on an offer only means the application or saved knowledge changed after it was saved; the terms are still as saved. Ask whether newer terms exist. `outdated` is computed only when you pass `applicationId`; in the all-offers listing it's always false.
- `variable` is an amount in the same currency and period; treat it as `conditional` unless `variableConditions` says it's guaranteed.
- Show each offer's decode (SKILL.md step 2). For the side-by-side view, point to Career → Offers instead of rebuilding it.

## 4. Offer terms waiting in a read employer message

If the user pasted the offer into the web app's Messages tab but didn't apply the offer change, the terms sit in a `reply` item:

```
api_career_saved_items {applicationId: "<id>", kind: "reply"}
```

Use a reply item only if `data.applied` is null and `data.changes` has an entry with `type: "offer"`. The proposed terms are in `data.offer`. Show them next to the original message (`data.message`) and ask whether they're right. Applying marks the whole reply as applied: its stage and follow-up proposals can't be applied later, so mention them to the user first. If `data.applied` is already set, the call does nothing; send the user to Messages to read the message again.

Apply the offer change before any other write to this application. Every `update_application`, `add_application_note` or tag change bumps the application's `updatedAt`, and `api_career_apply_reply` then fails with a conflict. If you've already written to the record this session, don't call it; ask the user to read the message again in Messages and apply it there. On a yes, save only the offer change:

```
api_career_apply_reply {id: "<reply item id>", changes: [<index of the offer change>]}
```

- After the call, list `api_career_saved_items {applicationId, kind: "offer"}` and confirm a new item exists before saying the terms were saved.
- It fails with a conflict if the application (including your own writes) or the user's knowledge changed after the message was read; then the user reads the message again in Messages and applies it there.
- If the proposed terms are wrong, don't apply them: the user corrects the pasted text in Messages and reads it again.
- Applying an offer change saves terms for comparison only. It doesn't accept the offer or reply to the employer.

## 5. Criteria and evidence for the asks

```
api_career_profile {}
```

Use `minBase {amount, currency, period}` (compare only when currency and period match the offer; otherwise show both), `maxOfficeDays`, `noticeWeeks`, `locations` and `priorities` for the walk-away check. Read-only here: `api_career_save_profile` replaces the whole profile, so change preferences only on an explicit request, after reading and sending every field.

```
api_career_facts {applicationId: "<id>"}
```

Use only facts with `status: "active"` as scope or level evidence for a reason ("led the migration for 40k subscriptions"). Don't save negotiation numbers (current pay, target, walk-away) as facts.

## 6. Follow-up, deadline tag and stage

**Follow-up.** One `followUpAt` per application, so date it for the next negotiation step (when time allows, at least 2 business days before `respondBy`) and name the deadline in the note:

```
update_application {
  id: "<id>",
  followUpAt: "2026-10-13T09:00:00-07:00",
  followUpNote: "Counter call with Dana, then recap email · offer deadline Fri 16 Oct 17:00"
}
```

Reuse the offset of an existing `followUpAt` or an interview's `timezone`; ask only if neither exists. After the counter is sent, move it to the date the recruiter said they'd reply, plus one business day.

**Deadline tag.** `bulk_update_applications {ids: ["<id>"], addTags: ["deadline"]}` appends without removing other tags. Don't send `tags` through `update_application` unless you include the whole existing list, because it replaces the list.

**Stage.** If the record isn't at `offer` yet:

```
update_application {id: "<id>", status: "offer", stageEnteredAt: "2026-10-09"}
```

Use the date the offer actually arrived. If the record is still at `saved`, the application itself was never recorded; ask job-application-manager's Applied step (or the user) to record what was sent first.

## 7. Log each negotiation step

After the user confirms each step happened, one note per step:

```
add_application_note {id: "<id>", date: "2026-10-09", text: "Received: written offer from Dana Ruiz (recruiter). 185,000 USD base, 10% target bonus, 160,000 USD RSUs over 4 years. Respond by 16 Oct."}
add_application_note {id: "<id>", date: "2026-10-13", text: "Sent: counter to Dana Ruiz, call and email. Asked base 200,000 USD, or 192,000 USD + 30,000 USD sign-on."}
add_application_note {id: "<id>", date: "2026-10-15", text: "Received: revised offer. Base 192,000 USD, sign-on 25,000 USD, refreshers reviewed annually."}
```

- If offer terms are waiting in an unapplied reply item (§4), apply them before writing any note: the note bumps `updatedAt` and blocks the apply.
- `Sent:` and `Received:` prefixes match job-application-manager, so its review can compute "days since the employer last spoke".
- Store the asks and answers as stated, with currency. Keep the target and walk-away point out of notes unless the user asks.
- The tool isn't idempotent: after an error, `read_application` and check `activity` before retrying.
- Revised terms in writing: the user saves them as a new offer version through Messages (§9), so Career → Offers can compare versions.

## 8. Accepting or declining

Only after the user confirms they sent the acceptance or decline.

- **Accepted:** hand to job-application-manager's accept cascade (close this record as `accepted`, others as `accepted-other`, draft withdrawals, cancel pending interviews). Light version with a yes: `update_application {id, status: "closed", closedReason: "accepted", stageEnteredAt: "<acceptance date>"}`, then list the other open records and propose closing each.
- **Declined:** `update_application {id, status: "closed", closedReason: "withdrew", stageEnteredAt}` (or `accepted-other` when the user took another offer), plus a `Sent:` note.
- **Rescinded by the employer:** `closed` with `not-selected`, and `bulk_update_applications {ids: [id], addTags: ["rescinded"]}`.

## 9. Hand off to the web app

Applications → the application → **Open workspace**:

- **Messages:** paste the offer, **Read it for me**, check the proposed terms against the letter, apply the offer change. This saves a new offer version and uses the user's AI provider.
- **Saved:** earlier offer versions; offer items open in Career → Offers.

**Career → Offers:** two saved offers side by side in their own currencies and pay periods, the user's requirements from Preferences, "Not in either offer yet" questions with **Copy questions**, and **Plan what to ask**, which opens the coach with both offers as context.

## 10. Errors

| Error                             | Meaning and action                                                                                                                                        |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NOT_FOUND`                       | Stale or wrong ID: list again and match by company and role                                                                                               |
| 409 / conflict                    | Changed since you read it: read again and recompute; for `api_career_apply_reply` (often caused by your own earlier write), the user re-reads in Messages |
| `BAD_REQUEST` on apply_reply      | An invalid change index, or a stage change on a `saved` record; apply only the offer index                                                                |
| 429                               | Rate limited: wait, then batch fewer calls                                                                                                                |
| Input rejected on an `api_*` call | Check the field names in `tools/list`                                                                                                                     |
