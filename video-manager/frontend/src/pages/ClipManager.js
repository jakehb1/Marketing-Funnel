import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiDownload, FiTrash2, FiEdit2, FiSave } from 'react-icons/fi';
import { toast } from 'react-toastify';
import './ClipManager.css';

function ClipManager() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    startTime: '',
    endTime: '',
    purpose: ''
  });
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchVideoAndClips();
  }, [videoId]);

  const fetchVideoAndClips = async () => {
    try {
      const videoResponse = await fetch(`/api/videos/${videoId}`);
      if (videoResponse.ok) {
        const videoData = await videoResponse.json();
        setVideo(videoData);
      }

      const clipsResponse = await fetch(`/api/clips/${videoId}`);
      if (clipsResponse.ok) {
        const clipsData = await clipsResponse.json();
        setClips(clipsData.clips || []);
      }
    } catch (error) {
      toast.error('Error loading data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClip = async (e) => {
    e.preventDefault();

    if (!formData.startTime || !formData.endTime || !formData.purpose) {
      toast.error('Please fill in all fields');
      return;
    }

    const start = parseFloat(formData.startTime);
    const end = parseFloat(formData.endTime);

    if (start >= end) {
      toast.error('Start time must be less than end time');
      return;
    }

    if (video && video.duration && end > video.duration) {
      toast.error('End time exceeds video duration');
      return;
    }

    setCreating(true);

    try {
      const response = await fetch('/api/clips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoId,
          startTime: start,
          endTime: end,
          purpose: formData.purpose
        })
      });

      if (response.ok) {
        const newClip = await response.json();
        setClips([newClip, ...clips]);
        setFormData({ startTime: '', endTime: '', purpose: '' });
        setShowForm(false);
        toast.success('Clip created successfully');
      } else {
        toast.error('Failed to create clip');
      }
    } catch (error) {
      toast.error('Error creating clip');
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteClip = async (clipId) => {
    if (!window.confirm('Delete this clip?')) return;

    try {
      const response = await fetch(`/api/clips/${clipId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setClips(clips.filter(c => c.id !== clipId));
        toast.success('Clip deleted');
      }
    } catch (error) {
      toast.error('Error deleting clip');
      console.error(error);
    }
  };

  const handleDownloadClip = (clip) => {
    const downloadUrl = `/uploads/${clip.filename}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${clip.purpose || 'clip'}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="clip-manager">
      <button className="btn-back" onClick={() => navigate('/')}>
        <FiArrowLeft /> Back to Dashboard
      </button>

      <div className="clips-card">
        <div className="clips-header">
          <div>
            <h2>Video Clips</h2>
            {video && <p className="video-name">{video.title}</p>}
          </div>
          <button className="btn-create" onClick={() => setShowForm(!showForm)}>
            <FiPlus /> Create Clip
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreateClip} className="clip-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Start Time (seconds) *</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  placeholder="0"
                  disabled={creating}
                />
              </div>

              <div className="form-group">
                <label>End Time (seconds) *</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  placeholder={video?.duration || '120'}
                  disabled={creating}
                />
              </div>

              <div className="form-group full-width">
                <label>Purpose / Description *</label>
                <input
                  type="text"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="e.g., Intro segment, Best moment, Patient testimonial"
                  disabled={creating}
                />
              </div>
            </div>

            {video && video.duration && (
              <p className="video-duration">Video duration: {Math.floor(video.duration / 60)}m {video.duration % 60}s</p>
            )}

            <div className="form-actions">
              <button type="submit" className="btn-submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create Clip'}
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => { setShowForm(false); setFormData({ startTime: '', endTime: '', purpose: '' }); }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {clips.length === 0 ? (
          <div className="empty-state">
            <p>No clips yet</p>
            <small>Create a clip by selecting a time segment from the video</small>
          </div>
        ) : (
          <div className="clips-list">
            {clips.map(clip => (
              <div key={clip.id} className="clip-card">
                <div className="clip-info">
                  <h4>{clip.purpose}</h4>
                  <p className="timestamps">
                    {clip.start_time}s - {clip.end_time}s <span className="duration">({clip.duration}s)</span>
                  </p>
                  <small>{new Date(clip.created_at).toLocaleDateString()}</small>
                </div>

                <div className="clip-actions">
                  <button
                    className="btn-action download"
                    onClick={() => handleDownloadClip(clip)}
                    title="Download clip"
                  >
                    <FiDownload />
                  </button>
                  <button
                    className="btn-action delete"
                    onClick={() => handleDeleteClip(clip.id)}
                    title="Delete clip"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ClipManager;
