import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Calendar, Users, UserPlus, UserMinus, Settings, 
  Edit2, Check, X, Image as ImageIcon, MapPin, Link as LinkIcon,
  Mail, MessageCircle, Grid, List
} from 'lucide-react';
import { toast } from 'react-toastify';
import Card from '../components/common/Card';
import PostCard from '../components/posts/PostCard';
import Button from '../components/common/Button';
import ImageUploadModal from '../components/common/ImageUploadModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { userService } from '../services/userService';
import { socialService } from '../services/socialService';
import { postService } from '../services/postService';
import { useAuth } from '../contexts/AuthContext';
import './UserProfile.css';

// 1. Skeleton Component for better loading UX
const ProfileSkeleton = () => (
  <div className="profile-container skeleton-mode">
    <Card className="profile-header-card">
      <div className="profile-banner skeleton-animate" />
      <div className="profile-info-section">
        <div className="profile-avatar-wrapper">
          <div className="profile-avatar-large skeleton-animate" />
        </div>
        <div className="profile-details-wrapper">
          <div className="skeleton-line w-50 skeleton-animate mb-2" />
          <div className="skeleton-line w-25 skeleton-animate mb-4" />
          <div className="skeleton-line w-75 skeleton-animate mb-2" />
          <div className="skeleton-line w-75 skeleton-animate" />
        </div>
      </div>
    </Card>
  </div>
);

const UserProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, refreshUser } = useAuth();
  
  // State
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [mediaPosts, setMediaPosts] = useState([]); // New: Filtered media
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [isEditing, setIsEditing] = useState(false);
  const [savedPosts, setSavedPosts] = useState([]); // New: Saved posts
  
  // Enhanced Edit Form
  const [editForm, setEditForm] = useState({
    displayName: '',
    bio: '',
    location: '', // New
    website: '',  // New
    avatar: '',
    banner: ''
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  
  // Groups & Social Feed
  const [ownedGroups, setOwnedGroups] = useState([]);
  const [joinedGroups, setJoinedGroups] = useState([]);
  const [followersPosts, setFollowersPosts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, variant: 'danger' });

  const isOwnProfile = currentUser && currentUser.username === username;

  useEffect(() => {
    console.log('Banner modal state:', showBannerModal);
  }, [showBannerModal]);

  useEffect(() => {
    if (username) fetchAllData();
  }, [username]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch profile first
      const profileData = await userService.getUserProfile(username);
      setProfile(profileData.user);
      
      // Initialize Edit Form
      setEditForm({
        displayName: profileData.user.displayName || '',
        bio: profileData.user.bio || '',
        location: profileData.user.location || '',
        website: profileData.user.website || '',
        avatar: profileData.user.avatar || '',
        banner: profileData.user.banner || ''
      });

      // Fetch other data in parallel with error handling
      const [postsData, followersData, followingData, groupsData, savedPostsData] = await Promise.allSettled([
        userService.getUserPosts(username),
        socialService.getFollowers(username),
        socialService.getFollowing(username),
        userService.getUserGroups(username),
        isOwnProfile && currentUser ? postService.getSavedPosts(username) : Promise.resolve({ saved: [] })
      ]);

      // Handle posts
      const allPosts = postsData.status === 'fulfilled' ? (postsData.value.posts || []) : [];
      setPosts(allPosts);
      // Filter media posts: check if post has media array with items or postType is image/video
      setMediaPosts(allPosts.filter(p => 
        (p.media && Array.isArray(p.media) && p.media.length > 0) || 
        p.postType === 'image' || 
        p.postType === 'video'
      ));

      // Handle followers
      setFollowers(followersData.status === 'fulfilled' ? (followersData.value.followers || []) : []);
      
      // Handle following
      setFollowing(followingData.status === 'fulfilled' ? (followingData.value.following || []) : []);
      
      // Handle groups
      if (groupsData.status === 'fulfilled') {
        setOwnedGroups(groupsData.value.owned || []);
        setJoinedGroups(groupsData.value.joined || []);
      } else {
        setOwnedGroups([]);
        setJoinedGroups([]);
      }

      // Handle saved posts
      if (savedPostsData.status === 'fulfilled') {
        setSavedPosts(savedPostsData.value.saved || []);
      } else {
        setSavedPosts([]);
      }

      // Fetch posts from people user follows
      const followingList = followingData.status === 'fulfilled' ? (followingData.value.following || []) : [];
      if (followingList.length > 0) {
        try {
          const followingPostsResults = await Promise.allSettled(
            followingList.slice(0, 10).map(u => userService.getUserPosts(u.username))
          );
          const allFollowersPosts = followingPostsResults
            .filter(result => result.status === 'fulfilled')
            .flatMap(result => result.value.posts || [])
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setFollowersPosts(allFollowersPosts);
        } catch (err) {
          console.error('Failed to fetch followers posts:', err);
          setFollowersPosts([]);
        }
      }

      if (currentUser && currentUser.username !== username) {
        const myFollowing = await socialService.getFollowing(currentUser.username);
        setIsFollowing(myFollowing.following?.some(f => f.username === username));
      }
    } catch (error) {
      console.error(error);
      toast.error('Could not load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser) return navigate('/login');
    try {
      if (isFollowing) {
        await socialService.unfollowUser(username, currentUser.userId);
        setFollowers(prev => prev.filter(u => u.username !== currentUser.username));
      } else {
        await socialService.followUser(username, currentUser.userId);
        // Optimistically add current user to followers list
        setFollowers(prev => [...prev, { ...currentUser }]); 
      }
      setIsFollowing(!isFollowing);
    } catch (error) {
      toast.error('Action failed');
    }
  };

  // Image Modal Handlers
  const handleAvatarModalSave = async (file, preview) => {
    console.log('Avatar modal save called with file:', file, 'preview:', preview);
    // Revoke old blob URL if exists
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarPreview(preview);
    await handleAvatarUpload(file, preview);
    setShowAvatarModal(false);
  };

  const handleBannerModalSave = async (file, preview) => {
    console.log('Banner modal save called with file:', file, 'preview:', preview);
    // Revoke old blob URL if exists
    if (bannerPreview) {
      URL.revokeObjectURL(bannerPreview);
    }
    setBannerPreview(preview);
    await handleBannerUpload(file, preview);
    setShowBannerModal(false);
  };

  const handleEditToggle = () => {
    if (isEditing) {
      setAvatarPreview(null);
      setBannerPreview(null);
      setAvatarFile(null);
      setBannerFile(null);
      setShowAvatarModal(false);
      setShowBannerModal(false);
    }
    setIsEditing(!isEditing);
  };

  const handleEditSubmit = async () => {
    try {
      let updatedForm = { ...editForm };
      
      // Upload avatar to S3 if changed
      if (avatarFile) {
        toast.info('Uploading avatar...');
        const uploadResult = await userService.uploadImage(avatarFile);
        updatedForm.avatar = uploadResult.url;
      }
      
      // Upload banner to S3 if changed
      if (bannerFile) {
        toast.info('Uploading banner...');
        const uploadResult = await userService.uploadImage(bannerFile);
        updatedForm.banner = uploadResult.url;
      }

      await userService.updateUserProfile(username, updatedForm);
      setProfile({ ...profile, ...updatedForm });
      setAvatarFile(null);
      setBannerFile(null);
      setAvatarPreview(null);
      setBannerPreview(null);
      setIsEditing(false);
      toast.success('Profile updated!');
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Update failed');
    }
  };

  // Handle avatar upload independently
  const handleAvatarUpload = async (file, preview) => {
    try {
      if (!file) return;
      
      console.log('handleAvatarUpload: Starting upload for file:', file.name, file.size);
      toast.info('Uploading profile picture...');
      const uploadResult = await userService.uploadImage(file);
      console.log('handleAvatarUpload: Upload complete, S3 URL:', uploadResult.url);
      
      await userService.updateUserProfile(username, { avatar: uploadResult.url });
      console.log('handleAvatarUpload: Profile updated');
      
      // Force state update with new object reference
      setProfile(prev => ({ ...prev, avatar: uploadResult.url }));
      
      // Revoke blob URL and clear preview
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarPreview(null);
      setAvatarFile(null);
      console.log('handleAvatarUpload: State updated, preview cleared');
      
      // Refresh user in AuthContext to update navbar avatar
      if (isOwnProfile) {
        await refreshUser();
      }
      
      toast.success('Profile picture updated!');
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error('Failed to update profile picture');
      setAvatarPreview(null);
    }
  };

  // Handle banner upload independently
  const handleBannerUpload = async (file, preview) => {
    try {
      if (!file) return;
      
      console.log('handleBannerUpload: Starting upload for file:', file.name, file.size);
      toast.info('Uploading cover photo...');
      const uploadResult = await userService.uploadImage(file);
      console.log('handleBannerUpload: Upload complete, S3 URL:', uploadResult.url);
      
      await userService.updateUserProfile(username, { banner: uploadResult.url });
      console.log('handleBannerUpload: Profile updated');
      
      // Force state update with new object reference
      setProfile(prev => ({ ...prev, banner: uploadResult.url }));
      
      // Revoke blob URL and clear preview
      if (bannerPreview) {
        URL.revokeObjectURL(bannerPreview);
      }
      setBannerPreview(null);
      setBannerFile(null);
      console.log('handleBannerUpload: State updated, preview cleared');
      
      toast.success('Cover photo updated!');
    } catch (error) {
      console.error('Banner upload error:', error);
      toast.error('Failed to update cover photo');
      setBannerPreview(null);
    }
  };

  const handleMessage = () => {
    navigate(`/messages?user=${profile.userId}`);
  };

  const handleDeletePost = async (postId) => {
    const post = posts.find(p => p.postId === postId);
    if (!post) return;

    toast(
      ({ closeToast }) => (
        <div>
          <p style={{ marginBottom: '12px', fontWeight: 500 }}>Delete this post?</p>
          <p style={{ marginBottom: '16px', fontSize: '14px', color: '#64748b' }}>This action cannot be undone.</p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                closeToast();
              }}
              style={{
                padding: '8px 16px',
                border: '1px solid #e2e8f0',
                background: 'white',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                closeToast();
                try {
                  await postService.deletePost(postId, post.userId);
                  setPosts(prev => prev.filter(p => p.postId !== postId));
                  setMediaPosts(prev => prev.filter(p => p.postId !== postId));
                  toast.success('Post deleted successfully');
                } catch (error) {
                  console.error('Delete error:', error);
                  toast.error(error.response?.data?.message || 'Failed to delete post');
                }
              }}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: '#dc2626',
                color: 'white',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              Delete
            </button>
          </div>
        </div>
      ),
      {
        position: 'top-center',
        autoClose: false,
        closeButton: false,
        draggable: false
      }
    );
  };

  const handleRemoveFollower = async (follower) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Follower?',
      message: `Remove @${follower.followingUsername || follower.username} from your followers? They will no longer see your activity.`,
      confirmText: 'Remove',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await socialService.unfollowUser(currentUser.username, follower.followerId);
          setFollowers(prev => prev.filter(f => f.followerId !== follower.followerId));
          toast.success('Follower removed');
        } catch (error) {
          console.error('Remove follower error:', error);
          toast.error('Failed to remove follower');
        }
        setConfirmDialog({ isOpen: false });
      }
    });
  };

  const handleRemoveFollowing = async (following) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Unfollow User?',
      message: `Unfollow @${following.followingUsername || following.username}? You will no longer see their posts in your feed.`,
      confirmText: 'Unfollow',
      variant: 'warning',
      onConfirm: async () => {
        try {
          await socialService.unfollowUser(following.followingUsername || following.username, currentUser.userId);
          setFollowing(prev => prev.filter(f => f.followingId !== following.followingId));
          toast.success('Unfollowed successfully');
        } catch (error) {
          console.error('Unfollow error:', error);
          toast.error('Failed to unfollow');
        }
        setConfirmDialog({ isOpen: false });
      }
    });
  };

  if (loading) return <ProfileSkeleton />;
  if (!profile) return null;

  return (
    <>
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        confirmVariant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ isOpen: false })}
      />
      <div className="profile-page">
      <div className="profile-container">
        {/* === Header Card === */}
        <Card className="profile-header-card">
          <div 
            className="profile-banner" 
            style={bannerPreview ? 
              { backgroundImage: `url(${bannerPreview})`, backgroundSize: 'cover', backgroundPosition: 'center' } : 
              profile.banner ? 
              { backgroundImage: `url(${profile.banner})`, backgroundSize: 'cover', backgroundPosition: 'center' } : 
              {}
            }
          >
            {isOwnProfile && (
              <button 
                className="edit-banner-btn" 
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Banner button clicked, opening modal');
                  setShowBannerModal(true);
                }}
              >
                <ImageIcon size={18} /> Change Cover
              </button>
            )}
          </div>

          <div className="profile-info-section">
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar-large">
                {avatarPreview ? (
                  <img src={avatarPreview} alt={username} />
                ) : profile.avatar ? (
                  <img src={profile.avatar} alt={username} />
                ) : (
                  <div className="avatar-initial">{username[0].toUpperCase()}</div>
                )}
                {isOwnProfile && (
                  <div className="avatar-overlay" onClick={() => setShowAvatarModal(true)}>
                    <ImageIcon size={24} />
                    <span>Change</span>
                  </div>
                )}
              </div>
            </div>

            <div className="profile-details-wrapper">
              <div className="profile-header-row">
                <div className="profile-texts">
                  {isEditing ? (
                    <input 
                      className="edit-input name-input" 
                      value={editForm.displayName} 
                      onChange={e => setEditForm({...editForm, displayName: e.target.value})}
                      placeholder="Display Name"
                    />
                  ) : (
                    <h1 className="profile-name">{profile.displayName || username}</h1>
                  )}
                  <p className="profile-username">@{username}</p>
                </div>

                <div className="profile-actions">
                  {isOwnProfile ? (
                    isEditing ? (
                      <>
                        <Button onClick={handleEditSubmit} variant="primary" size="small"><Check size={18}/> Save</Button>
                        <Button onClick={() => setIsEditing(false)} variant="ghost" size="small"><X size={18}/></Button>
                      </>
                    ) : (
                      <Button onClick={handleEditToggle} variant="secondary" size="small"><Edit2 size={16}/> Edit Profile</Button>
                    )
                  ) : (
                    <>
                      <Button onClick={handleMessage} variant="ghost" icon><MessageCircle size={20}/></Button>
                      <Button 
                        onClick={handleFollow} 
                        variant={isFollowing ? 'outline' : 'primary'}
                      >
                        {isFollowing ? 'Following' : 'Follow'}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Bio & Meta */}
              <div className="profile-bio-section">
                {isEditing ? (
                  <textarea 
                    className="edit-textarea" 
                    value={editForm.bio} 
                    onChange={e => setEditForm({...editForm, bio: e.target.value})}
                    placeholder="Tell us about yourself..."
                  />
                ) : (
                  profile.bio && <p className="profile-bio">{profile.bio}</p>
                )}

                <div className="profile-meta-list">
                  <span className="meta-item">
                    <Calendar size={14} /> Joined {new Date(profile.createdAt).toLocaleDateString()}
                  </span>
                  
                  {(profile.location || isEditing) && (
                    <span className="meta-item">
                      <MapPin size={14} />
                      {isEditing ? (
                        <input 
                          className="edit-input-inline" 
                          placeholder="City, Country"
                          value={editForm.location}
                          onChange={e => setEditForm({...editForm, location: e.target.value})}
                        />
                      ) : profile.location}
                    </span>
                  )}

                  {(profile.website || isEditing) && (
                    <span className="meta-item highlight">
                      <LinkIcon size={14} />
                      {isEditing ? (
                        <input 
                          className="edit-input-inline" 
                          placeholder="website.com"
                          value={editForm.website}
                          onChange={e => setEditForm({...editForm, website: e.target.value})}
                        />
                      ) : (
                        <a href={profile.website} target="_blank" rel="noopener noreferrer">{profile.website}</a>
                      )}
                    </span>
                  )}
                </div>

                <div className="profile-stats">
                  <button onClick={() => setActiveTab('following')}>
                    <strong>{following.length}</strong> Following
                  </button>
                  <button onClick={() => setActiveTab('followers')}>
                    <strong>{followers.length}</strong> Followers
                  </button>
                  <span><strong>{posts.length}</strong> Posts</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* === Content Section === */}
        <div className="profile-content-wrapper">
          <div className="sticky-tabs-container">
            <Card className="profile-tabs-card">
              <div className="profile-tabs">
                <button 
                  className={`profile-tab ${activeTab === 'posts' ? 'active' : ''}`}
                  onClick={() => setActiveTab('posts')}
                >
                  <List size={18} /> Posts
                </button>
                <button 
                  className={`profile-tab ${activeTab === 'media' ? 'active' : ''}`}
                  onClick={() => setActiveTab('media')}
                >
                  <Grid size={18} /> Media
                </button>
                <button 
                  className={`profile-tab ${activeTab === 'followers' ? 'active' : ''}`}
                  onClick={() => setActiveTab('followers')}
                >
                  <Users size={18} /> Followers
                </button>
                <button 
                  className={`profile-tab ${activeTab === 'following' ? 'active' : ''}`}
                  onClick={() => setActiveTab('following')}
                >
                  <UserPlus size={18} /> Following
                </button>
                <button 
                  className={`profile-tab ${activeTab === 'groups' ? 'active' : ''}`}
                  onClick={() => setActiveTab('groups')}
                >
                  Groups
                </button>
                {isOwnProfile && (
                  <button 
                    className={`profile-tab ${activeTab === 'saved' ? 'active' : ''}`}
                    onClick={() => setActiveTab('saved')}
                  >
                    Saved
                  </button>
                )}
              </div>
            </Card>
          </div>

          <div className="tab-content">
            <AnimatePresence mode="wait">
              {activeTab === 'posts' && (
                <motion.div 
                  key="posts"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="posts-feed"
                >
                  {posts.map(post => (
                    <PostCard 
                      key={post.postId} 
                      post={post}
                      onDelete={isOwnProfile ? () => handleDeletePost(post.postId) : undefined}
                      onUpdate={fetchAllData}
                    />
                  ))}
                  {posts.length === 0 && <EmptyState text="No posts yet" />}
                </motion.div>
              )}

              {activeTab === 'media' && (
                <motion.div 
                  key="media"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="media-grid"
                >
                  {mediaPosts.length > 0 ? (
                    mediaPosts.map(post => {
                      // Get first media item URL
                      const mediaUrl = post.media && post.media[0] ? 
                        (post.media[0].thumbnail || post.media[0].url) : 
                        null;
                      
                      return (
                        <div key={post.postId} className="media-grid-item" onClick={() => navigate(`/post/${post.postId}`)}>
                          {mediaUrl && <img src={mediaUrl} alt={post.title} />}
                        </div>
                      );
                    })
                  ) : (
                    <EmptyState text="No photos or videos" icon={<ImageIcon size={40}/>} />
                  )}
                </motion.div>
              )}

              {activeTab === 'followers' && (
                <motion.div 
                  key="followers"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="users-list"
                >
                  <Card className="users-list-card">
                    {followers.length > 0 ? (
                      followers.map(user => (
                        <UserListItem 
                          key={user.followerId || user.username} 
                          user={user} 
                          showRemove={isOwnProfile}
                          onRemove={handleRemoveFollower}
                        />
                      ))
                    ) : (
                      <EmptyState text="No followers yet" icon={<Users size={40}/>} />
                    )}
                  </Card>
                </motion.div>
              )}

              {activeTab === 'following' && (
                <motion.div 
                  key="following"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                >
                  <div className="following-section">
                    <Card className="users-list-card">
                      <h3 className="section-title">People</h3>
                      {following.length > 0 ? (
                        following.map(user => (
                          <UserListItem 
                            key={user.followingId || user.username} 
                            user={user} 
                            showRemove={isOwnProfile}
                            onRemove={handleRemoveFollowing}
                          />
                        ))
                      ) : (
                        <EmptyState text="Not following anyone yet" icon={<UserPlus size={40}/>} />
                      )}
                    </Card>

                    {followersPosts.length > 0 && (
                      <div className="followers-posts-feed">
                        <h3 className="section-title">Posts from people you follow</h3>
                        {followersPosts.map(post => (
                          <PostCard key={post.postId} post={post} />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'groups' && (
                <motion.div 
                  key="groups"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="groups-section"
                >
                  {ownedGroups.length > 0 && (
                    <Card className="groups-list-card">
                      <h3 className="section-title">Groups you own</h3>
                      {ownedGroups.map(group => (
                        <GroupListItem key={group.groupId} group={group} isOwner />
                      ))}
                    </Card>
                  )}

                  {joinedGroups.length > 0 && (
                    <Card className="groups-list-card">
                      <h3 className="section-title">Groups you've joined</h3>
                      {joinedGroups.map(group => (
                        <GroupListItem key={group.groupId} group={group} />
                      ))}
                    </Card>
                  )}

                  {ownedGroups.length === 0 && joinedGroups.length === 0 && (
                    <EmptyState text="No groups yet" icon={<Users size={40}/>} />
                  )}
                </motion.div>
              )}

              {activeTab === 'saved' && isOwnProfile && (
                <motion.div 
                  key="saved"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="posts-feed"
                >
                  {savedPosts.map(post => (
                    <PostCard key={post.postId} post={post} />
                  ))}
                  {savedPosts.length === 0 && <EmptyState text="No saved posts yet" />}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Image Upload Modals */}
      <ImageUploadModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        onSave={handleAvatarModalSave}
        type="avatar"
        currentImage={profile?.avatar}
      />
      <ImageUploadModal
        isOpen={showBannerModal}
        onClose={() => setShowBannerModal(false)}
        onSave={handleBannerModalSave}
        type="banner"
        currentImage={profile?.banner}
      />
    </div>
    </>
  );
};

const UserListItem = ({ user, onRemove, showRemove }) => {
  const navigate = useNavigate();
  return (
    <div className="user-item">
      <div className="user-item-content" onClick={() => navigate(`/profile/${user.followingUsername || user.username}`)}>
        <div className="user-item-avatar">
          {user.avatar ? (
            <img src={user.avatar} alt={user.followingUsername || user.username} />
          ) : (
            (user.followingUsername || user.username || 'U')[0].toUpperCase()
          )}
        </div>
        <div className="user-item-info">
          <div className="user-item-name">{user.displayName || user.followingUsername || user.username}</div>
          <div className="user-item-username">@{user.followingUsername || user.username}</div>
        </div>
      </div>
      {showRemove && onRemove && (
        <Button 
          onClick={(e) => {
            e.stopPropagation();
            onRemove(user);
          }} 
          variant="ghost" 
          size="small"
        >
          <UserMinus size={16} /> Remove
        </Button>
      )}
    </div>
  );
};

const GroupListItem = ({ group, isOwner }) => {
  const navigate = useNavigate();
  return (
    <div className="group-item" onClick={() => navigate(`/group/${group.groupId}`)}>
      <div className="group-item-avatar">
        {group.avatar ? (
          <img src={group.avatar} alt={group.name} />
        ) : (
          <Users size={24} />
        )}
      </div>
      <div className="group-item-info">
        <div className="group-item-name">
          {group.name}
          {isOwner && <span className="owner-badge">Owner</span>}
        </div>
        <div className="group-item-meta">
          {group.memberCount || 0} members • {group.privacy || 'Public'}
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({ text, icon }) => (
  <div className="empty-state">
    <div className="empty-icon">{icon || <Edit2 size={40} />}</div>
    <p>{text}</p>
  </div>
);

export default UserProfile;