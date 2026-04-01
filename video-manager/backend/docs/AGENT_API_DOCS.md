# Agent Orchestration API Documentation

## Overview

The Agent Orchestration API provides a comprehensive interface for autonomous agents (Growth, Voice, Matching, Retention) to interact with the ENNIE marketing platform. All endpoints follow a standard response format with request tracking, audit logging, and approval-gated content access.

## Table of Contents

1. [Authentication](#authentication)
2. [Response Format](#response-format)
3. [Content Access Endpoints](#content-access-endpoints)
4. [Funnel State Management](#funnel-state-management)
5. [Email/SMS Sending](#emailsms-sending)
6. [Patient-Healer Matching](#patient-healer-matching)
7. [Metrics & Analytics](#metrics--analytics)
8. [Real-time Dashboard](#real-time-dashboard)
9. [Error Handling](#error-handling)
10. [Examples](#examples)

---

## Authentication

All agent endpoints require API key authentication via the `x-agent-key` header.

### Header Format

```
x-agent-key: <agent_api_key>
```

### Example

```bash
curl -X GET "http://localhost:5000/api/agents/content?funnel=patient&stage=awareness" \
  -H "x-agent-key: growth_agent_key_123456"
```

### Agent Types & Keys

- **Growth Agent**: `GROWTH_AGENT_KEY` — Drives user acquisition and funnel progression
- **Voice Agent**: `VOICE_AGENT_KEY` — Manages video content, transcripts, voice creation
- **Matching Agent**: `MATCHING_AGENT_KEY` — Patient-healer matching & availability
- **Retention Agent**: `RETENTION_AGENT_KEY` — Engagement, churn detection, re-engagement

Each key is stored in the database and logged on every request.

---

## Response Format

All successful responses follow this structure:

```json
{
  "status": "success",
  "data": { ... },
  "requestId": "req_a1b2c3d4",
  "timestamp": "2026-04-01T22:00:00Z",
  "agentName": "growth-agent",
  "action": "get_content"
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `success` or `error` |
| `data` | object/array | Response payload (varies by endpoint) |
| `requestId` | string | Unique request ID for audit trail |
| `timestamp` | ISO string | Request timestamp |
| `agentName` | string | Agent that made the request |
| `action` | string | API action performed |
| `error` | string | Error message (on failure) |

---

## Content Access Endpoints

### GET /api/agents/content

Get approved marketing content (copy, images, videos) for a funnel stage.

**Parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `funnel` | string | Yes | `patient`, `healer`, `untrained`, `referral`, `owned` |
| `stage` | string | Yes | `awareness`, `interest`, `consideration`, `nurture`, `conversion` |
| `type` | string | No | `video`, `transcript`, `image`, `copy`, `landing_page` |

**Example Request**

```bash
curl -X GET "http://localhost:5000/api/agents/content?funnel=patient&stage=awareness&type=email" \
  -H "x-agent-key: growth_agent_key_123456"
```

**Example Response**

```json
{
  "status": "success",
  "data": {
    "assets": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "asset_type": "copy",
        "name": "Awareness Email 1",
        "content_url": "s3://bucket/awareness-1.html",
        "content_text": "Discover the power of energy healing...",
        "metadata": { "tone": "warm", "cta": "Learn More" },
        "approved_at": "2026-03-20T10:00:00Z"
      }
    ],
    "count": 1
  },
  "requestId": "req_a1b2c3d4",
  "timestamp": "2026-04-01T22:00:00Z",
  "agentName": "growth-agent",
  "action": "get_content"
}
```

**Rules**

- Only returns **approved** content (approval_status = 'approved')
- If content is not approved, agent cannot access it
- Sorted by approval date (newest first)

---

### GET /api/agents/transcripts

Get approved video transcripts for copy generation.

**Parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `approved` | boolean | No | Filter by approval status (true/false) |
| `funnel` | string | No | Filter by funnel |

**Example Request**

```bash
curl -X GET "http://localhost:5000/api/agents/transcripts?approved=true&funnel=patient" \
  -H "x-agent-key: voice_agent_key_123456"
```

**Example Response**

```json
{
  "status": "success",
  "data": {
    "transcripts": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "title": "Introduction to Reiki",
        "funnel": "patient",
        "text": "Welcome to this introduction to reiki...",
        "language": "en",
        "approval_status": "approved"
      }
    ],
    "count": 1
  },
  "requestId": "req_a1b2c3d5",
  "timestamp": "2026-04-01T22:00:00Z",
  "agentName": "voice-agent",
  "action": "get_transcripts"
}
```

---

### GET /api/agents/assets/:id

Get a single asset with approval status.

**Parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | UUID | Yes | Asset ID |

**Example Request**

```bash
curl -X GET "http://localhost:5000/api/agents/assets/550e8400-e29b-41d4-a716-446655440000" \
  -H "x-agent-key: growth_agent_key_123456"
```

**Rules**

- Returns `403 Forbidden` if asset not approved
- Only approved assets are accessible to agents

---

### GET /api/agents/email-templates

List all approved email templates for a funnel/stage.

**Parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `funnel` | string | No | Filter by funnel |
| `stage` | string | No | Filter by stage |

**Example Request**

```bash
curl -X GET "http://localhost:5000/api/agents/email-templates?funnel=patient&stage=awareness" \
  -H "x-agent-key: growth_agent_key_123456"
```

**Example Response**

```json
{
  "status": "success",
  "data": {
    "templates": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "name": "Day 1 Welcome Email",
        "funnel": "patient",
        "stage": "awareness",
        "subject": "Welcome to ENNIE - Discover Your Perfect Healer",
        "variables": ["first_name", "healer_type", "cta_url"],
        "created_at": "2026-03-15T10:00:00Z"
      }
    ],
    "count": 1
  },
  "requestId": "req_a1b2c3d6",
  "timestamp": "2026-04-01T22:00:00Z",
  "agentName": "growth-agent",
  "action": "list_email_templates"
}
```

---

## Funnel State Management

### GET /api/agents/user/:userId/state

Get a user's current progression across all funnels.

**Parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `userId` | string | Yes | User ID |

**Example Request**

```bash
curl -X GET "http://localhost:5000/api/agents/user/user_12345/state" \
  -H "x-agent-key: growth_agent_key_123456"
```

**Example Response**

```json
{
  "status": "success",
  "data": {
    "userStates": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440003",
        "user_id": "user_12345",
        "funnel": "patient",
        "current_stage": "awareness",
        "entered_at": "2026-03-20T10:00:00Z",
        "last_action_at": "2026-03-25T14:30:00Z",
        "status": "active",
        "metadata": {}
      }
    ]
  },
  "requestId": "req_a1b2c3d7",
  "timestamp": "2026-04-01T22:00:00Z",
  "agentName": "growth-agent",
  "action": "get_user_state"
}
```

---

### PUT /api/agents/user/:userId/state

Update a user's funnel progression.

**Parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `userId` | string | Yes | User ID |

**Request Body**

```json
{
  "funnel": "patient",
  "stage": "interest",
  "status": "active"
}
```

**Example Request**

```bash
curl -X PUT "http://localhost:5000/api/agents/user/user_12345/state" \
  -H "x-agent-key: growth_agent_key_123456" \
  -H "Content-Type: application/json" \
  -d '{
    "funnel": "patient",
    "stage": "interest",
    "status": "active"
  }'
```

**Rules**

- Creates state if it doesn't exist
- Updates last_action_at automatically
- Valid stages: `awareness`, `interest`, `consideration`, `nurture`, `conversion`
- Valid statuses: `active`, `paused`, `completed`, `churned`

---

### POST /api/agents/user/:userId/log

Log an action performed on behalf of the user (audit trail).

**Request Body**

```json
{
  "action": "sent_welcome_email",
  "action_type": "email",
  "result": "success",
  "details": {
    "template_id": "550e8400-e29b-41d4-a716-446655440002",
    "email_address": "user@example.com"
  }
}
```

**Example Request**

```bash
curl -X POST "http://localhost:5000/api/agents/user/user_12345/log" \
  -H "x-agent-key: growth_agent_key_123456" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "sent_welcome_email",
    "action_type": "email",
    "result": "success",
    "details": {
      "template_id": "550e8400-e29b-41d4-a716-446655440002"
    }
  }'
