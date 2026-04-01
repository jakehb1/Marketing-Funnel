# Video Manager - Testing Guide

## Comprehensive Testing for Vanilla Frontend

---

## 1. Local Setup Testing

### 1.1 Start Backend
```bash
cd video-manager
npm install
npm run dev
```

**Expected output:**
```
✓ Server running on port 5000
✓ Database connected
✓ Health check passed
```

### 1.2 Browser Test
```
Open: http://localhost:5000
```

**Expected:**
- ✅ Dashboard tab visible
- ✅ Approvals tab visible
- ✅ Upload form displayed
- ✅ No console errors

---

## 2. Dashboard Testing

### 2.1 Upload Form Validation

**Test: Title required**
- Clear title input
- Try to upload a file
- **Expected:** Error message "Please enter a video title"

**Test: Funnel required**
- Enter title "Test Video"
- Leave funnel as "Select a funnel..."
- Try to upload
- **Expected:** Error message "Please select a funnel"

**Test: File required**
- Enter title and funnel
- Don't select a file
- Click "Upload Video"
- **Expected:** Error message "Please select a file"

### 2.2 File Upload

**Test: Drag-drop upload**
1. Enter title: "Drag Drop Test"
2. Select funnel: "healer"
3. Drag a video file onto the dropzone
4. **Expected:**
   - Dropzone highlights (blue border)
   - File name appears
   - "Upload Video" button shows

**Test: Click-to-upload**
1. Click "Choose File" button
2. Select a video file from file picker
3. **Expected:**
   - File name appears
   - "Upload Video" button shows

**Test: Progress bar**
1. Complete upload form
2. Click "Upload Video"
3. **Expected:**
   - Progress bar appears (0-100%)
   - Status: "Uploading..."
   - Percentage text updates
   - On success: "Video uploaded successfully!"

**Test: Form reset after upload**
1. Complete upload
2. **Expected:**
   - Title field cleared
   - Funnel reset to default
   - File input cleared
   - Progress bar hidden
   - "Choose File" button visible again

### 2.3 Video List

**Test: Videos load after upload**
1. Upload a video successfully
2. **Expected:**
   - Video appears in grid
   - Title displayed
   - Funnel badge shown
   - Status badge shown
   - Upload date displayed

**Test: Video card hover**
1. Hover over video card
2. **Expected:**
   - Card shadow increases (elevation)
   - Card lifts slightly (transform)
   - Cursor becomes pointer

**Test: Video list empty state**
1. If no videos uploaded
2. **Expected:**
   - "No videos yet" message
   - "Upload a video to get started" hint

### 2.4 Filters & Search

**Test: Search by title**
1. Upload 2+ videos with different titles
2. Type in search box: partial title
3. **Expected:**
   - Grid shows only matching videos
   - Non-matching videos hidden

**Test: Search by filename**
1. Upload video with filename "test-video.mp4"
2. Search for: "test-video"
3. **Expected:**
   - Video appears in results

**Test: Funnel filter**
1. Upload videos with different funnels
2. Select funnel dropdown: "healer"
3. **Expected:**
   - Only healer funnel videos shown
   - Count matches expectation

**Test: Status filter**
1. Select status dropdown: "ready"
2. **Expected:**
   - Only ready videos shown

**Test: Combined filters**
1. Search: "healer"
2. Funnel: "healer"
3. Status: "ready"
4. **Expected:**
   - All filters applied
   - Only matching videos shown

**Test: Clear filters**
1. Apply filters
2. Clear search box
3. Set filters to "All"
4. **Expected:**
   - All videos shown again

### 2.5 Stats Cards

**Test: Stats display**
1. Upload several videos
2. Look at stats cards
3. **Expected:**
   - Total: matches grid count
   - Ready: matches ready videos
   - Processing: matches processing videos
   - Errors: matches error videos

**Test: Stats update after upload**
1. Note initial stats
2. Upload new video
3. After real-time poll (5s)
4. **Expected:**
   - Total count increased by 1

### 2.6 Refresh Button

