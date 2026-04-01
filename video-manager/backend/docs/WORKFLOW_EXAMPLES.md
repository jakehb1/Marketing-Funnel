# Workflow Examples: Real Patient Journeys

This document shows real-world examples of how agents orchestrate multi-step workflows across the ENNIE platform.

## Workflow 1: Awareness → Nurture → Matching → Conversion

**Timeline**: Days 1-30  
**Agents**: Growth Agent → Retention Agent → Matching Agent → Conversion

### Day 1: Patient Enters Platform (Awareness)

**Trigger**: User signs up for ENNIE platform

```bash
# 1. Growth Agent: Create user in patient funnel (awareness stage)
curl -X PUT "http://localhost:5000/api/agents/user/user_abc123/state" \
  -H "x-agent-key: growth_agent_key" \
  -H "Content-Type: application/json" \
  -d '{
    "funnel": "patient",
    "stage": "awareness",
    "status": "active"
  }'
# Response: User created in awareness stage

# 2. Growth Agent: Get approved awareness-stage content
curl -X GET "http://localhost:5000/api/agents/content?funnel=patient&stage=awareness&type=email" \
  -H "x-agent-key: growth_agent_key"
# Returns: [Welcome email, hero image, hero video transcript]

# 3. Growth Agent: Send Day 1 welcome email
curl -X POST "http://localhost:5000/api/agents/send-email" \
  -H "x-agent-key: growth_agent_key" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_abc123",
    "email_address": "patient@example.com",
    "template_id": "tpl_awareness_day1",
    "variables": {
      "first_name": "Sarah",
      "healer_count": "1,250+",
      "cta_url": "https://ennie.com/discover"
    }
  }'
# Response: Email logged and sent

# 4. Growth Agent: Log action for audit
curl -X POST "http://localhost:5000/api/agents/user/user_abc123/log" \
  -H "x-agent-key: growth_agent_key" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "sent_day1_welcome",
    "action_type": "email",
    "result": "success",
    "details": {
      "email": "patient@example.com",
      "template": "awareness_day1"
    }
  }'
```

**Database State After Day 1**

```sql
-- user_states
user_id: user_abc123
funnel: patient
current_stage: awareness
status: active
entered_at: 2026-04-01 09:00:00
last_action_at: 2026-04-01 09:05:00

-- email_logs
user_id: user_abc123
email_address: patient@example.com
template_id: tpl_awareness_day1
status: sent
sent_at: 2026-04-01 09:05:00

-- agent_logs
agent_name: growth-agent
user_id: user_abc123
action: sent_day1_welcome
action_type: email
result: success
```

### Day 3: Patient Opens Email (Interest)

**Trigger**: Automated (opens email or clicks link)

```bash
# 1. Growth Agent: Update to interest stage
curl -X PUT "http://localhost:5000/api/agents/user/user_abc123/state" \
  -H "x-agent-key: growth_agent_key" \
  -H "Content-Type: application/json" \
  -d '{
    "funnel": "patient",
    "stage": "interest",
    "status": "active"
  }'

# 2. Growth Agent: Send Day 3 nurture email (introduce healers)
curl -X POST "http://localhost:5000/api/agents/send-email" \
  -H "x-agent-key: growth_agent_key" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_abc123",
    "email_address": "patient@example.com",
    "template_id": "tpl_interest_day3",
    "variables": {
      "first_name": "Sarah",
      "healer_specialty": "Reiki",
      "top_healer": "Maria Santos",
      "testimonial": "Best healing experience of my life!"
    }
  }'
```

### Day 7: Reminder Email (Nurture)

```bash
# 1. Growth Agent: Update stage to consideration
curl -X PUT "http://localhost:5000/api/agents/user/user_abc123/state" \
  -H "x-agent-key: growth_agent_key" \
  -H "Content-Type: application/json" \
  -d '{
    "funnel": "patient",
    "stage": "consideration",
    "status": "active"
  }'

# 2. Growth Agent: Send Day 7 social proof email
curl -X POST "http://localhost:5000/api/agents/send-email" \
  -H "x-agent-key: growth_agent_key" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_abc123",
    "email_address": "patient@example.com",
    "template_id": "tpl_nurture_day7",
    "variables": {
      "first_name": "Sarah",
      "testimonials_count": "4,127",
      "avg_rating": "4.8/5"
    }
  }'
```