```

---

### GET /api/agents/funnel/:funnel/stats

Get real-time funnel metrics (users at each stage, conversion rates, CAC).

**Parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `funnel` | string | Yes | Funnel name |

**Example Request**

```bash
curl -X GET "http://localhost:5000/api/agents/funnel/patient/stats" \
  -H "x-agent-key: growth_agent_key_123456"
```

**Example Response**

```json
{
  "status": "success",
  "data": {
    "funnel": "patient",
    "stages": [
      {
        "stage": "awareness",
        "user_count": 1500,
        "active_users": 1200,
        "churned_users": 250,
        "completed_users": 50
      },
      {
        "stage": "interest",
        "user_count": 800,
        "active_users": 700,
        "churned_users": 80,
        "completed_users": 20
      }
    ],
    "daily_conversions": {
      "total_conversions": 45,
      "match_conversions": 30,
      "booking_conversions": 10,
      "payment_conversions": 5,
      "total_revenue": 2500.00
    },
    "timestamp": "2026-04-01T22:00:00Z"
  },
  "requestId": "req_a1b2c3d8",
  "timestamp": "2026-04-01T22:00:00Z",
  "agentName": "growth-agent",
  "action": "get_funnel_stats"
}
```

---

## Email/SMS Sending

### POST /api/agents/send-email

Send a personalized email from an approved template.

**Request Body**

```json
{
  "user_id": "user_12345",
  "email_address": "user@example.com",
  "template_id": "550e8400-e29b-41d4-a716-446655440002",
  "variables": {
    "first_name": "John",
    "healer_type": "Reiki Master",
    "cta_url": "https://ennie.com/match/123"
  }
}
```

**Example Request**

```bash
curl -X POST "http://localhost:5000/api/agents/send-email" \
  -H "x-agent-key: growth_agent_key_123456" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_12345",
    "email_address": "user@example.com",
    "template_id": "550e8400-e29b-41d4-a716-446655440002",
    "variables": {
      "first_name": "John",
      "healer_type": "Reiki Master"
    }
  }'