**Test: Manual refresh**
1. Click "🔄 Refresh" button
2. **Expected:**
   - Grid updates
   - New videos appear (if available)
   - No loading state freeze

### 2.7 Real-time Polling

**Test: 5-second auto-update**
1. Upload a video
2. Watch status badge (uploading → transcribing → ready)
3. **Expected:**
   - Status updates without manual refresh
   - Every ~5 seconds

**Test: Polling on tab switch**
1. Go to Approvals tab
2. Come back to Dashboard
3. **Expected:**
   - Videos refreshed
   - Latest data shown

---

## 3. Video Detail Modal Testing

### 3.1 Open Modal

**Test: Click video card**
1. Click on any video card
2. **Expected:**
   - Modal opens
   - Modal slides up (animation)
   - Video details loaded

**Test: Modal content**
1. Open video modal
2. **Expected:**
   - Title matches
   - Funnel displayed
   - Status badge shown
   - Upload date shown
   - Duration shown

### 3.2 Transcript Viewer

**Test: Transcript loads**
1. Open video modal
2. Look at transcript section
3. **Expected:**
   - "Loading transcript..." appears briefly
   - Full transcript text displays
   - Text is scrollable if long

**Test: No transcript**
1. If video has no transcript
2. **Expected:**
   - "No transcript available" message

### 3.3 Approval Info

**Test: Approval status displays**
1. Open video modal
2. If video has approval record
3. **Expected:**
   - Approval info section visible
   - Status badge shown (pending/approved/rejected)

**Test: Approval notes display**
1. If approval has notes
2. **Expected:**
   - "Charlie's Notes:" section visible
   - Notes text displayed

**Test: No approval info**
1. If video has no approval
2. **Expected:**
   - Approval section hidden

### 3.4 Download Buttons

**Test: Download transcript**
1. Open video modal
2. Click "⬇️ Download Transcript"
3. **Expected:**
   - File downloads as `.txt`
   - Filename: "{title}-transcript.txt"

**Test: Download video**
1. Open video modal
2. Click "⬇️ Download Video"
3. **Expected:**
   - Opens video URL in new tab
   - Or downloads depending on server headers

### 3.5 Close Modal

**Test: Close button**
1. Open modal
2. Click X button (top right)
3. **Expected:**
   - Modal closes
   - Modal slides down (animation)

**Test: Click outside modal**
1. Open modal
2. Click on dark overlay background
3. **Expected:**
   - Modal closes

**Test: Escape key**
1. Open modal
2. Press ESC
3. **Expected:** Modal closes (if implemented)

---

## 4. Approval Dashboard Testing

### 4.1 Login Screen

**Test: PIN input**
1. Go to Approvals tab
2. See login screen
3. **Expected:**
   - PIN input field visible
   - Placeholder: "••••••"
   - Input masked (dots instead of numbers)

**Test: Valid PIN**
1. Enter PIN: "1234" (or your CHARLIE_PIN)
2. Click "Unlock Dashboard"
3. **Expected:**
   - Login screen fades out
   - Dashboard screen appears
   - Logout button visible

**Test: Invalid PIN**
1. Enter wrong PIN
2. Click "Unlock Dashboard"
3. **Expected:**
   - Error message (if implemented)
   - Stay on login screen

**Test: Empty PIN**
1. Leave PIN empty
2. Click "Unlock Dashboard"
3. **Expected:**
   - Error: "Please enter a PIN"

### 4.2 Session Management

**Test: Session storage**
1. Log in
2. Open DevTools → Application → Session Storage
3. **Expected:**
   - `charlie_pin_session` key visible with PIN value

**Test: Auto-login on refresh**
1. Log in
2. Refresh page (F5)
3. **Expected:**
   - Dashboard loads directly (no login screen)
   - PIN from sessionStorage used

**Test: Session cleanup on close**
1. Log in
2. Close browser tab
3. Reopen video-manager
4. **Expected:**
   - Login screen appears (session cleared)

### 4.3 Approval Tabs

