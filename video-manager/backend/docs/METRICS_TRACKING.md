# Metrics Tracking Guide

## Overview

ENNIE's Agent Orchestration API automatically tracks all actions, conversions, and metrics. This guide explains what gets tracked, how to query it, and how to use metrics for optimization.

## What Gets Tracked

### 1. Agent Actions (agent_logs)

Every action performed by every agent is logged with:

| Field | Description |
|-------|-------------|
| `agent_name` | Which agent performed the action |
| `user_id` | User affected (if applicable) |
| `action` | What action (send_email, match_patient, etc.) |
| `action_type` | Category: email, sms, match, query, state_update, conversion, other |
| `result` | success, failed, partial |
| `request_id` | Unique ID for tracing |
| `details` | JSON with context-specific data |
| `error_message` | Error details if failed |
| `created_at` | Timestamp |

### 2. User Progression (user_states)

Track user journey through funnels:

| Field | Description |
|-------|-------------|
| `user_id` | User ID |
| `funnel` | patient, healer, untrained, referral, owned |
| `current_stage` | Current stage in funnel |
| `entered_at` | When user entered this funnel |
| `last_action_at` | Last time user did something |
| `status` | active, paused, completed, churned, at_risk |
| `metadata` | JSON with custom data |

### 3. Conversions (conversions)

Track conversions across the funnel:

| Field | Description |
|-------|-------------|
| `user_id` | User ID |
| `funnel` | Which funnel converted |
| `stage` | Stage where conversion happened |
| `conversion_type` | match, booking, payment, retention |
| `amount` | Revenue (if applicable) |
| `trigger_agent` | Which agent triggered conversion |
| `created_at` | Timestamp |

### 4. Email/SMS Logs

Track email/SMS delivery and engagement:

**email_logs**:
- user_id, email_address, template_id, subject
- status: queued, sent, opened, clicked, bounced, complained
- sent_at, opened_at, clicked_at

**sms_logs**:
- user_id, phone_number, template_id, message_text
- status: queued, sent, delivered, failed
- sent_at, delivered_at

### 5. Healer Metrics

Healer availability, ratings, and match data tracked in:

**healers**:
- availability_status, rating, review_count
- specialties, experience_level, price_range

**matches**:
- patient_id, healer_id, compatibility_score
- status: pending, accepted, rejected, completed

---

## Querying Metrics

### Agent Performance

**Total actions by agent (7 days)**

```sql
SELECT 
  agent_name,
  COUNT(*) as total_actions,
  COUNT(CASE WHEN result = 'success' THEN 1 END) as successful,
  COUNT(CASE WHEN result = 'failed' THEN 1 END) as failed,
  ROUND(100.0 * COUNT(CASE WHEN result = 'success' THEN 1 END) / COUNT(*), 2) as success_rate
FROM agent_logs
WHERE created_at >= NOW() - interval '7 days'
GROUP BY agent_name
ORDER BY total_actions DESC;
```

**Actions by type (growth-agent, 24 hours)**

```sql
SELECT 
  action_type,
  COUNT(*) as count,
  COUNT(CASE WHEN result = 'success' THEN 1 END) as successful
FROM agent_logs
WHERE agent_name = 'growth-agent'
AND created_at >= NOW() - interval '1 day'
GROUP BY action_type
ORDER BY count DESC;
```

**Failed actions (last 24 hours)**

```sql
SELECT 
  agent_name,
  action,
  error_message,
  COUNT(*) as count,
  MAX(created_at) as last_error
FROM agent_logs
WHERE result = 'failed'
AND created_at >= NOW() - interval '1 day'
GROUP BY agent_name, action, error_message
ORDER BY count DESC;
```

### Funnel Metrics

**Users at each stage (snapshot)**

```sql
SELECT 
  funnel,
  current_stage,
  status,
  COUNT(*) as user_count
FROM user_states
GROUP BY funnel, current_stage, status
ORDER BY funnel, current_stage;
```

**Funnel conversion rates**

```sql
SELECT 
  funnel,
  current_stage,
  COUNT(DISTINCT user_id) as users_in_stage,
  COUNT(DISTINCT CASE WHEN status = 'completed' THEN user_id END) as completed,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN status = 'completed' THEN user_id END) / 
        COUNT(DISTINCT user_id), 2) as completion_rate
FROM user_states
GROUP BY funnel, current_stage
ORDER BY funnel, current_stage;
```

