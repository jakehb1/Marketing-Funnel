import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/ApprovalDashboard.css';
import { toast } from 'react-toastify';

function ApprovalDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [filterFunnel, setFilterFunnel] = useState('all');
  const [filterContentType, setFilterContentType] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    if (authenticated) {
      fetchApprovals();
      // Poll for new approvals every 30 seconds
      const interval = setInterval(fetchApprovals, 30000);
      return () => clearInterval(interval);
    }
  }, [authenticated, activeTab, filterFunnel, filterContentType]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (pin.length === 0) {
      toast.error('Please enter a PIN');
      return;
    }
    
    // Store pin in session storage for API calls
    sessionStorage.setItem('charlie_pin', pin);
    setAuthenticated(true);
    setPin('');
    toast.success('Authenticated!');
  };

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const charliePIN = sessionStorage.getItem('charlie_pin');
      
      let url = `/api/approvals?status=${activeTab}`;
      if (filterContentType !== 'all') {
        url += `&content_type=${filterContentType}`;
      }

      const response = await fetch(url, {
        headers: {
          'X-Charlie-PIN': charliePIN
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch approvals');
      }

      const data = await response.json();
      setApprovals(data.approvals || []);
    } catch (error) {
      console.error('Error fetching approvals:', error);
      toast.error('Failed to load approvals');
      if (error.message === 'Unauthorized') {
        setAuthenticated(false);
        sessionStorage.removeItem('charlie_pin');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approvalId) => {
    try {
      const charliePIN = sessionStorage.getItem('charlie_pin');
      
      const response = await fetch(`/api/approvals/${approvalId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Charlie-PIN': charliePIN
        },
        body: JSON.stringify({ notes: '' })
      });

      if (!response.ok) {
        throw new Error('Failed to approve');
      }

      toast.success('✅ Approved!');
      fetchApprovals();
      setSelectedApproval(null);
    } catch (error) {
      console.error('Error approving:', error);
      toast.error('Failed to approve');
    }
  };

  const handleRejectClick = (approval) => {
    setRejectingId(approval.id);
    setRejectNotes('');
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectNotes.trim()) {
      toast.error('Please provide rejection notes');
      return;
    }

    try {
      const charliePIN = sessionStorage.getItem('charlie_pin');
      
      const response = await fetch(`/api/approvals/${rejectingId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Charlie-PIN': charliePIN
        },
        body: JSON.stringify({ notes: rejectNotes })
      });

      if (!response.ok) {
        throw new Error('Failed to reject');
      }

      toast.error('❌ Rejected with notes');
      fetchApprovals();
      setShowRejectModal(false);
      setRejectNotes('');
      setRejectingId(null);
      setSelectedApproval(null);
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error('Failed to reject');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('charlie_pin');
    setAuthenticated(false);
    setApprovals([]);
    setPin('');
  };

  const getContentPreview = (approval) => {
    if (approval.content_type === 'video' && approval.content) {
      return (
        <div className="approval-content-preview">
          <h4>{approval.content.title}</h4>
          <p className="funnel-badge">{approval.content.funnel}</p>
          {approval.content.duration && <p className="duration">{approval.content.duration}s</p>}
        </div>
      );
    } else if (approval.content_type === 'transcript') {
      return (
        <div className="approval-content-preview">
          <h4>Transcript</h4>
          <p className="transcript-preview">
            {approval.content?.text?.substring(0, 150)}...
          </p>
        </div>
      );
    }
    return <p>Content #{approval.content_id}</p>;
  };

  const filteredApprovals = approvals.filter(a => {
    if (filterFunnel !== 'all' && a.content?.funnel !== filterFunnel) {
      return false;
    }
    return true;
  });

  if (!authenticated) {
    return (
      <div className="approval-login-container">
        <div className="login-card">
          <h1>🔐 Approval Dashboard</h1>
          <p className="subtitle">Charlie's Content Review Portal</p>
          
          <form onSubmit={handleLogin}>
            <div className="pin-input-group">
              <label>PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength="6"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••••"
                className="pin-input"
              />
            </div>
            <button type="submit" className="login-button">
              Unlock Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="approval-dashboard">
      <div className="approval-header">
        <div>
          <h1>🔍 Approval Dashboard</h1>
          <p>Review pending content submissions</p>
        </div>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>

      <div className="approval-controls">
        <div className="tab-buttons">
          <button
            className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            ⏳ Pending ({approvals.filter(a => a.status === 'pending').length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'approved' ? 'active' : ''}`}
            onClick={() => setActiveTab('approved')}
          >
            ✅ Approved ({approvals.filter(a => a.status === 'approved').length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'rejected' ? 'active' : ''}`}
            onClick={() => setActiveTab('rejected')}
          >
            ❌ Rejected ({approvals.filter(a => a.status === 'rejected').length})
          </button>
        </div>

        <div className="filters">
          <select value={filterContentType} onChange={(e) => setFilterContentType(e.target.value)}>
            <option value="all">All Content Types</option>
            <option value="video">Videos</option>
            <option value="transcript">Transcripts</option>
            <option value="clip">Clips</option>
          </select>

          <select value={filterFunnel} onChange={(e) => setFilterFunnel(e.target.value)}>
            <option value="all">All Funnels</option>
            <option value="healer">Healer</option>
            <option value="untrained">Untrained</option>
            <option value="patient">Patient</option>
            <option value="referral">Referral</option>
            <option value="owned">Owned</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <p>Loading...</p>
        </div>
      ) : filteredApprovals.length === 0 ? (
        <div className="empty-state">
          <p>No {activeTab} items</p>
          {activeTab === 'pending' && <p className="sub">All caught up! ✨</p>}
        </div>
      ) : (
        <div className="approvals-grid">
          {filteredApprovals.map((approval) => (
            <div
              key={approval.id}
              className={`approval-card status-${approval.status}`}
              onClick={() => setSelectedApproval(approval)}
            >
              <div className="card-status">
                {approval.status === 'pending' && '⏳'}
                {approval.status === 'approved' && '✅'}
                {approval.status === 'rejected' && '❌'}
              </div>

              {getContentPreview(approval)}

              <div className="card-meta">
                <span className="content-type">{approval.content_type}</span>
                <span className="submitted-date">
                  {new Date(approval.created_at).toLocaleDateString()}
                </span>
              </div>

              {approval.status === 'pending' && (
                <div className="card-actions">
                  <button
                    className="action-btn approve-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApprove(approval.id);
                    }}
                  >
                    ✅ Approve
                  </button>
                  <button
                    className="action-btn reject-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRejectClick(approval);
                    }}
                  >
                    ❌ Reject
                  </button>
                </div>
              )}

              {approval.notes && (
                <div className="card-notes">
                  <strong>Notes:</strong> {approval.notes.substring(0, 80)}...
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>❌ Reject Content</h2>
            <p className="modal-subtitle">
              Please provide detailed feedback for the creator.
            </p>

            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Why is this being rejected? (required)"
              className="rejection-notes-input"
              rows={6}
            />

            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowRejectModal(false)}
              >
                Cancel
              </button>
              <button
                className="reject-confirm-btn"
                onClick={handleReject}
                disabled={!rejectNotes.trim()}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail View Modal */}
      {selectedApproval && (
        <div className="modal-overlay" onClick={() => setSelectedApproval(null)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <button
              className="close-button"
              onClick={() => setSelectedApproval(null)}
            >
              ✕
            </button>

            <h2>Content Details</h2>

            <div className="detail-section">
              <h3>Content</h3>
              {getContentPreview(selectedApproval)}
            </div>

            <div className="detail-section">
              <h3>Status</h3>
              <p>
                <strong>Status:</strong> {selectedApproval.status}
              </p>
              {selectedApproval.reviewed_by && (
                <>
                  <p><strong>Reviewed by:</strong> {selectedApproval.reviewed_by}</p>
                  <p><strong>Date:</strong> {new Date(selectedApproval.review_date).toLocaleString()}</p>
                </>
              )}
            </div>

            {selectedApproval.notes && (
              <div className="detail-section">
                <h3>Notes</h3>
                <p className="full-notes">{selectedApproval.notes}</p>
              </div>
            )}

            {selectedApproval.status === 'pending' && (
              <div className="detail-actions">
                <button
                  className="action-btn approve-btn"
                  onClick={() => {
                    handleApprove(selectedApproval.id);
                  }}
                >
                  ✅ Approve
                </button>
                <button
                  className="action-btn reject-btn"
                  onClick={() => {
                    handleRejectClick(selectedApproval);
                  }}
                >
                  ❌ Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ApprovalDashboard;