### Day 14: Patient Still Inactive → Retention Check

**Trigger**: Retention Agent sees no action in 7+ days

```bash
# 1. Retention Agent: Check at-risk users
curl -X GET "http://localhost:5000/api/agents/funnel/patient/stats" \
  -H "x-agent-key: retention_agent_key"
# Identifies user_abc123 as at_risk (no action in 7 days)

# 2. Retention Agent: Send re-engagement email
curl -X POST "http://localhost:5000/api/agents/send-email" \
  -H "x-agent-key: retention_agent_key" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_abc123",
    "email_address": "patient@example.com",
    "template_id": "tpl_reengagement_day14",
    "variables": {
      "first_name": "Sarah",
      "discount": "20% off first session"
    }
  }'
```

### Day 20: Patient Clicks Link → Ready for Matching

**Trigger**: Patient clicks "Find a Healer" button

```bash
# 1. Growth Agent: Update to nurture stage
curl -X PUT "http://localhost:5000/api/agents/user/user_abc123/state" \
  -H "x-agent-key: growth_agent_key" \
  -H "Content-Type: application/json" \
  -d '{
    "funnel": "patient",
    "stage": "nurture",
    "status": "active"
  }'

# 2. Matching Agent: Query expert reiki healers
curl -X GET "http://localhost:5000/api/agents/healers?experience=expert&availability=true&specialties=reiki" \
  -H "x-agent-key: matching_agent_key"
# Returns: [Maria Santos (4.9★), John Lee (4.8★), Lisa Chen (4.7★)]

# 3. Matching Agent: Match patient with best healer
curl -X POST "http://localhost:5000/api/agents/match" \
  -H "x-agent-key: matching_agent_key" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "user_abc123",
    "healer_filters": {
      "experience": "expert",
      "specialties": ["reiki"],
      "minRating": 4.7
    }
  }'
# Response: Matched with Maria Santos

# 4. Growth Agent: Update to conversion stage
curl -X PUT "http://localhost:5000/api/agents/user/user_abc123/state" \
  -H "x-agent-key: growth_agent_key" \
  -H "Content-Type: application/json" \
  -d '{
    "funnel": "patient",
    "stage": "conversion",
    "status": "active"
  }'

# 5. Growth Agent: Send matching confirmation email
curl -X POST "http://localhost:5000/api/agents/send-email" \
  -H "x-agent-key: growth_agent_key" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_abc123",
    "email_address": "patient@example.com",
    "template_id": "tpl_match_confirmed",
    "variables": {
      "first_name": "Sarah",
      "healer_name": "Maria Santos",
      "healer_specialty": "Reiki Master",
      "rating": "4.9/5",
      "book_url": "https://ennie.com/book/maria-santos"
    }
  }'

# 6. Growth Agent: Log conversion
curl -X POST "http://localhost:5000/api/agents/user/user_abc123/log" \
  -H "x-agent-key: growth_agent_key" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "matched_with_healer",
    "action_type": "match",
    "result": "success",
    "details": {
      "healer_id": "healer_maria_santos",
      "compatibility_score": 0.89
    }
  }'
```

### Day 21: Patient Books Session → Conversion Complete

**Trigger**: Patient books session with Maria (off-platform or on booking page)

```bash
# Retention Agent: Track conversion
curl -X POST "http://localhost:5000/api/agents/user/user_abc123/log" \
  -H "x-agent-key: retention_agent_key" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "booking_completed",
    "action_type": "conversion",
    "result": "success",
    "details": {
      "healer_id": "healer_maria_santos",
      "session_type": "60-minute reiki",
      "amount": 85.00
    }
  }'

# Growth Agent: Update to completed
curl -X PUT "http://localhost:5000/api/agents/user/user_abc123/state" \
  -H "x-agent-key: growth_agent_key" \
  -H "Content-Type: application/json" \
  -d '{
    "funnel": "patient",
    "stage": "conversion",
    "status": "completed"
  }'
```

**Final Journey Metrics**