```

**Example Response**

```json
{
  "status": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440004",
    "user_id": "user_12345",
    "email_address": "user@example.com",
    "template_id": "550e8400-e29b-41d4-a716-446655440002",
    "subject": "Welcome to ENNIE - Discover Your Perfect Reiki Master",
    "status": "sent",
    "sent_at": "2026-04-01T22:00:00Z"
  },
  "requestId": "req_a1b2c3d9",
  "timestamp": "2026-04-01T22:00:00Z",
  "agentName": "growth-agent",
  "action": "send_email"
}
```

**Rules**

- Template must be approved (approval_status = 'approved')
- Variables replace `{{key}}` placeholders in template
- Returns `403 Forbidden` if template not approved
- All sends logged to `email_logs` table automatically

---

### POST /api/agents/send-sms

Send an SMS from an approved template.

**Request Body**

```json
{
  "user_id": "user_12345",
  "phone_number": "+1-555-0123",
  "template_id": "550e8400-e29b-41d4-a716-446655440005",
  "variables": {
    "first_name": "John"
  }
}
```

**Rules**

- Template must be approved and type = 'sms'
- Phone number must be valid E.164 format
- All sends logged to `sms_logs` table automatically

---

## Patient-Healer Matching

### POST /api/agents/match

Match a patient with the best available healer.

**Request Body**

```json
{
  "patient_id": "user_12345",
  "healer_filters": {
    "experience": "expert",
    "specialties": ["reiki", "sound_healing"],
    "minRating": 4.5
  },
  "compatibility_threshold": 0.8
}
```

**Example Request**

```bash
curl -X POST "http://localhost:5000/api/agents/match" \
  -H "x-agent-key: matching_agent_key_123456" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "user_12345",
    "healer_filters": {
      "experience": "expert",
      "specialties": ["reiki"]
    }
  }'