**Test: Tab switching**
1. Click "⏳ Pending" tab
2. **Expected:**
   - Grid shows pending approvals
   - Tab highlighted

3. Click "✅ Approved" tab
4. **Expected:**
   - Grid shows approved approvals
   - Tab highlighted

5. Click "❌ Rejected" tab
6. **Expected:**
   - Grid shows rejected approvals
   - Tab highlighted

**Test: Tab counts**
1. Look at tab buttons
2. **Expected:**
   - Count in parentheses (e.g., "Pending (3)")
   - Counts match actual cards in grid

### 4.4 Approval Cards

**Test: Card display**
1. Open Approvals dashboard
2. Look at approval cards
3. **Expected:**
   - Status emoji displayed (⏳/✅/❌)
   - Content preview shown (title, funnel)
   - Content type badge visible
   - Submit date shown
   - Colored left border (orange/green/red)

**Test: Card hover**
1. Hover over approval card
2. **Expected:**
   - Shadow increases
   - Cursor becomes pointer
   - Card lifts slightly

### 4.5 Approve Action

**Test: Click Approve button**
1. Find pending approval
2. Click "✅ Approve" button
3. **Expected:**
   - Card updates to "approved" status
   - Tab count updates
   - Notification shows

**Test: Approval API call**
1. Open DevTools Network tab
2. Click Approve
3. **Expected:**
   - POST `/api/approvals/{id}/approve` called
   - Header: `X-Charlie-PIN`
   - Status: 200 OK

### 4.6 Reject Workflow

**Test: Open reject modal**
1. Click "❌ Reject" button on pending approval
2. **Expected:**
   - Modal opens
   - Reject notes textarea visible
   - Confirm button disabled (no notes yet)

**Test: Notes validation**
1. Try to click "Confirm Rejection" without notes
2. **Expected:**
   - Button disabled
   - Can't submit

3. Type notes: "Quality issue"
4. **Expected:**
   - Button becomes enabled

**Test: Reject submission**
1. Enter notes: "Quality issue with audio"
2. Click "Confirm Rejection"
3. **Expected:**
   - Modal closes
   - Card updates to "rejected" status
   - Notes appear on card
   - Tab count updates

**Test: Reject API call**
1. Open DevTools Network tab
2. Complete rejection
3. **Expected:**
   - POST `/api/approvals/{id}/reject` called
   - Body includes notes
   - Header: `X-Charlie-PIN`
   - Status: 200 OK

### 4.7 Filters

**Test: Content Type filter**
1. Select dropdown: "Videos"
2. **Expected:**
   - Grid shows only video approvals
   - Transcript/Clip cards hidden

3. Select: "Transcripts"
4. **Expected:**
   - Grid shows only transcript approvals

**Test: Funnel filter**
1. Select funnel dropdown: "healer"
2. **Expected:**
   - Grid shows only healer funnel approvals

**Test: Combined filters**
1. Content Type: "Videos"
2. Funnel: "healer"
3. Tab: "pending"
4. **Expected:**
   - All filters applied
   - Only matching cards shown

### 4.8 Real-time Polling

**Test: 30-second auto-update**
1. Open Approvals dashboard
2. Wait 30+ seconds
3. **Expected:**
   - Tab counts update
   - New pending approvals appear
   - Approved/Rejected items may disappear

**Test: Polling on tab switch**
1. Go to Dashboard, then back to Approvals
2. **Expected:**
   - Approvals refreshed
   - Latest counts shown

### 4.9 Logout

**Test: Click Logout**
1. Click "Logout" button
2. **Expected:**
   - Dashboard hides
   - Login screen appears
   - PIN field empty
   - SessionStorage cleared

**Test: Session cleanup**
1. Logout
2. Open DevTools → Application → Session Storage
3. **Expected:**
   - `charlie_pin_session` key gone

---

## 5. Responsive Design Testing

### 5.1 Mobile (375px - iPhone)

**Test: Layout**
1. Open DevTools → Device Emulation
2. Select iPhone SE (375px)
3. **Expected:**
   - Single column layout
   - Buttons full width
   - Text readable
   - No horizontal scroll

