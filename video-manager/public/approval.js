/**
 * ENNIE Video Manager - Approval Dashboard
 * Pure vanilla JavaScript - Charlie's content review portal
 * PIN auth + real-time polling for approvals
 */

// ================================================================
// State Management
// ================================================================

const state = {
  authenticated: false,
  pin: null,
  approvals: [],
  activeTab: 'pending',
  selectedApproval: null,
  showingRejectModal: false,
  rejectingId: null,
  pollingInterval: null,
  filters: {
    contentType: '',
    funnel: ''
  }
};

const API_BASE = '/api';
const POLL_INTERVAL = 30000; // 30 seconds
const PIN_STORAGE_KEY = 'charlie_pin_session';

// ================================================================
// DOM Elements
// ================================================================

const elements = {
  // Login
  loginScreen: document.getElementById('login-screen'),
  loginForm: document.getElementById('login-form'),
  pinInput: document.getElementById('pin-input'),
  dashboardScreen: document.getElementById('dashboard-screen'),
  logoutBtn: document.getElementById('logout-btn'),

  // Tabs
  tabButtons: document.querySelectorAll('.tab-btn'),

  // Filters
  filterContentType: document.getElementById('filter-content-type'),
  filterFunnel: document.getElementById('filter-funnel'),
  approvalRefreshBtn: document.getElementById('approval-refresh-btn'),

  // Grid
  approvalsGrid: document.getElementById('approvals-grid'),

  // Counts
  pendingCount: document.querySelector('.pending-count'),
  approvedCount: document.querySelector('.approved-count'),
  rejectedCount: document.querySelector('.rejected-count'),

  // Modals
  rejectModal: document.getElementById('reject-modal'),
  rejectNotes: document.getElementById('reject-notes'),
  rejectCancelBtn: document.getElementById('reject-cancel-btn'),
  rejectConfirmBtn: document.getElementById('reject-confirm-btn'),
  detailModal: document.getElementById('detail-modal'),
  detailContent: document.getElementById('detail-content'),
  detailActions: document.getElementById('detail-actions'),
  detailClose: document.querySelector('#detail-modal .modal-close'),
  rejectClose: document.querySelector('#reject-modal .modal-close')
};

// ================================================================
// Event Listeners - Login
// ================================================================

if (elements.loginForm) {
  elements.loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pin = elements.pinInput.value.trim();

    if (!pin) {
      showError('Please enter a PIN');
      return;
    }

    login(pin);
  });
}

function login(pin) {
  state.pin = pin;
  state.authenticated = true;

  // Store in session storage (not localStorage for security)
  sessionStorage.setItem(PIN_STORAGE_KEY, pin);

  // Update UI
  elements.loginScreen.style.display = 'none';
  elements.dashboardScreen.style.display = 'flex';
  elements.logoutBtn.style.display = 'block';

  // Load approvals
  fetchApprovals();
  startPolling();
}

if (elements.logoutBtn) {
  elements.logoutBtn.addEventListener('click', logout);
}

function logout() {
  state.authenticated = false;
  state.pin = null;
  sessionStorage.removeItem(PIN_STORAGE_KEY);

  elements.loginScreen.style.display = 'flex';
  elements.dashboardScreen.style.display = 'none';
  elements.logoutBtn.style.display = 'none';
  elements.pinInput.value = '';

  stopPolling();
}

// ================================================================
// Event Listeners - Tabs & Filters
// ================================================================

elements.tabButtons.forEach(btn => {
  btn.addEventListener('click', (e) => {
    const status = e.target.dataset.status;
    switchTab(status);
  });
});

function switchTab(status) {
  state.activeTab = status;

  // Update active button
  elements.tabButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.status === status);
  });

  renderApprovals();
}

elements.filterContentType?.addEventListener('change', (e) => {
  state.filters.contentType = e.target.value;
  renderApprovals();
});

