import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowUp, ArrowDown, MessageCircle, Share2, Bookmark, Eye, MoreHorizontal, ArrowLeft, FileText, Download, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { toast } from 'react-toastify';
import Button from '../components/common/Button';
import { postService } from '../services/postService';
import { commentService } from '../services/commentService';
import { useAuth } from '../contexts/AuthContext';
import './PostDetail.css';

const PostDetail = () => {
  const { postId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [userVote, setUserVote] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [textContent, setTextContent] = useState({});
  const [zoomLevel, setZoomLevel] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef(null);

  useEffect(() => {
    fetchPost();
    fetchComments();
  }, [postId]);

  useEffect(() => {
    if (showFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showFullscreen]);

  const fetchPost = async () => {
    try {
      const data = await postService.getPost(postId);
      setPost(data.post);
      if (user && data.post) {
        setUserVote(data.post.userVoteStatus || 0);
        setIsSaved(data.post.userSaved || false);
      }
    } catch (error) {
      toast.error('Post not found');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const data = await commentService.getPostComments(postId);
      setComments(data.comments || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleVote = async (voteValue) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const newVote = userVote === voteValue ? 0 : voteValue;
      await postService.votePost(postId, user.userId, newVote);
      setUserVote(newVote);
      setPost(prev => ({
        ...prev,
        score: prev.score - userVote + newVote
      }));
    } catch (error) {
      toast.error('Failed to vote');
    }
  };

  const handleSave = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      if (isSaved) {
        await postService.unsavePost(postId, user.userId);
        toast.success('Post unsaved');
      } else {
        await postService.savePost(postId, user.userId);
        toast.success('Post saved');
      }
      setIsSaved(!isSaved);
    } catch (error) {
      toast.error('Failed to save post');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }

    if (!commentText.trim()) return;

    try {
      await commentService.createComment(postId, {
        body: commentText,
        userId: user.userId,
        username: user.username,
      });
      setCommentText('');
      fetchComments();
      toast.success('Comment added!');
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const nextMedia = (e) => {
    e?.stopPropagation();
    if (post.media && currentMediaIndex < post.media.length - 1) {
      setCurrentMediaIndex(prev => prev + 1);
    }
  };

  const prevMedia = (e) => {
    e?.stopPropagation();
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex(prev => prev - 1);
    }
  };

  const getFileExtension = (url) => {
    return url?.split('.').pop()?.split('?')[0]?.toUpperCase() || 'FILE';
  };

  const getMediaType = (media) => {
    return media.type || (
      media.url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? 'image' :
      media.url.match(/\.(mp4|webm|ogg|mov|avi)$/i) ? 'video' :
      media.url.match(/\.(mp3|wav|ogg|m4a|flac)$/i) ? 'audio' :
      media.url.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar)$/i) ? 'document' : 'document'
    );
  };

  const renderMediaGrid = () => {
    if (!post.media || post.media.length === 0) return null;

    // Preload text files for thumbnails
    post.media.forEach(media => {
      const mediaType = getMediaType(media);
      if (mediaType === 'document' && getFileExtension(media.url).toLowerCase() === 'txt' && !textContent[media.url]) {
        fetch(media.url)
          .then(res => res.text())
          .then(text => setTextContent(prev => ({ ...prev, [media.url]: text })))
          .catch(() => setTextContent(prev => ({ ...prev, [media.url]: 'Failed to load' })));
      }
    });

    return (
      <div className={`media-grid grid-${Math.min(post.media.length, 4)}`}>
        {post.media.slice(0, 4).map((media, index) => {
          const mediaType = getMediaType(media);
          return (
            <div 
              key={index} 
              className="media-grid-item"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentMediaIndex(index);
                setShowLightbox(true);
              }}
            >
              {mediaType === 'image' || mediaType === 'gif' ? (
                <img src={media.url} alt="" className="media-grid-img" />
              ) : mediaType === 'video' ? (
                <div className="media-grid-video">
                  <video src={media.url} />
                  <div className="play-overlay">▶</div>
                </div>
              ) : mediaType === 'audio' ? (
                <div className="media-grid-audio">
                  <FileText size={32} />
                  <span>Audio</span>
                </div>
              ) : (
                <div className="media-grid-document">
                  {mediaType === 'document' && getFileExtension(media.url).toLowerCase() === 'pdf' ? (
                    <iframe 
                      src={`${media.url}#page=1&toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
                      title="PDF Preview"
                    />
                  ) : mediaType === 'document' && ['doc', 'docx', 'ppt', 'pptx'].includes(getFileExtension(media.url).toLowerCase()) ? (
                    <iframe 
                      src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(media.url)}`}
                      title="Office Preview"
                    />
                  ) : mediaType === 'document' && getFileExtension(media.url).toLowerCase() === 'txt' ? (
                    <div style={{ width: '100%', height: '100%', padding: '8px', fontSize: '7px', lineHeight: '1.2', overflow: 'hidden', textAlign: 'left', fontFamily: 'Consolas, monospace', background: 'white', color: '#1e293b', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {textContent[media.url] || 'Loading...'}
                    </div>
                  ) : (
                    <>
                      <FileText size={48} />
                      <span style={{ fontSize: '14px', fontWeight: '600' }}>{getFileExtension(media.url)}</span>
                    </>
                  )}
                </div>
              )}
              {index === 3 && post.media.length > 4 && (
                <div className="media-grid-more">+{post.media.length - 4}</div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.5, 1));
  const handleZoomReset = () => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (!showFullscreen) {
      setZoomLevel(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [showFullscreen]);

  useEffect(() => {
    if (zoomLevel === 1) setPosition({ x: 0, y: 0 });
  }, [zoomLevel]);

  const handleWheel = (e) => {
    if (getMediaType(post.media[currentMediaIndex]) !== 'image') return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoomLevel(prev => Math.max(1, Math.min(3, prev + delta)));
  };

  const handleMouseDown = (e) => {
    if (zoomLevel <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || zoomLevel <= 1) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const renderLightboxMedia = (isFullscreen = false) => {
    const media = post.media[currentMediaIndex];
    const mediaType = getMediaType(media);
    const fileExt = getFileExtension(media.url).toLowerCase();

    switch (mediaType) {
      case 'image':
      case 'gif':
        return (
          <img 
            ref={isFullscreen ? imageRef : null}
            src={media.url} 
            alt="" 
            className={`lightbox-media ${zoomLevel > 1 ? 'zoomed' : ''} ${isDragging ? 'dragging' : ''}`}
            onClick={(e) => {
              if (!isFullscreen) {
                e.stopPropagation();
                setShowFullscreen(true);
              }
            }}
            onMouseDown={isFullscreen ? handleMouseDown : undefined}
            style={{ 
              cursor: isFullscreen ? (zoomLevel > 1 ? 'grab' : 'zoom-in') : 'pointer',
              transform: isFullscreen ? `translate(${position.x}px, ${position.y}px) scale(${zoomLevel})` : 'none'
            }}
          />
        );
      case 'video':
        return (
          <video 
            src={media.url} 
            controls 
            className="lightbox-media" 
            autoPlay
            onClick={(e) => {
              if (!isFullscreen) {
                e.stopPropagation();
                setShowFullscreen(true);
              }
            }}
            style={{ cursor: isFullscreen ? 'default' : 'pointer' }}
          />
        );
      case 'audio':
        return (
          <div className="lightbox-audio">
            <FileText size={64} />
            <audio src={media.url} controls autoPlay />
          </div>
        );
      case 'document':
      default:
        if (fileExt === 'pdf') {
          return (
            <iframe 
              src={`${media.url}#toolbar=1&navpanes=0&scrollbar=1`}
              className="lightbox-media document-viewer"
              title="PDF Viewer"
              style={{ pointerEvents: 'auto', width: '100%', height: '100%', maxWidth: isFullscreen ? '95vw' : '100%' }}
              onDoubleClick={(e) => {
                if (!isFullscreen) {
                  e.stopPropagation();
                  setShowFullscreen(true);
                }
              }}
            />
          );
        }
        if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(fileExt)) {
          return (
            <iframe 
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(media.url)}`}
              className="lightbox-media document-viewer"
              title="Office Viewer"
              style={{ pointerEvents: 'auto', width: '100%', height: '100%', maxWidth: isFullscreen ? '95vw' : '100%' }}
              onDoubleClick={(e) => {
                if (!isFullscreen) {
                  e.stopPropagation();
                  setShowFullscreen(true);
                }
              }}
            />
          );
        }
        if (fileExt === 'txt') {
          return (
            <div 
              className="lightbox-media document-viewer text-viewer"
              onClick={(e) => {
                if (!isFullscreen) {
                  e.stopPropagation();
                  setShowFullscreen(true);
                }
              }}
              style={{ cursor: isFullscreen ? 'default' : 'pointer' }}
            >
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                {textContent[media.url] || ''}
              </pre>
            </div>
          );
        }
        return (
          <div className="lightbox-document">
            <FileText size={64} />
            <div className="document-info">
              <span className="document-name">{media.name || 'Document'}</span>
              <span className="document-type">{getFileExtension(media.url)}</span>
            </div>
            <a href={media.url} target="_blank" rel="noopener noreferrer" className="document-download-btn">
              <Download size={20} /> Download
            </a>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="post-detail-page">
      <div className="post-detail-container">
        {/* Post Card */}
        <article className="post-detail-card">
          <div className="post-main-content">
            {/* Header */}
            <div className="post-credit-bar">
              <button className="back-button" onClick={() => navigate(-1)} title="Back">
                <ArrowLeft size={16} />
              </button>
              
              <div className="credit-left">
                <div className="avatars-group">
                  {post.community && post.community !== 'global' && (
                    <Link to={`/g/${post.community}`} className="community-avatar">
                      <div className="community-icon">
                        {post.communityIcon ? (
                          <img src={post.communityIcon} alt={post.community} />
                        ) : (
                          post.community[0].toUpperCase()
                        )}
                      </div>
                    </Link>
                  )}
                  
                  <Link to={`/profile/${post.username || post.userId}`} className="user-avatar">
                    <div className="user-avatar-icon">
                      {post.userAvatar ? (
                        <img src={post.userAvatar} alt={post.username || post.userId} />
                      ) : (
                        <div className="avatar-initial">
                          {(post.username || post.userId)[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                  </Link>
                </div>
                
                <div className="credit-info">
                  {post.community && post.community !== 'global' && (
                    <>
                      <Link to={`/g/${post.community}`} className="community-name">c/{post.community}</Link>
                      <span className="credit-separator">•</span>
                    </>
                  )}
                  <Link to={`/profile/${post.username || post.userId}`} className="author-name">{post.username || post.userId}</Link>
                  <span className="credit-separator">•</span>
                  <span className="post-time">{formatTime(post.createdAt)}</span>
                </div>
              </div>

              <button className="post-menu-btn" title="More options">
                <MoreHorizontal size={16} />
              </button>
            </div>

            {/* Title & Body */}
            <div className="post-content">
              <h1 className="post-title">{post.title}</h1>
              {post.body && <div className="post-body">{post.body}</div>}
            </div>

            {/* Media */}
            {post.media && post.media.length > 0 && (
              <div className="post-media-wrapper">
                {showLightbox ? (
                  <div className="media-expanded" onClick={(e) => e.stopPropagation()}>
                    <div className="expanded-content" onClick={(e) => e.stopPropagation()}>
                      {renderLightboxMedia(false)}
                    </div>
                    {post.media.length > 1 && (
                      <>
                        <button className="expanded-btn prev" onClick={(e) => { e.stopPropagation(); prevMedia(e); }} disabled={currentMediaIndex === 0}>
                          <ChevronLeft size={28} />
                        </button>
                        <button className="expanded-btn next" onClick={(e) => { e.stopPropagation(); nextMedia(e); }} disabled={currentMediaIndex === post.media.length - 1}>
                          <ChevronRight size={28} />
                        </button>
                        <div className="expanded-indicator">{currentMediaIndex + 1} / {post.media.length}</div>
                      </>
                    )}
                    <button className="expanded-fullscreen" onClick={(e) => { e.stopPropagation(); setShowFullscreen(true); }} title="Fullscreen">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2 2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                      </svg>
                    </button>
                    <button className="expanded-close" onClick={(e) => { e.stopPropagation(); setShowLightbox(false); }}>×</button>
                  </div>
                ) : (
                  renderMediaGrid()
                )}
              </div>
            )}

            {/* Actions */}
            <div className="post-action-row">
              <div className="vote-buttons-inline">
                <button 
                  className={`action-btn vote-btn upvote ${userVote === 1 ? 'active' : ''}`}
                  onClick={() => handleVote(1)}
                  title="Upvote"
                >
                  <ArrowUp size={16} />
                </button>
                <span className="vote-count">{post.score || 0}</span>
                <button 
                  className={`action-btn vote-btn downvote ${userVote === -1 ? 'active' : ''}`}
                  onClick={() => handleVote(-1)}
                  title="Downvote"
                >
                  <ArrowDown size={16} />
                </button>
              </div>

              <div className="action-btn comment-info">
                <MessageCircle size={16} />
                <span>{comments.length} Comments</span>
              </div>

              <button className="action-btn share-btn" onClick={handleShare}>
                <Share2 size={16} />
                <span>Share</span>
              </button>

              <button className={`action-btn save-btn ${isSaved ? 'saved' : ''}`} onClick={handleSave}>
                <Bookmark size={16} />
                <span>{isSaved ? 'Saved' : 'Save'}</span>
              </button>

              <div className="view-count">
                <Eye size={16} />
                <span>{post.views || 0}</span>
              </div>
            </div>
          </div>
        </article>

        {/* Comment Input */}
        {user ? (
          <div className="comment-input-card">
            <div className="comment-as">
              <div className="comment-avatar">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.username} />
                ) : (
                  <div className="avatar-initial">{user.username[0].toUpperCase()}</div>
                )}
              </div>
              <span>Comment as <strong>{user.username}</strong></span>
            </div>
            <form onSubmit={handleComment} className="comment-form">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="What are your thoughts?"
                rows={4}
                className="comment-textarea"
              />
              <div className="comment-form-actions">
                <Button type="submit" variant="primary" disabled={!commentText.trim()}>
                  Comment
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div className="login-prompt-card">
            <p>Log in or sign up to leave a comment</p>
            <Button variant="primary" onClick={() => navigate('/login')}>Log In</Button>
          </div>
        )}

        {/* Comments Section */}
        <div className="comments-section">
          <div className="comments-header">
            <h2>Comments ({comments.length})</h2>
          </div>
          
          {comments.length === 0 ? (
            <div className="no-comments">
              <MessageCircle size={48} />
              <p>No comments yet</p>
              <span>Be the first to share what you think!</span>
            </div>
          ) : (
            <div className="comments-list">
              {comments && Array.isArray(comments) && comments.map((comment) => comment && (
                <div key={comment.commentId} className="comment-thread">
                  <div className="comment-card">
                    <div className="comment-left-col">
                      <Link to={`/profile/${comment.username || 'user'}`} className="comment-avatar-link">
                        <div className="comment-avatar">
                          {comment.userAvatar ? (
                            <img src={comment.userAvatar} alt={comment.username || 'User'} />
                          ) : (
                            <div className="avatar-initial">{(comment.username || 'U')[0].toUpperCase()}</div>
                          )}
                        </div>
                      </Link>
                      <div className="comment-thread-line"></div>
                    </div>
                    
                    <div className="comment-right-col">
                      <div className="comment-header">
                        <Link to={`/profile/${comment.username || 'user'}`} className="comment-author-link">
                          <span className="comment-author-name">{comment.username || 'Anonymous'}</span>
                        </Link>
                        <span className="comment-separator">•</span>
                        <span className="comment-time">{formatTime(comment.createdAt)}</span>
                      </div>
                      
                      <div className="comment-body">{comment.body}</div>
                      
                      <div className="comment-actions">
                        <button className="comment-action-btn upvote-btn">
                          <ArrowUp size={14} />
                        </button>
                        <span className="comment-score">{comment.score || 0}</span>
                        <button className="comment-action-btn downvote-btn">
                          <ArrowDown size={14} />
                        </button>
                        <button className="comment-action-btn reply-btn">
                          <MessageCircle size={14} />
                          <span>Reply</span>
                        </button>
                        <button className="comment-action-btn share-btn">
                          <Share2 size={14} />
                          <span>Share</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {showFullscreen && ReactDOM.createPortal(
        <div 
          className="fullscreen-modal" 
          onClick={() => setShowFullscreen(false)}
          onWheel={handleWheel}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div className="fullscreen-content" onClick={(e) => e.stopPropagation()}>
            {getMediaType(post.media[currentMediaIndex]) === 'image' && (
              <img 
                src={post.media[currentMediaIndex]?.url} 
                alt="" 
                className="fullscreen-bg-blur post-background-image-filter"
                aria-hidden="true"
              />
            )}
            <figure className="fullscreen-figure">
              {renderLightboxMedia(true)}
            </figure>
          </div>
          {getMediaType(post.media[currentMediaIndex]) === 'image' && (
            <div className="fullscreen-zoom-controls">
              <button className="fullscreen-zoom-btn" onClick={(e) => { e.stopPropagation(); handleZoomIn(); }} title="Zoom In">
                +
              </button>
              <button className="fullscreen-zoom-btn" onClick={(e) => { e.stopPropagation(); handleZoomOut(); }} title="Zoom Out">
                −
              </button>
              <button className="fullscreen-zoom-btn" onClick={(e) => { e.stopPropagation(); handleZoomReset(); }} title="Reset Zoom">
                ⟲
              </button>
            </div>
          )}
          {post.media.length > 1 && (
            <>
              <button className="fullscreen-btn prev" onClick={(e) => { e.stopPropagation(); prevMedia(e); }} disabled={currentMediaIndex === 0}>
                <ChevronLeft size={32} />
              </button>
              <button className="fullscreen-btn next" onClick={(e) => { e.stopPropagation(); nextMedia(e); }} disabled={currentMediaIndex === post.media.length - 1}>
                <ChevronRight size={32} />
              </button>
              <div className="fullscreen-indicator">{currentMediaIndex + 1} / {post.media.length}</div>
            </>
          )}
          <button className="fullscreen-close" onClick={(e) => { e.stopPropagation(); setShowFullscreen(false); }}>
            <X size={24} />
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PostDetail;
