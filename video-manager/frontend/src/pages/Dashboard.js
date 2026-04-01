import React, { useState } from 'react';
import { FiRefreshCw, FiSearch, FiFilter } from 'react-icons/fi';
import VideoCard from '../components/VideoCard';
import './Dashboard.css';

function Dashboard({ videos, loading, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [funnelFilter, setFunnelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredVideos = videos.filter(video => {
    const matchesSearch = searchTerm === '' || 
      video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (video.original_name && video.original_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFunnel = funnelFilter === '' || video.funnel === funnelFilter;
    const matchesStatus = statusFilter === '' || video.status === statusFilter;

    return matchesSearch && matchesFunnel && matchesStatus;
  });

  const uniqueFunnels = [...new Set(videos.map(v => v.funnel))].filter(Boolean);
  const uniqueStatuses = [...new Set(videos.map(v => v.status))].filter(Boolean);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Video Library</h2>
        <button className="btn-refresh" onClick={onRefresh}>
          <FiRefreshCw /> Refresh
        </button>
      </div>

      <div className="dashboard-filters">
        <div className="search-box">
          <FiSearch />
          <input
            type="text"
            placeholder="Search videos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <div className="filter-group">
            <FiFilter />
            <select
              value={funnelFilter}
              onChange={(e) => setFunnelFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Funnels</option>
              {uniqueFunnels.map(funnel => (
                <option key={funnel} value={funnel}>{funnel}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Status</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <span className="stat-label">Total Videos</span>
          <span className="stat-value">{videos.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Ready</span>
          <span className="stat-value">{videos.filter(v => v.status === 'ready').length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Processing</span>
          <span className="stat-value">{videos.filter(v => v.status !== 'ready' && v.status !== 'error').length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Errors</span>
          <span className="stat-value">{videos.filter(v => v.status === 'error').length}</span>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading videos...</div>
      ) : filteredVideos.length === 0 ? (
        <div className="empty-state">
          <p>No videos found</p>
          <small>Try adjusting your filters or upload a new video</small>
        </div>
      ) : (
        <div className="videos-grid">
          {filteredVideos.map(video => (
            <VideoCard
              key={video.id}
              video={video}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