elements.filterFunnel?.addEventListener('change', (e) => {
  state.filters.funnel = e.target.value;
  renderApprovals();
});

elements.approvalRefreshBtn?.addEventListener('click', () => {
  fetchApprovals();
});

// ================================================================
// Event Listeners - Modals
// ================================================================

// Reject modal
if (elements.rejectClose) {
  elements.rejectClose.addEventListener('click', closeRejectModal);
}

if (elements.rejectCancelBtn) {
  elements.rejectCancelBtn.addEventListener('click', closeRejectModal);
}

if (elements.rejectConfirmBtn) {
  elements.rejectConfirmBtn.addEventListener('click', confirmReject);
}

elements.rejectNotes?.addEventListener('input', (e) => {
  // Enable/disable confirm button based on notes
  if (elements.rejectConfirmBtn) {
    elements.rejectConfirmBtn.disabled = !e.target.value.trim();
  }
});

// Detail modal
if (elements.detailClose) {
  elements.detailClose.addEventListener('click', closeDetailModal);
}

window.addEventListener('click', (e) => {
  if (e.target === elements.detailModal) {
    closeDetailModal();
  }
  if (e.target === elements.rejectModal) {
    closeRejectModal();
  }
});

// ================================================================
// Fetch & Render Approvals
// ================================================================

async function fetchApprovals() {
  if (!state.authenticated) return;

  try {
    let url = `${API_BASE}/approvals`;
    const params = new URLSearchParams();

    if (state.activeTab !== 'all') {
      params.append('status', state.activeTab);
    }

    if (state.filters.contentType) {
      params.append('content_type', state.filters.contentType);
    }

    if (params.toString()) {
      url += '?' + params.toString();
    }

    const response = await fetch(url, {
      headers: {
        'X-Charlie-PIN': state.pin
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        logout();
        return;
      }
      throw new Error('Failed to fetch approvals');
    }

    const data = await response.json();
    state.approvals = data.approvals || [];
    updateTabCounts();
    renderApprovals();
  } catch (error) {
    console.error('Error fetching approvals:', error);
    showError('Failed to load approvals');
  }
}

function renderApprovals() {
  const filtered = filterApprovals();

  if (filtered.length === 0) {
    elements.approvalsGrid.innerHTML = `
      <div class="empty-state">
        <p>📭 No items in this category</p>
        ${state.activeTab === 'pending' ? '<p class="sub">All caught up! </p>' : ''}
      </div>
    `;
    return;
  }

  elements.approvalsGrid.innerHTML = filtered.map(a => createApprovalCard(a)).join('');

  // Add event listeners
  document.querySelectorAll('.approval-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.card-actions button')) {
        const approvalId = card.dataset.approvalId;
        const approval = state.approvals.find(a => a.id === approvalId);
        if (approval) {
          showDetailModal(approval);
        }
      }
    });
  });

  // Action buttons
  document.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const approvalId = e.target.closest('.approval-card').dataset.approvalId;
      const approval = state.approvals.find(a => a.id === approvalId);
      if (approval) {
        approveApproval(approval.id);
      }
    });
  });

  document.querySelectorAll('.reject-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const approvalId = e.target.closest('.approval-card').dataset.approvalId;
      const approval = state.approvals.find(a => a.id === approvalId);
      if (approval) {
        openRejectModal(approval.id);
      }
    });
  });
}

function filterApprovals() {
  return state.approvals.filter(a => {
    // Filter by active tab
    if (state.activeTab !== 'all' && a.status !== state.activeTab) {
      return false;
    }

    // Filter by funnel
    if (state.filters.funnel && a.content?.funnel !== state.filters.funnel) {
      return false;
    }

    return true;
  });
}

