import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Groups from './pages/Groups';
import CreateGroup from './pages/CreateGroup';
import CreatePost from './pages/CreatePost';
import PostDetail from './pages/PostDetail';
import UserProfile from './pages/UserProfile';
import Friends from './pages/Friends';
import Search from './pages/Search';
import GroupDetail from './pages/GroupDetail';
import GroupSettings from './pages/GroupSettings';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import ComingSoon from './pages/ComingSoon';
import './App.css';

function AppContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  // Hide sidebars on auth pages
  const authPages = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password'];
  const isAuthPage = authPages.includes(location.pathname);

  return (
    <div className="App">
      {/* Fixed Header */}
      <Navbar />
      
      {/* Grid shell layout */}
      <div
        className={`app-grid-container ${isAuthPage ? 'auth-layout' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}
      >
        {/* Left rail keeps nav fixed while reserving grid space */}
        {!isAuthPage && (
          <aside className="app-left-rail" aria-label="Site navigation">
            <Sidebar
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
          </aside>
        )}

        {/* Subgrid centers main feed and right rail */}
        <div className="app-subgrid">
          <div className="app-content">
            <main className="app-main" id="main-content" role="main">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/groups" element={<Groups />} />
                <Route path="/create-group" element={<CreateGroup />} />
                <Route path="/trending" element={<Home />} />
                <Route path="/create-post" element={<CreatePost />} />
                <Route path="/post/:postId" element={<PostDetail />} />
                <Route path="/profile/:username" element={<UserProfile />} />
                <Route path="/u/:username" element={<UserProfile />} />
                <Route path="/friends" element={<Friends />} />
                <Route path="/search" element={<Search />} />
                <Route path="/g/:groupName" element={<GroupDetail />} />
                <Route path="/c/:groupName" element={<GroupDetail />} />
                <Route path="/g/:groupName/settings" element={<GroupSettings />} />
                <Route path="/c/:groupName/settings" element={<GroupSettings />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/discover" element={<ComingSoon feature="Discover" />} />
                <Route path="/polls" element={<ComingSoon feature="Polls" />} />
                <Route path="/capsules" element={<ComingSoon feature="Time Capsules" />} />
                <Route path="/events" element={<ComingSoon feature="Events" />} />
                <Route path="/settings" element={<ComingSoon feature="Settings" />} />
              </Routes>
            </main>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
