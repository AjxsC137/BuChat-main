import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowUp, 
  ArrowDown, 
  MessageCircle, 
  Share2, 
  MoreHorizontal, 
  Bookmark,
  Eye,
  ChevronLeft,
  ChevronRight,
  FileText,
  Download,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { postService } from '../../services/postService';
import './PostCard.css';

const PostCard = ({ post, onUpdate, onDelete, hideGroupName = false }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [voteStatus, setVoteStatus] = useState(post.userVoteStatus || 0); // -1, 0, 1
  const [voteCount, setVoteCount] = useState(post.score || 0);
  const [saved, setSaved] = useState(post.userSaved || false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [textContent, setTextContent] = useState({});
  const [zoomLevel, setZoomLevel] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef(null);

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
  const menuRef = useRef(null);
  
  const isOwnPost = user && (user.userId === post.userId || user.username === post.username);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);
  
  const handleVote = async (value) => {
    if (!user) {
      // Redirect to login or show message
      navigate('/login');
      return;
    }

    const newVote = voteStatus === value ? 0 : value;
    const oldVote = voteStatus;

    // Optimistic update
    setVoteStatus(newVote);
    setVoteCount(prev => prev - oldVote + newVote);

    try {
      await postService.votePost(post.postId, user.userId, newVote);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Vote failed:', error);
      // Revert on error
      setVoteStatus(oldVote);
      setVoteCount(prev => prev - newVote + oldVote);
    }
  };

  const handleSave = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    const newSaved = !saved;
    setSaved(newSaved);

    try {
      if (newSaved) {
        await postService.savePost(post.postId, user.userId);
      } else {
        await postService.unsavePost(post.postId, user.userId);
      }
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Save failed:', error);
      setSaved(!newSaved);
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const postTime = new Date(timestamp);
    const diff = Math.floor((now - postTime) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatNumber = (num) => {
    if (!num || num === 0) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
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

  return (
    <>
    <article className="post-card">
      {/* Post Content */}
      <div className="post-main-content">
        {/* Header */}
        <div className="post-credit-bar">
          {/* Group & User Info */}
          <div className="credit-left">
            {!hideGroupName && post.group && post.group !== 'global' && (
              <>
                <Link to={`/g/${post.group}`} className="group-link">
                  <div className="group-icon">
                    {post.groupIcon ? (
                      <img src={post.groupIcon} alt={post.groupDisplayName || post.group} />
                    ) : (
                      (post.groupDisplayName || post.group)[0].toUpperCase()
                    )}
                  </div>
                  <span className="group-name">{post.groupDisplayName || post.group}</span>
                </Link>
                <span className="credit-separator">•</span>
              </>
            )}
            
            <div className="author-info">
              <Link to={`/u/${post.username || post.userId}`} className="author-link">
                <div className="author-avatar">
                  {post.userAvatar ? (
                    <img src={post.userAvatar} alt={post.username || post.userId} />
                  ) : (
                    <div className="avatar-initial">
                      {(post.username || post.userId)[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="author-text">
                  <span className="author-display-name">{post.userDisplayName || post.username || post.userId}</span>
                  <span className="author-username">@{post.username || post.userId}</span>
                </div>
              </Link>
            </div>
            
            <span className="credit-separator">•</span>
            <span className="post-time">{formatTime(post.createdAt)}</span>
          </div>

          {/* Options */}
          <div className="post-menu-wrapper" ref={menuRef}>
            <button 
              className="post-menu-btn" 
              title="More options"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
            >
              <MoreHorizontal size={16} />
            </button>
            {showMenu && (
              <div className="post-dropdown-menu">
                {isOwnPost && onDelete && (
                  <button 
                    className="menu-item danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onDelete();
                    }}
                  >
                    Delete Post
                  </button>
                )}
                <button 
                  className="menu-item"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    handleSave();
                  }}
                >
                  {saved ? 'Unsave' : 'Save'} Post
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        {post.flair && (
          <div className="post-tags">
            <span className="tag flair-tag">{post.flair}</span>
          </div>
        )}

        {/* Title & Content */}
        <div onClick={() => navigate(`/post/${post.postId}`)} style={{ cursor: 'pointer' }}>
          <h2 className="post-title">{post.title}</h2>
          
          {post.body && (
            <div className="post-body">
              {post.body.length > 400 ? (
                <>
                  {post.body.substring(0, 400)}...
                  <span className="read-more"> Read more</span>
                </>
              ) : (
                post.body
              )}
            </div>
          )}
        </div>

        {/* Media */}
        {post.media && post.media.length > 0 && (
          showLightbox ? (
            <div className="media-expanded" onClick={(e) => { e.stopPropagation(); navigate(`/post/${post.postId}`); }}>
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
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                </svg>
              </button>
              <button className="expanded-close" onClick={(e) => { e.stopPropagation(); setShowLightbox(false); }}>×</button>
            </div>
          ) : (
            renderMediaGrid()
          )
        )}

        {/* Action Row */}
        <div className="post-action-row">
          {/* Vote Buttons */}
          <div className="vote-buttons-inline">
            <button 
              className={`action-btn vote-btn upvote ${voteStatus === 1 ? 'active' : ''}`}
              onClick={() => handleVote(1)}
              title="Upvote"
            >
              <ArrowUp size={16} />
            </button>
            <span className="vote-count">{formatNumber(voteCount)}</span>
            <button 
              className={`action-btn vote-btn downvote ${voteStatus === -1 ? 'active' : ''}`}
              onClick={() => handleVote(-1)}
              title="Downvote"
            >
              <ArrowDown size={16} />
            </button>
          </div>
          
          <Link to={`/post/${post.postId}`} className="action-btn comment-btn">
            <MessageCircle size={16} />
            <span>{formatNumber(post.commentCount || 0)}</span>
          </Link>
          
          <button 
            className="action-btn share-btn"
            onClick={() => {
              navigator.clipboard.writeText(window.location.origin + `/post/${post.postId}`);
              alert('Link copied to clipboard!');
            }}
          >
            <Share2 size={16} />
            <span>Share</span>
          </button>
          
          <button 
            className={`action-btn save-btn ${saved ? 'saved' : ''}`}
            onClick={handleSave}
          >
            <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
            <span>{saved ? 'Saved' : 'Save'}</span>
          </button>
          
          {post.viewCount > 0 && (
            <div className="view-count">
              <Eye size={16} />
              <span>{formatNumber(post.viewCount)}</span>
            </div>
          )}
        </div>
      </div>

    </article>
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
    </>
  );
};

export default PostCard;
