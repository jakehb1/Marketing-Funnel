import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiEdit2, FiSave, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import './VideoDetails.css';

function VideoDetails({ onRefresh }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [funnel, setFunnel] = useState('');

  useEffect(() => {
    fetchVideo();
  }, [id]);

  const fetchVideo = async () => {
    try {
      const response = await fetch(`/api/videos/${id}`);
      if (response.ok) {
        const data = await response.json();
        setVideo(data);
        setTitle(data.title);
        setFunnel(data.funnel);
      } else {
        toast.error('Video not found');
        navigate('/');
      }
    } catch (error) {
      toast.error('Error loading video');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/videos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          funnel
        })
      });

      if (response.ok) {
        const updated = await response.json();
        setVideo(updated);
        setEditing(false);
        toast.success('Video updated');
        onRefresh();
      }
    } catch (error) {
      toast.error('Failed to update video');
      console.error(error);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!video) {
    return <div className="error">Video not found</div>;
  }

  return (
    <div className="video-details">
      <button className="btn-back" onClick={() => navigate('/')}>
        <FiArrowLeft /> Back to Dashboard
      </button>

      <div className="details-card">
        <div className="details-header">
          {editing ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="title-edit"
            />
          ) : (
            <h1>{video.title}</h1>
          )}

          <div className="header-actions">
            {editing ? (
              <>
                <button className="btn-save" onClick={handleSave}>
                  <FiSave /> Save
                </button>
                <button className="btn-cancel" onClick={() => setEditing(false)}>
                  <FiX /> Cancel
                </button>
              </>
            ) : (
              <button className="btn-edit" onClick={() => setEditing(true)}>
                <FiEdit2 /> Edit
              </button>
            )}
          </div>
        </div>

        <div className="details-grid">
          <div className="detail-item">
            <span className="label">Status</span>
            <span className={`value status-${video.status}`}>
              {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
            </span>
          </div>

          <div className="detail-item">
            <span className="label">Funnel</span>
            {editing ? (
              <select value={funnel} onChange={(e) => setFunnel(e.target.value)}>
                <option value="general">General</option>
                <option value="patient">Patient</option>
                <option value="healer">Healer</option>
                <option value="promotion">Promotion</option>
              </select>
            ) : (
              <span className="value">{video.funnel || 'general'}</span>
            )}
          </div>

          {video.duration && (
            <div className="detail-item">
              <span className="label">Duration</span>
              <span className="value">
                {Math.floor(video.duration / 60)}m {video.duration % 60}s
              </span>
            </div>
          )}

          {video.size && (
            <div className="detail-item">
              <span className="label">File Size</span>
              <span className="value">
                {(video.size / 1024 / 1024 / 1024).toFixed(2)} GB
              </span>
            </div>
          )}

          <div className="detail-item">
            <span className="label">Uploaded</span>
            <span className="value">
              {new Date(video.uploaded_at).toLocaleDateString()}
            </span>
          </div>

          <div className="detail-item">
            <span className="label">File Name</span>
            <span className="value filename">{video.filename}</span>
          </div>
        </div>

        {video.clips && video.clips.length > 0 && (
          <div className="clips-section">
            <h3>Associated Clips ({video.clips.length})</h3>
            <div className="clips-list">
              {video.clips.map(clip => (
                <div key={clip.id} className="clip-item">
                  <div>
                    <p className="clip-purpose">{clip.purpose || 'Clip'}</p>
                    <small>
                      {clip.start_time}s - {clip.end_time}s ({clip.duration}s)
                    </small>
                  </div>
                  <a href={`/uploads/${clip.filename}`} download className="btn-download">
                    Download
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VideoDetails;
