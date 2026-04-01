import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiDownload, FiEdit2, FiTrash2, FiInfo } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import './VideoCard.css';

function VideoCard({ video, onRefresh }) {
  const [status, setStatus] = useState(video.status);
  const [transcript, setTranscript] = useState(null);
  const [approvalStatus, setApprovalStatus] = useState(video.approval_status || 'pending');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/status/${video.id}`);
        const data = await response.json();
        setStatus(data.status);
      } catch (error) {
        console.error('Error fetching status:', error);
      }
    };

    if (status !== 'ready' && status !== 'error') {
      const interval = setInterval(fetchStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [video.id, status]);

  useEffect(() => {
    const fetchTranscript = async () => {
      try {
        const response = await fetch(`/api/transcripts/${video.id}`);
        if (response.ok) {
          const data = await response.json();
          setTranscript(data);
        }
      } catch (error) {
        console.error('Error fetching transcript:', error);
      }
    };

    if (status === 'ready') {
      fetchTranscript();
    }
  }, [video.id, status]);

  const getStatusBadge = () => {
    const badges = {
      uploading: { text: 'Uploading...', color: '#3498db' },
      transcribing: { text: 'Transcribing...', color: '#f39c12' },
      ready: { text: 'Ready', color: '#27ae60' },
      error: { text: 'Error', color: '#e74c3c' }
    };

    const badge = badges[status] || badges.uploading;
    return badge;
  };

  const getApprovalBadge = () => {
    const badges = {
      pending: { text: '⏳ Pending Approval', color: '#f39c12', icon: '⏳' },
      approved: { text: '✅ Approved', color: '#27ae60', icon: '✅' },
      rejected: { text: '❌ Rejected', color: '#e74c3c', icon: '❌' }
    };

    return badges[approvalStatus] || badges.pending;
  };

  const uploadTime = formatDistanceToNow(new Date(video.uploaded_at), { addSuffix: true });

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this video?')) {
      return;
    }

    try {
      const response = await fetch(`/api/videos/${video.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error deleting video:', error);
    }
  };

  const badge = getStatusBadge();
  const approvalBadge = getApprovalBadge();

  return (
    <div className="video-card">
      <div className="video-card-header">
        <h3>{video.title}</h3>
        <div className="badge-group">
          <span className="status-badge" style={{ backgroundColor: badge.color }}>
            {badge.text}
          </span>
          <span className="approval-badge" style={{ backgroundColor: approvalBadge.color }}>
            {approvalBadge.text}
          </span>
        </div>
      </div>

      <div className="video-card-meta">
        <div className="meta-item">
          <span className="label">Funnel:</span>
          <span className="value">{video.funnel || 'general'}</span>
        </div>
        <div className="meta-item">
          <span className="label">Uploaded:</span>
          <span className="value">{uploadTime}</span>
        </div>
        {video.duration && (
          <div className="meta-item">
            <span className="label">Duration:</span>
            <span className="value">{Math.round(video.duration / 60)}m {video.duration % 60}s</span>
          </div>
        )}
      </div>

      {transcript && (
        <div className="video-card-transcript">
          <p className="transcript-preview">
            {transcript.text.substring(0, 150)}...
          </p>
        </div>
      )}

      <div className="video-card-actions">
        <Link to={`/video/${video.id}`} className="btn btn-secondary">
          <FiInfo /> Details
        </Link>
        {status === 'ready' && (
          <>
            <Link to={`/transcript/${video.id}`} className="btn btn-secondary">
              <FiEdit2 /> Transcript
            </Link>
            <Link to={`/clips/${video.id}`} className="btn btn-secondary">
              <FiDownload /> Clips
            </Link>
          </>
        )}
        <button className="btn btn-danger" onClick={handleDelete}>
          <FiTrash2 /> Delete
        </button>
      </div>
    </div>
  );
}

export default VideoCard;
