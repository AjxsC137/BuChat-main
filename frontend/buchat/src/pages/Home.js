import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, UserPlus, Users, Sparkles, Zap, Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PostCard from '../components/posts/PostCard';
import Button from '../components/common/Button';
import { postService } from '../services/postService';
import { groupService } from '../services/groupService';
import { userService } from '../services/userService';
import { socialService } from '../services/socialService';
import { useAuth } from '../contexts/AuthContext';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  // State
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedType, setFeedType] = useState('new');
  const [trendingGroups, setTrendingGroups] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // --- Logic remains same as your original code ---
  const fetchPosts = useCallback(async (resetPage = false) => {
    try {
      if (resetPage) {
        setLoading(true);
        setPage(1);
      }
      const params = {
        limit: 15,
        userId: user?.username || user?.userId
      };
      const response = await postService.getFeed(feedType, params);
      const newPosts = response.posts || [];
      
      if (resetPage) setPosts(newPosts);
      else setPosts(prev => [...prev, ...newPosts]);
      
      setHasMore(newPosts.length === 15);
      if (!resetPage) setPage(prev => prev + 1);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [page, feedType, user]);

  const fetchGroups = useCallback(async () => {
    try {
      const response = await groupService.getAllGROUPS({ limit: 5, sort: 'popular', userId: user?.userId });
      setTrendingGroups(response.groups || []);
    } catch (error) { console.error(error); }
  }, [user]);

  const fetchUserSuggestions = useCallback(async () => {
    if (!isAuthenticated || !user?.userId) return;
    try {
      const response = await userService.getUserSuggestions(user.userId, 5);
      setSuggestedUsers(response.suggestions || []);
    } catch (error) { console.error(error); }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchPosts(true);
    fetchGroups();
    if (isAuthenticated) fetchUserSuggestions();
  }, [isAuthenticated]);

  useEffect(() => { fetchPosts(true); }, [feedType]);

  const handlePostUpdate = useCallback(() => fetchPosts(true), []);

  // --- Visual Components ---

  const WelcomeHeader = () => {
    const hours = new Date().getHours();
    const greeting = hours < 12 ? 'Good Morning' : hours < 18 ? 'Good Afternoon' : 'Good Evening';
    
    return (
      <motion.div 
        className="welcome-glass-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="welcome-text">
          <h1>{greeting}, {user?.displayName?.split(' ')[0] || 'Friend'}! <span className="wave">👋</span></h1>
          <p>Here's what's happening in your world.</p>
        </div>
        <div className="search-pill">
            <Search size={18} />
            <input type="text" placeholder="Explore BuChat..." />
        </div>
      </motion.div>
    );
  };

  const StoriesRail = () => (
    <div className="stories-rail">
       <motion.div className="story-item create-story" whileTap={{ scale: 0.95 }}>
          <div className="story-ring add-ring">
             <img src={user?.avatar || "https://via.placeholder.com/150"} alt="Me" />
             <div className="plus-badge"><Plus size={14} /></div>
          </div>
          <span>You</span>
       </motion.div>
       {/* Mock Stories for visual appeal - replace with real data later */}
       {[1,2,3,4].map((i) => (
         <motion.div key={i} className="story-item" whileHover={{ y: -5 }} whileTap={{ scale: 0.95 }}>
            <div className="story-ring gradient-ring">
              <img src={`https://i.pravatar.cc/150?img=${i + 10}`} alt="User" />
            </div>
            <span>User {i}</span>
         </motion.div>
       ))}
    </div>
  );

  return (
    <div className="home-page">
      {/* Ambient Background Blobs */}
      <div className="ambient-blob blob-1"></div>
      <div className="ambient-blob blob-2"></div>
      
      <div className="home-container">
        
        {/* Main Feed Area */}
        <main className="home-main">
          {isAuthenticated && <WelcomeHeader />}
          
          {/* Stories Rail */}
          <StoriesRail />

          {/* Create Post Trigger */}
          {isAuthenticated && (
            <motion.div 
              className="glass-card create-post-trigger"
              whileHover={{ scale: 1.01, boxShadow: "0 8px 32px rgba(31, 38, 135, 0.15)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/create-post')}
            >
              <div className="user-avatar">
                {user?.avatar ? <img src={user.avatar} alt="me" /> : <div className="avatar-placeholder">{user?.username?.[0]}</div>}
              </div>
              <div className="fake-input">Share your spark... ✨</div>
              <Button size="small" variant="primary" className="post-btn">Post</Button>
            </motion.div>
          )}

          {/* Floating Feed Toggle */}
          <div className="feed-toggle-container">
            <div className="glass-pill-nav">
              {[
                { id: 'new', icon: Sparkles, label: 'Fresh' },
                { id: 'trending', icon: TrendingUp, label: 'Trending' },
                { id: 'following', icon: UserPlus, label: 'Following', authOnly: true }
              ].map((tab) => {
                if (tab.authOnly && !isAuthenticated) return null;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setFeedType(tab.id)}
                    className={`nav-pill ${feedType === tab.id ? 'active' : ''}`}
                  >
                    <Icon size={16} />
                    <span>{tab.label}</span>
                    {feedType === tab.id && <motion.div layoutId="pill-bg" className="active-pill-bg" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Posts Feed */}
          <div className="posts-feed">
            <AnimatePresence mode="popLayout">
              {loading && page === 1 ? (
                 <div className="loading-skeleton">
                    <div className="skeleton-card glass-card"></div>
                    <div className="skeleton-card glass-card"></div>
                 </div>
              ) : posts.length > 0 ? (
                posts.map((post, index) => (
                  <motion.div
                    key={post.postId || index}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                  >
                    <PostCard post={post} onUpdate={handlePostUpdate} className="glass-post-card" />
                  </motion.div>
                ))
              ) : (
                <div className="glass-card empty-state">
                  <div className="empty-graphic">🛸</div>
                  <h3>It's quiet here...</h3>
                  <p>Be the first to break the silence!</p>
                </div>
              )}
            </AnimatePresence>
            
            {hasMore && !loading && posts.length > 0 && (
               <Button onClick={() => fetchPosts(false)} variant="ghost" className="load-more-btn">
                 Discover More
               </Button>
            )}
          </div>
        </main>

        {/* Right Sidebar - Glassmorphic */}
        <aside className="home-sidebar">
          
          {/* Suggested People */}
          {isAuthenticated && suggestedUsers.length > 0 && (
            <motion.div 
              className="glass-card sidebar-widget"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="widget-header">
                <h3>Vibe Check <Zap size={16} fill="#F59E0B" color="#F59E0B" /></h3>
              </div>
              <div className="widget-list">
                {suggestedUsers.map(u => (
                  <div key={u.userId} className="compact-user-row">
                    <img src={u.avatar || `https://ui-avatars.com/api/?name=${u.username}`} alt={u.username} className="row-avatar" />
                    <div className="row-info" onClick={() => navigate(`/profile/${u.username}`)}>
                      <span className="row-name">{u.displayName || u.username}</span>
                      <span className="row-sub">@{u.username}</span>
                    </div>
                    <button className="icon-btn-add" onClick={() => navigate(`/profile/${u.username}`)}><UserPlus size={16} /></button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Suggested Groups */}
          <motion.div 
            className="glass-card sidebar-widget"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="widget-header">
              <h3>Tribes</h3>
              <span className="see-all" onClick={() => navigate('/groups')}>View All</span>
            </div>
            <div className="widget-list">
              {trendingGroups.map(g => (
                <div key={g.groupId} className="compact-group-row" onClick={() => navigate(`/g/${g.name}`)}>
                   <div className="group-row-icon">
                     {g.icon ? <img src={g.icon} alt="" /> : <Users size={18} />}
                   </div>
                   <div className="row-info">
                     <span className="row-name">{g.displayName}</span>
                     <span className="row-sub">{g.memberCount} members</span>
                   </div>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="mini-footer">
            <p>© 2025 BuChat</p>
            <div className="footer-links">
               <a href="#">Privacy</a> • <a href="#">Terms</a> • <a href="#">More</a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Home;