**Average days in funnel**

```sql
SELECT 
  funnel,
  ROUND(AVG(EXTRACT(DAY FROM (NOW() - entered_at))), 1) as avg_days_in_funnel,
  ROUND(AVG(EXTRACT(DAY FROM (NOW() - entered_at))) FILTER (WHERE status = 'completed'), 1) as avg_days_to_conversion,
  COUNT(*) as total_users
FROM user_states
GROUP BY funnel;
```

**Churn analysis (users inactive 14+ days)**

```sql
SELECT 
  funnel,
  COUNT(*) as at_risk_users,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM user_states WHERE status = 'active'), 2) as churn_rate
FROM user_states
WHERE status = 'active'
AND (last_action_at IS NULL OR last_action_at < NOW() - interval '14 days')
GROUP BY funnel;
```

### Email/SMS Performance

**Email delivery rates (7 days)**

```sql
SELECT 
  COUNT(*) as total_sent,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) as delivered,
  COUNT(CASE WHEN status = 'opened' THEN 1 END) as opened,
  COUNT(CASE WHEN status = 'clicked' THEN 1 END) as clicked,
  COUNT(CASE WHEN status = 'bounced' THEN 1 END) as bounced,
  ROUND(100.0 * COUNT(CASE WHEN status = 'opened' THEN 1 END) / COUNT(*), 2) as open_rate,
  ROUND(100.0 * COUNT(CASE WHEN status = 'clicked' THEN 1 END) / COUNT(*), 2) as click_rate
FROM email_logs
WHERE sent_at >= NOW() - interval '7 days';
```

**Email performance by template**

```sql
SELECT 
  t.name,
  COUNT(el.id) as sent,
  COUNT(CASE WHEN el.status = 'opened' THEN 1 END) as opened,
  ROUND(100.0 * COUNT(CASE WHEN el.status = 'opened' THEN 1 END) / COUNT(*), 2) as open_rate,
  COUNT(CASE WHEN el.status = 'clicked' THEN 1 END) as clicked
FROM email_logs el
JOIN templates t ON el.template_id = t.id
WHERE el.sent_at >= NOW() - interval '7 days'
GROUP BY t.name
ORDER BY sent DESC;
```

**SMS delivery rates**

```sql
SELECT 
  COUNT(*) as total_sent,
  COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  ROUND(100.0 * COUNT(CASE WHEN status = 'delivered' THEN 1 END) / COUNT(*), 2) as delivery_rate
FROM sms_logs
WHERE sent_at >= NOW() - interval '7 days';
```

### Matching Performance

**Match completion rates**

```sql
SELECT 
  status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM matches
GROUP BY status;
```

**Matches by healer**

```sql
SELECT 
  h.name,
  h.experience_level,
  COUNT(m.id) as total_matches,
  COUNT(CASE WHEN m.status = 'accepted' THEN 1 END) as accepted,
  ROUND(100.0 * COUNT(CASE WHEN m.status = 'accepted' THEN 1 END) / COUNT(*), 2) as acceptance_rate,
  ROUND(AVG(m.compatibility_score), 2) as avg_compatibility_score
FROM matches m
JOIN healers h ON m.healer_id = h.id
GROUP BY h.id, h.name, h.experience_level
ORDER BY total_matches DESC;
```

### Conversion Metrics

**Total revenue and conversions (30 days)**

```sql
SELECT 
  funnel,
  conversion_type,
  COUNT(*) as conversions,
  COUNT(DISTINCT user_id) as unique_users,
  SUM(amount) as total_revenue,
  ROUND(AVG(amount), 2) as avg_order_value
FROM conversions
WHERE created_at >= NOW() - interval '30 days'
GROUP BY funnel, conversion_type
ORDER BY total_revenue DESC;
```

**Revenue by agent**

```sql
SELECT 
  trigger_agent,
  COUNT(*) as conversions,
  SUM(amount) as total_revenue,
  ROUND(AVG(amount), 2) as avg_conversion_value
FROM conversions
WHERE created_at >= NOW() - interval '30 days'
GROUP BY trigger_agent
ORDER BY total_revenue DESC;
```

