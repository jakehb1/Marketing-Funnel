import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCopy, FiDownload, FiEdit2, FiSave, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import './TranscriptViewer.css';

function TranscriptViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [transcript, setTranscript] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  useEffect(() => {
    fetchTranscript();
  }, [id]);

  const fetchTranscript = async () => {
    try {
      const response = await fetch(`/api/transcripts/${id}`);
      if (response.ok) {
        const data = await response.json();
        setTranscript(data);
        setText(data.text || '');
      } else {
        toast.error('Transcript not found');
      }
    } catch (error) {
      toast.error('Error loading transcript');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/transcripts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });

      if (response.ok) {
        const updated = await response.json();
        setTranscript(updated);
        setEditing(false);
        toast.success('Transcript updated');
      }
    } catch (error) {
      toast.error('Failed to update transcript');
      console.error(error);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    toast.success('Transcript copied to clipboard');
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `transcript_${id}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Transcript downloaded');
  };

  if (loading) {
    return <div className="loading">Loading transcript...</div>;
  }

  if (!transcript) {
    return <div className="error">Transcript not found</div>;
  }

  return (
    <div className="transcript-viewer">
      <button className="btn-back" onClick={() => navigate('/')}>
        <FiArrowLeft /> Back to Dashboard
      </button>

      <div className="transcript-card">
        <div className="transcript-header">
          <div>
            <h2>Transcript</h2>
            <p className="language">Language: {transcript.language || 'en'}</p>
          </div>

          <div className="header-actions">
            {editing ? (
              <>
                <button className="btn-save" onClick={handleSave}>
                  <FiSave /> Save
                </button>
                <button className="btn-cancel" onClick={() => { setEditing(false); setText(transcript.text); }}>
                  <FiX /> Cancel
                </button>
              </>
            ) : (
              <>
                <button className="btn-action" onClick={handleCopy}>
                  <FiCopy /> Copy
                </button>
                <button className="btn-action" onClick={handleDownload}>
                  <FiDownload /> Download
                </button>
                <button className="btn-action" onClick={() => setEditing(true)}>
                  <FiEdit2 /> Edit
                </button>
              </>
            )}
          </div>
        </div>

        {editing ? (
          <textarea
            className="transcript-edit"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Transcript text..."
            rows="20"
          />
        ) : (
          <div className="transcript-content">
            <p>{text}</p>
            {!text && (
              <p className="empty-message">No transcript available yet. Transcription may still be in progress.</p>
            )}
          </div>
        )}

        <div className="transcript-stats">
          <div className="stat">
            <span className="stat-label">Characters:</span>
            <span className="stat-value">{text.length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Words:</span>
            <span className="stat-value">{text.split(/\s+/).filter(w => w).length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Paragraphs:</span>
            <span className="stat-value">{text.split('\n\n').filter(p => p.trim()).length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TranscriptViewer;
