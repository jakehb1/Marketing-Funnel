# ENNIE Patient Funnel Automation Playbook

**Version:** 1.0 | **Status:** Ready for Production | **Last Updated:** 2026-04-01

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Funnel Architecture](#funnel-architecture)
3. [Stage Breakdown & Automation](#stage-breakdown--automation)
4. [Agent Responsibilities Matrix](#agent-responsibilities-matrix)
5. [Trigger Points & Decision Trees](#trigger-points--decision-trees)
6. [Success Metrics & KPIs](#success-metrics--kpis)
7. [Escalation Rules](#escalation-rules)
8. [Optimization Loops](#optimization-loops)
9. [Risk Mitigation](#risk-mitigation)
10. [Testing Plan (Week 1-4)](#testing-plan-week-1-4)
11. [Go-Live Checklist](#go-live-checklist)

---

## Executive Summary

The ENNIE Patient funnel automates the entire journey from awareness to retention for chronic pain patients seeking energy healing. This system operates with **minimal human intervention** through:

- **4 autonomous agents** handling distinct funnel stages
- **Real-time triggers** based on user behavior and PostHog events
- **Orchestration layer** managing agent handoffs and state
- **Escalation protocols** for edge cases and high-value patients
- **Feedback loops** enabling continuous optimization

**Key Principles:**
- Autonomous by default, human-controlled by exception
- Data-driven decision trees at every stage
- Fail-safe escalation to prevent patient loss
- Privacy-first (full GDPR/CCPA compliance)
- Measurable impact on conversion and retention

---

## Funnel Architecture

### The 7-Stage Patient Journey

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. AWARENESS                                                    │
│ (Google Ads, Meta Ads, Organic Discovery, Content)             │
│ Target: Chronic pain sufferers searching for healing solutions   │
└──────────────────┬──────────────────────────────────────────────┘
                   │ (Lead captured, email + app events)
┌──────────────────▼──────────────────────────────────────────────┐
│ 2. NURTURE                                                      │
│ (Email sequences, Retargeting, Engagement scoring)             │
│ Goal: Move warm lead to high-intent prospect                    │
└──────────────────┬──────────────────────────────────────────────┘
                   │ (Engagement threshold met)
┌──────────────────▼──────────────────────────────────────────────┐
│ 3. EARLY ACCESS / ONBOARDING                                   │
│ (Intake form, Preference matching, Healer discovery)           │
│ Goal: Patient completes profile & sees matched healers          │
└──────────────────┬──────────────────────────────────────────────┘
                   │ (Healer matched, invite ready)
┌──────────────────▼──────────────────────────────────────────────┐
│ 4. SESSION MATCHING & BOOKING                                  │
│ (Session invitation, calendar sync, confirmation)              │
│ Goal: Book first healing session with healer                    │
└──────────────────┬──────────────────────────────────────────────┘
                   │ (Session scheduled)
┌──────────────────▼──────────────────────────────────────────────┐
│ 5. FIRST SESSION EXECUTION                                     │
│ (Session reminders, pre-session support, outcome capture)       │
│ Goal: Successful completion, capture outcomes & feedback        │
└──────────────────┬──────────────────────────────────────────────┘
                   │ (Session completed)
┌──────────────────▼──────────────────────────────────────────────┐
│ 6. POST-SESSION CARE                                            │
│ (Outcome scoring, satisfaction survey, next-step recommendations) │
│ Goal: Measure impact, drive repeat sessions or referrals        │
└──────────────────┬──────────────────────────────────────────────┘
                   │ (Engaged or disengaged)
┌──────────────────▼──────────────────────────────────────────────┐
│ 7. RETENTION & GROWTH                                           │
│ (Win-back campaigns, upsell, loyalty rewards, referral engine)  │
│ Goal: Lifetime value maximization, organic growth               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Stage Breakdown & Automation

### Stage 1: AWARENESS (Patient-Awareness-Agent)

**Duration:** Continuous  
**Agent Owner:** Patient-Awareness-Agent

#### Objectives
- Reach chronic pain patients actively searching for solutions
- Capture high-intent leads into CRM
- Build ENNIE brand awareness in wellness space

#### Automation Triggers
| Trigger | Source | Action |
|---------|--------|--------|
| Keyword match (high intent) | Google Ads API | Auto-adjust bid, track conversion |
| Demo video view >60% | PostHog | Retarget with next-level ad creative |
| Landing page visit | App event | Add to Loops audience, send onboarding email |
| Traffic source = organic | PostHog | Tag as "organic" for attribution |
| Device/location = target region | Ad platform | Geo-target optimization |

#### Decision Tree
```
Patient searches for "chronic pain relief" or similar
├─ Match: Ad shown → Click → Landing page load
│  ├─ Email provided → Move to Stage 2 (Nurture)
│  ├─ Email NOT provided → Show exit offer ("Get free guide")
│  └─ Re-engagement fails → Retarget for 14 days
├─ Non-match → Continue audience building
└─ Competitor keywords → Smart bidding adjustment
```

#### Workflow
1. **Ingest:** PostHog events (page views, clicks, form submissions)
2. **Reason:** Evaluate user intent, source quality, ad performance
3. **Execute:** 
   - Adjust Google Ads bids based on conversion signals
   - Update Meta lookalike audiences
   - Segment users by intent level
4. **Log:** Track cost per lead, lead quality score, attribution
5. **Escalate:** If ROAS < 1.5, flag for creative refresh

#### Success Criteria
- Cost per lead (CPL) < $12
- Lead quality score > 65/100
- Landing page conversion rate > 8%
- Return on ad spend (ROAS) > 2.0

#### Data Inputs
- Google Ads performance metrics
- Meta Ads conversion tracking
- PostHog behavioral events
- Landing page analytics

#### Data Outputs
- Qualified lead (email, pain level, location, source)
- Lead quality score (0-100)
- Attribution tag
- Segment assignment

---

### Stage 2: NURTURE (Patient-Nurture-Agent)

**Duration:** 14-30 days  
**Agent Owner:** Patient-Nurture-Agent

#### Objectives
- Build trust and education around ENNIE's healing platform
- Move warm leads to high-intent (ready to book)
- Score engagement and identify churners early

#### Automation Triggers
| Trigger | Source | Action |
|---------|--------|--------|
| Email opened | Loops | Next email sends immediately |
| Email not opened >2x | Loops | Switch to educational variant |
| Landing page revisit | PostHog | Increase email frequency, personalize |
| Retargeting impression | Meta | Boost engagement scoring |
| Low engagement (no opens) | Loops | Pause sequence, move to win-back |
| 30 days no action | Loops | Mark as "cold lead," archive |

#### Decision Tree
```
Lead enters nurture sequence
├─ Email 1: Welcome + education (Day 0)
│  ├─ Opened → Continue sequence (Email 2 on Day 3)
│  ├─ Not opened → Resend variant (Day 1)
│  └─ Still no open → Retarget, pause sequence (Day 7)
├─ Email 2: Healer stories + proof (Day 3)
│  ├─ Clicked link → High intent signal, accelerate to Stage 3
│  ├─ Opened only → Continue, wait for Day 5
│  └─ Not opened → Switch to video variant
├─ Email 3: Limited-time offer or social proof (Day 7)
│  ├─ High engagement → Move to Early Access immediately
│  ├─ Medium engagement → Continue nurture
│  └─ Low engagement → Win-back campaign (offer: free consultation)
└─ Decision point (Day 14)
   ├─ Engagement score > 70 → Move to Stage 3
   ├─ Engagement score 40-70 → Extend nurture cycle (10 more days)
   └─ Engagement score < 40 → Mark as "cold," archive
```

#### Workflow
1. **Ingest:** Email opens/clicks, retargeting impressions, PostHog session events
2. **Reason:** Calculate engagement score, determine next email variant, identify churn risk
3. **Execute:**
   - Send personalized email based on pain level + healer specialty
   - Update engagement score in Loops
   - Trigger retargeting ads to non-engagers
   - Tag high-intent leads for early access
4. **Log:** Email metrics (open rate, CTR), engagement score, sequence progress
5. **Escalate:** If patient replies with question → Escalate to human support

#### Success Criteria
- Email open rate > 35%
- Email click rate > 8%
- Nurture-to-Early Access conversion > 20%
- Days in stage average < 21 days

#### Data Inputs
- Loops email engagement (opens, clicks, bounces)
- PostHog behavioral events (return visits, form interactions)
- Lead attributes (pain type, location, signup source)
- Engagement score history

#### Data Outputs
- Updated engagement score
- Sequence variant selected
- High-intent flag
- Churn risk assessment
- Next action date

---

### Stage 3: EARLY ACCESS / ONBOARDING (Patient-Matching-Agent)

**Duration:** 3-7 days  
**Agent Owner:** Patient-Matching-Agent

#### Objectives
- Collect complete patient profile (pain type, preferences, location)
- Match patient with compatible healers
- Build confidence before first session

#### Automation Triggers
| Trigger | Source | Action |
|---------|--------|--------|
| Lead moves to Stage 3 | Orchestration | Send onboarding/intake form |
| Intake form 75% complete | App event | Send encouragement, offer support |
| Intake form submitted | App event | Trigger healer matching algorithm |
| Healer match found | Matching algorithm | Send patient healer card + intro |
| Patient views healer profile | PostHog | Log interaction, measure interest |
| No healer match available | Matching algorithm | Escalate or offer waitlist option |
| 7 days in stage, no completion | Orchestration | Send reminder, offer 1-on-1 support |

#### Decision Tree
```
Patient enters Early Access (form prompt sent)
├─ Form started
│  ├─ >75% complete → Encourage completion
│  ├─ Abandoned → Remind after 24h, offer support
│  └─ Completed → Move to matching
└─ Form not started (48h timeout)
   ├─ Retarget → "Let us help you get matched"
   ├─ Still no action (7 days) → Escalate to human
   └─ Explicit opt-out → Move to archive

Matching Phase
├─ Pain profile + preferences matched
│  ├─ Best match found (score > 75) → Send healer card
│  ├─ Multiple matches (score 60-75) → Show top 3, let patient choose
│  └─ No match available (score < 60) → Offer waitlist + estimated time
└─ Healer availability check
   ├─ Healer available this week → Fast-track to booking
   ├─ Healer available, >7 days → Send alternative matches
   └─ No availability → Offer backup healer or waitlist

Patient Views Healer Card
├─ Clicks "Book Session" → Move to Stage 4
├─ Views but doesn't click → Measure interest, A/B test messaging
├─ Passes on match → Show alternative or escalate
└─ No action (3 days) → Remind, offer different healer
```

#### Workflow
1. **Ingest:** Intake form submissions, healer availability data, patient preferences
2. **Reason:** Run matching algorithm (pain type, healer specialty, location, availability, rating)
3. **Execute:**
   - Guide patient through intake form with smart defaults
   - Match patient with top 3 healer candidates
   - Send personalized healer introduction email
   - Track match quality score
4. **Log:** Form completion rate, match quality, patient interest signals
5. **Escalate:** If no match found or patient needs special accommodation → Human concierge

#### Success Criteria
- Form completion rate > 80%
- Matching algorithm success rate > 95% (finds at least 1 match)
- Average match quality score > 72/100
- Time to match < 2 hours
- Patient views healer within 48h of match > 85%

#### Data Inputs
- Intake form responses (pain type, location, preferences, schedule)
- Healer profile database (specialty, rating, availability, location)
- Historical match success data
- Patient engagement signals

#### Data Outputs
- Complete patient profile
- Match score + top 3 healer matches
- Personalized healer introduction message
- Next session booking window

---

### Stage 4: SESSION MATCHING & BOOKING (Patient-Matching-Agent)

**Duration:** 1-7 days  
**Agent Owner:** Patient-Matching-Agent

#### Objectives
- Convert matched patient to actual booking
- Coordinate healer-patient calendar sync
- Confirm session details and build confidence

#### Automation Triggers
| Trigger | Source | Action |
|---------|--------|--------|
| Healer selected | App event | Check availability, send booking options |
| Patient books session | App event | Confirm with both parties, send reminders |
| Payment received | Stripe event | Lock session, send pre-session guide |
| 48h before session | Scheduler | Send patient reminder + pre-session tips |
| 24h before session | Scheduler | Send healer reminder + patient notes |
| No payment after 7 days | App event | Send reminder, offer alternative time |
| Healer cancels session | App event | Auto-match alternative, notify patient |

#### Decision Tree
```
Patient clicks "Book with [Healer]" 
├─ Healer availability shown
│  ├─ 3+ time slots available → Patient chooses → Payment requested
│  ├─ 1-2 time slots → Reserve tentatively, request payment
│  └─ No availability → Offer alternative healer or waitlist
│
├─ Payment processing
│  ├─ Success → Lock session, send confirmations
│  ├─ Declined → Show error, offer alternative payment method
│  └─ Pending → Remind after 24h, send help link
│
└─ Session locked
   ├─ Confirmation sent (both parties) → 48h pre-session
   ├─ Healer confirms → Send patient pre-session guidance
   └─ Healer doesn't confirm (24h timeout) → Auto-escalate to admin

Pre-Session
├─ 48h before → Patient reminder + pre-session tips
├─ 24h before → Healer reminder + patient intake notes
├─ 2h before → Final confirmation SMS
└─ All confirmed → Ready for Stage 5
```

#### Workflow
1. **Ingest:** Healer availability, patient booking request, payment events
2. **Reason:** Match patient with healer slot, determine timezone, calculate session timing
3. **Execute:**
   - Show patient available time slots (considering timezone)
   - Process payment securely via Stripe
   - Lock session with both healer + patient
   - Send calendar invites + Zoom/call link
   - Generate pre-session briefing for both parties
4. **Log:** Booking time-to-conversion, payment success rate, session confirmation rate
5. **Escalate:** If payment fails 2x or healer unresponsive → Human support

#### Success Criteria
- Session booking completion rate > 75%
- Payment success rate > 98%
- Time from match to booking < 24h (average)
- Both parties confirm session > 90%
- Session show-up rate > 92%

#### Data Inputs
- Healer availability calendar
- Patient booking preferences
- Payment information
- Timezone/location data

#### Data Outputs
- Confirmed session booking
- Payment transaction ID
- Healer + patient confirmations
- Session details + call link
- Pre-session guides

---

### Stage 5: FIRST SESSION EXECUTION (Patient-Retention-Agent)

**Duration:** Session day + immediate post  
**Agent Owner:** Patient-Retention-Agent

#### Objectives
- Ensure successful session execution
- Capture real-time outcome data
- Prevent no-shows and session cancellations

#### Automation Triggers
| Trigger | Source | Action |
|---------|--------|--------|
| 2h before session | Scheduler | Send patient final reminder |
| Session started | App event | Disable cancellation option |
| Session ended | App event | Immediately request outcome feedback |
| Pain level response received | Outcome form | Score session effectiveness |
| Patient no-show | Scheduler | Notify healer, offer reschedule |
| Technical issue detected | App telemetry | Alert support team immediately |

#### Decision Tree
```
Session scheduled for T
├─ T-2h: Send reminder + tips
├─ T-15min: Final confirmation
├─ T+0min: Session begins
│  ├─ Both parties present → Session proceeds
│  ├─ Patient late (>5min) → Send gentle reminder message
│  ├─ Patient no-show → Mark event, trigger reschedule offer
│  └─ Technical issue → Offer support, reschedule option
│
└─ T+end: Session completed
   ├─ Request outcome within 5 minutes
   │  ├─ Pain level pre/post captured → Score effectiveness
   │  ├─ Satisfaction score received → Categorize as success/partial/failed
   │  └─ Notes submitted → Extract sentiment, key takeaways
   │
   └─ Outcome scoring
      ├─ "Success" (pain reduced ≥20%) → Stage 6 (retention focus)
      ├─ "Partial" (pain reduced 5-20%) → Stage 6 (nurture repeat)
      └─ "No change" (pain reduced <5%) → Offer alternative healer or refund option
```

#### Workflow
1. **Ingest:** Session scheduled events, reminders, attendance data, outcome forms
2. **Reason:** Monitor session health, assess outcome effectiveness, score satisfaction
3. **Execute:**
   - Send pre-session reminders with location/call link
   - Capture pain level before and after session
   - Measure satisfaction (NPS, satisfaction score)
   - Record healer notes (if applicable)
   - Assess session effectiveness score
4. **Log:** Show-up rate, pain reduction, satisfaction, completion rate
5. **Escalate:** If no-show or patient in pain → Offer support/alternative

#### Success Criteria
- Session show-up rate > 92%
- Session completion rate > 95%
- Average pain reduction > 15%
- Satisfaction score (NPS) > 45
- Post-session feedback collection rate > 80%

#### Data Inputs
- Session schedule + attendee data
- Pre/post session pain levels
- Satisfaction survey responses
- Healer notes/feedback
- Session duration + technical metrics

#### Data Outputs
- Session outcome (success/partial/failed)
- Pain reduction score
- Satisfaction NPS
- Effectiveness rating
- Recommendation for next session

---

### Stage 6: POST-SESSION CARE (Patient-Retention-Agent)

**Duration:** 1-7 days  
**Agent Owner:** Patient-Retention-Agent

#### Objectives
- Maximize satisfaction and trust post-session
- Drive repeat bookings for successful outcomes
- Identify and support struggling patients
- Gather testimonials and referral momentum

#### Automation Triggers
| Trigger | Source | Action |
|---------|--------|--------|
| Pain reduction > 20% | Outcome data | Send celebration + upsell next session |
| Pain reduction 5-20% | Outcome data | Send encouragement + "try again" offer |
| Pain reduction < 5% | Outcome data | Offer alternative healer or full refund |
| Satisfaction score > 8/10 | Survey | Request testimonial/review |
| Satisfaction score 6-7/10 | Survey | Send "how can we improve" message |
| 3 days post-session | Scheduler | Check-in: "How are you feeling?" |
| Patient replies positively | Message | Suggest next session booking |
| Patient reports pain return | Message | Offer booster session or healer switch |

#### Decision Tree
```
Session completed, outcomes captured
├─ Outcome analysis
│  ├─ Great results (pain ↓ >20%, satisfaction >8)
│  │  ├─ Day 0: Send celebration email + success story
│  │  ├─ Day 2: Request testimonial/review
│  │  ├─ Day 5: Suggest next session (frequency based on improvement)
│  │  └─ Escalate to referral program → "Tell a friend" bonus
│  │
│  ├─ Good results (pain ↓ 5-20%, satisfaction 6-8)
│  │  ├─ Day 0: Send "great start" message + reassurance
│  │  ├─ Day 1: Educational content on cumulative healing
│  │  ├─ Day 3: Send pre-filled booking for next session
│  │  └─ Focus: Build momentum toward 2nd session
│  │
│  └─ Minimal results (pain ↓ <5%, satisfaction <6)
│     ├─ Day 0: Send support message + diagnosis offer
│     ├─ Day 1: Offer alternative healer (different specialty)
│     ├─ Day 2: Offer full refund (no questions asked)
│     └─ Human escalation: Call/message to understand disconnect
│
└─ Follow-up sequence
   ├─ Day 3: "How are you feeling?" check-in
   ├─ Day 7: Symptom check-in (pain level today vs. session day)
   ├─ Day 10: Next session prompt (auto-filled with previous healer or alternative)
   └─ Day 14: Special offer (10% off 3-pack or loyalty reward)
```

#### Workflow
1. **Ingest:** Session outcome data, post-session feedback, patient check-ins
2. **Reason:** Evaluate session success, determine next actions, identify churn risk
3. **Execute:**
   - Send outcome-appropriate follow-up message
   - Trigger testimonial request if highly satisfied
   - Generate next session recommendation
   - Offer healer switch or alternative specialist if needed
   - Update patient lifetime value score
4. **Log:** Follow-up completion rate, repeat booking rate, NPS, testimonial collection
5. **Escalate:** If patient requests refund or reports adverse effects → Human approval required

#### Success Criteria
- Day 3 check-in response rate > 60%
- Repeat booking rate (within 14 days) > 35%
- Testimonial collection rate > 40% of satisfied customers
- NPS (Net Promoter Score) > 45
- Refund request rate < 5%

#### Data Inputs
- Session outcome metrics
- Post-session satisfaction data
- Patient check-in responses
- Pain level trajectory
- Healer performance ratings

#### Data Outputs
- Follow-up action assigned
- Next session recommendation
- Repeat booking trigger
- Testimonial/review request
- Churn risk flag

---

### Stage 7: RETENTION & GROWTH (Patient-Retention-Agent)

**Duration:** 14 days - lifetime  
**Agent Owner:** Patient-Retention-Agent

#### Objectives
- Maximize lifetime value through repeat sessions
- Grow organic referrals ("network effect")
- Build loyalty program engagement
- Prevent churn in long-term inactive patients

#### Automation Triggers
| Trigger | Source | Action |
|---------|--------|--------|
| Repeat booking made | App event | Welcome back, apply loyalty discount |
| 30 days since last session | Scheduler | "Miss you" re-engagement campaign |
| Referral link clicked | Loops/PostHog | Track source, prepare referral reward |
| Referral booking made | App event | Award bonus to referrer + referee |
| Patient inactive 60+ days | Scheduler | Special win-back offer (20% off) |
| Patient inactive 90+ days | Scheduler | "We want you back" VIP offer |
| 3+ sessions completed | Orchestration | Invite to loyalty program tier |
| Testimonial shared | Manual/API | Feature in case study, award bonus |

#### Decision Tree
```
Patient post-Stage 5 (first session done)
├─ Repeat booking made within 14 days
│  ├─ Session 2 completed → Success repeat rate metric
│  ├─ Reward: Loyalty points + discount on next
│  ├─ Track: Frequency and healer loyalty
│  └─ Trigger: Multi-session package offer after 3 sessions
│
├─ No repeat booking (30 days)
│  ├─ Automated: "Miss you" email + incentive
│  ├─ Trigger: Offer 10% off next session
│  ├─ Engagement: Re-nurture with healer stories
│  └─ If still inactive (60 days): Escalate offer to 20% off
│
├─ Referral activity detected
│  ├─ Patient shares referral link → Unique tracking enabled
│  ├─ Friend signs up → Referrer awarded (e.g., $20 credit)
│  ├─ Friend books session → Referrer awarded (e.g., free session)
│  └─ Network growth metric tracked
│
└─ Long-term retention (60+ days inactive)
   ├─ 60 days: "Come back, get 20% off" email + SMS
   ├─ 75 days: VIP re-engagement ("We miss you specifically")
   ├─ 90 days: Final win-back offer + escalation
   └─ 120 days: Archive or move to "cold" segment for annual reactivation
```

#### Workflow
1. **Ingest:** Repeat booking events, referral tracking, loyalty engagement, inactivity signals
2. **Reason:** Calculate lifetime value, churn risk, referral potential, next-best action
3. **Execute:**
   - Automate "welcome back" messages for repeat bookers
   - Trigger loyalty tier upgrades (bronze → silver → gold)
   - Send referral invitations with unique tracking links
   - Deploy win-back campaigns at 30, 60, 90-day inactivity milestones
   - Feature testimonials in marketing materials
4. **Log:** Repeat booking rate, customer lifetime value, referral rate, churn rate, NPS over time
5. **Escalate:** If customer provides negative feedback → Human follow-up required

#### Success Criteria
- Repeat booking rate (% of patients who book 2nd session) > 40%
- 3+ session rate (% who book 3+ sessions) > 25%
- Average lifetime value > $180 (3 sessions @ $60 each)
- Referral conversion rate > 20% (friends who book after referral)
- 90-day retention rate > 35%
- Annual reactivation rate > 15% (win-backs)

#### Data Inputs
- Repeat booking history
- Loyalty program engagement
- Referral tracking data
- Inactivity period metrics
- Lifetime value calculations
- NPS/satisfaction trends

#### Data Outputs
- Loyalty tier assignment
- Repeat booking recommendation
- Referral credit awarded
- Win-back campaign trigger
- Churn risk score
- Lifetime value updated

---

## Agent Responsibilities Matrix

| Agent | Stage(s) | Primary Responsibility | Data Sources | External APIs | Decision Authority |
|-------|----------|------------------------|---------------|----------------|-------------------|
| **Patient-Awareness-Agent** | 1 (Awareness) | Lead generation, ad optimization, lead scoring | Google Ads, Meta Ads, PostHog, Landing page | Google Ads API, Meta Marketing API, Loops | Bid adjustments, audience segmentation, creative testing |
| **Patient-Nurture-Agent** | 2 (Nurture) | Email engagement, lead qualification, nurture flow | Loops, PostHog, Lead attributes | Loops API, PostHog API, Retargeting pixels | Email variant selection, engagement scoring, sequence flow |
| **Patient-Matching-Agent** | 3-4 (Early Access → Booking) | Patient matching, intake, healer matching, calendar sync | App intake form, Healer database, Calendar API | Matching algorithm, Stripe API, Calendar API (Calendly/Google) | Match scoring, session confirmation, payment processing |
| **Patient-Retention-Agent** | 5-7 (Execution → Growth) | Session management, outcome tracking, repeat booking, loyalty | Session data, PostHog, Outcome forms, Referral tracking | Stripe, PostHog API, Email/SMS APIs | Session effectiveness scoring, repeat booking prompts, refund decisions (escalated) |
| **Orchestration** | All | Agent coordination, trigger firing, state management, escalation routing | All agent outputs, state database | Internal routing, state management | When to escalate, which agent handles edge cases |

---

## Trigger Points & Decision Trees

### Central Trigger Framework

**Rule Engine Logic:**

```
WHEN [event] is received
  IF [condition_1] AND [condition_2]
    THEN [action] → [agent] with [data]
  ELSE IF [condition_3]
    THEN [action] → escalate to [human]
  ELSE
    THEN [log] and [wait] for next trigger
```

### Trigger Catalog

#### High-Priority Triggers (Immediate Execution)
- **Session no-show detected** → Alert healer + offer immediate reschedule
- **Patient reports adverse effects** → Escalate to medical oversight (human review required)
- **Payment failed (session day)** → Offer alternative payment, prevent session cancellation
- **Healer cancels <24h before session** → Auto-trigger alternative matching, notify patient immediately
- **Negative feedback (satisfaction <4/10)** → Human follow-up required

#### Medium-Priority Triggers (Within 2 hours)
- **Lead completes intake form** → Run matching algorithm, send healer cards
- **Healer accepted/declined session** → Update patient, send confirmation or alternative
- **Patient hasn't opened nurture email (48h)** → Send variant, adjust messaging

#### Low-Priority Triggers (Batch, Daily)
- **30-day inactivity** → Send win-back campaign
- **3rd session completed** → Invite to loyalty program
- **Referral tracking update** → Award loyalty points
- **Weekly reporting** → Send KPI dashboard to Jake

### Decision Tree Examples

#### Example 1: Nurture Email Decision Tree
```
Email sent from Loops
├─ Opened within 24h
│  ├─ Clicked link → High engagement, send next email in 2 days
│  └─ Opened only → Medium engagement, send next email in 4 days
├─ Opened after 24h (48-72h)
│  └─ Low engagement, send variant email in 2 days
├─ Not opened after 48h
│  └─ Very low engagement, pause sequence, trigger retargeting
└─ Bounced → Remove from sequence, mark as invalid email
```

#### Example 2: Session Matching Decision Tree
```
Patient submits intake form
├─ Pain type identified
│  ├─ Chronic pain + specific modality preference
│  │  └─ Run matching algorithm with filters
│  │     ├─ Match found (score >75) → Show 1 top healer
│  │     ├─ Multiple matches (score 60-75) → Show top 3
│  │     └─ Weak matches (score <60) → Offer waitlist + alternatives
│  └─ Chronic pain + no preference
│     └─ Show top 5 healers by rating + specialization match
│
├─ Location extracted
│  ├─ Same city as healer available → Fast-track (priority)
│  ├─ Same region but different city → Show healer with telehealth option
│  └─ International → Offer telehealth specialists only
│
└─ Schedule preference extracted
   ├─ Flexible → Show available healers this week
   ├─ Specific times → Filter healers by availability
   └─ Weekend only → Filter healers with weekend slots
```

#### Example 3: Post-Session Outcome Decision Tree
```
Session ends, outcome form submitted
├─ Pain level pre/post captured
│  ├─ Pain reduced >20%
│  │  ├─ Satisfaction >8/10 → "Success" path
│  │  │  └─ Send celebration, request testimonial, offer next session
│  │  └─ Satisfaction <8/10 → "Good but not great" path
│  │     └─ Send encouragement, ask for feedback, offer repeat
│  │
│  ├─ Pain reduced 5-20%
│  │  └─ "Partial success" path
│  │     ├─ Send "building momentum" message
│  │     ├─ Suggest 2nd session with same healer
│  │     └─ Offer alternative healer if patient wants
│  │
│  └─ Pain reduced <5%
│     └─ "Limited success" path
│        ├─ Offer full refund (no questions)
│        ├─ Suggest alternative healer specialty
│        └─ Human follow-up to understand disconnect
│
└─ No pain data provided
   └─ Escalate → Human follow-up to capture outcome
```

---

## Success Metrics & KPIs

### Stage-Level KPIs

#### Stage 1: Awareness
| KPI | Target | Frequency | Owner |
|-----|--------|-----------|-------|
| Cost per lead (CPL) | < $12 | Daily | Awareness Agent |
| Landing page conversion rate | > 8% | Daily | Awareness Agent |
| Lead quality score | > 65/100 | Daily | Awareness Agent |
| Return on ad spend (ROAS) | > 2.0 | Daily | Awareness Agent |
| Impressions per day | 10,000+ | Daily | Awareness Agent |
| Click-through rate (CTR) | > 3% | Daily | Awareness Agent |

#### Stage 2: Nurture
| KPI | Target | Frequency | Owner |
|-----|--------|-----------|-------|
| Email open rate | > 35% | Daily | Nurture Agent |
| Email click rate | > 8% | Daily | Nurture Agent |
| Nurture-to-Early Access conversion | > 20% | Daily | Nurture Agent |
| Days in nurture (average) | < 21 days | Daily | Nurture Agent |
| Churn rate (no engagement) | < 5% | Daily | Nurture Agent |
| A/B test winner lift | > 15% | Weekly | Nurture Agent |

#### Stage 3: Early Access
| KPI | Target | Frequency | Owner |
|-----|--------|-----------|-------|
| Intake form completion rate | > 80% | Daily | Matching Agent |
| Time to match (average) | < 2 hours | Daily | Matching Agent |
| Healer match found rate | > 95% | Daily | Matching Agent |
| Match quality score | > 72/100 | Daily | Matching Agent |
| Patient views healer within 48h | > 85% | Daily | Matching Agent |
| Escalation rate (human intervention) | < 3% | Daily | Matching Agent |

#### Stage 4: Booking
| KPI | Target | Frequency | Owner |
|-----|--------|-----------|-------|
| Booking completion rate | > 75% | Daily | Matching Agent |
| Payment success rate | > 98% | Daily | Matching Agent |
| Time from match to booking | < 24h (avg) | Daily | Matching Agent |
| Both parties confirm session | > 90% | Daily | Matching Agent |
| Session show-up rate | > 92% | Daily | Matching Agent |
| Cancellation rate | < 8% | Daily | Matching Agent |

#### Stage 5: First Session
| KPI | Target | Frequency | Owner |
|-----|--------|-----------|-------|
| Session show-up rate | > 92% | Daily | Retention Agent |
| Session completion rate | > 95% | Daily | Retention Agent |
| Average pain reduction | > 15% | Daily | Retention Agent |
| Satisfaction NPS | > 45 | Daily | Retention Agent |
| Post-session feedback rate | > 80% | Daily | Retention Agent |
| Technical issue rate | < 2% | Daily | Retention Agent |

#### Stage 6: Post-Session Care
| KPI | Target | Frequency | Owner |
|-----|--------|-----------|-------|
| Day-3 check-in response rate | > 60% | Daily | Retention Agent |
| Repeat booking rate (within 14d) | > 35% | Daily | Retention Agent |
| Testimonial collection rate | > 40% | Daily | Retention Agent |
| NPS improvement (Day 0 → Day 7) | > +5 points | Weekly | Retention Agent |
| Refund request rate | < 5% | Daily | Retention Agent |

#### Stage 7: Retention & Growth
| KPI | Target | Frequency | Owner |
|-----|--------|-----------|-------|
| Repeat booking rate (2+ sessions) | > 40% | Weekly | Retention Agent |
| 3+ session rate | > 25% | Weekly | Retention Agent |
| Lifetime value (average) | > $180 | Weekly | Retention Agent |
| Referral conversion rate | > 20% | Weekly | Retention Agent |
| 90-day retention rate | > 35% | Weekly | Retention Agent |
| Annual reactivation rate | > 15% | Monthly | Retention Agent |

### Funnel-Wide KPIs

| KPI | Target | Frequency | Owner | Formula |
|-----|--------|-----------|-------|---------|
| End-to-end conversion rate (Awareness → 1st Session) | > 2.5% | Weekly | Orchestration | (Bookings / Leads) × 100 |
| Cost per acquisition (CPA) | < $48 | Weekly | Orchestration | Total Marketing Spend / Bookings |
| Customer acquisition cost (CAC) | < $50 | Weekly | Orchestration | (All costs) / New customers |
| Revenue per customer (avg) | > $180 | Weekly | Orchestration | Total revenue / Customer count |
| Payback period | < 60 days | Monthly | Orchestration | CAC / (ARPU / 30) |
| Lifetime value (LTV) | > $600 | Monthly | Orchestration | (ARPU × Repeat rate × Avg lifespan) |
| LTV:CAC ratio | > 12:1 | Monthly | Orchestration | LTV / CAC |
| Churn rate (monthly) | < 8% | Monthly | Orchestration | (Churned customers) / (Start customers) |
| Net promoter score (NPS) | > 45 | Monthly | Orchestration | % Promoters − % Detractors |
| Return on marketing investment (ROMI) | > 3.0x | Monthly | Orchestration | Revenue attributed / Marketing spend |

### Data Quality & System Health KPIs

| KPI | Target | Frequency | Owner |
|-----|--------|-----------|-------|
| Data pipeline uptime | > 99.5% | Daily | DevOps |
| PostHog event delivery latency | < 5 sec | Daily | DevOps |
| Agent execution success rate | > 99.0% | Daily | Orchestration |
| Error rate (all stages) | < 0.5% | Daily | Orchestration |
| Escalation resolution time | < 4 hours | Daily | Human Support |
| API availability (all integrations) | > 99.8% | Daily | DevOps |

---

## Escalation Rules

### Escalation Matrix

#### Level 1: Automated Retry (No Human Involvement)
| Trigger | Retry Logic | Max Retries | Condition |
|---------|-------------|------------|-----------|
| Email send fails | Retry after 5 min | 3 | Non-permanent bounce |
| API timeout | Exponential backoff | 5 | Rate limit / temporary outage |
| Calendar sync fails | Retry after 30 min | 2 | Temporal calendar conflict |
| Payment declined | Offer alternative method | Unlimited | Not fraud-related |

#### Level 2: Human Escalation (Same Business Day)
| Trigger | Action | Timeline | Owner | Condition |
|---------|--------|----------|-------|-----------|
| Patient unable to complete intake form | Send support email + phone option | < 2 hours | Support team | >3 form abandonment attempts |
| Healer match not found | Manual matching + white-glove matching | < 4 hours | Concierge | <60% match confidence after algorithm |
| Payment processing issue | Manual payment processing | < 1 hour | Payments team | 2nd declined attempt or fraud flag |
| Session cancellation <24h before | Offer immediate alternative healer | < 30 min | Concierge | Healer cancels; patient needs same-day |
| Patient reports adverse effects | Health & safety review | < 1 hour | Medical advisor | Any pain increase or side effects reported |
| Negative testimonial / complaint | Immediate response + resolution | < 2 hours | Customer success | NPS < 4 or explicit complaint |

#### Level 3: Escalation to Leadership
| Trigger | Action | Timeline | Owner | Condition |
|---------|--------|----------|-------|-----------|
| Refund request | Review + approval | < 24 hours | Finance lead | >10 refund requests / week trending |
| Potential safety issue | Medical review + decision | < 2 hours | Medical director | Any adverse effect or injury claim |
| Data breach / PII exposure | Incident response | Immediate | Security lead | Any suspected unauthorized access |
| Major system outage | War room | Immediate | CTO | >30 min downtime; >100 affected users |
| Unhappy healer | Relationship recovery | < 24 hours | Healer ops lead | Healer threatens to leave or complains publicly |
| Regulatory / compliance issue | Legal review | < 4 hours | Legal counsel | GDPR, HIPAA, or payment compliance issue |

### Escalation Rules by Stage

#### Stage 1: Awareness
- **Low quality leads detected:** If CPL trends >$15 for 3 consecutive days → Review creative and messaging
- **ROAS collapse:** If ROAS drops <1.2 → Auto-pause underperforming campaigns, escalate to human
- **Ad account flagged:** Any policy violation → Immediate escalation to Ad ops specialist

#### Stage 2: Nurture
- **High unsubscribe rate:** If unsubscribe rate >3% in a sequence → Review content, pause sequence
- **High bounce rate:** If hard bounce rate >5% → Clean email list, escalate to data quality team
- **Patient reply with question:** All patient replies → Route to human support (concierge)

#### Stage 3: Early Access
- **Form abandonment:** If >50% abandon after starting form → Escalate to UX/product for form redesign
- **No healer match found:** If >5% of patients can't be matched → Review healer database, escalate to healer ops
- **Patient needs special accommodation:** Any accessibility or health-related requests → Escalate to concierge

#### Stage 4: Booking
- **Payment failure >1x:** Escalate to support, offer manual processing
- **Healer non-responsive:** If healer doesn't confirm within 24h → Escalate to healer ops, find alternative
- **Calendar sync issues:** If >2 sync failures → Escalate to DevOps, use manual calendar entry

#### Stage 5: Execution
- **Session no-show:** Alert healer + offer immediate reschedule; escalate to concierge after 2nd no-show
- **Technical issues during session:** Any audio/video problems → Alert support, offer reschedule, no charge
- **Patient reports health concern:** Any mention of adverse effects → Medical review required, escalate immediately

#### Stage 6: Post-Session
- **Refund request:** All refund requests → Human approval (typically auto-approve if <$100)
- **Low satisfaction + refund:** If NPS <4 and refund requested → Human follow-up to understand issue
- **Negative review:** Any public negative feedback → Customer success response within 2 hours

#### Stage 7: Retention
- **Churned high-LTV customer:** If lifetime value >$300 and inactive 60 days → Personal outreach from leadership
- **Referral fraud detected:** If referral pattern looks suspicious → Escalate to security team
- **Loyalty program complaint:** Any dispute over rewards → Manual review + settlement by finance

---

## Optimization Loops

### Weekly Optimization Cycle

Every Friday at 4 PM, trigger weekly optimization review:

1. **Data Review** (Friday 4-5 PM)
   - Pull KPI dashboard for all stages
   - Identify metrics trending negatively (>10% below target)
   - Segment by cohort (source, region, pain type)

2. **Root Cause Analysis** (Friday 5-6 PM)
   - For each negative trend, determine likely cause
   - Compare to historical data (1-week, 4-week baseline)
   - Check for external factors (seasonality, external events)

3. **Hypothesis Generation** (Friday 6-7 PM)
   - Generate 1-3 hypothesis for each issue
   - Rank by impact (potential improvement % × confidence)
   - Select top 3 hypotheses for testing

4. **Test Design** (Friday 7-8 PM)
   - Design A/B test or variant for each hypothesis
   - Determine sample size and duration
   - Schedule test launch (typically Monday)

5. **Execution** (Monday AM)
   - Launch approved A/B tests
   - Monitor for data quality issues
   - Log test in optimization registry

6. **Monitoring** (Daily)
   - Monitor test performance vs. control
   - Flag if test is clearly winning/losing (>95% confidence)
   - Pause losing tests early to avoid waste

7. **Analysis & Implementation** (Friday following week)
   - Analyze test results
   - If winner found, implement across all applicable segments
   - If inconclusive, extend test or redesign
   - Log learnings in optimization playbook

### Stage-Specific Optimization Examples

#### Stage 1: Awareness - Email Subject Line Testing
```
Hypothesis: Emotional subject lines (fear of missing out) outperform factual ones
Control: "New platform for chronic pain relief"
Variant A: "Finally, healing that actually works for chronic pain"
Variant B: "The energy healing solution chronic pain sufferers have been waiting for"

Sample size: 5,000 per variant
Duration: 7 days
Success metric: Click-through rate (CTR) >3%
Winner rollout: Full audience if CTR >3.5%
```

#### Stage 2: Nurture - Sequence Timing Testing
```
Hypothesis: Patients respond better to email sequences with variable delays (mimics human interaction)
Control: Fixed 3-day gaps between emails (automation obvious)
Variant A: Random delays (2-4 days) between emails
Variant B: Responsive delays based on engagement (if opened, send next day; if unopened, send after 5 days)

Sample size: 2,000 per variant
Duration: 14 days (2 full sequences)
Success metric: Sequence completion + advance to Stage 3 (conversion >20%)
Winner rollout: Applied to all future nurture sequences
```

#### Stage 3: Matching - Healer Card Presentation Testing
```
Hypothesis: Showing 1 "best match" (recommendation) outperforms showing 3 options (choice paralysis)
Control: Show top 3 healers with comparison table
Variant A: Show 1 "Best Match" prominently with "other options" link below
Variant B: Show 1 healer, add social proof (5-star rating, testimonial)

Sample size: 1,000 per variant
Duration: 10 days
Success metric: Patient clicks "Book Session" (conversion >40%)
Winner rollout: New default healer card presentation
```

#### Stage 4: Booking - Payment Page Testing
```
Hypothesis: Showing payment plan options (e.g., 3-session package) increases booking value
Control: Single payment option ($60 per session)
Variant A: "Popular" 3-pack ($165, 8% off) highlighted
Variant B: Subscription option ($50/month, cancel anytime)

Sample size: 500 per variant
Duration: 14 days
Success metric: Average booking value + conversion rate
Winner rollout: Show winning option as default
```

#### Stage 5: Execution - Pre-Session Message Testing
```
Hypothesis: Personalized healer bio (pre-session) increases confidence and reduces no-show rate
Control: Generic reminder email (time, link, instructions)
Variant A: Healer bio + specific pain modality explanation
Variant B: Patient success story from same healer + tips for session

Sample size: 300 per variant
Duration: 14 days
Success metric: Show-up rate + satisfaction score
Winner rollout: Applied to all pre-session communications
```

#### Stage 6: Post-Session - Follow-up Timing Testing
```
Hypothesis: Asking for feedback immediately (within 5 min) captures more detailed responses than waiting
Control: Ask for feedback 24h after session
Variant A: Ask for feedback immediately after session (in-app)
Variant B: Ask for feedback 2h after session (email)

Sample size: 200 per variant
Duration: 10 days
Success metric: Feedback completion rate + response quality/detail
Winner rollout: New post-session feedback timing
```

#### Stage 7: Retention - Repeat Booking Incentive Testing
```
Hypothesis: "Book 3, get 1 free" offers drive higher lifetime value than percentage discounts
Control: No incentive (baseline repeat rate ~35%)
Variant A: 10% off next 3 sessions
Variant B: "Book 3 sessions, 4th free" offer
Variant C: Loyalty points (earn 10 points per session, redeem for free session)

Sample size: 500 per variant
Duration: 30 days (longer cycle due to session booking delays)
Success metric: Repeat booking rate + 3-session rate + customer lifetime value
Winner rollout: New retention incentive across all customers
```

### Quarterly Deep-Dive Review

Once per quarter (every 13 weeks), conduct in-depth analysis:

1. **Cohort Analysis**
   - Segment customers by acquisition source, signup month, pain type
   - Compare KPIs by cohort
   - Identify highest/lowest performing segments
   - Recommend budget reallocation

2. **Funnel Leak Analysis**
   - Calculate drop-off rate between each stage
   - Benchmark against industry standards
   - Identify biggest leak points
   - Prioritize fixes by impact × feasibility

3. **LTV Drivers Analysis**
   - Correlate customer attributes with lifetime value
   - Identify high-LTV customer profiles
   - Recommend targeting adjustments

4. **Healer Performance Analysis**
   - Rate healers by patient satisfaction and repeat rate
   - Identify top performers vs. at-risk healers
   - Make healer retention/development recommendations

5. **Competitive Landscape Review**
   - Monitor competitor messaging and positioning
   - Identify messaging opportunities
   - Recommend creative refresh

---

## Risk Mitigation

### High-Risk Scenarios & Safeguards

#### Risk 1: Patient Safety & Medical Liability
**Scenario:** Patient reports adverse effects (increased pain, allergic reaction, emotional distress) following a healing session.

**Safeguards:**
- All patient outcomes require informed consent before first session
- Post-session feedback includes safety check: "Did you experience any pain increase or adverse effects?"
- Any adverse report triggers **immediate escalation** to medical advisor
- Automated refund issued within 1 hour if safety concern confirmed
- Healer temporarily suspended pending investigation
- Incident logged for medical/legal review
- Patient offered support call within 2 hours

**Monitoring:** Daily adverse event log review; weekly safety metrics dashboard

---

#### Risk 2: Data Privacy Breach (GDPR/CCPA)
**Scenario:** Patient health data exposed due to security vulnerability or unauthorized access.

**Safeguards:**
- All patient health data encrypted at rest and in transit (AES-256, TLS 1.3)
- PostHog & Loops integrate via OAuth 2.0 (no password storage)
- Healer profiles do not contain patient PHI (personal health information)
- Patient consent required for all email/SMS communications
- Automated daily security scanning for data exposure
- Quarterly penetration testing
- Incident response plan: notify affected users within 24h, legal review within 2h
- All vendors (Loops, PostHog, Stripe) GDPR/SOC2 certified

**Monitoring:** Daily security logs; monthly compliance audit

---

#### Risk 3: Scaling Payment Processing
**Scenario:** As volume increases, payment processing failures increase, leading to revenue loss and poor UX.

**Safeguards:**
- Stripe redundancy: Have backup processor (e.g., Braintree) pre-integrated but dormant
- Auto-retry with exponential backoff for failed transactions
- Multiple payment methods supported (card, ACH, Apple Pay, Google Pay)
- Manual payment processing option for high-touch customers
- Real-time payment monitoring dashboard with alert thresholds (>2% decline rate)
- If payment success rate drops <95%, auto-scale retry infrastructure

**Monitoring:** Real-time payment metrics; hourly success rate tracking

---

#### Risk 4: Healer Supply Shortage
**Scenario:** Not enough healers available to meet patient demand, leading to match failures and refunds.

**Safeguards:**
- Proactive healer recruitment before patient volume scales
- Matching algorithm allows cross-specialty suggestions (e.g., reiki healer for stress-related pain)
- Telehealth-enabled healers available nationwide (not just local)
- Waitlist system allows patients to queue for healer availability
- Incentivize healer availability with performance bonuses
- Fallback: Offer group healing sessions or recorded healing content while waiting
- Auto-refund if wait time exceeds 7 days and patient requests

**Monitoring:** Weekly healer-to-patient ratio; daily match success rate

---

#### Risk 5: Low Repeat Booking Rate (Churn)
**Scenario:** Despite successful first sessions, <30% of patients book a 2nd session, limiting LTV.

**Safeguards:**
- Aggressive post-session nurture (Day 3, 7, 14 check-ins)
- Incentivize repeat booking (loyalty points, discounts on 3-pack)
- Measure pain reduction as outcome KPI—if not met, escalate
- Offer alternative healer for failed first sessions (no penalty)
- Capture feedback on why patients don't return (survey)
- Run targeted win-back campaigns at 30, 60, 90-day milestones

**Monitoring:** Weekly repeat booking rate; cohort retention analysis

---

#### Risk 6: Negative Reviews / Reputation Damage
**Scenario:** Dissatisfied patient leaves negative review on public platform (Google, Trustpilot), harming ENNIE brand.

**Safeguards:**
- Capture feedback immediately post-session (in-app, before leaving review elsewhere)
- Any NPS <6 triggers **immediate human follow-up** within 2 hours
- Proactive review request from satisfied patients (NPS >8)
- Automated brand monitoring (Google Alerts, Twitter, Reddit)
- Response template for negative reviews (empathy + solution offered)
- Escalation if multiple negative reviews in a week (reputational trend)

**Monitoring:** Daily review monitoring; weekly sentiment analysis

---

#### Risk 7: Email Deliverability Degradation
**Scenario:** High unsubscribe/bounce rates cause Loops domain reputation to decline, emails start hitting spam folder.

**Safeguards:**
- Monitor daily unsubscribe rate; if >1%, review email content
- Monitor daily bounce rate; if >2%, clean email list immediately
- Segment "engaged" vs. "unengaged" users; only email engaged
- Authentication protocols (SPF, DKIM, DMARC) configured correctly
- Warm-up IP reputation if sending to cold audiences
- Use Loops IP pools (not shared) if volume scales

**Monitoring:** Daily email metrics (open, bounce, unsubscribe); weekly domain reputation score

---

#### Risk 8: Orchestration / Agent Failure
**Scenario:** Orchestration layer crashes, preventing agent coordination and patient progression.

**Safeguards:**
- Orchestration layer deployed with redundancy (multi-region failover)
- Agent state persisted to database (not in-memory) for recovery
- Heartbeat monitoring for all agents; auto-restart if unresponsive
- Message queue (e.g., RabbitMQ) buffers trigger events; no data loss
- Circuit breaker pattern for API calls to external systems
- Rollback procedure for bad agent configurations
- Post-incident analysis for all >5 minute outages

**Monitoring:** Real-time agent health dashboard; hourly error rate tracking

---

#### Risk 9: Trigger Misfiring (False Positives)
**Scenario:** Trigger causes incorrect action (e.g., patient moved to wrong stage, double-booked session).

**Safeguards:**
- All trigger logic tested with unit tests (>90% coverage)
- Trigger decisions logged with reasoning (explainability)
- Dry-run mode available: show what *would* happen without executing
- Manual approval required for high-impact triggers (e.g., refunds >$100)
- Staging environment mirrors production; test all trigger changes there first
- Rollback procedure if bad trigger causes data corruption

**Monitoring:** Daily trigger decision audit; weekly false positive rate

---

#### Risk 10: Competitor Poaching Healer Network
**Scenario:** Competitor launches similar platform, offers better rates, poaches ENNIE healers.

**Safeguards:**
- Exclusive content & features for healers (e.g., patient feedback, reputation scores, revenue analytics)
- Performance-based healer bonuses (e.g., extra 10% if maintain >4.8 rating)
- Long-term healer loyalty program (unlock perks after 10 sessions)
- Regular healer community events (networking, training, support)
- Monitor healer satisfaction quarterly; address concerns proactively
- Legal contracts protect relationship exclusivity (if applicable)

**Monitoring:** Monthly healer satisfaction survey; quarterly churn analysis

---

### Risk Acceptance Criteria

For each risk, determine: **Accept | Mitigate | Avoid**

| Risk | Strategy | Owner | Contingency |
|------|----------|-------|-------------|
| Patient Safety | Mitigate | Medical advisor | Emergency escalation protocol + insurance |
| Data Privacy | Mitigate | Security lead | Immediate notification + legal response |
| Payment Processing | Mitigate | Finance lead | Backup processor + manual processing |
| Healer Supply | Mitigate | Healer ops | Aggressive recruitment + waitlist system |
| Low Repeat Rate | Mitigate | Growth lead | Win-back campaigns + incentive testing |
| Negative Reviews | Mitigate | Customer success | Rapid response protocol + sentiment monitoring |
| Email Deliverability | Mitigate | Marketing ops | Email list cleaning + IP warm-up |
| Agent Failure | Mitigate | CTO | Multi-region failover + incident response |
| Trigger Misfiring | Mitigate | Product lead | Testing + approval + rollback |
| Competitor Threat | Mitigate | Healer ops | Healer loyalty program + exclusive benefits |

---

## Testing Plan (Week 1-4)

### Pre-Launch Phase: Weeks 1-4 (Sandbox Environment)

**Goal:** Validate all automation logic, agent interactions, and data flows before production launch.

### Week 1: Foundation & Integration Testing

#### Day 1-2: Agent Integration Audit
- [ ] Verify each agent can read required data sources (PostHog, Loops, Stripe, etc.)
- [ ] Test agent-to-orchestration message passing (triggers firing correctly)
- [ ] Verify all external API connections (authentication, rate limits, error handling)
- [ ] Document any integration gaps or missing credentials

**Deliverable:** Integration readiness report (Go/No-Go)

#### Day 3-5: Trigger Testing (Sandbox)
- [ ] Test each trigger with sample data in isolated environment
  - [ ] Stage 1 triggers: Lead capture, ad conversions
  - [ ] Stage 2 triggers: Email opens, click engagement
  - [ ] Stage 3 triggers: Intake form submission, matching
  - [ ] Stage 4 triggers: Booking, payment
  - [ ] Stage 5 triggers: Session completion, feedback
  - [ ] Stage 6 triggers: Post-session actions
  - [ ] Stage 7 triggers: Repeat booking, churn
- [ ] Verify trigger decision trees execute correctly
- [ ] Test error handling (what happens if API fails, data missing, etc.)

**Deliverable:** Trigger test report with pass/fail for each

#### Day 5: Escalation Testing
- [ ] Manually test each escalation scenario
  - [ ] Safety concern escalation
  - [ ] Payment failure escalation
  - [ ] Healer mismatch escalation
  - [ ] Negative feedback escalation
- [ ] Verify escalation notifications reach correct team member
- [ ] Verify escalation logging is complete and traceable

**Deliverable:** Escalation testing report

---

### Week 2: End-to-End Workflow Testing

#### Day 1-3: Stage 1 → Stage 2 (Awareness to Nurture)
- [ ] Create test lead via landing page form
- [ ] Verify lead added to Loops audience
- [ ] Verify first nurture email sends automatically
- [ ] Verify engagement scoring works (open, click, etc.)

**Deliverable:** Stage 1→2 workflow validation ✅

#### Day 3-5: Stage 2 → Stage 3 (Nurture to Early Access)
- [ ] Mark test lead as "high engagement" (simulated by clicking email)
- [ ] Verify lead moves to Early Access stage
- [ ] Verify intake form email sent
- [ ] Create test patient profile with intake form

**Deliverable:** Stage 2→3 workflow validation ✅

#### Day 5-7: Stage 3 → Stage 4 (Onboarding to Booking)
- [ ] Submit completed intake form (pain type, preferences, etc.)
- [ ] Verify matching algorithm runs
- [ ] Verify healer matches displayed to test patient
- [ ] Select healer and proceed to booking

**Deliverable:** Stage 3→4 workflow validation ✅

#### Day 7: Emergency Exit
- [ ] If all previous stages working, proceed to Stage 4-5
- [ ] If >2 stage failures, pause testing and debug before continuing

---

### Week 3: Full Patient Journey Test (Happy Path)

#### Day 1-2: Complete Booking (Stage 4)
- [ ] Test patient confirms healer selection
- [ ] Verify payment form loads (Stripe test environment)
- [ ] Process test payment ($0.50 in Stripe test mode)
- [ ] Verify booking confirmation email sent to patient + healer
- [ ] Verify calendar invite sent (test with mock calendar)

**Deliverable:** Full booking workflow validated

#### Day 2-3: Schedule Session (Stage 5)
- [ ] Verify 48h pre-session reminder sent
- [ ] Simulate session completion (mark completed in app)
- [ ] Verify post-session feedback form presented
- [ ] Submit test outcomes (pain reduction, satisfaction)

**Deliverable:** Session execution workflow validated

#### Day 3-4: Post-Session Follow-up (Stage 6)
- [ ] Verify Day-3 check-in email sent
- [ ] Simulate positive response (patient happy with results)
- [ ] Verify repeat booking recommendation sent
- [ ] Verify testimonial request email sent (if satisfied)

**Deliverable:** Post-session care workflow validated

#### Day 4-5: Repeat Booking (Stage 7)
- [ ] Verify repeat booking prompt shows loyalty discount
- [ ] Simulate booking second session
- [ ] Verify loyalty points awarded
- [ ] Verify customer lifetime value updated

**Deliverable:** Retention & growth workflow validated

#### Day 5-7: Buffer for Issues
- [ ] Document any issues found during full journey
- [ ] Prioritize by severity (blocker vs. nice-to-have)
- [ ] Fix blockers before moving to Week 4

---

### Week 4: Edge Cases & Performance Testing

#### Day 1-2: Edge Case Testing
- [ ] **No healer match found:** Verify waitlist workflow triggered
- [ ] **Payment failure:** Verify retry logic and alternative payment offered
- [ ] **Session no-show:** Verify escalation to support team
- [ ] **Low satisfaction:** Verify refund offer and alternative healer suggestion
- [ ] **Adverse effects reported:** Verify escalation to medical advisor
- [ ] **Form abandonment:** Verify reminder email triggers at correct time

**Deliverable:** Edge case test report (all scenarios pass)

#### Day 2-3: Data Quality Testing
- [ ] Verify PostHog event tracking for all major actions (form submit, email open, booking, etc.)
- [ ] Verify data flowing correctly between systems (app → PostHog → Agent → Loops)
- [ ] Verify no data loss in event pipeline (spot check event counts)
- [ ] Verify PII is not exposed in logs or dashboards

**Deliverable:** Data quality report (no sensitive data exposed, >99% event capture)

#### Day 3-4: Load Testing (Simulated)
- [ ] Simulate 100 simultaneous leads entering funnel
- [ ] Verify all agents handle increased load without errors
- [ ] Verify database query performance (no slowdowns)
- [ ] Verify email sending doesn't get rate-limited by Loops
- [ ] Verify Stripe payment processing handles volume

**Deliverable:** Load test report (no errors at 100 concurrent users)

#### Day 4-5: Rollback & Recovery Testing
- [ ] Simulate agent crash; verify orchestration auto-restarts it
- [ ] Simulate database connection loss; verify graceful degradation
- [ ] Simulate API timeout; verify retry logic kicks in
- [ ] Manually test rollback procedure (reverting bad agent config)

**Deliverable:** Disaster recovery playbook validation ✅

#### Day 5-7: Sign-Off & Launch Preparation
- [ ] Final go/no-go decision on each component
- [ ] Document any known issues + mitigation plans
- [ ] Brief Jake on test results + readiness
- [ ] Prepare launch plan for production (see Go-Live Checklist)
- [ ] Schedule on-call rotation for Week 1 post-launch

**Deliverable:** Go/No-Go decision + launch plan

---

### Testing Success Criteria

| Criterion | Target | Status |
|-----------|--------|--------|
| All 7 stages automated | 100% | ✅ |
| Trigger accuracy (false positives) | <1% | ⏳ |
| Email deliverability | >95% | ⏳ |
| Payment processing success | >98% | ⏳ |
| Agent uptime | >99% | ⏳ |
| Data integrity | 100% (no loss) | ⏳ |
| Escalation accuracy | 100% | ⏳ |
| End-to-end journey (happy path) | 1 successful patient through all 7 stages | ⏳ |
| Edge case handling | All major scenarios tested | ⏳ |
| Stakeholder approval | Product, Engineering, Medical, Legal | ⏳ |

---

## Go-Live Checklist

### Pre-Launch (48 hours before)

#### Product & Data
- [ ] All agent configurations deployed to staging
- [ ] All integrations tested (PostHog, Loops, Stripe, Calendar, etc.)
- [ ] Database backup created and restoration tested
- [ ] Data migration (if any legacy data) validated
- [ ] PII masking confirmed on all non-prod environments
- [ ] A/B test framework ready (Statsig or similar)

#### Monitoring & Observability
- [ ] Dashboards created for all stage-level KPIs
- [ ] Alerts configured for error rates, API failures, trigger misfires
- [ ] Log aggregation (CloudWatch/DataDog) set up
- [ ] APM (Application Performance Monitoring) instrumented
- [ ] On-call rotation published (Week 1-4 post-launch)

#### Security & Compliance
- [ ] Security audit completed (no critical findings)
- [ ] GDPR consent flows validated
- [ ] PII handling reviewed (encryption, access controls)
- [ ] Data retention policy enforced (CCPA compliance)
- [ ] Legal review completed (terms of service, privacy policy)

#### Support & Documentation
- [ ] Support team trained on escalation procedures
- [ ] Runbook created for common issues (agent crash, payment failure, etc.)
- [ ] Support ticket template created for patient escalations
- [ ] Customer support FAQ prepared
- [ ] Healer support documentation updated

#### Stakeholder Sign-Off
- [ ] Product lead: Functional testing complete ✅
- [ ] Engineering: Deployment & monitoring ready ✅
- [ ] Finance: Payment processing validated ✅
- [ ] Medical/Legal: Safety & compliance approved ✅
- [ ] Jake (Founder): Final approval to launch ✅

---

### Launch Day (Rollout Phase)

#### 6 AM: Final Systems Check
- [ ] All agents responding to health checks
- [ ] All integrations connected and authenticated
- [ ] Database backups recent and tested
- [ ] Monitoring & alerts active
- [ ] On-call team standing by

#### 8 AM: Canary Launch (10% of Traffic)
- [ ] Route 10% of new leads to production agents
- [ ] Monitor error rates, success rates, latency
- [ ] Check for unusual patterns in agent decisions
- [ ] Verify data flowing to PostHog and Loops correctly
- [ ] Spot-check email delivery (open a few emails manually)

**Success criteria:** <0.5% error rate, >90% agent success rate

#### 12 PM: Expand to 50% (if canary successful)
- [ ] Route 50% of new leads to production
- [ ] Monitor KPIs at each stage
- [ ] Watch for payment processing issues
- [ ] Monitor email deliverability
- [ ] Check healer matching quality

**Success criteria:** Stage 1-3 KPIs on target

#### 4 PM: Full Rollout (100% of Traffic)
- [ ] Route all new leads to production
- [ ] Increase monitoring frequency
- [ ] Be ready to roll back if critical issue detected

**Success criteria:** All stages executing, <1% error rate

#### Hourly Monitoring (Day 1)
- [ ] Check error logs every 30 minutes
- [ ] Verify trigger execution accuracy
- [ ] Monitor payment transaction success rate
- [ ] Watch email queue for backlog
- [ ] Check agent CPU/memory usage

---

### Post-Launch (Week 1-4)

#### Week 1: Intensive Monitoring
- [ ] Daily standup with full team
- [ ] Review KPIs twice daily (8 AM, 4 PM)
- [ ] Respond to any escalations immediately
- [ ] Log all incidents and root causes
- [ ] Make no major changes (stability first)

#### Week 2: Optimization Begins
- [ ] Review Week 1 metrics with team
- [ ] Identify any underperforming KPIs
- [ ] Launch first optimization tests (A/B tests from playbook)
- [ ] Monitor test results daily
- [ ] Maintain escalation response SLA

#### Week 3: Scaling Validation
- [ ] If volume increasing, stress-test agents under load
- [ ] Monitor database query performance
- [ ] Check email queue for delays
- [ ] Verify payment processing scales without errors
- [ ] Start long-term trend analysis

#### Week 4: Full Production Review
- [ ] Comprehensive review: Are we hitting all targets? (See KPI table)
- [ ] Customer feedback review (NPS, testimonials, complaints)
- [ ] Healer feedback review (satisfaction, usage patterns)
- [ ] System reliability review (uptime, error rates, incident response)
- [ ] Optimization recommendations for next quarter

#### Metrics to Track (Weeks 1-4)
| Metric | Target | Week 1 | Week 2 | Week 3 | Week 4 |
|--------|--------|--------|--------|--------|--------|
| Leads generated | 500+ | ⏳ | ⏳ | ⏳ | ⏳ |
| Cost per lead | <$12 | ⏳ | ⏳ | ⏳ | ⏳ |
| Nurture conversion | >20% | ⏳ | ⏳ | ⏳ | ⏳ |
| Booking rate | >75% | ⏳ | ⏳ | ⏳ | ⏳ |
| Session show-up | >92% | ⏳ | ⏳ | ⏳ | ⏳ |
| Repeat booking | >35% | ⏳ | ⏳ | ⏳ | ⏳ |
| NPS | >45 | ⏳ | ⏳ | ⏳ | ⏳ |
| Agent uptime | >99% | ⏳ | ⏳ | ⏳ | ⏳ |

---

### Rollback Trigger (When to Stop & Revert)

Stop the rollout and revert to previous version if:
- [ ] Any **safety incident** (patient adverse effect not caught by escalation)
- [ ] Payment processing success rate drops **<95%** for >1 hour
- [ ] Agent error rate exceeds **2%** for >30 minutes
- [ ] Email deliverability drops **<85%** (spam filtering issue)
- [ ] Database corruption detected (data loss or inconsistency)
- [ ] PII exposed in logs or dashboards
- [ ] Healer network significantly disrupted (mass complaints)
- [ ] Core orchestration system unavailable for >15 minutes

**Rollback procedure:**
1. Pause all trigger execution (freeze agents)
2. Revert agent configurations to last known-good version
3. Verify all systems operational on previous version
4. Post-incident analysis (root cause + fix)
5. Re-test fixes before re-launch

---

### Post-Launch Support

#### Escalation Contacts
| Issue Type | Owner | Phone | Email | Response SLA |
|------------|-------|-------|-------|--------------|
| Patient safety | Medical advisor | [phone] | [email] | 5 minutes |
| Payment processing | Finance lead | [phone] | [email] | 15 minutes |
| Email delivery | Marketing ops | [phone] | [email] | 30 minutes |
| Agent failure | CTO | [phone] | [email] | 10 minutes |
| Data integrity | Database admin | [phone] | [email] | 30 minutes |
| General support | Customer success | [phone] | [email] | 60 minutes |

#### On-Call Rotation (Week 1-4)
- [ ] Schedule created: [Link to on-call calendar]
- [ ] Runbooks prepared for each on-call engineer
- [ ] Escalation chain defined
- [ ] Communication tools tested (Slack, phone, video)

---

## Appendix: Key Definitions

### Funnel Stages Defined

1. **Awareness:** Lead discovers ENNIE through ads, organic search, or referral; visits landing page
2. **Nurture:** Lead not yet ready to book; receives educational email sequence
3. **Early Access:** Lead completes intake form; shown matched healers
4. **Booking:** Lead selects healer; completes payment; session scheduled
5. **First Session:** Patient attends session with healer; outcome captured
6. **Post-Session Care:** Patient receives follow-up; encouraged to repeat; testimonial requested
7. **Retention & Growth:** Patient either books repeat sessions or churns; referral incentivized

### Key Metrics Defined

- **Cost per Lead (CPL):** Total ad spend / Number of leads
- **Conversion Rate:** (Count at stage N+1 / Count at stage N) × 100
- **Churn Rate:** (Customers lost / Starting customers) × 100
- **Net Promoter Score (NPS):** (% Promoters − % Detractors)
- **Lifetime Value (LTV):** Average revenue per customer × Repeat rate × Customer lifespan
- **Return on Ad Spend (ROAS):** Revenue from ads / Ad spend
- **Pain Reduction:** (Pre-session pain level − Post-session pain level) / Pre-session pain level

---

## End of Automation Playbook

**Document Status:** Ready for Production
**Last Updated:** 2026-04-01
**Next Review:** 2026-04-15 (post-Week 1 launch)
**Prepared by:** Subagent | **Approved by:** [Jakeh] (pending)
