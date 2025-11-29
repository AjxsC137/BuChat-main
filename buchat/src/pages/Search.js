import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search as SearchIcon, Users, MessageSquare, Hash } from 'lucide-react';
import Card from '../components/common/Card';
import PostCard from '../components/posts/PostCard';
import Input from '../components/common/Input';
import { postService } from '../services/postService';
import { userService } from '../services/userService';
import { groupService } from '../services/groupService';
import './Search.css';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [activeTab, setActiveTab] = useState('posts');
  const [results, setResults] = useState({ posts: [], users: [], communities: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, [searchParams]);

  const performSearch = async (searchQuery) => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const [postsData, usersData, groupsData] = await Promise.all([
        postService.searchPosts(searchQuery).catch(() => ({ posts: [] })),
        userService.searchUsers(searchQuery).catch(() => ({ users: [] })),
        groupService.searchGROUPS(searchQuery).catch(() => ({ groups: [] })),
      ]);
      
      setResults({
        posts: postsData.posts || [],
        users: usersData.users || [],
        communities: groupsData.groups || [],
      });
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query });
    }
  };

  const tabs = [
    { id: 'posts', label: 'Posts', icon: MessageSquare, count: results.posts.length },
    { id: 'communities', label: 'Communities', icon: Hash, count: results.communities.length },
    { id: 'users', label: 'Users', icon: Users, count: results.users.length },
  ];

  return (
    <div className="search-page">
      <div className="search-container">
        <Card className="search-header">
          <form onSubmit={handleSearch} className="search-form">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search posts, communities, users..."
              icon={<SearchIcon size={18} />}
            />
          </form>
        </Card>

        {query && (
          <Card className="search-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon size={18} />
                <span>{tab.label}</span>
                {tab.count > 0 && <span className="count">{tab.count}</span>}
              </button>
            ))}
          </Card>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
        ) : query ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {activeTab === 'posts' && (
              <div className="results-section">
                {results.posts.length > 0 ? (
                  <div className="results-list">
                    {results.posts.map((post) => (
                      <PostCard key={post.postId} post={post} />
                    ))}
                  </div>
                ) : (
                  <Card><p className="no-results">No posts found</p></Card>
                )}
              </div>
            )}

            {activeTab === 'communities' && (
              <div className="results-section">
                {results.communities.length > 0 ? (
                  <div className="communities-grid">
                    {results.communities.map((group) => (
                      <Link key={group.groupId} to={`/g/${group.name}`}>
                        <Card className="community-result" hover>
                          <div className="community-icon"><Hash size={24} /></div>
                          <h3>c/{group.name}</h3>
                          <p>{group.description}</p>
                          <div className="community-meta">
                            <span>{group.memberCount || 0} members</span>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Card><p className="no-results">No communities found</p></Card>
                )}
              </div>
            )}

            {activeTab === 'users' && (
              <div className="results-section">
                {results.users.length > 0 ? (
                  <div className="users-list">
                    {results.users.map((user) => (
                      <Link key={user.userId} to={`/u/${user.username}`}>
                        <Card className="user-result" hover>
                          <div className="user-avatar"><Users size={24} /></div>
                          <div className="user-info">
                            <h3>u/{user.username}</h3>
                            {user.displayName && <p>{user.displayName}</p>}
                            {user.bio && <p className="bio">{user.bio}</p>}
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Card><p className="no-results">No users found</p></Card>
                )}
              </div>
            )}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
};

export default Search;
