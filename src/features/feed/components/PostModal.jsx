// src/features/feed/components/PostModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Changes from previous version:
//   FIXED: standalone mode now fetches the author profile via `user_id` using
//          getProfile() after loading the post row, then injects full_name,
//          username and avatar_url into the author shape passed to PostCard.
//          Previously author_name / github_username / author_avatar were read
//          directly from the post row — those columns are no longer written on
//          `posts`, so PostCard always fell back to "Unknown User".
//   NOTE:  ProjectCard reads author_* columns from project_posts directly
//          (those are still written there), so no change needed for projects.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../../services/supabaseClient";
import { getProfile } from "../../../services/userService";
import PostCard    from "./PostCard";
import ProjectCard from "./ProjectCard";
import { FiX } from "react-icons/fi";

// ─────────────────────────────────────────────────────────────────────────────
// PostModal
//
// Two usage modes:
//
//  1. Profile mode — post data passed directly:
//     <PostModal post={postObj} onClose={fn} onDelete={fn} />
//
//  2. Standalone / deep-link mode — fetches by id (e.g. navigated from
//     ActivityStreamBar ring click):
//     <PostModal postId="123" postType="code" onClose={fn} />
//
// ─────────────────────────────────────────────────────────────────────────────

const PostModal = ({ post: propPost, postId, postType, onClose, onDelete }) => {
  const overlayRef = useRef(null);

  const [fetchedPost, setFetchedPost] = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [notFound,    setNotFound]    = useState(false);

  const isStandaloneMode = !propPost && !!postId;
  const activePost       = propPost || fetchedPost;
  const activeType       = propPost
    ? (propPost.type || "code")
    : (postType || "code");

  // ── fetch in standalone mode ──────────────────────────────────────────────
  // After loading the post row we also fetch the author's profile so that
  // PostCard gets real display fields instead of the stale (now-null)
  // author_name / github_username / author_avatar columns on `posts`.
  useEffect(() => {
    if (!isStandaloneMode) return;

    const table = postType === "project" ? "project_posts" : "posts";

    const fetchPost = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("id", postId)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // For code posts the author columns are no longer written —
      // resolve display fields from the profiles table instead.
      // Project posts still carry author_* so getProfile is a nice-to-have
      // there but won't break anything.
      let resolvedName   = data.author_name     || null;
      let resolvedUser   = data.github_username || null;
      let resolvedAvatar = data.author_avatar   || null;

      if (data.user_id) {
        const profile = await getProfile(data.user_id);
        if (profile) {
          resolvedName   = profile.full_name  || resolvedName;
          resolvedUser   = profile.username   || resolvedUser;
          resolvedAvatar = profile.avatar_url || resolvedAvatar;
        }
      }

      setFetchedPost({
        ...data,
        type: postType || "code",
        // Inject resolved fields so PostCard / ProjectCard can read them
        // from both the top-level post object and the nested author shape.
        _resolvedName:   resolvedName,
        _resolvedUser:   resolvedUser,
        _resolvedAvatar: resolvedAvatar,
      });

      setLoading(false);
    };

    fetchPost();
  }, [postId, postType, isStandaloneMode]);
  useEffect(() => {
  if (!propPost) return;

  const resolve = async () => {
    const profile = await getProfile(propPost.user_id);
    setFetchedPost({
      ...propPost,
      _resolvedName: profile?.full_name,
      _resolvedUser: profile?.username,
      _resolvedAvatar: profile?.avatar_url,
    });
  };

  resolve();
}, [propPost]);

  // ── backdrop click ────────────────────────────────────────────────────────
  const handleBackdropClick = useCallback(
    (e) => { if (e.target === overlayRef.current) onClose(); },
    [onClose]
  );

  // ── ESC ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // ── lock body scroll ──────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      style={{
        position:             "fixed",
        inset:                0,
        background:           "rgba(0,0,0,0.78)",
        display:              "flex",
        alignItems:           "flex-start",
        justifyContent:       "center",
        zIndex:               100,
        overflowY:            "auto",
        backdropFilter:       "blur(3px)",
        WebkitBackdropFilter: "blur(3px)",
        padding:              "48px 16px 48px",
      }}
    >
      <div
        style={{
          position:  "relative",
          width:     "100%",
          maxWidth:  "712px",
          animation: "tg-modal-in 0.22s cubic-bezier(.34,1.2,.64,1) both",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes tg-modal-in {
            from { opacity:0; transform:scale(0.96) translateY(10px); }
            to   { opacity:1; transform:scale(1)    translateY(0);    }
          }
        `}</style>

        {/* close button */}
        <button
          onClick={onClose}
          style={{
            position:       "absolute",
            top:            0,
            right:          0,
            width:          36,
            height:         36,
            borderRadius:   "50%",
            background:     "#161615",
            border:         "1px solid #252523",
            color:          "#8891b2",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            cursor:         "pointer",
            transition:     "color 0.15s, border-color 0.15s, background 0.15s",
            zIndex:         10,
            flexShrink:     0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color       = "#f472b6";
            e.currentTarget.style.borderColor = "rgba(244,114,182,0.45)";
            e.currentTarget.style.background  = "rgba(244,114,182,0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color       = "#8891b2";
            e.currentTarget.style.borderColor = "#252523";
            e.currentTarget.style.background  = "#161615";
          }}
          aria-label="Close"
        >
          <FiX size={16} />
        </button>

        {/* card area */}
        <div style={{ margin: "44px 20px 0" }}>

          {/* loading */}
          {loading && (
            <div style={{
              background: "#161615", borderRadius: "16px",
              border: "1px solid #252523", padding: "60px 24px", textAlign: "center",
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                border: "2px solid #252523", borderTopColor: "#f472b6",
                margin: "0 auto 14px",
                animation: "tg-spin 0.7s linear infinite",
              }} />
              <style>{`@keyframes tg-spin { to { transform:rotate(360deg); } }`}</style>
              <p style={{ fontSize: 12, color: "#6b7a99", fontFamily: "'Space Mono', monospace" }}>
                Loading post…
              </p>
            </div>
          )}

          {/* not found */}
          {notFound && (
            <div style={{
              background: "#161615", borderRadius: "16px",
              border: "1px solid #252523", padding: "60px 24px", textAlign: "center",
            }}>
              <p style={{ fontSize: 14, color: "#8891b2", marginBottom: 8 }}>Post not found</p>
              <p style={{ fontSize: 12, color: "#6b7a99", marginBottom: 20 }}>
                It may have been deleted or the link is invalid.
              </p>
              <button onClick={onClose} style={{
                padding: "8px 20px", borderRadius: "8px",
                background: "rgba(244,114,182,0.08)",
                border: "1px solid rgba(244,114,182,0.25)",
                color: "#f472b6", fontSize: 12, cursor: "pointer",
              }}>
                Go back
              </button>
            </div>
          )}

          {/* post card */}
          {!loading && !notFound && activePost && (
            <>
              {activeType === "project" ? (
                // ProjectCard still reads author_* from project_posts directly,
                // but also benefits from resolved fields if they were injected.
                <ProjectCard
                  post={{
                    ...activePost,
                    // Prefer resolved profile values where available
                    author_name:     activePost._resolvedName   || activePost.author_name,
                    github_username: activePost._resolvedUser   || activePost.github_username,
                    author_avatar:   activePost._resolvedAvatar || activePost.author_avatar,
                  }}
                  onDelete={onDelete}
                />
              ) : (
                <PostCard
                  post={{
                    id:         activePost.id,
                    user_id:    activePost.user_id,
                    // author shape — resolved profile fields take priority
                    author: {
                      // name:     activePost._resolvedName   || activePost.author_name     || null,
                      name:
  activePost.author?.name ||
  activePost._resolvedName ||
  activePost.author_name ||
  "Unknown User",
                      username: activePost._resolvedUser   || activePost.github_username  || null,
                      avatar:
  activePost.author?.avatar ||
  activePost._resolvedAvatar ||
  activePost.author_avatar ||
  null
                    },
                    tag:        activePost.tag,
                    fileName:   activePost.file_name || activePost.fileName,
                    language:   activePost.language,
                    code:       activePost.code,
                    caption:    activePost.caption,
                    likes:      activePost.likes,
                    comments:   activePost.comments,
                    created_at: activePost.created_at,
                    // community attribution passthrough
                    community_id:   activePost.community_id,
                    community_name: activePost.community_name,
                  }}
                  onDelete={onDelete}
                />
              )}

              {/* delete button — only shown in Profile mode (onDelete prop present) */}
              {onDelete && activeType !== "project" && (
                <div style={{ display: "flex", justifyContent: "flex-end", padding: "4px 0 8px" }}>
                  <button
                    onClick={async () => {
                      const { data: { user } } = await supabase.auth.getUser();
                      const { error } = await supabase
                        .from("posts")
                        .delete()
                        .match({ id: activePost.id, user_id: user.id });
                      if (error) { console.error(error); return; }
                      onDelete(activePost.id);
                      onClose();
                    }}
                    style={{
                      padding: "6px 16px", borderRadius: "8px",
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      color: "#f87171", fontSize: 11, cursor: "pointer",
                    }}
                  >
                    Delete post
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostModal;