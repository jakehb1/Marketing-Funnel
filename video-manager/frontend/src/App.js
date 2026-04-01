import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import UploadVideo from './pages/UploadVideo';
import VideoDetails from './pages/VideoDetails';
import TranscriptViewer from './pages/TranscriptViewer';
import ClipManager from './pages/ClipManager';
import ApprovalDashboard from './pages/ApprovalDashboard';
import './App.css';

function App() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchVideos, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await fetch('/api/videos');
      const data = await response.json();
      setVideos(data.videos || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Router>
      <div className="app">
        <Header />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Dashboard videos={videos} loading={loading} onRefresh={fetchVideos} />} />
            <Route path="/upload" element={<UploadVideo onSuccess={fetchVideos} />} />
            <Route path="/video/:id" element={<VideoDetails onRefresh={fetchVideos} />} />
            <Route path="/transcript/:id" element={<TranscriptViewer />} />
            <Route path="/clips/:videoId" element={<ClipManager />} />
            <Route path="/approval" element={<ApprovalDashboard />} />
          </Routes>
        </main>
        <ToastContainer position="bottom-right" autoClose={4000} />
      </div>
    </Router>
  );
}

export default App;
