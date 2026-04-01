# Content Approval System

## Overview
The Content Approval System is a workflow that allows Charlie (CEO) to review and approve/reject video content, transcripts, and other assets created by the marketing team before they're used in funnel dashboards.

## Features

### 1. Automatic Approval Requests
When a video is uploaded, an approval request is automatically created with status `pending`. Charlie can then review and approve/reject it.

### 2. Charlie's Approval Dashboard
A dedicated web interface at `/approval` where Charlie can:
- View pending content grouped by funnel
- See video thumbnails, titles, transcripts
- Approve content with optional notes
- Reject content with required detailed feedback
- Search and filter by content type and funnel
- View approval history

### 3. Approval Badges
Agents see approval status on content in dashboards:
- ⏳ **Pending Approval** - Yellow badge (can't use yet)
- ✅ **Approved** - Green badge (can use)
- ❌ **Rejected** - Red badge (needs revision)

### 4. API Endpoints
All approval endpoints require Charlie's PIN for security.

#### Get Pending Approvals
```bash
curl http://localhost:5000/api/approvals?status=pending \
  -H "X-Charlie-PIN: 1234"
```

**Response:**
```json
{
  "approvals": [
    {
      "id": "uuid",
      "content_id": "video-uuid",
      "content_type": "video",
      "status": "pending",
      "submitted_by": "system",
      "created_at": "2025-04-01T15:00:00Z",
      "content": {
        "id": "video-uuid",
        "title": "Product Demo",
        "funnel": "patient",
        "duration": 120
      }
    }
  ]
}
```

#### Create Approval Request
```bash
curl -X POST http://localhost:5000/api/approvals \
  -H "Content-Type: application/json" \
  -d '{
    "content_id": "video-uuid",
    "content_type": "video",
    "submitted_by": "upload-agent"
  }'
```

#### Approve Content
```bash
curl -X POST http://localhost:5000/api/approvals/{approval_id}/approve \
  -H "X-Charlie-PIN: 1234" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Perfect, ready for deployment"
  }'
```

#### Reject Content
```bash
curl -X POST http://localhost:5000/api/approvals/{approval_id}/reject \
  -H "X-Charlie-PIN: 1234" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Needs higher quality audio. Re-record with better mic."
  }'
```

#### Check If Content Is Approved
```bash
# No PIN required - agents check this to know if they can use content
curl http://localhost:5000/api/approvals/status/content/{video_id}
```

**Response:**
```json
{
  "id": "video-uuid",
  "type": "video",
  "approval_status": "approved",
  "is_approved": true
}
```

#### Add Notes/Comments
```bash
curl -X PUT http://localhost:5000/api/approvals/{approval_id}/notes \
  -H "X-Charlie-PIN: 1234" \
  -H "Content-Type: application/json" \
  -d '{
    "comment_text": "Minor edit on thumbnail positioning needed"
  }'
```

## Approval Dashboard (Charlie's Interface)

### Login
1. Navigate to `/approval`
2. Enter Charlie's PIN
3. Access dashboard

### Main View
- **Pending Tab** - Shows items awaiting approval
- **Approved Tab** - Shows approved items (archive)
- **Rejected Tab** - Shows items Charlie rejected

### Filters
- Filter by **Content Type**: Video, Transcript, Clip, Asset
- Filter by **Funnel**: Healer, Untrained, Patient, Referral, Owned

### Content Card
Each content item shows:
- Status icon (⏳ / ✅ / ❌)
- Title or preview
- Funnel assignment
- Date submitted
- Quick action buttons (for pending items)

### Approval Actions

#### Approve
1. Click "✅ Approve" button
2. Optionally add notes
3. Confirm
4. Badge updates immediately

#### Reject
1. Click "❌ Reject" button
2. **Required**: Enter detailed feedback
3. Confirm
4. Content marked as rejected
5. Submitter sees rejection reason

## Integration with Dashboards

### Video Card Badge
Video cards in dashboards now show approval status:
```
[Video Title]
Status: ✅ Approved
Funnel: patient
...
```

### Blocking Unapproved Content
Agents querying for content to use should check approval status:

```javascript
// Before using a video in a funnel:
const statusResponse = await fetch(`/api/approvals/status/content/${videoId}`);
const { is_approved } = await statusResponse.json();

if (!is_approved) {
  // Show warning or skip this video
  console.warn('Content not approved yet');
}
```

## Database Schema

### Approvals Table
```sql
CREATE TABLE approvals (
  id UUID PRIMARY KEY,
  content_id UUID NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  submitted_by VARCHAR(255),
  reviewed_by VARCHAR(255),
  review_date TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Approval Comments Table
```sql
CREATE TABLE approval_comments (
  id UUID PRIMARY KEY,
  approval_id UUID NOT NULL REFERENCES approvals(id),
  comment_text TEXT NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Videos Table Addition
```sql
ALTER TABLE videos ADD COLUMN approval_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE videos ADD COLUMN approval_id UUID REFERENCES approvals(id);
```

## Security

### PIN Protection
- All approval actions require Charlie's PIN
- PIN passed via `X-Charlie-PIN` header
- Never stored in localStorage, only sessionStorage
- Pins are verified on every request

### Audit Trail
- Every approval action is timestamped
- `reviewed_by` field shows who approved/rejected
- `review_date` shows when decision was made
- Comments are timestamped with creator

## Workflow Example

### Scenario: New Video Upload
1. Agent uploads video via `/api/upload`
2. Video gets `approval_status = 'pending'`
3. Approval request created automatically
4. Charlie sees it in "⏳ Pending" tab
5. Charlie reviews video quality
6. Charlie clicks ✅ Approve
7. Agent sees "✅ Approved" badge
8. Agent can now use video in funnel dashboards
9. Video deployed to production

### Scenario: Rejection Flow
1. Charlie reviews video
2. Audio quality is poor
3. Charlie clicks ❌ Reject
4. Must enter: "Audio is muffled, re-record with better microphone"
5. Video marked as "❌ Rejected"
6. Agent sees rejection reason in dashboard
7. Agent re-uploads improved version
8. New approval request created
9. Process repeats

## Testing

### Run Tests
```bash
npm test backend/tests/approvals.test.js
```

### Manual Testing Steps
1. Upload a test video
2. Check it appears in approval dashboard
3. Approve it
4. Verify approval badge updates
5. Reject another
6. Verify rejection shows in tab
7. Add notes to an approval
8. Check API `/api/approvals/status/content/{id}`

## Performance Considerations

### Indexes
Created on:
- `approvals.status` - Fast filtering by pending/approved/rejected
- `approvals.content_id` - Fast content lookup
- `approvals.content_type` - Fast type filtering
- `approvals.created_at` - Fast chronological sorting

### Query Optimization
- Queries enriched with content details after fetching
- Uses pagination (limit/offset) for large result sets
- Lazy-loads comments on detail view

## Configuration

### Environment Variables
```
CHARLIE_PIN=<secure-pin>  # Set in Railway dashboard
DATABASE_URL=...          # PostgreSQL connection
FRONTEND_URL=...          # For CORS
```

### Change Charlie's PIN
1. Update `CHARLIE_PIN` env variable in Railway
2. Restart deployment
3. New PIN required on next dashboard access

## Troubleshooting

### "Unauthorized" Error
- PIN is incorrect or not being sent
- Check `X-Charlie-PIN` header is set
- Verify PIN matches environment variable

### Content Not Showing in Dashboard
- Check `approval_status = 'pending'` in database
- Verify approval records exist in `approvals` table
- Check browser console for network errors

### Rejection Notes Not Saving
- Confirm notes are not empty string
- Check database connection
- Verify user has PIN access

### Performance Slow
- Check database indexes exist
- Run: `SELECT * FROM pg_indexes WHERE tablename = 'approvals';`
- Consider archiving old approvals to separate table

## Future Enhancements

- Bulk approval actions
- Email notifications for Charlie
- Approval workflow stages (draft → review → approved)
- Revision history tracking
- Video preview in dashboard
- Approval SLA tracking
- Integration with content quality scoring
- Automated approval based on quality metrics

---

**System Version:** 1.0  
**Last Updated:** April 1, 2025  
**Status:** Production Ready
