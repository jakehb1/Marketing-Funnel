/**
 * ENNIE Video Manager - Dashboard
 * Pure vanilla JavaScript - No frameworks
 * Handles: Upload, video list, filtering, search, real-time polling
 */

// ================================================================
// State Management
// ================================================================

const state = {
  videos: [],
  selectedVideo: null,
  currentTab: 'dashboard',
  filters: {
    search: '',
    funnel: '',
    status: ''
  },
  uploadingFile: null,
  pollingInterval: null
};

const API_BASE = '/api';
const POLL_INTERVAL = 5000; // 5 seconds

// ================================================================
// DOM Elements
// ================================================================

const elements = {
  // Tabs
  navTabs: document.querySelectorAll('.nav-tab'),
  tabContents: document.querySelectorAll('.tab-content'),

  // Upload
  dropzone: document.getElementById('video-dropzone'),
  videoFile: document.getElementById('video-file'),
  selectFileBtn: document.getElementById('select-file-btn'),
  uploadBtn: document.getElementById('upload-btn'),
  uploadProgress: document.getElementById('upload-progress'),
  progressFill: document.getElementById('progress-fill'),
  progressText: document.getElementById('progress-text'),
  videoTitle: document.getElementById('video-title'),
  videoFunnel: document.getElementById('video-funnel'),

  // Filters
  searchInput: document.getElementById('search-input'),
  filterFunnel: document.getElementById('filter-funnel'),
  filterStatus: document.getElementById('filter-status'),
  refreshBtn: document.getElementById('refresh-btn'),

  // Stats
  statTotal: document.getElementById('stat-total'),
  statReady: document.getElementById('stat-ready'),
  statProcessing: document.getElementById('stat-processing'),
  statErrors: document.getElementById('stat-errors'),

  // Videos Grid
  videosGrid: document.getElementById('videos-grid'),

  // Modal
  modal: document.getElementById('video-modal'),
  modalClose: document.querySelector('#video-modal .modal-close'),
  modalTitle: document.getElementById('modal-title'),
  modalFunnel: document.getElementById('modal-funnel'),
  modalStatus: document.getElementById('modal-status'),
  modalUploaded: document.getElementById('modal-uploaded'),
  modalDuration: document.getElementById('modal-duration'),
  transcriptViewer: document.getElementById('transcript-viewer'),
  downloadTranscriptBtn: document.getElementById('download-transcript-btn'),
  downloadVideoBtn: document.getElementById('download-video-btn'),
  approvalInfo: document.getElementById('approval-info'),
  approvalStatus: document.getElementById('approval-status'),
  approvalNotes: document.getElementById('approval-notes'),
  approvalNotesLine: document.getElementById('approval-notes-line')
};

// ================================================================
// Event Listeners - Tab Navigation
// ================================================================

elements.navTabs.forEach(tab => {
  tab.addEventListener('click', (e) => {
    const tabName = e.target.dataset.tab;
    switchTab(tabName);
  });
});