**Cohort analysis (users entered funnel on same day)**

```sql
SELECT 
  DATE(us.entered_at) as cohort_date,
  COUNT(DISTINCT us.user_id) as cohort_size,
  COUNT(DISTINCT c.user_id) as conversions,
  ROUND(100.0 * COUNT(DISTINCT c.user_id) / COUNT(DISTINCT us.user_id), 2) as conversion_rate,
  SUM(c.amount) as total_revenue
FROM user_states us
LEFT JOIN conversions c ON us.user_id = c.user_id
WHERE us.funnel = 'patient'
GROUP BY DATE(us.entered_at)
ORDER BY cohort_date DESC
LIMIT 30;
```

---

## API Endpoints for Metrics

### Get Funnel Stats

```bash
curl -X GET "http://localhost:5000/api/agents/funnel/patient/stats" \
  -H "x-agent-key: growth_agent_key"
```

Returns:
- Users at each stage
- Daily conversions + revenue
- Churn metrics

### Get Agent Performance

```bash
curl -X GET "http://localhost:5000/api/agents/metrics?funnel=patient&days=7" \
  -H "x-agent-key: growth_agent_key"
```

Returns:
- Actions by type per day
- Success rates
- User touchpoints

### Get Conversion Rates

```bash
curl -X GET "http://localhost:5000/api/agents/conversion-rate?funnel=patient&stage=awareness" \
  -H "x-agent-key: growth_agent_key"
```

Returns:
- Users at each stage
- Conversion counts
- Conversion percentages

### Dashboard Endpoints (Charlie only)

```bash
# All agents activity
curl -X GET "http://localhost:5000/api/dashboard/agents" \
  -H "x-charlie-pin: <pin>"

# Funnel metrics
curl -X GET "http://localhost:5000/api/dashboard/funnel/patient" \
  -H "x-charlie-pin: <pin>"

# Conversions summary
curl -X GET "http://localhost:5000/api/dashboard/conversions?days=7" \
  -H "x-charlie-pin: <pin>"

# Email/SMS performance
curl -X GET "http://localhost:5000/api/dashboard/email-sms" \
  -H "x-charlie-pin: <pin>"

# Healer metrics
curl -X GET "http://localhost:5000/api/dashboard/healers" \
  -H "x-charlie-pin: <pin>"
```

---

## Key Performance Indicators (KPIs)

### Growth KPIs

| KPI | Query | Target | Frequency |
|-----|-------|--------|-----------|
| Users in Awareness | `COUNT(*) WHERE stage='awareness'` | 10K+ | Daily |
| Awareness→Interest Conversion | Email open rate | >35% | Daily |
| Interest→Consideration Rate | Click rate | >20% | Daily |
| Overall Funnel Conversion | `completed / aware` | >2% | Weekly |
| Cost per Acquisition | `ad spend / conversions` | <$10 | Weekly |
| Days to Match | `AVG(days from enter to match)` | <21 | Weekly |

### Engagement KPIs

| KPI | Query | Target | Frequency |
|-----|-------|--------|-----------|
| Email Open Rate | `opened / sent` | >35% | Daily |
| Email Click Rate | `clicked / sent` | >5% | Daily |
| Email Bounce Rate | `bounced / sent` | <2% | Daily |
| SMS Delivery Rate | `delivered / sent` | >98% | Daily |
| Days in Funnel (avg) | `AVG(days in stage)` | <30 | Weekly |
| Churn Rate | `at_risk / active` | <10% | Weekly |

### Healer KPIs

| KPI | Query | Target | Frequency |
|-----|-------|--------|-----------|
| Healer Activation | Time to first booking | <7 days | Weekly |
| Match Acceptance Rate | `accepted / total` | >60% | Weekly |
| Avg Healer Rating | `AVG(rating)` | >4.5 | Monthly |
| Healers Available | `COUNT(status='available')` | 500+ | Daily |

### Revenue KPIs

| KPI | Query | Target | Frequency |
|-----|-------|--------|-----------|
| Monthly Revenue | `SUM(amount) last 30d` | $100K+ | Daily |
| Average Order Value | `AVG(amount)` | $85+ | Weekly |
| Revenue per Cohort | Cohort analysis | +10% MoM | Weekly |

---

## Creating Custom Reports

### Daily Health Check Script

