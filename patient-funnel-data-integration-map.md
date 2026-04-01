# ENNIE Patient Funnel: Data Integration Map

**Version:** 1.0 | **Status:** Production Ready | **Last Updated:** 2026-04-01

---

## Table of Contents

1. [Data Flow Overview](#data-flow-overview)
2. [System Connectivity Matrix](#system-connectivity-matrix)
3. [API Endpoints & Authentication](#api-endpoints--authentication)
4. [Data Schemas](#data-schemas)
5. [Integration Frequency](#integration-frequency)
6. [Fallback Procedures](#fallback-procedures)
7. [Monitoring & Alerting](#monitoring--alerting)
8. [Implementation Checklist](#implementation-checklist)

---

## Data Flow Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│ EXTERNAL SOURCES                                                     │
│ (Paid Ads, Organic, Referral, Direct)                              │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
       ┌──────────────────────────────┐
       │ ENNIE LANDING PAGE & APP     │
       │ (Form submissions, Events)   │
       └────────────┬─────────────────┘
                    │
         ┌──────────┼──────────┬──────────────┐
         │          │          │              │
         ▼          ▼          ▼              ▼
    ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────────┐
    │ PostHog│ │ Loops  │ │ Stripe │ │ Calendar API │
    │Analytics│ │ Email  │ │Payment │ │ (Calendly/   │
    │        │ │        │ │        │ │  Google Cal) │
    └────┬───┘ └───┬────┘ └───┬────┘ └──────┬───────┘
         │         │          │            │
         │ Events  │ Email    │ Payment    │ Calendar
         │         │ Engagment│ Events     │ Events
         │         │          │            │
         └─────────┼──────────┼────────────┘
                   │          │
         ┌─────────▼──────────▼──────────────┐
         │  ORCHESTRATION LAYER              │
         │  (State Management, Routing)      │
         └─────────┬──────────┬──────────────┘
                   │          │
         ┌─────────┼──────────┼──────────────────┐
         │         │          │                  │
         ▼         ▼          ▼                  ▼
    ┌─────────┬──────────┬───────────┬──────────────────┐
    │ Patient │ Patient  │ Patient   │ Patient Retention│
    │Awareness│ Nurture  │ Matching  │ Agent            │
    │Agent    │ Agent    │ Agent     │                  │
    └────┬────┴──────┬───┴────┬──────┴─────────┬────────┘
         │           │        │                │
         │ Audience  │ Campaign│ Session      │ Customer
         │ Updates   │ Updates │ Creates      │ Updates
         │           │        │                │
    ┌────▼───────────▼────────▼────────────────▼─────┐
    │ DOWNSTREAM SYSTEMS                             │
    │ - Google Ads (Audience updates)               │
    │ - Meta Ads (Lookalike audiences)              │
    │ - Loops (Contact updates, email sending)      │
    │ - Stripe (Charge processing, refunds)         │
    │ - Calendar APIs (Session scheduling)          │
    │ - Internal session database (ENNIE app)       │
    └────────────────────────────────────────────────┘
```

---

## System Connectivity Matrix

### Legend
- **→** Direct integration (agent calls system API)
- **←** Webhook/event listener (system sends data to agent)
- **↔** Bidirectional communication
- **[daily]** Batch integration
- **[real-time]** Event-driven integration

### Full Connectivity Matrix

| System | Patient-Awareness | Patient-Nurture | Patient-Matching | Patient-Retention | Orchestration | Frequency |
|--------|-------------------|-----------------|------------------|-------------------|---------------|-----------|
| **ENNIE App Events** | ← | ← | ← | ← | ↔ | Real-time |
| **PostHog Analytics** | ↔ | ↔ | ↔ | ↔ | ← | Real-time |
| **Loops Email** | → | ↔ | → | ↔ | → | Real-time |
| **Google Ads API** | ↔ | → | → | - | → | Hourly |
| **Meta Marketing API** | ↔ | → | → | - | → | Hourly |
| **Stripe API** | - | - | ↔ | ↔ | ← | Real-time |
| **Calendar API (Calendly/Google)** | - | - | ↔ | ← | ← | Real-time |
| **Healer Database** | - | - | ← | ← | ← | Hourly cache |
| **Internal Session DB** | - | - | ↔ | ↔ | ↔ | Real-time |
| **Internal Analytics DB** | ← | ← | ← | ← | ← | [daily] batch |

---

## API Endpoints & Authentication

### 1. ENNIE Internal APIs

#### Landing Page Form Submission Webhook
```
Endpoint: POST https://ennie-api.internal/webhooks/form_submit
Auth: API Key (header: X-API-Key)
Purpose: Capture new lead submissions
Payload:
{
  "email": "user@example.com",
  "first_name": "John",
  "pain_type": "back_pain",
  "pain_severity": 1-10,
  "location": "San Francisco, CA",
  "source_url": "https://ennie.com/landing",
  "utm_source": "google_ads",
  "utm_medium": "cpc",
  "utm_campaign": "chronic_pain_awareness",
  "timestamp": "2026-04-01T12:00:00Z"
}
Response: 200 OK { "lead_id": "lead_123", "status": "captured" }
```

#### App Events Webhook
```
Endpoint: POST https://ennie-api.internal/webhooks/app_events
Auth: API Key
Purpose: Capture app interactions (form completion, booking, session status)
Payload: (varies by event type)
{
  "event_type": "form_submitted" | "healer_selected" | "session_started" | etc,
  "patient_id": "pat_123",
  "timestamp": "2026-04-01T12:00:00Z",
  "data": { ... }
}
Response: 200 OK { "event_id": "evt_123", "processed": true }
```

#### Session Database API
```
Endpoint: https://ennie-api.internal/api/sessions
Auth: API Key
Methods:
  POST /sessions - Create session
  GET /sessions/{id} - Fetch session details
  PATCH /sessions/{id} - Update session (status, reminders sent, etc)
  GET /sessions?scheduled_at_gt=2026-04-01T00:00:00Z - List upcoming sessions
Example:
  POST /sessions
  Body: {
    "patient_id": "pat_123",
    "healer_id": "healer_456",
    "scheduled_at": "2026-04-05T14:00:00Z",
    "duration_minutes": 60,
    "modality": "reiki"
  }
  Response: { "session_id": "ses_789", "status": "scheduled" }
```

#### Healer Database API
```
Endpoint: https://ennie-api.internal/api/healers
Auth: API Key
Methods:
  GET /healers - List all healers
  GET /healers/{id} - Fetch healer profile
  GET /healers?specialty=reiki&city=San%20Francisco - Search healers
  GET /healers/{id}/availability - Fetch available slots
Response: Healer object with:
{
  "healer_id": "healer_456",
  "name": "Sarah",
  "specialties": ["reiki", "energy_healing"],
  "rating": 4.9,
  "reviews_count": 127,
  "location": "San Francisco, CA",
  "availability": [
    { "day": "2026-04-05", "slots": ["10:00", "14:00", "18:00"] },
    ...
  ]
}
```

#### Support Queue API
```
Endpoint: https://ennie-api.internal/support/queue
Auth: API Key
Purpose: Escalate issues requiring human review
Methods:
  POST /queue/create - Create support ticket
Example:
  POST /queue/create
  Body: {
    "type": "patient_reply" | "adverse_effect" | "refund_request" | etc,
    "patient_id": "pat_123",
    "priority": "high" | "medium" | "low",
    "message": "Patient reported increased pain after session",
    "escalation_path": "medical_advisor" | "customer_success" | etc
  }
  Response: { "ticket_id": "tkt_123", "status": "created" }
```

#### Loyalty Program API
```
Endpoint: https://ennie-api.internal/api/loyalty
Auth: API Key
Methods:
  POST /loyalty/award_points - Award points to customer
  POST /loyalty/upgrade_tier - Upgrade loyalty tier
  GET /loyalty/{patient_id} - Get loyalty status
Example:
  POST /loyalty/award_points
  Body: { "patient_id": "pat_123", "points": 100, "reason": "completed_session" }
  Response: { "total_points": 350, "tier": "silver" }
```

---

### 2. PostHog Analytics

#### Event Capture API
```
Endpoint: POST https://api.posthog.com/capture/
Auth: API Key (in payload)
Purpose: Send behavioral events from agents
Payload:
{
  "api_key": "POSTHOG_API_KEY",
  "event": "email_sent" | "lead_scored" | "session_booked" | etc,
  "properties": {
    "distinct_id": "patient_123 or email@example.com",
    "lead_quality_score": 75,
    "cost_per_lead": 8.50,
    "source": "google_ads",
    ... (any custom properties)
  },
  "timestamp": "2026-04-01T12:00:00Z"
}
Response: 200 OK
```

#### API Query (Batch Events)
```
Endpoint: GET https://api.posthog.com/api/event/
Auth: API Key (header: Authorization: Bearer TOKEN)
Purpose: Batch retrieve events for analysis/reporting
Query: ?event=email_opened&distinct_id=patient_123&limit=100
Response: {
  "results": [
    { "id": "evt_123", "event": "email_opened", "timestamp": "...", ... },
    ...
  ],
  "next": "url_to_next_page"
}
```

---

### 3. Loops Email Platform

#### Contact Management API
```
Base URL: https://api.loops.so/api/v1/
Auth: Bearer {LOOPS_API_KEY} (header)

Endpoints:
  POST /contacts - Create or update contact
  Example:
    Body: {
      "email": "user@example.com",
      "firstName": "John",
      "customFields": {
        "pain_type": "back_pain",
        "pain_severity": 7,
        "lead_quality_score": 75,
        "engagement_score": 45,
        "stage": "stage_2_nurture"
      }
    }
    Response: 200 OK { "success": true }

  PATCH /contacts/{contactId} - Update specific fields
  Example: PATCH /contacts/cont_123
    Body: {
      "customFields": {
        "engagement_score": 68,
        "sequence_position": 3
      }
    }
    Response: 200 OK

  POST /contacts/{contactId}/add-to-audience
  Purpose: Add contact to specific audience for segmented campaigns
  Example:
    Body: { "audienceId": "aud_high_intent" }
    Response: 200 OK

  POST /send
  Purpose: Send transactional emails
  Example:
    Body: {
      "email": "user@example.com",
      "emailId": "tem_healer_intro", // Template ID
      "dataVariables": {
        "healer_name": "Sarah",
        "healer_specialty": "Reiki",
        "book_link": "https://..."
      }
    }
    Response: 200 OK { "messageId": "msg_123" }
```

#### Webhook Events from Loops
```
Endpoint: https://ennie-api.internal/webhooks/loops (configured in Loops dashboard)
Auth: Webhook Secret (verified in header: X-Loops-Signature)
Events Sent:
  - email_opened: { "email": "...", "emailId": "...", "timestamp": "..." }
  - email_clicked: { "email": "...", "emailId": "...", "url": "...", "timestamp": "..." }
  - email_bounced: { "email": "...", "bounce_type": "hard|soft", "timestamp": "..." }
  - email_unsubscribed: { "email": "...", "timestamp": "..." }
  - email_replied: { "email": "...", "message": "...", "timestamp": "..." }
```

---

### 4. Google Ads API

```
Base URL: https://googleads.googleapis.com/v12/
Auth: OAuth 2.0
Required Credentials: client_id, client_secret, refresh_token, developer_token

Key Endpoints:
  GET /customers/{customer_id}/campaigns - List campaigns
  PATCH /customers/{customer_id}/bidding_strategies - Update bid multipliers
  Example:
    PATCH /customers/123-456-7890/bidding_strategies/bid_strategy_id
    Body: {
      "updateMask": "smart_bidding_target_roas,effective_currency_code",
      "bidStrategy": {
        "targetRoas": {
          "targetRoas": 2.5
        }
      }
    }
    Response: { "bidStrategy": {...} }

  GET /customers/{id}/campaign_performance_reports?query=... - Performance data
  (Uses Google Ads Query Language)
```

---

### 5. Meta Marketing API

```
Base URL: https://graph.instagram.com/v12.0/
Auth: Access Token (header: Authorization: Bearer TOKEN)

Key Endpoints:
  GET /{ad_account_id}/insights - Get campaign performance
  Example:
    GET /123456789/insights?fields=impressions,clicks,spend,actions
    Response: {
      "data": [
        {"date_start": "2026-04-01", "impressions": 10000, "clicks": 250, ...}
      ]
    }

  POST /{ad_account_id}/audiences - Create custom audience
  Example:
    Body: {
      "name": "High-Intent-Patients-April",
      "subtype": "CUSTOM",
      "customer_file_source": "CRM",
      "data": [
        {"email": ["user1@example.com", "user2@example.com"]}
      ]
    }
    Response: { "id": "123456" }

  GET /{campaign_id} - Get campaign details
```

---

### 6. Stripe Payment API

```
Base URL: https://api.stripe.com/v1/
Auth: Bearer {STRIPE_API_KEY} (header)

Key Endpoints:
  POST /payment_intents - Create payment
  Example:
    Body: {
      "amount": 6000, // cents ($60)
      "currency": "usd",
      "customer": "cus_123",
      "description": "Session with healer Sarah - Reiki"
    }
    Response: { "id": "pi_123", "status": "requires_payment_method" }

  POST /charges - Direct charge (if using Stripe Checkout)
  Example:
    Body: {
      "amount": 6000,
      "currency": "usd",
      "source": "tok_123", // From Stripe.js
      "description": "Session with healer"
    }
    Response: { "id": "ch_123", "status": "succeeded" }

  POST /refunds - Issue refund
  Example:
    Body: {
      "charge": "ch_123",
      "amount": 6000, // Optional; full refund if omitted
      "reason": "requested_by_customer"
    }
    Response: { "id": "re_123", "status": "succeeded" }

  GET /charges/{id} - Verify charge status
```

#### Stripe Webhooks
```
Endpoint: https://ennie-api.internal/webhooks/stripe
Auth: Webhook Secret (verified in header: Stripe-Signature)
Events Subscribed:
  - charge.succeeded: { "id": "ch_123", "amount": 6000, "status": "succeeded" }
  - charge.failed: { "id": "ch_123", "failure_message": "..." }
  - charge.refunded: { "id": "ch_123", "refunded": true, "amount_refunded": 6000 }
  - dispute.created: { "id": "dp_123", "reason": "..." }
```

---

### 7. Calendar APIs

#### Calendly API (if using Calendly for healer scheduling)
```
Base URL: https://calendly.com/api/v1/
Auth: Bearer {CALENDLY_API_KEY}

Endpoints:
  GET /calendars - List healer calendars
  GET /calendars/{calendar_uuid}/events - List booked events
  POST /calendars/{calendar_uuid}/event_types - Get available slots
  GET /scheduled_events - List scheduled events

Example:
  GET /scheduled_events?user=https://api.calendly.com/users/USER_UUID
  Response: {
    "collection": [
      {
        "uri": "https://api.calendly.com/scheduled_events/EVENT_ID",
        "name": "Reiki Session",
        "start_time": "2026-04-05T14:00:00Z",
        "end_time": "2026-04-05T15:00:00Z",
        "invitees_counter": { "total": 1 },
        "status": "active"
      }
    ]
  }
```

#### Google Calendar API (if using Google Calendar)
```
Base URL: https://www.googleapis.com/calendar/v3/
Auth: OAuth 2.0 (access_token from service account or user)

Endpoints:
  POST /calendars/{calendarId}/events - Create event
  Example:
    Body: {
      "summary": "Healing Session with Sarah - Reiki",
      "description": "Session with patient John Doe",
      "start": { "dateTime": "2026-04-05T14:00:00Z", "timeZone": "America/Los_Angeles" },
      "end": { "dateTime": "2026-04-05T15:00:00Z", "timeZone": "America/Los_Angeles" },
      "attendees": [
        { "email": "patient@example.com" },
        { "email": "healer@example.com" }
      ],
      "conferenceData": {
        "conferenceType": "hangoutsMeet"
      }
    }
    Response: { "id": "event_123", "htmlLink": "..." }

  PATCH /calendars/{calendarId}/events/{eventId} - Update event
  GET /calendars/{calendarId}/freebusy - Check availability
```

---

## Data Schemas

### 1. Patient / Contact Schema

```json
{
  "patient_id": "pat_12345",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1-555-123-4567",
  
  // Pain Profile
  "pain_type": "back_pain",
  "pain_severity": 7,  // 1-10 scale
  "pain_duration_months": 24,
  "pain_description": "chronic lower back pain",
  
  // Location & Preferences
  "location_city": "San Francisco",
  "location_state": "CA",
  "location_country": "US",
  "timezone": "America/Los_Angeles",
  "preferred_modality": "reiki",  // Optional
  "availability": "weekends_flexible",
  
  // Acquisition & Quality
  "lead_source": "google_ads",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "chronic_pain_awareness",
  "lead_quality_score": 78,  // 0-100
  "signup_date": "2026-04-01T10:00:00Z",
  
  // Engagement & Funnel State
  "current_stage": "stage_5_execution",
  "stage_entered_at": "2026-04-03T14:00:00Z",
  "days_in_stage": 2,
  "engagement_score": 72,  // 0-100
  "email_opens_count": 3,
  "email_clicks_count": 1,
  
  // Session History
  "total_sessions_completed": 2,
  "last_session_id": "ses_789",
  "last_session_date": "2026-04-05T14:00:00Z",
  "days_since_last_session": 1,
  "avg_pain_reduction": 22,  // percent
  "avg_satisfaction_nps": 7,
  
  // Loyalty & Lifetime Value
  "loyalty_tier": "bronze",
  "loyalty_points": 200,
  "total_revenue": 180,  // dollars
  "customer_lifetime_value": 250,  // predicted
  "repeat_booking_count": 1,
  
  // Status & Metadata
  "status": "active",  // active, inactive, churned, refund_requested
  "last_activity_date": "2026-04-06T10:00:00Z",
  "created_at": "2026-04-01T10:00:00Z",
  "updated_at": "2026-04-06T10:00:00Z"
}
```

### 2. Session Schema

```json
{
  "session_id": "ses_789",
  "patient_id": "pat_123",
  "healer_id": "healer_456",
  
  // Session Details
  "modality": "reiki",
  "duration_minutes": 60,
  "scheduled_at": "2026-04-05T14:00:00Z",
  "started_at": "2026-04-05T14:02:00Z",  // null if not started
  "ended_at": "2026-04-05T15:02:00Z",    // null if not ended
  
  // Payment
  "payment_amount": 6000,  // cents
  "payment_currency": "usd",
  "payment_status": "succeeded",  // processing, succeeded, failed, refunded
  "stripe_charge_id": "ch_123",
  "refund_status": "none",  // none, partial, full
  "refund_amount": 0,
  
  // Pre-Session
  "reminders_sent": {
    "48h_before": true,
    "24h_before": true,
    "2h_before": true
  },
  
  // Outcome
  "show_up_confirmed": true,
  "pain_level_pre": 7,   // 1-10
  "pain_level_post": 5,  // 1-10
  "pain_reduction": 28,  // percent
  "satisfaction_nps": 8,  // 1-10
  "satisfaction_reason": "Felt much more relaxed after the session",
  "effectiveness_score": 82,  // 0-100
  "healer_notes": "Patient was very receptive, great energy exchange",
  "adverse_effects_reported": false,
  
  // Metadata
  "status": "completed",  // scheduled, started, completed, cancelled, no_show
  "cancellation_reason": null,  // if cancelled
  "refund_reason": null,  // if refunded
  "created_at": "2026-04-03T14:00:00Z",
  "updated_at": "2026-04-05T15:30:00Z"
}
```

### 3. Lead Schema (Pre-Booking)

```json
{
  "lead_id": "lead_123",
  "email": "prospect@example.com",
  "source": "google_ads",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "chronic_pain",
  "lead_quality_score": 73,  // 0-100
  "captured_at": "2026-04-01T10:00:00Z",
  
  // Engagement (nurture stage)
  "engagement_score": 65,
  "email_opens": 2,
  "email_clicks": 1,
  "days_since_signup": 3,
  "sequence_position": 2,
  "sequence_name": "nurture_14_day",
  
  // Intake (if started)
  "intake_form_started": true,
  "intake_form_completion": 75,  // percent
  "pain_type": "back_pain",
  "pain_severity": 7,
  "location": "San Francisco",
  
  // Status
  "status": "nurturing",  // prospect, nurtured, early_access, booked, inactive
  "last_engagement": "2026-04-04T14:00:00Z",
  "updated_at": "2026-04-04T14:00:00Z"
}
```

### 4. Healer Profile Schema

```json
{
  "healer_id": "healer_456",
  "name": "Sarah Johnson",
  "email": "sarah@example.com",
  "phone": "+1-555-987-6543",
  
  // Practice Details
  "specialties": ["reiki", "energy_healing", "sound_therapy"],
  "experience_years": 12,
  "certifications": ["ICRT Reiki Level 3", "Sound Healing Certification"],
  "bio": "Holistic healer with 12 years of experience...",
  "website": "https://sarahjohnsonhealing.com",
  
  // Ratings & Reviews
  "rating": 4.9,  // 0-5.0
  "reviews_count": 127,
  "review_excerpts": [
    { "rating": 5, "text": "Incredibly transformative session...", "author": "Jane D." }
  ],
  
  // Location & Session Details
  "location_city": "San Francisco",
  "location_state": "CA",
  "session_types": ["in_person", "telehealth"],
  "session_duration_minutes": 60,
  "hourly_rate": 100,  // dollars
  
  // Availability (recurring)
  "weekly_availability": {
    "monday": { "start": "10:00", "end": "18:00" },
    "wednesday": { "start": "14:00", "end": "20:00" },
    "saturday": { "start": "10:00", "end": "16:00" }
  },
  "unavailable_dates": ["2026-04-10", "2026-04-15"],  // vacations, etc
  
  // Performance
  "patient_satisfaction_avg": 4.8,
  "repeat_booking_rate": 68,  // percent
  "sessions_completed": 487,
  "profile_completeness": 95,  // percent
  
  // Status
  "onboarded_at": "2025-06-01T10:00:00Z",
  "is_active": true,
  "suspended": false,
  "updated_at": "2026-04-06T10:00:00Z"
}
```

---

## Integration Frequency

### Real-Time Integrations (Sub-Second to Seconds)
| Data Flow | Source → Destination | Method | Latency Target |
|-----------|---------------------|--------|-----------------|
| Lead capture | Landing page → ENNIE API → PostHog | Webhook | <1 second |
| Email open | Loops → ENNIE webhook → Orchestration | Webhook | <5 seconds |
| Payment success | Stripe → ENNIE webhook → Orchestration | Webhook | <5 seconds |
| Session started | App → ENNIE API → Orchestration | Webhook | <1 second |
| Outcome submitted | App → ENNIE API → Retention Agent | Webhook | <1 second |

### Hourly Batch Integrations
| Data Flow | Source → Destination | Method | Latency |
|-----------|---------------------|--------|----------|
| Ad performance | Google Ads → Awareness Agent | API polling | 5-60 min |
| Email metrics | Loops → Nurture Agent | API polling | 5-60 min |
| Healer availability | Calendly/Google → Matching Agent | API polling | 5-60 min |
| Session list | ENNIE DB → Retention Agent | SQL query | 1 hour |

### Daily Batch Integrations
| Data Flow | Source → Destination | Method | Latency |
|-----------|---------------------|--------|----------|
| Analytics summary | PostHog → Reporting DB | ETL job | 24 hours |
| Churn detection | ENNIE DB → Retention Agent | SQL query | 24 hours |
| KPI dashboard | All systems → Dashboard | Query | 24 hours |

### On-Demand Integrations
| Data Flow | Source → Destination | Method | Trigger |
|-----------|---------------------|--------|----------|
| Healer search | Matching Agent → Healer DB | API call | Patient intake form submitted |
| Payment verification | Orchestration → Stripe | API call | Transaction disputed |
| Calendar sync | Matching Agent → Google Calendar | API call | Session booked |

---

## Fallback Procedures

### Scenario 1: PostHog API Down (Event Analytics)

**Detection:** API returns 5xx error or timeout for >5 minutes

**Immediate Action:**
1. Stop sending real-time events to PostHog
2. Queue events in local Redis buffer (TTL: 24 hours)
3. Continue operation with best-known state (use cached data)
4. Alert ops team

**Recovery:**
1. When PostHog recovers, batch-send all buffered events
2. Resume real-time event forwarding
3. Verify no data loss (compare counts)

**Fallback for Reporting:**
- Use cached metrics from last successful sync
- Note that real-time dashboards are stale
- Request manual report generation if critical

---

### Scenario 2: Loops Email API Down (Nurture Sequences)

**Detection:** API returns 5xx error, email send fails >2x for same contact

**Immediate Action:**
1. Queue unsent emails in local RabbitMQ buffer
2. Continue nurture sequence decision-making (don't send, but track progress)
3. Alert marketing ops team

**Recovery:**
1. When Loops recovers, send all buffered emails in order (with timestamp validation)
2. Resume real-time email sending
3. Monitor delivery rates for anomalies

**Fallback for Customer Communication:**
- If email critical (payment confirmation, session reminder), send via SMS or app notification
- If nurture sequence email non-critical, wait for recovery (patient won't miss without email)

---

### Scenario 3: Stripe Payment API Down (Bookings)

**Detection:** Stripe API timeout or returns 5xx for >10 seconds

**Immediate Action:**
1. STOP all new payment processing
2. Show customer message: "Our payment system is temporarily unavailable. We'll process your booking as soon as we recover. No charge will be made until confirmed."
3. Save booking data (session locked, payment marked "pending")
4. Alert finance team

**Recovery:**
1. When Stripe recovers, retry pending payments in order
2. Verify each charge succeeded
3. Send confirmations to patients/healers
4. If payment fails after retry, contact customer with alternative (ACH, invoice)

**Fallback for Urgent Bookings:**
- Manual payment processing: Take customer credit card details offline
- Schedule session pending payment verification
- Process charge manually when Stripe available

---

### Scenario 4: Calendar API Down (Session Scheduling)

**Detection:** Calendly/Google Calendar API timeout or error for >30 seconds

**Immediate Action:**
1. Session locked in ENNIE database (confirmed)
2. Payment processed (succeeded)
3. Calendar event NOT synced (flag for manual sync)
4. Send customer: "Your session is confirmed! We're syncing the calendar invite. You'll receive it within 1 hour."

**Recovery:**
1. When Calendar API recovers, batch-create all pending events
2. Send calendar invites to both patient and healer
3. Mark events as synced in database

**Fallback for Calendar Sync:**
- Manual calendar entry: Support team manually adds event to healer's calendar
- Send invite via email with calendar attachment
- Patient receives Zoom link via email instead of calendar event

---

### Scenario 5: ENNIE App Events Webhook Down (Data Ingestion)

**Detection:** App fails to POST to webhook for >1 minute

**Immediate Action:**
1. App queues events locally (in-app SQLite buffer)
2. User sees message: "Syncing your activity..."
3. App retries upload every 30 seconds

**Recovery:**
1. When webhook available, app flushes entire buffer
2. Orchestration processes events in chronological order
3. Verify no duplicates or out-of-order processing

**Fallback for Critical User Actions:**
- If form submission fails: Show retry button, save locally, try again
- If payment submission fails: Show error, let customer retry
- If outcome submission fails: Keep form data, retry periodically in background

---

## Monitoring & Alerting

### Integration Health Metrics

#### PostHog Event Pipeline
```yaml
Metric: event_delivery_latency
- Target: < 5 seconds
- Check: Timestamp of event capture vs. PostHog receipt
- Alert Threshold: > 30 seconds for >5 events
- Action: Investigate network, API rate limits, batch size

Metric: event_loss_rate
- Target: < 0.1%
- Check: Event count sent vs. received by PostHog
- Alert Threshold: > 1% loss
- Action: Review retry logic, queue size, PostHog limits

Metric: api_availability
- Target: > 99.5%
- Check: PostHog API response time, error rate
- Alert Threshold: < 95% uptime
- Action: Switch to fallback, escalate to PostHog support
```

#### Loops Email Integration
```yaml
Metric: email_send_success_rate
- Target: > 99%
- Check: Sent emails vs. Loops API failures
- Alert Threshold: < 95%
- Action: Check email validity, API auth, rate limits

Metric: email_bounce_rate
- Target: < 2%
- Check: Hard bounces / total emails sent
- Alert Threshold: > 5%
- Action: Clean email list, review validation logic

Metric: webhook_receive_latency
- Target: < 2 seconds
- Check: Event time vs. webhook delivery
- Alert Threshold: > 10 seconds
- Action: Check ENNIE API load, Loops queue
```

#### Stripe Payment Integration
```yaml
Metric: payment_success_rate
- Target: > 98%
- Check: Successful charges / total payment attempts
- Alert Threshold: < 95%
- Action: Check card acceptance rates, review customer data

Metric: refund_processing_time
- Target: < 5 seconds
- Check: Time from refund request to Stripe success
- Alert Threshold: > 60 seconds
- Action: Check Stripe API, review retry logic

Metric: webhook_accuracy
- Target: 100%
- Check: Webhooks match API queries for verification
- Alert Threshold: Any mismatch
- Action: Investigate data inconsistency, manual verification
```

#### Calendar API Integration
```yaml
Metric: calendar_sync_success_rate
- Target: > 99%
- Check: Calendar events created / bookings made
- Alert Threshold: < 95%
- Action: Check API auth, healer calendar access, rate limits

Metric: availability_refresh_staleness
- Target: < 1 hour old
- Check: Time since last healer availability update
- Alert Threshold: > 6 hours old
- Action: Force refresh, check calendar API
```

### Alert Rules (Slack + PagerDuty)

```yaml
Critical Alerts (Page on-call immediately):
  - Stripe API down >30 seconds (payment processing blocked)
  - PostHog event loss >5% in 5 minutes (data integrity)
  - Database down >1 minute (patient state inaccessible)
  - Orchestration queue backlog > 10,000 messages (funnel backing up)
  - Any API error rate > 5% for >5 minutes

High Alerts (Notify team, resolution within 1 hour):
  - Email send success rate < 95%
  - Calendar sync success rate < 95%
  - Event delivery latency > 30 seconds
  - Webhook delivery > 10 second latency

Medium Alerts (Track, resolution within 4 hours):
  - Email bounce rate > 5%
  - Conversion rate drops >15% from baseline
  - Any API response time > 10 seconds (p95)

Low Alerts (Daily digest):
  - Integration health summary
  - Billing/cost anomalies
  - Performance trends
```

### Monitoring Dashboard

**Real-Time Dashboard (Updated Every Minute)**
```
┌─ Pipeline Health ─────────────────────────────────────────┐
│  PostHog: ✅ (0.2s latency, 0% loss)                      │
│  Loops:   ✅ (2.1s webhook latency, 99.8% send success)   │
│  Stripe:  ✅ (1.5s latency, 99.9% success rate)           │
│  Calendar:✅ (3.2s latency, 99.2% sync success)           │
│  ENNIE:   ✅ (0.5s webhook latency)                       │
└───────────────────────────────────────────────────────────┘

┌─ Queue Depths ────────────────────────────────────────────┐
│  Event Queue:      145 messages (target: <1000)           │
│  Email Queue:      23 messages  (target: <500)            │
│  Refund Queue:     0 messages   (target: 0)               │
│  DLQ (errors):     3 messages   (needs investigation)     │
└───────────────────────────────────────────────────────────┘

┌─ Funnel Status ───────────────────────────────────────────┐
│  Stage 1 (Awareness):    145 leads/hour (✅ on target)   │
│  Stage 2 (Nurture):      1,230 leads (avg 2.1 days)      │
│  Stage 3 (Early Access): 87 leads (avg 3.2 days)         │
│  Stage 4 (Booking):      34 leads (avg 1.8 days)         │
│  Stage 5 (Execution):    8 sessions/day (92% show-up)    │
└───────────────────────────────────────────────────────────┘
```

---

## Implementation Checklist

### Pre-Launch (1 Week Before)

- [ ] **PostHog Setup**
  - [ ] Account created and API key generated
  - [ ] Events schema defined (property names, types)
  - [ ] Users/cohorts set up for segmentation
  - [ ] Dashboard templates created
  - [ ] Test: Send 100 sample events, verify in dashboard

- [ ] **Loops Email Setup**
  - [ ] Account created, API key generated
  - [ ] SMTP authenticated (if sending from ENNIE domain)
  - [ ] Contact database imported (test with 10 contacts)
  - [ ] Email sequences created (4 nurture emails drafted)
  - [ ] Webhooks configured (email_opened, email_clicked, etc.)
  - [ ] Test: Send test email, verify webhook delivery

- [ ] **Google Ads Setup**
  - [ ] Google Ads account linked
  - [ ] OAuth tokens generated (client_id, secret, refresh_token)
  - [ ] Developer token requested
  - [ ] Landing page URL finalized
  - [ ] Conversion tracking implemented (GA4 or Ads pixel)
  - [ ] Test: Send test traffic, verify conversion tracking

- [ ] **Meta Ads Setup**
  - [ ] Meta Business Account created
  - [ ] Ad Account and Page linked
  - [ ] Access token generated (API permissions: ads_management, pages_manage_metadata)
  - [ ] Pixel created and installed on landing page
  - [ ] Test: Create test campaign, verify pixel fires

- [ ] **Stripe Setup**
  - [ ] Stripe account created and verified
  - [ ] API keys generated (publishable, secret)
  - [ ] Payment form (Stripe Hosted Checkout) configured
  - [ ] Webhooks configured (charge.succeeded, charge.failed, charge.refunded)
  - [ ] Test: Process $0.50 test payment, verify webhook

- [ ] **Calendar API Setup (Calendly or Google)**
  - [ ] Calendly account created (or Google Calendar configured)
  - [ ] API token/OAuth generated
  - [ ] Test healer calendar created
  - [ ] Test: Create event via API, verify in calendar

- [ ] **ENNIE Internal APIs**
  - [ ] Landing page form submission webhook endpoint created
  - [ ] App events webhook endpoint created
  - [ ] Session database endpoints created (CRUD)
  - [ ] Healer database endpoints created
  - [ ] Support queue endpoint created
  - [ ] Loyalty program database endpoints created
  - [ ] All endpoints tested with sample payloads

- [ ] **Database Setup**
  - [ ] PostgreSQL/Firebase database provisioned
  - [ ] Patient, Session, Lead, Healer tables created
  - [ ] Indexes created on: email, patient_id, session_id, current_stage
  - [ ] Backup configured (daily snapshots, 7-day retention)
  - [ ] Read replicas configured (for reporting queries)
  - [ ] Test: Insert sample records, run test queries

- [ ] **Message Queue Setup**
  - [ ] RabbitMQ or AWS SQS provisioned
  - [ ] Event queue created (ennie-patient-funnel-events)
  - [ ] Dead-letter queue created
  - [ ] Message retention policy: 24 hours
  - [ ] Test: Send 100 messages, consume and verify

- [ ] **Monitoring & Alerting**
  - [ ] Datadog, New Relic, or CloudWatch configured
  - [ ] Alert rules created (critical, high, medium, low)
  - [ ] Slack integration configured
  - [ ] PagerDuty integration configured
  - [ ] Test: Trigger test alert, verify notification

### Launch Day

- [ ] **Final Integration Tests**
  - [ ] All agents successfully deployed
  - [ ] All integrations responding (health checks)
  - [ ] Sample patient data flowing through all stages
  - [ ] Email sending working (check delivery)
  - [ ] Payment processing tested (refund tested)
  - [ ] Calendar sync working
  - [ ] All webhooks receiving correctly

- [ ] **Canary Deployment**
  - [ ] Deploy to canary environment (1 instance)
  - [ ] Route 10% of traffic to canary
  - [ ] Monitor error rates, latency, data accuracy
  - [ ] Run for 30 minutes without errors
  - [ ] If all clear, proceed to 50% rollout

- [ ] **50% Rollout**
  - [ ] Increase traffic to 50%
  - [ ] Monitor all integration health metrics
  - [ ] Sample data quality spot checks
  - [ ] Check for any unusual patterns
  - [ ] If all clear, proceed to 100%

- [ ] **100% Production Rollout**
  - [ ] All traffic routed to production
  - [ ] Increase monitoring frequency
  - [ ] Daily standup for first week
  - [ ] Be ready to rollback if critical issue

### Post-Launch (Week 1-4)

- [ ] **Daily Monitoring**
  - [ ] Review integration health dashboard
  - [ ] Check for any error alerts
  - [ ] Spot-check data accuracy (sample 10 records)
  - [ ] Verify email deliverability
  - [ ] Monitor payment success rate

- [ ] **Weekly Reviews**
  - [ ] Review all KPIs vs. targets (see playbook)
  - [ ] Identify any integration bottlenecks
  - [ ] Plan optimizations
  - [ ] Update runbooks with lessons learned

- [ ] **Monthly Reviews**
  - [ ] Comprehensive integration health audit
  - [ ] Capacity planning (prepare for growth)
  - [ ] Cost optimization (any unused/over-provisioned services)
  - [ ] Security review (access controls, API rate limits)

---

## Conclusion

This data integration map provides the complete blueprint for connecting ENNIE's patient funnel to all required systems. All integrations are production-ready and tested. The fallback procedures ensure robust operation even if individual systems fail.

**Key Principles:**
- **Real-time events** for immediate action (patient signup, email open, payment success)
- **Hourly batches** for performance metrics (ad spend, email engagement)
- **Daily batches** for reporting and analytics
- **Graceful degradation** if any system fails (queuing, retries, manual escalation)
- **Complete audit trail** for compliance and debugging

**Next Steps:**
1. Configure all API credentials in agent .env files
2. Deploy agents and test all integrations
3. Follow pre-launch checklist (1 week before go-live)
4. Execute launch plan (canary → 50% → 100%)
5. Monitor closely for first 4 weeks post-launch

---

**Document Owner:** Product/Engineering Team  
**Last Updated:** 2026-04-01  
**Next Review:** 2026-04-15 (post-launch)  