```

**Example Response**

```json
{
  "status": "success",
  "data": {
    "match": {
      "id": "550e8400-e29b-41d4-a716-446655440006",
      "patient_id": "user_12345",
      "healer_id": "550e8400-e29b-41d4-a716-446655440007",
      "compatibility_score": 0.87,
      "match_reason": "Matched by agent algorithm",
      "status": "pending",
      "matched_at": "2026-04-01T22:00:00Z"
    },
    "healer": {
      "id": "550e8400-e29b-41d4-a716-446655440007",
      "name": "Sarah Chen",
      "experience_level": "expert",
      "specialties": ["reiki", "sound_healing"],
      "rating": 4.8,
      "review_count": 157
    }
  },
  "requestId": "req_a1b2c3da",
  "timestamp": "2026-04-01T22:00:00Z",
  "agentName": "matching-agent",
  "action": "match_patient_healer"
}
```

---

### GET /api/agents/healers

Query available healers by filters.

**Parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `experience` | string | No | `beginner`, `intermediate`, `advanced`, `expert` |
| `availability` | boolean | No | true/false for available only |
| `specialties` | string | No | Comma-separated list: `reiki,sound_healing,ayurveda` |
| `limit` | integer | No | Max results (default 50) |

**Example Request**

```bash
curl -X GET "http://localhost:5000/api/agents/healers?experience=expert&availability=true&specialties=reiki" \
  -H "x-agent-key: matching_agent_key_123456"
```

---

### GET /api/agents/healers/:id/availability

Check healer's availability and calendar.

**Example Request**

```bash
curl -X GET "http://localhost:5000/api/agents/healers/550e8400-e29b-41d4-a716-446655440007/availability" \
  -H "x-agent-key: matching_agent_key_123456"
```

---

### PUT /api/agents/healers/:id/availability

Update healer's availability status.

**Request Body**

```json
{
  "status": "busy"
}
```

**Valid Statuses**: `available`, `busy`, `unavailable`

---

## Metrics & Analytics

### GET /api/agents/metrics

Get agent performance metrics (7 days).

**Parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `funnel` | string | No | Filter by funnel |
| `days` | integer | No | Days to include (1-90, default 7) |

**Example Response**

```json
{
  "status": "success",
  "data": {
    "metrics": [
      {
        "date": "2026-04-01",
        "total_actions": 250,
        "email_actions": 150,
        "sms_actions": 50,
        "match_actions": 30,
        "successful_actions": 245
      }
    ]
  }
}
```

---

### GET /api/agents/cohort/:cohortId/performance

Track cohort conversion rates.

**Example Response**

```json
{
  "status": "success",
  "data": {
    "cohort_performance": [
      {
        "funnel": "patient",
        "users": 500,
        "conversions": 75,
        "total_revenue": 15000.00,
        "match_conversions": 45
      }
    ]
  }
}
```

---

### GET /api/agents/conversion-rate

Get conversion rates by funnel and stage.

**Parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `funnel` | string | No | Filter by funnel |
| `stage` | string | No | Filter by stage |

**Example Response**

```json
{
  "status": "success",
  "data": {
    "conversion_rates": [
      {
        "stage": "awareness",
        "users_in_stage": 1500,
        "converted_users": 300,
        "conversion_rate": 20.00
      },
      {
        "stage": "interest",
        "users_in_stage": 800,
        "converted_users": 160,
        "conversion_rate": 20.00
      }
    ]
  }
}
```

---

## Real-time Dashboard

### GET /api/dashboard/agents

View all agents and their activity (Charlie only).

**Header**: `x-charlie-pin: <pin>`

**Response**

```json
{
  "agents": [
    {
      "agent_name": "growth-agent",
      "last_used": "2026-04-01T21:50:00Z",
      "total_actions": 1250,
      "actions_last_hour": 45,
      "successful_actions": 1230,
      "failed_actions": 20,
      "last_action": "2026-04-01T21:50:00Z"
    }
  ],
  "total_agents": 4,
  "active_agents": 3
}
```

---

### GET /api/dashboard/funnel/:funnel

Live funnel metrics dashboard.

**Response**

```json
{
  "funnel": "patient",
  "totals": {
    "total_users": 2300,
    "active_users": 1900,
    "churned_users": 330,
    "completed_users": 70
  },
  "by_stage": [ ... ],
  "conversion_rates": [ ... ],
  "daily_metrics": [ ... ]
}
```

---

### GET /api/dashboard/approvals

Recent approvals/rejections by Charlie.

---

### GET /api/dashboard/conversions

Real-time conversion summary.

---

## Error Handling

### Error Response Format

```json
{
  "status": "error",
  "data": null,
  "requestId": "req_a1b2c3db",
  "timestamp": "2026-04-01T22:00:00Z",
  "agentName": "growth-agent",
  "action": "send_email",
  "error": "Email template not approved for use"
}
```

### Common HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Content retrieved |
| 201 | Created | Email/SMS logged |
| 400 | Bad Request | Missing required field |
| 401 | Unauthorized | Invalid API key |
| 403 | Forbidden | Content not approved |
| 404 | Not Found | User/asset doesn't exist |
| 500 | Server Error | Database error |

---

## Examples

### Complete Workflow: Awareness → Interest

```bash
# 1. Create/update user state (awareness)
curl -X PUT "http://localhost:5000/api/agents/user/user_12345/state" \
  -H "x-agent-key: growth_agent_key_123456" \
  -H "Content-Type: application/json" \
  -d '{
    "funnel": "patient",
    "stage": "awareness",
    "status": "active"
  }'