function switchTab(tabName) {
  state.currentTab = tabName;

  // Update nav tabs
  elements.navTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  // Update tab content
  elements.tabContents.forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}-tab`);
  });

  // Load approval dashboard if switching to approval tab
  if (tabName === 'approval') {
    loadApprovalDashboard();
  }
}

// ================================================================
// Event Listeners - Upload
// ================================================================

elements.selectFileBtn.addEventListener('click', () => {
  elements.videoFile.click();
});

elements.videoFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    handleFileSelected(file);
  }
});

// Drag and drop
elements.dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
  elements.dropzone.classList.add('dragover');
});

elements.dropzone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  e.stopPropagation();
  elements.dropzone.classList.remove('dragover');
});

elements.dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();
  elements.dropzone.classList.remove('dragover');

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    if (file.type.startsWith('video/')) {
      handleFileSelected(file);
    } else {
      showError('Please drop a video file');
    }
  }
});

function handleFileSelected(file) {
  state.uploadingFile = file;
  elements.selectFileBtn.style.display = 'none';
  elements.uploadBtn.style.display = 'inline-block';
  showNotification(`File selected: ${file.name}`);
}

elements.uploadBtn.addEventListener('click', () => {
  const title = elements.videoTitle.value.trim();
  const funnel = elements.videoFunnel.value;

  if (!title) {
    showError('Please enter a video title');
    return;
  }

  if (!funnel) {
    showError('Please select a funnel');
    return;
  }

  if (!state.uploadingFile) {
    showError('Please select a file');
    return;
  }

  uploadVideo(title, funnel, state.uploadingFile);
});

// ================================================================
// Event Listeners - Filters & Search
// ================================================================

elements.searchInput.addEventListener('input', (e) => {
  state.filters.search = e.target.value;
  renderVideos();
});

elements.filterFunnel.addEventListener('change', (e) => {
  state.filters.funnel = e.target.value;
  renderVideos();
});

elements.filterStatus.addEventListener('change', (e) => {
  state.filters.status = e.target.value;
  renderVideos();
});

elements.refreshBtn.addEventListener('click', () => {
  fetchVideos();
});

// ================================================================
// Event Listeners - Modal
// ================================================================

elements.modalClose.addEventListener('click', () => {
  closeModal();
});

window.addEventListener('click', (e) => {
  if (e.target === elements.modal) {
    closeModal();
  }
});

elements.downloadTranscriptBtn.addEventListener('click', () => {
  if (state.selectedVideo && state.selectedVideo.transcript) {
    downloadFile(
      state.selectedVideo.transcript,
      `${state.selectedVideo.title}-transcript.txt`,
      'text/plain'
    );
  }
});

elements.downloadVideoBtn.addEventListener('click', () => {
  if (state.selectedVideo && state.selectedVideo.file_url) {
    window.open(state.selectedVideo.file_url, '_blank');
  }
});

// ================================================================
// Upload Handler
// ================================================================

async function uploadVideo(title, funnel, file) {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('funnel', funnel);
  formData.append('file', file);

  try {
    elements.uploadProgress.style.display = 'block';
    elements.uploadBtn.disabled = true;

    // Create XMLHttpRequest for progress tracking
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = Math.round((e.loaded / e.total) * 100);
        elements.progressFill.style.width = percentComplete + '%';
        elements.progressText.textContent = percentComplete + '%';
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200 || xhr.status === 201) {
        const response = JSON.parse(xhr.responseText);
        showSuccess(`Video "${title}" uploaded successfully!`);
        resetUploadForm();
        fetchVideos();
      } else {
        showError('Upload failed');
        elements.uploadBtn.disabled = false;
      }
    });

    xhr.addEventListener('error', () => {
      showError('Upload error');
      elements.uploadBtn.disabled = false;
    });

    xhr.open('POST', `${API_BASE}/upload`);
    xhr.send(formData);
  } catch (error) {
    console.error('Upload error:', error);
    showError('Upload failed');
    elements.uploadBtn.disabled = false;
  }
}

function resetUploadForm() {
  elements.videoTitle.value = '';
  elements.videoFunnel.value = '';
  elements.videoFile.value = '';
  elements.uploadBtn.style.display = 'none';
  elements.selectFileBtn.style.display = 'block';
  elements.uploadProgress.style.display = 'none';
  elements.progressFill.style.width = '0%';
  elements.progressText.textContent = '0%';
  state.uploadingFile = null;
}

// ================================================================
// Fetch Videos
// ================================================================

async function fetchVideos() {
  try {
    const response = await fetch(`${API_BASE}/videos`);
    if (!response.ok) throw new Error('Failed to fetch videos');

    const data = await response.json();
    state.videos = data.videos || [];
    renderVideos();
    updateStats();
  } catch (error) {
    console.error('Error fetching videos:', error);
    showError('Failed to load videos');
  }
}

function renderVideos() {
  const filtered = filterVideos();

  if (filtered.length === 0) {
    elements.videosGrid.innerHTML = `
      <div class="empty-state">
        <p>📭 No videos found</p>
        <small>Try adjusting your filters</small>
      </div>
    `;
    return;
  }

  elements.videosGrid.innerHTML = filtered.map(video => createVideoCard(video)).join('');

  // Add click handlers to video cards
  document.querySelectorAll('.video-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const videoId = e.currentTarget.dataset.videoId;
      const video = state.videos.find(v => v.id === videoId);
      if (video) {
        showVideoModal(video);
      }
    });
  });
}

function filterVideos() {
  return state.videos.filter(video => {
    const matchesSearch =
      state.filters.search === '' ||
      video.title.toLowerCase().includes(state.filters.search.toLowerCase()) ||
      (video.original_name &&
        video.original_name.toLowerCase().includes(state.filters.search.toLowerCase()));

    const matchesFunnel = state.filters.funnel === '' || video.funnel === state.filters.funnel;
    const matchesStatus = state.filters.status === '' || video.status === state.filters.status;

    return matchesSearch && matchesFunnel && matchesStatus;
  });
}

function createVideoCard(video) {
  const date = new Date(video.created_at).toLocaleDateString();
  const statusBadge = `<span class="badge badge-status badge-${video.status}">
    ${getStatusEmoji(video.status)} ${video.status}
  </span>`;

  return `
    <div class="video-card" data-video-id="${video.id}">
      <div class="video-thumbnail"></div>
      <div class="video-content">
        <h3 class="video-title">${escapeHtml(video.title)}</h3>
        <div class="video-meta">
          <span class="badge badge-funnel">${escapeHtml(video.funnel)}</span>
          ${statusBadge}
        </div>
        <p class="video-date">${date}</p>
      </div>
    </div>
  `;
}

function getStatusEmoji(status) {
  const emojis = {
    uploading: '⬆',
    transcribing: '✍',
    ready: '',
    error: '⚠'
  };
  return emojis[status] || '❓';
}

function updateStats() {
  const total = state.videos.length;
  const ready = state.videos.filter(v => v.status === 'ready').length;
  const processing = total - ready - state.videos.filter(v => v.status === 'error').length;
  const errors = state.videos.filter(v => v.status === 'error').length;

  elements.statTotal.textContent = total;
  elements.statReady.textContent = ready;
  elements.statProcessing.textContent = processing;
  elements.statErrors.textContent = errors;
}

// ================================================================
// Modal Management
// ================================================================

async function showVideoModal(video) {
  state.selectedVideo = video;

  elements.modalTitle.textContent = video.title;
  elements.modalFunnel.textContent = video.funnel || 'Unknown';
  elements.modalStatus.innerHTML = `<span class="badge badge-${video.status}">${video.status}</span>`;
  elements.modalUploaded.textContent = new Date(video.created_at).toLocaleString();
  elements.modalDuration.textContent = video.duration ? `${video.duration}s` : 'N/A';

  // Load transcript
  await loadTranscript(video.id);

  // Load approval info if exists
  await loadApprovalInfo(video.id);

  elements.modal.classList.add('active');
}

async function loadTranscript(videoId) {
  try {
    elements.transcriptViewer.innerHTML = '<p class="loading-text">Loading transcript...</p>';

    const response = await fetch(`${API_BASE}/transcripts/${videoId}`);
    if (!response.ok) throw new Error('No transcript');

    const data = await response.json();
    const transcript = data.transcript || 'No transcript available';
    elements.transcriptViewer.innerHTML = `<p>${escapeHtml(transcript)}</p>`;
  } catch (error) {
    elements.transcriptViewer.innerHTML = '<p class="loading-text">No transcript available</p>';
  }
}

async function loadApprovalInfo(videoId) {
  try {
    const response = await fetch(`${API_BASE}/approvals?video_id=${videoId}`);
    if (!response.ok) throw new Error('No approval');

    const data = await response.json();
    const approval = data.approvals?.[0];

    if (approval) {
      elements.approvalInfo.style.display = 'block';
      const statusBadge = `<span class="badge badge-${approval.status}">${approval.status}</span>`;
      elements.approvalStatus.innerHTML = statusBadge;

      if (approval.notes) {
        elements.approvalNotes.textContent = approval.notes;
        elements.approvalNotesLine.style.display = 'block';
      } else {
        elements.approvalNotesLine.style.display = 'none';
      }
    } else {
      elements.approvalInfo.style.display = 'none';
    }
  } catch (error) {
    elements.approvalInfo.style.display = 'none';
  }
}

function closeModal() {
  elements.modal.classList.remove('active');
  state.selectedVideo = null;
}

// ================================================================
// Approval Dashboard
// ================================================================

async function loadApprovalDashboard() {
  const container = document.getElementById('approval-container');

  // Load from approval.html
  try {
    const response = await fetch('approval.html');
    const html = await response.text();

    // Extract only the approval-specific content
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const loginScreen = doc.getElementById('login-screen');
    const dashboardScreen = doc.getElementById('dashboard-screen');
    const rejectModal = doc.getElementById('reject-modal');
    const detailModal = doc.getElementById('detail-modal');

    if (loginScreen && dashboardScreen) {
      container.innerHTML = loginScreen.outerHTML + dashboardScreen.outerHTML;

      // Also append modals
      if (rejectModal) container.innerHTML += rejectModal.outerHTML;
      if (detailModal) container.innerHTML += detailModal.outerHTML;

      // Initialize approval script
      const script = doc.querySelector('script[src="approval.js"]');
      if (script) {
        const approvalScript = document.createElement('script');
        approvalScript.src = 'approval.js';
        document.body.appendChild(approvalScript);
      }
    }
  } catch (error) {
    console.error('Failed to load approval dashboard:', error);
    container.innerHTML = '<p>Failed to load approval dashboard</p>';
  }
}

// ================================================================
// Polling for Real-time Updates
// ================================================================

function startPolling() {
  if (state.pollingInterval) clearInterval(state.pollingInterval);

  state.pollingInterval = setInterval(() => {
    if (state.currentTab === 'dashboard') {
      fetchVideos();
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

function showNotification(message) {
  console.log('Notification:', message);
  // Could be replaced with toast library
}

function showSuccess(message) {
  console.log('Success:', message);
  showNotification(message);
}

function showError(message) {
  console.error('Error:', message);
  showNotification(' ' + message);
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ================================================================
// Initialization
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('Video Manager initialized');
  fetchVideos();
  startPolling();
});

window.addEventListener('beforeunload', () => {
  stopPolling();
});