**Test: Upload form**
1. Mobile view
2. **Expected:**
   - Title input full width
   - Funnel dropdown full width
   - Dropzone displays properly
   - Progress bar visible

**Test: Video grid**
1. Mobile view
2. **Expected:**
   - Cards stack vertically
   - One column
   - Cards full width

**Test: Modals**
1. Open modal on mobile
2. **Expected:**
   - Modal fits screen
   - Scrollable if content tall
   - Close button accessible

### 5.2 Tablet (768px - iPad)

**Test: Layout**
1. Device emulation: iPad (768px)
2. **Expected:**
   - 2-column grid for videos
   - Wider form inputs
   - Good spacing

### 5.3 Desktop (1440px+)

**Test: Layout**
1. Full desktop screen
2. **Expected:**
   - Multi-column grid (auto-fill)
   - Balanced spacing
   - Optimal line lengths

---

## 6. Dark Mode Testing

### 6.1 Enable Dark Mode

**macOS:**
1. System Preferences → General → Appearance → Dark
2. Refresh browser

**Windows:**
1. Settings → Personalization → Colors → Dark

**DevTools (all platforms):**
1. DevTools → More → Rendering
2. Emulate CSS media feature: `prefers-color-scheme: dark`

### 6.2 Visual Changes

**Expected in dark mode:**
- ✅ Background: Dark (#1a1a1a instead of white)
- ✅ Text: Light (white instead of black)
- ✅ Cards: Dark background with subtle borders
- ✅ Inputs: Dark with light text
- ✅ Buttons: Dark mode colors
- ✅ Good contrast ratio (WCAG AA)

### 6.3 No Broken Elements

**Expected:**
- ✅ All text readable
- ✅ Icons visible
- ✅ Buttons clickable
- ✅ No white backgrounds showing through
- ✅ Modal overlay visible

---

## 7. Accessibility Testing

### 7.1 Keyboard Navigation

**Test: Tab through elements**
1. Press Tab repeatedly
2. **Expected:**
   - Focus moves through buttons, inputs, links
   - Focus visible (blue outline)
   - Logical order (left to right, top to bottom)

**Test: Enter key**
1. Focus on button
2. Press Enter
3. **Expected:**
   - Button activates (same as click)

**Test: Space key**
1. Focus on button/checkbox
2. Press Space
3. **Expected:**
   - Activates properly

**Test: Escape key**
1. Modal open
2. Press Escape
3. **Expected:**
   - Modal closes (if implemented)

### 7.2 Screen Reader (if available)

**Test: Semantic HTML**
1. Use NVDA (Windows) or VoiceOver (Mac)
2. Navigate page
3. **Expected:**
   - Headings announced
   - Button labels clear
   - Form labels associated
   - Status updates announced

### 7.3 Color Contrast

**Test: Contrast ratio**
1. Use WebAIM Contrast Checker
2. Check text on background
3. **Expected:**
   - All text: 4.5:1 minimum (WCAG AA)

---

## 8. Performance Testing

### 8.1 Load Time

**Test: Page load**
1. Open DevTools → Network tab
2. Hard refresh (Cmd+Shift+R)
3. **Expected:**
   - HTML: < 100ms
   - CSS: < 100ms
   - JS: < 150ms
   - Total: < 500ms

**Test: First Paint**
1. Check Performance tab
2. **Expected:**
   - First Paint: ~100ms
   - Largest Contentful Paint: ~300ms

### 8.2 Memory Usage

**Test: Baseline memory**
1. Open DevTools → Memory
2. Take heap snapshot
3. **Expected:**
   - ~2-5 MB JavaScript heap
   - Much less than React (15+ MB)

### 8.3 Network Requests

**Test: Minimal requests**
1. Open DevTools → Network tab
2. Load dashboard
3. **Expected:**
   - HTML, CSS, JS files (5 files)
   - API calls for videos
   - No unused files loading

---

## 9. API Integration Testing

### 9.1 Health Check

```bash
curl http://localhost:5000/health
```

**Expected:**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-04-01T..."
}
```

### 9.2 Videos Endpoint

```bash
curl http://localhost:5000/api/videos
```

**Expected:**
```json
{
  "videos": [
    {
      "id": "...",
      "title": "Test Video",
      "funnel": "healer",
      "status": "ready",
      "created_at": "...",
      "duration": 120
    }
  ]
}
```

### 9.3 Upload Endpoint

```bash
curl -X POST http://localhost:5000/api/upload \
  -F "title=Test" \
  -F "funnel=healer" \
  -F "file=@video.mp4"