# 2. Get approved content
curl -X GET "http://localhost:5000/api/agents/content?funnel=patient&stage=awareness&type=email" \
  -H "x-agent-key: growth_agent_key_123456"

# 3. Send welcome email
curl -X POST "http://localhost:5000/api/agents/send-email" \
  -H "x-agent-key: growth_agent_key_123456" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_12345",
    "email_address": "user@example.com",
    "template_id": "<template_id>",
    "variables": {
      "first_name": "John"
    }
  }'

# 4. Update to interest stage
curl -X PUT "http://localhost:5000/api/agents/user/user_12345/state" \
  -H "x-agent-key: growth_agent_key_123456" \
  -H "Content-Type: application/json" \
  -d '{
    "funnel": "patient",
    "stage": "interest",
    "status": "active"
  }'

# 5. Send interest-stage email (day 3)
curl -X POST "http://localhost:5000/api/agents/send-email" \
  -H "x-agent-key: growth_agent_key_123456" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_12345",
    "email_address": "user@example.com",
    "template_id": "<interest_template_id>",
    "variables": {
      "first_name": "John"
    }
  }'

# 6. Check funnel metrics
curl -X GET "http://localhost:5000/api/agents/funnel/patient/stats" \
  -H "x-agent-key: growth_agent_key_123456"
```

### Complete Workflow: Patient Matching

```bash
# 1. Query available expert healers
curl -X GET "http://localhost:5000/api/agents/healers?experience=expert&availability=true" \
  -H "x-agent-key: matching_agent_key_123456"

# 2. Match patient with healer
curl -X POST "http://localhost:5000/api/agents/match" \
  -H "x-agent-key: matching_agent_key_123456" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "user_12345",
    "healer_filters": {
      "experience": "expert",
      "specialties": ["reiki"],
      "minRating": 4.5
    }
  }'

# 3. Log match action
curl -X POST "http://localhost:5000/api/agents/user/user_12345/log" \
  -H "x-agent-key: matching_agent_key_123456" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "matched_with_healer",
    "action_type": "match",
    "result": "success",
    "details": {
      "healer_id": "<healer_id>",
      "compatibility_score": 0.87
    }
  }'

# 4. Update to conversion stage
curl -X PUT "http://localhost:5000/api/agents/user/user_12345/state" \
  -H "x-agent-key: growth_agent_key_123456" \
  -H "Content-Type: application/json" \
  -d '{
    "funnel": "patient",
    "stage": "conversion",
    "status": "completed"
  }'
```

---

## Rate Limiting

- Standard rate limit: 100 requests per 15 minutes per API key
- Bulk operations: Contact engineering for higher limits

---

## Support

For API questions or issues, contact: `api-support@ennie.com`

---

**Last Updated**: 2026-04-01  
**Version**: 1.0.0  
**Status**: Production Ready