```
Total Days: 21
Email Opens: 3/4 (75%)
Click-through Rate: 50% (2/4 emails)
Conversion: YES ✓
Time to Booking: 21 days
Cost per Acquisition: $5 (email costs only)
Revenue: $85 (booking value)
ROI: 1,700%
```

---

## Workflow 2: Healer Onboarding

**Timeline**: Days 1-3  
**Agents**: Growth Agent → Matching Agent

### Day 1: Healer Submits Profile

```bash
# 1. Growth Agent: Create healer in untrained funnel
curl -X PUT "http://localhost:5000/api/agents/user/healer_xyz789/state" \
  -H "x-agent-key: growth_agent_key" \
  -H "Content-Type: application/json" \
  -d '{
    "funnel": "healer",
    "stage": "profile_created",
    "status": "active"
  }'

# 2. Growth Agent: Send onboarding email
curl -X POST "http://localhost:5000/api/agents/send-email" \
  -H "x-agent-key: growth_agent_key" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "healer_xyz789",
    "email_address": "healer@example.com",
    "template_id": "tpl_healer_welcome",
    "variables": {
      "healer_name": "Maria Santos",
      "next_step": "Complete your availability calendar"
    }
  }'
```

### Day 2: Healer Completes Availability

```bash
# 1. Matching Agent: Update healer availability
curl -X PUT "http://localhost:5000/api/agents/healers/healer_maria_santos/availability" \
  -H "x-agent-key: matching_agent_key" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "available"
  }'

# 2. Growth Agent: Update funnel state
curl -X PUT "http://localhost:5000/api/agents/user/healer_xyz789/state" \
  -H "x-agent-key: growth_agent_key" \
  -H "Content-Type: application/json" \
  -d '{
    "funnel": "healer",
    "stage": "ready_to_accept_patients",
    "status": "active"
  }'

# 3. Growth Agent: Send activation email
curl -X POST "http://localhost:5000/api/agents/send-email" \
  -H "x-agent-key: growth_agent_key" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "healer_xyz789",
    "email_address": "healer@example.com",
    "template_id": "tpl_healer_activated",
    "variables": {
      "healer_name": "Maria",
      "first_patient_expected": "within 48 hours"
    }
  }'
```

---

## Workflow 3: Real-time Email Campaign Sequence

**Timeline**: 30 days  
**Agents**: Growth Agent → Retention Agent

### Automated Email Sequence (Day 1, 7, 14, 30)

```bash
#!/bin/bash

# Get all users in awareness stage
curl -X GET "http://localhost:5000/api/agents/funnel/patient/stats" \
  -H "x-agent-key: growth_agent_key" | jq

# For each user, send sequence email
USERS=$(psql -t -c "SELECT user_id FROM user_states WHERE funnel='patient' AND current_stage='awareness'")

for user_id in $USERS; do
  # Get user email
  email=$(psql -t -c "SELECT email FROM users WHERE id='$user_id'")
  
  # Send Day 1 email
  curl -X POST "http://localhost:5000/api/agents/send-email" \
    -H "x-agent-key: growth_agent_key" \
    -H "Content-Type: application/json" \
    -d "{
      \"user_id\": \"$user_id\",
      \"email_address\": \"$email\",
      \"template_id\": \"tpl_day1\",
      \"variables\": {}
    }"
  
  sleep 1  # Rate limiting
done
```

---

## Workflow 4: Churn Detection & Re-engagement

**Timeline**: Ongoing  
**Agents**: Retention Agent

```bash
# Run hourly
#!/bin/bash

# Check for at-risk users (no action in 14 days)
AT_RISK=$(psql -t -c "
  SELECT user_id FROM user_states 
  WHERE funnel='patient' 
  AND status='active'
  AND (last_action_at IS NULL OR last_action_at < NOW() - interval '14 days')
  LIMIT 100
")

for user_id in $AT_RISK; do
  email=$(psql -t -c "SELECT email FROM users WHERE id='$user_id'")
  
  # Get user state
  STAGE=$(psql -t -c "SELECT current_stage FROM user_states WHERE user_id='$user_id'")
  
  # Send appropriate re-engagement email
  case $STAGE in
    "awareness")
      template="tpl_reeng_awareness"
      ;;
    "interest")
      template="tpl_reeng_interest"
      ;;
    "consideration")
      template="tpl_reeng_special_offer"
      ;;
  esac
  
  curl -X POST "http://localhost:5000/api/agents/send-email" \
    -H "x-agent-key: retention_agent_key" \
    -H "Content-Type: application/json" \
    -d "{
      \"user_id\": \"$user_id\",
      \"email_address\": \"$email\",
      \"template_id\": \"$template\",
      \"variables\": {}
    }"
  
  sleep 1
done
```

