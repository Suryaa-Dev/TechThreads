import React, { useMemo, useState } from "react";
import { FiSearch, FiTrendingUp, FiHash } from "react-icons/fi";
import { FaRegHeart, FaRegComment } from "react-icons/fa";

// ── helpers ───────────────────────────────────────────────────────────────────

const TRENDING_THRESHOLD = 10; // min likes to appear in trending

function getTrendingTopics(posts) {
  // Collect all tags + tech stacks
  const tagCount = {};

  posts.forEach((p) => {
    // code posts have a `tag`
    if (p.tag) {
      const key = p.tag.toLowerCase();
      tagCount[key] = (tagCount[key] || 0) + (p.likes || 0) + 1;
    }
    // project posts have `project_stack` comma-separated
    if (p.project_stack) {
      p.project_stack.split(",").forEach((t) => {
        const key = t.trim().toLowerCase();
        if (key) tagCount[key] = (tagCount[key] || 0) + (p.likes || 0) + 1;
      });
    }
  });

  return Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([tag, score]) => ({ tag, score }));
}

function getTrendingPosts(posts) {
  return [...posts]
    .filter((p) => (p.likes || 0) >= TRENDING_THRESHOLD)
    .sort((a, b) => (b.likes || 0) - (a.likes || 0))
    .slice(0, 4);
}

function getAuthorName(p) {
  return p.author?.name || p.author_name || "Unknown";
}

function getPostTitle(p) {
  if (p.type === "code") return p.file_name || p.fileName || "Untitled";
  return p.project_title || "Untitled Project";
}

// ── RightSidebar ──────────────────────────────────────────────────────────────

const RightSidebar = ({ posts = [], activeTab, setActiveTab, searchQuery, setSearchQuery }) => {
  const trendingTopics = useMemo(() => getTrendingTopics(posts), [posts]);
  const trendingPosts  = useMemo(() => getTrendingPosts(posts), [posts]);

  const tabs = [
    { id: "all",     label: "All"      },
    { id: "code",    label: "Code"     },
    { id: "project", label: "Projects" },
  ];

  return (
    <div className="w-72 flex-shrink-0 flex flex-col gap-4 pt-10 pr-4 sticky top-0 h-screen overflow-y-auto pb-10">

      {/* ── Filter ───────────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl border border-[#252523] overflow-hidden"
        style={{ background: "#161615" }}
      >
        <div className="px-4 pt-3 pb-2 border-b border-[#252523]">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-[#6b7a99]">
            Filter Posts
          </p>
        </div>
        <div className="flex gap-2 p-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer border"
              style={
                activeTab === tab.id
                  ? {
                      background: "rgba(236,72,153,0.15)",
                      borderColor: "rgba(236,72,153,0.4)",
                      color: "#f472b6",
                      boxShadow: "0 0 12px rgba(236,72,153,0.15)",
                    }
                  : {
                      background: "transparent",
                      borderColor: "#252523",
                      color: "#3d4a6e",
                    }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Search ───────────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl border border-[#252523] overflow-hidden"
        style={{ background: "#161615" }}
      >
        <div className="px-4 pt-3 pb-2 border-b border-[#252523]">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-[#6b7a99]">
            Search
          </p>
        </div>
        <div className="p-3">
          <div className="relative">
            <FiSearch
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b7a99] pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="user, title, keyword…"
              className="w-full pl-8 pr-3 py-2 rounded-lg text-[13px] bg-[#0e0e0d] border border-[#252523] text-[#e8eaf6] placeholder-[#2d3452] focus:outline-none transition-all"
              style={{
                caretColor: "#f472b6",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = "rgba(236,72,153,0.4)")
              }
              onBlur={(e) => (e.target.style.borderColor = "#252523")}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6b7a99] hover:text-[#aab4cc] text-xs transition-colors cursor-pointer bg-transparent border-none"
              >
                ✕
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-[10px] text-[#6b7a99] mt-2 pl-1">
              Searching by username, title &amp; caption
            </p>
          )}
        </div>
      </div>

      {/* ── Trending Topics ──────────────────────────────────────────────────── */}
      {trendingTopics.length > 0 && (
        <div
          className="rounded-2xl border border-[#252523] overflow-hidden"
          style={{ background: "#161615" }}
        >
          <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-[#252523]">
            <FiTrendingUp size={12} className="text-pink-500" />
            <p className="text-[10px] font-semibold tracking-widest uppercase text-[#6b7a99]">
              Trending Topics
            </p>
          </div>
          <div className="p-3 flex flex-col gap-1">
            {trendingTopics.map(({ tag, score }, i) => (
              <button
                key={tag}
                onClick={() => setSearchQuery(tag)}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-left w-full cursor-pointer border border-transparent transition-all group hover:border-[#252523] bg-transparent"
                style={{ background: "transparent" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.03)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] text-[#4a5878] font-mono w-3 flex-shrink-0">
                    {i + 1}
                  </span>
                  <FiHash size={10} className="text-[#6b7a99] flex-shrink-0" />
                  <span className="text-[13px] text-[#aab4cc] font-medium truncate group-hover:text-white transition-colors">
                    {tag}
                  </span>
                </div>
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded font-mono flex-shrink-0"
                  style={{
                    background: "rgba(244,114,182,0.08)",
                    color: "#f472b6",
                    border: "1px solid rgba(244,114,182,0.15)",
                  }}
                >
                  {score}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Trending Posts ───────────────────────────────────────────────────── */}
      {trendingPosts.length > 0 && (
        <div
          className="rounded-2xl border border-[#252523] overflow-hidden"
          style={{ background: "#161615" }}
        >
          <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-[#252523]">
            <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-500 opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-pink-500" />
            </span>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-[#6b7a99]">
              Hot Right Now
            </p>
          </div>
          <div className="p-3 flex flex-col gap-2">
            {trendingPosts.map((p) => (
              <div
                key={p.id}
                className="p-3 rounded-xl border border-[#252523] transition-all"
                style={{ background: "#121211" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = "rgba(236,72,153,0.25)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = "#252523")
                }
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-[13px] text-[#d0d8ee] font-medium leading-snug line-clamp-1 flex-1">
                    {getPostTitle(p)}
                  </p>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded flex-shrink-0 font-medium"
                    style={
                      p.type === "code"
                        ? {
                            color: "#61AFEF",
                            background: "rgba(97,175,239,0.08)",
                            border: "1px solid rgba(97,175,239,0.2)",
                          }
                        : {
                            color: "#a78bfa",
                            background: "rgba(167,139,250,0.08)",
                            border: "1px solid rgba(167,139,250,0.2)",
                          }
                    }
                  >
                    {p.type === "code" ? "Code" : "Project"}
                  </span>
                </div>
                <p className="text-[10px] text-[#6b7a99] mb-2">
                  by {getAuthorName(p)}
                </p>
                <div className="flex items-center gap-3 text-[10px] text-[#6b7a99]">
                  <span className="flex items-center gap-1">
                    <FaRegHeart size={9} className="text-pink-500/70" />
                    <span className="text-pink-400/80 font-semibold">
                      {p.likes || 0}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <FaRegComment size={9} />
                    {p.comments || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── empty state if no data yet ───────────────────────────────────────── */}
      {trendingTopics.length === 0 && trendingPosts.length === 0 && (
        <div className="rounded-2xl border border-[#252523] p-5 text-center" style={{ background: "#161615" }}>
          <p className="text-[12px] text-[#4a5878]">More features coming soon</p>
        </div>
      )}
    </div>
  );
};

export default RightSidebar;