```

**Expected:** 200 OK with video object

### 9.4 Approvals Endpoint

```bash
curl http://localhost:5000/api/approvals \
  -H "X-Charlie-PIN: 1234"
```

**Expected:**
```json
{
  "approvals": [
    {
      "id": "...",
      "content_type": "video",
      "status": "pending",
      "created_at": "..."
    }
  ]
}
```

---

## 10. Error Handling

### 10.1 Network Errors

**Test: Offline upload**
1. Turn off internet
2. Try to upload
3. **Expected:**
   - Error message displayed
   - Form not submitted

**Test: API down**
1. Stop backend server
2. Try to load videos
3. **Expected:**
   - Error message: "Failed to load videos"
   - Grid shows error state

### 10.2 Invalid Input

**Test: Missing title**
- **Expected:** Error validation

**Test: Invalid PIN**
- **Expected:** Login fails

**Test: Large file**
- **Expected:** Error or timeout handling

---

## 11. Browser Console

### Expected State

**On page load:**
```
✓ No errors
✓ No warnings (except 3rd party)
✓ Network requests all 200/204
```

**On upload:**
```
✓ No CORS errors
✓ Progress logged
✓ Success/error logged
```

**On approval actions:**
```
✓ PIN header sent
✓ Response 200
✓ No auth errors
```

---

## 12. Rapid-Fire Checklist

Run through these quickly:

- [ ] Page loads without errors
- [ ] Upload form works end-to-end
- [ ] Search filters videos
- [ ] Real-time polling works (watch network tab)
- [ ] Modal opens/closes
- [ ] Approval login works
- [ ] Approve action works
- [ ] Reject action works
- [ ] Mobile view works
- [ ] Dark mode works
- [ ] All buttons functional
- [ ] No console errors
- [ ] API responses correct
- [ ] Download buttons work
- [ ] Refresh button works

---

## Test Results Template

```markdown
## Test Date: 2026-04-01

### Dashboard
- [ ] Upload validation
- [ ] Drag-drop upload
- [ ] File input upload
- [ ] Progress bar
- [ ] Video list
- [ ] Search filtering
- [ ] Funnel filtering
- [ ] Status filtering
- [ ] Stats cards
- [ ] Real-time polling
- [ ] Video modal
- [ ] Transcript viewer
- [ ] Approval info
- [ ] Download buttons

### Approvals
- [ ] PIN login
- [ ] Tab switching
- [ ] Approve button
- [ ] Reject modal
- [ ] Real-time polling
- [ ] Logout

### Responsive
- [ ] Mobile (375px)
- [ ] Tablet (768px)
- [ ] Desktop (1440px)

### Dark Mode
- [ ] Colors correct
- [ ] Text readable
- [ ] No broken elements

### Accessibility
- [ ] Keyboard navigation
- [ ] Color contrast
- [ ] Screen reader (if available)

### Performance
- [ ] Page loads < 500ms
- [ ] No memory leaks
- [ ] Network efficient

### Errors
- [ ] No console errors
- [ ] Proper error messages
- [ ] API errors handled

### Status: ✅ PASS
```

---

## Continuous Testing

After each change:
1. Test upload flow
2. Test approval flow
3. Quick mobile check
4. Console check

---

**Total testing time:** ~1 hour for complete checklist  
**Rapid check:** ~10 minutes for critical paths

Good luck! 🚀
