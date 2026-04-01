import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiUploadCloud, FiCheckCircle } from 'react-icons/fi';
import './UploadVideo.css';

function UploadVideo({ onSuccess }) {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [title, setTitle] = useState('');
  const [funnel, setFunnel] = useState('general');
  const [selectedFile, setSelectedFile] = useState(null);

  const onDrop = (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.mkv']
    },
    multiple: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!selectedFile) {
      toast.error('Please select a video file');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('video', selectedFile);
      formData.append('title', title);
      formData.append('funnel', funnel);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 201) {
          const response = JSON.parse(xhr.responseText);
          toast.success('Video uploaded! Transcription in progress...');
          
          // Reset form
          setTitle('');
          setFunnel('general');
          setSelectedFile(null);
          setUploadProgress(0);

          // Refresh and navigate
          onSuccess();
          setTimeout(() => navigate('/'), 2000);
        } else {
          toast.error('Upload failed');
        }
        setUploading(false);
      });

      xhr.addEventListener('error', () => {
        toast.error('Upload error');
        setUploading(false);
      });

      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    } catch (error) {
      toast.error(error.message || 'Upload failed');
      setUploading(false);
    }
  };

  return (
    <div className="upload-page">
      <div className="upload-card">
        <h2>Upload Video</h2>
        <p className="upload-description">
          Upload your video and it will automatically be transcribed using Whisper
        </p>

        <form onSubmit={handleSubmit} className="upload-form">
          <div className="form-group">
            <label htmlFor="title">Video Title *</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Introduction to Reiki Healing"
              disabled={uploading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="funnel">Funnel</label>
            <select
              id="funnel"
              value={funnel}
              onChange={(e) => setFunnel(e.target.value)}
              disabled={uploading}
            >
              <option value="general">General</option>
              <option value="patient">Patient</option>
              <option value="healer">Healer</option>
              <option value="promotion">Promotion</option>
            </select>
          </div>

          <div
            {...getRootProps()}
            className={`dropzone ${isDragActive ? 'active' : ''} ${selectedFile ? 'has-file' : ''}`}
          >
            <input {...getInputProps()} disabled={uploading} />
            <div className="dropzone-content">
              {selectedFile ? (
                <>
                  <FiCheckCircle size={48} />
                  <p className="file-name">{selectedFile.name}</p>
                  <p className="file-size">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  <p className="change-file">Click or drag to change</p>
                </>
              ) : (
                <>
                  <FiUploadCloud size={48} />
                  <p>Drag and drop your video here</p>
                  <p className="or">or</p>
                  <p>Click to select file</p>
                </>
              )}
            </div>
          </div>

          {uploading && (
            <div className="progress-section">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
              </div>
              <p className="progress-text">Uploading... {uploadProgress}%</p>
            </div>
          )}

          <button
            type="submit"
            className="btn-submit"
            disabled={uploading || !title.trim() || !selectedFile}
          >
            {uploading ? `Uploading... ${uploadProgress}%` : 'Upload & Transcribe'}
          </button>
        </form>

        <div className="upload-info">
          <h4>Info</h4>
          <ul>
            <li>Supported formats: MP4, MOV, AVI, MKV</li>
            <li>Maximum file size: 5GB</li>
            <li>Transcription happens automatically after upload</li>
            <li>Processing time depends on video length</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default UploadVideo;