```bash
#!/bin/bash

# Run daily at 8 AM
REPORT=$(cat <<EOF
=== ENNIE DAILY METRICS $(date +%Y-%m-%d) ===

FUNNEL STATUS:
$(psql -t -c "
  SELECT funnel, 
    COUNT(*) as users,
    COUNT(CASE WHEN status='active' THEN 1 END) as active,
    COUNT(CASE WHEN status='churned' THEN 1 END) as churned
  FROM user_states
  GROUP BY funnel;
")

EMAIL PERFORMANCE:
$(psql -t -c "
  SELECT 
    COUNT(*) as sent,
    ROUND(100.0*COUNT(CASE WHEN status='opened' THEN 1 END)/COUNT(*),1) as open_rate,
    ROUND(100.0*COUNT(CASE WHEN status='clicked' THEN 1 END)/COUNT(*),1) as click_rate,
    ROUND(100.0*COUNT(CASE WHEN status='bounced' THEN 1 END)/COUNT(*),1) as bounce_rate
  FROM email_logs WHERE sent_at::date = CURRENT_DATE;
")

CONVERSIONS:
$(psql -t -c "
  SELECT 
    COUNT(*) as total,
    SUM(amount) as revenue,
    ROUND(AVG(amount),2) as aov
  FROM conversions WHERE created_at::date = CURRENT_DATE;
")

AGENT ACTIVITY:
$(psql -t -c "
  SELECT agent_name, COUNT(*) as actions, 
    ROUND(100.0*COUNT(CASE WHEN result='success' THEN 1 END)/COUNT(*),1) as success_rate
  FROM agent_logs WHERE created_at::date = CURRENT_DATE
  GROUP BY agent_name;
")
EOF
)

echo "$REPORT"

# Send to Slack
curl -X POST $SLACK_WEBHOOK -d "{ \"text\": \"\`\`\`$REPORT\`\`\`\" }"
```

---

## Performance Optimization Based on Metrics

### Low Email Open Rate (<30%)

**Diagnosis**: Check email_logs
```sql
SELECT template_id, COUNT(*) as sent, 
  ROUND(100.0*COUNT(CASE WHEN status='opened' THEN 1 END)/COUNT(*),1) as open_rate
FROM email_logs
WHERE sent_at >= NOW() - interval '7 days'
GROUP BY template_id
ORDER BY open_rate ASC;
```

**Action**: Request Charlie to review subject lines

### High Churn Rate (>15%)

**Diagnosis**: Find churned users
```sql
SELECT * FROM user_states 
WHERE status = 'churned'
AND updated_at >= NOW() - interval '7 days'
LIMIT 20;
```

**Action**: Retention Agent sends re-engagement emails

### Low Funnel Conversion (<1%)

**Diagnosis**: Find bottleneck stage
```sql
SELECT current_stage,
  COUNT(*) as users,
  ROUND(100.0*COUNT(CASE WHEN status='completed' THEN 1 END)/COUNT(*),1) as completion_rate
FROM user_states WHERE funnel='patient'
GROUP BY current_stage;
```

**Action**: Update template copy or shorten stage duration

---

## Exporting Metrics

### Export to CSV

```bash
# Email performance
psql -d video_manager -c "\COPY (
  SELECT DATE(sent_at), 
    COUNT(*) as sent,
    COUNT(CASE WHEN status='opened' THEN 1 END) as opened
  FROM email_logs
  WHERE sent_at >= NOW() - interval '30 days'
  GROUP BY DATE(sent_at)
) TO '/tmp/email_metrics.csv' WITH CSV HEADER"

# Upload to S3
aws s3 cp /tmp/email_metrics.csv s3://ennie-analytics/reports/
```

### Export to Data Warehouse

```bash
# Sync agent_logs to Redshift (daily)
# Use AWS Glue or similar

psql -d video_manager -c "
  SELECT * FROM agent_logs 
  WHERE created_at::date = CURRENT_DATE
" > /tmp/agent_logs_today.csv

aws redshift-data execute-statement \
  --cluster-identifier ennie-warehouse \
  --database analytics \
  --sql 'COPY agent_logs FROM s3://ennie-datalake/agent_logs_today.csv'
```

---

**Version**: 1.0.0  
**Last Updated**: 2026-04-01