function createApprovalCard(approval) {
  const contentPreview = createContentPreview(approval);
  const submitDate = new Date(approval.created_at).toLocaleDateString();

  let actionButtons = '';
  if (approval.status === 'pending') {
    actionButtons = `
      <div class="card-actions">
        <button class="action-btn approve-btn"> Approve</button>
        <button class="action-btn reject-btn"> Reject</button>
      </div>
    `;
  }

  let notesHtml = '';
  if (approval.notes) {
    notesHtml = `
      <div class="card-notes">
        <strong>Notes:</strong> ${escapeHtml(approval.notes.substring(0, 80))}${
          approval.notes.length > 80 ? '...' : ''
        }
      </div>
    `;
  }

  const statusEmoji = getStatusEmoji(approval.status);

  return `
    <div class="approval-card status-${approval.status}" data-approval-id="${approval.id}">
      <div class="card-status">${statusEmoji}</div>
      ${contentPreview}
      <div class="card-meta">
        <span class="content-type">${approval.content_type}</span>
        <span class="submitted-date">${submitDate}</span>
      </div>
      ${actionButtons}
      ${notesHtml}
    </div>
  `;
}

function createContentPreview(approval) {
  if (approval.content_type === 'video' && approval.content) {
    return `
      <div class="approval-content-preview">
        <h4>${escapeHtml(approval.content.title)}</h4>
        <p class="funnel-badge">${escapeHtml(approval.content.funnel)}</p>
        ${approval.content.duration ? `<p class="duration">${approval.content.duration}s</p>` : ''}
      </div>
    `;
  } else if (approval.content_type === 'transcript') {
    const preview = approval.content?.text ? approval.content.text.substring(0, 150) : '';
    return `
      <div class="approval-content-preview">
        <h4>Transcript</h4>
        <p class="transcript-preview">${escapeHtml(preview)}...</p>
      </div>
    `;
  } else if (approval.content_type === 'clip') {
    return `
      <div class="approval-content-preview">
        <h4>${escapeHtml(approval.content?.title || 'Clip')}</h4>
        <p class="funnel-badge">${escapeHtml(approval.content?.funnel || 'N/A')}</p>
      </div>
    `;
  }

  return `<p>Content #${approval.content_id}</p>`;
}

function getStatusEmoji(status) {
  const emojis = {
    pending: '',
    approved: '',
    rejected: ''
  };
  return emojis[status] || '❓';
}

function updateTabCounts() {
  const pending = state.approvals.filter(a => a.status === 'pending').length;
  const approved = state.approvals.filter(a => a.status === 'approved').length;
  const rejected = state.approvals.filter(a => a.status === 'rejected').length;

  if (elements.pendingCount) elements.pendingCount.textContent = pending;
  if (elements.approvedCount) elements.approvedCount.textContent = approved;
  if (elements.rejectedCount) elements.rejectedCount.textContent = rejected;
}

// ================================================================
// Approval Actions
// ================================================================