---

## Workflow 5: Daily Funnel Reporting

**Timeline**: Daily (8 AM)  
**Agents**: Growth Agent (querying metrics)

```bash
#!/bin/bash
# Daily funnel health report

echo "=== PATIENT FUNNEL HEALTH ===="

# Get funnel stats
curl -s -X GET "http://localhost:5000/api/agents/funnel/patient/stats" \
  -H "x-agent-key: growth_agent_key" | jq '
  {
    "awareness_users": .data.stages[] | select(.stage=="awareness") | .user_count,
    "interest_users": .data.stages[] | select(.stage=="interest") | .user_count,
    "consideration_users": .data.stages[] | select(.stage=="consideration") | .user_count,
    "conversion_users": .data.stages[] | select(.stage=="conversion") | .user_count,
    "daily_conversions": .data.daily_conversions.total_conversions,
    "daily_revenue": .data.daily_conversions.total_revenue
  }
'

# Get agent performance
curl -s -X GET "http://localhost:5000/api/agents/metrics?funnel=patient&days=1" \
  -H "x-agent-key: growth_agent_key" | jq '.data.metrics[0]'

# Send report to Slack/email
# (Integration code here)
```

---

## Workflow 6: A/B Testing Email Variants

**Timeline**: 7 days  
**Agents**: Growth Agent

```bash
# Split users into A/B groups
A_GROUP_USERS=$(psql -t -c "
  SELECT user_id FROM user_states 
  WHERE funnel='patient' 
  AND current_stage='awareness'
  AND user_id::uuid % 2 = 0  -- Even IDs
  LIMIT 500
")

B_GROUP_USERS=$(psql -t -c "
  SELECT user_id FROM user_states 
  WHERE funnel='patient' 
  AND current_stage='awareness'
  AND user_id::uuid % 2 = 1  -- Odd IDs
  LIMIT 500
")

# Send A variant (subject: "Discover...")
for user_id in $A_GROUP_USERS; do
  email=$(psql -t -c "SELECT email FROM users WHERE id='$user_id'")
  
  curl -X POST "http://localhost:5000/api/agents/send-email" \
    -H "x-agent-key: growth_agent_key" \
    -H "Content-Type: application/json" \
    -d "{
      \"user_id\": \"$user_id\",
      \"email_address\": \"$email\",
      \"template_id\": \"tpl_variant_a\",
      \"variables\": {
        \"subject_line\": \"Discover Your Perfect Healer\"
      }
    }"
done

# Send B variant (subject: "Meet...")
for user_id in $B_GROUP_USERS; do
  email=$(psql -t -c "SELECT email FROM users WHERE id='$user_id'")
  
  curl -X POST "http://localhost:5000/api/agents/send-email" \
    -H "x-agent-key: growth_agent_key" \
    -H "Content-Type: application/json" \
    -d "{
      \"user_id\": \"$user_id\",
      \"email_address\": \"$email\",
      \"template_id\": \"tpl_variant_b\",
      \"variables\": {
        \"subject_line\": \"Meet 1,200+ Healers\"
      }
    }"
done

# After 7 days, compare conversion rates
# ...
```

---

## Key Metrics to Track

For each workflow:

| Metric | Formula | Target |
|--------|---------|--------|
| Awareness → Interest | Click rate on Day 1 email | >30% |
| Interest → Consideration | Open rate on Day 3 email | >40% |
| Consideration → Conversion | Booking rate | >15% |
| Time to Match | Days from awareness to match | <21 days |
| Churn Rate | Users marked churned | <10% |
| CAC | Total marketing spend / conversions | <$10 |
| Healer Activation | Time from signup to first booking | <7 days |

---

**Version**: 1.0.0  
**Last Updated**: 2026-04-01