async function approveApproval(approvalId) {
  try {
    const response = await fetch(`${API_BASE}/approvals/${approvalId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Charlie-PIN': state.pin
      },
      body: JSON.stringify({ notes: '' })
    });

    if (!response.ok) {
      throw new Error('Failed to approve');
    }

    showSuccess(' Approved!');
    closeDetailModal();
    fetchApprovals();
  } catch (error) {
    console.error('Error approving:', error);
    showError('Failed to approve');
  }
}

function openRejectModal(approvalId) {
  state.rejectingId = approvalId;
  elements.rejectNotes.value = '';
  elements.rejectConfirmBtn.disabled = true;
  elements.rejectModal.classList.add('active');
}

function closeRejectModal() {
  elements.rejectModal.classList.remove('active');
  state.rejectingId = null;
  elements.rejectNotes.value = '';
}

async function confirmReject() {
  const notes = elements.rejectNotes.value.trim();

  if (!notes) {
    showError('Please provide rejection notes');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/approvals/${state.rejectingId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Charlie-PIN': state.pin
      },
      body: JSON.stringify({ notes })
    });

    if (!response.ok) {
      throw new Error('Failed to reject');
    }

    showSuccess(' Rejected with notes');
    closeRejectModal();
    closeDetailModal();
    fetchApprovals();
  } catch (error) {
    console.error('Error rejecting:', error);
    showError('Failed to reject');
  }
}

// ================================================================
// Detail Modal
// ================================================================

function showDetailModal(approval) {
  state.selectedApproval = approval;

  // Build content details
  let contentHtml = '';
  if (approval.content_type === 'video' && approval.content) {
    contentHtml = `
      <div class="detail-section">
        <h3>Video Details</h3>
        <div class="video-info-grid">
          <div class="info-group">
            <label>Title</label>
            <p>${escapeHtml(approval.content.title)}</p>
          </div>
          <div class="info-group">
            <label>Funnel</label>
            <p>${escapeHtml(approval.content.funnel)}</p>
          </div>
          <div class="info-group">
            <label>Duration</label>
            <p>${approval.content.duration ? approval.content.duration + 's' : 'N/A'}</p>
          </div>
        </div>
      </div>
    `;
  } else if (approval.content_type === 'transcript') {
    const preview = approval.content?.text ? approval.content.text : '';
    contentHtml = `
      <div class="detail-section">
        <h3>Transcript</h3>
        <div class="transcript-viewer">
          <p>${escapeHtml(preview)}</p>
        </div>
      </div>
    `;
  }

  // Build status info
  let statusHtml = `
    <div class="detail-section">
      <h3>Status</h3>
      <p><strong>Status:</strong> <span class="badge badge-${approval.status}">${approval.status}</span></p>
  `;

  if (approval.reviewed_by) {
    statusHtml += `<p><strong>Reviewed by:</strong> ${escapeHtml(approval.reviewed_by)}</p>`;
    statusHtml += `<p><strong>Date:</strong> ${new Date(approval.review_date).toLocaleString()}</p>`;
  }

  statusHtml += '</div>';

  // Build notes info
  let notesHtml = '';
  if (approval.notes) {
    notesHtml = `
      <div class="detail-section">
        <h3>Notes</h3>
        <p class="full-notes">${escapeHtml(approval.notes)}</p>
      </div>
    `;
  }

  // Build action buttons
  let actionsHtml = '';
  if (approval.status === 'pending') {
    actionsHtml = `
      <button class="action-btn approve-btn detail-approve" onclick="approveApproval('${approval.id}')">
         Approve
      </button>
      <button class="action-btn reject-btn detail-reject" onclick="openRejectModal('${approval.id}')">
         Reject
      </button>
    `;
  }

  elements.detailContent.innerHTML = contentHtml + statusHtml + notesHtml;
  elements.detailActions.innerHTML = actionsHtml;
  elements.detailModal.classList.add('active');
}

function closeDetailModal() {
  elements.detailModal.classList.remove('active');
  state.selectedApproval = null;
}

// ================================================================
// Polling for Real-time Updates
// ================================================================

function startPolling() {
  if (state.pollingInterval) clearInterval(state.pollingInterval);

  state.pollingInterval = setInterval(() => {
    if (state.authenticated) {
      fetchApprovals();
    }
  }, POLL_INTERVAL);
}

function stopPolling() {
  if (state.pollingInterval) {
    clearInterval(state.pollingInterval);
    state.pollingInterval = null;
  }
}

// ================================================================
// Utility Functions
// ================================================================

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showSuccess(message) {
  console.log('Success:', message);
  // Could be replaced with toast library
}

function showError(message) {
  console.error('Error:', message);
  // Could be replaced with toast library
}

// ================================================================
// Initialization
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('Approval Dashboard initialized');

  // Check if already authenticated (from session storage)
  const savedPin = sessionStorage.getItem(PIN_STORAGE_KEY);
  if (savedPin) {
    login(savedPin);
  }
});

window.addEventListener('beforeunload', () => {
  stopPolling();
});
