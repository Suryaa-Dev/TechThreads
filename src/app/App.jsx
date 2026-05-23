// src/app/App.jsx
// ─────────────────────────────────────────────────────────────────────────────
// FIXES:
//   1. Removed the broken init() function that was incorrectly placed inside
//      AppContent (it referenced supabase/mounted/setUser which don't exist
//      there — would have crashed at runtime).
//   2. Fixed ADMIN_ROUTES to match actual <Route> paths so the sidebar
//      correctly hides on admin pages.
//   3. Replaced `return null` on loading with a visible spinner — so a blank
//      dark screen never appears even if auth takes a moment.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
  useParams,
} from 'react-router-dom';

import { AuthProvider, useAuth } from '../context/AuthContext';

import Sidebar         from '../components/Sidebar';
import AuthPage        from '../features/auth/pages/AuthPage';
import AuthCallback    from '../features/auth/pages/AuthCallback';
import CompleteProfile from '../features/auth/pages/CompleteProfile';
import Feed            from '../features/feed/pages/Feed';
import Explore         from '../features/feed/pages/Explore';
import UploadPost      from '../features/feed/pages/UploadPost';
import Profile         from '../features/profile/pages/Profile';
import UserProfile     from '../features/profile/pages/UserProfile';
import PostModal       from '../features/feed/components/PostModal';

import Challenges        from '../features/challenges/pages/Challenges';
import GameCreationAdmin from '../features/admin/pages/GameCreationAdmin';

import CommunitiesPage   from '../features/communities/pages/CommunitiesPage';
import CommunityPageView from '../features/communities/pages/CommunityPageView';
import { AdminCommunityRequests } from '../features/communities/pages/CommunitiesPage';

import DocsAdmin from '../features/docs/pages/DocsAdmin';
import DocsPage from '../features/docs/pages/DocsPage';

// ── FeedWithModal ─────────────────────────────────────────────────────────────
const FeedWithModal = () => {
  const { type, id } = useParams();
  const navigate     = useNavigate();
  const handleClose  = () => navigate('/feed', { replace: true });

  return (
    <>
      <Feed />
      {type && id && (
        <PostModal postId={id} postType={type} onClose={handleClose} />
      )}
    </>
  );
};

// ── Route constants ───────────────────────────────────────────────────────────
const AUTH_ROUTES = ['/', '/auth', '/auth/callback', '/complete-profile'];

// FIX: these must exactly match the <Route path> values below
const ADMIN_ROUTES = [
  '/challenges/admin/game-creation',
  '/admin/community-requests',
  '/docs/admin',
];

// ── AppContent ────────────────────────────────────────────────────────────────
const AppContent = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate  = useNavigate();

  const hideSidebar =
    AUTH_ROUTES.includes(location.pathname) ||
    ADMIN_ROUTES.some((r) => location.pathname.startsWith(r));

  // ── route guards ──────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (loading) return;
    const isAuthRoute = AUTH_ROUTES.includes(location.pathname);
    if (!user && !isAuthRoute) navigate('/');
    if (user  && location.pathname === '/') navigate('/feed');
  }, [user, loading, location.pathname, navigate]);

  // ── loading screen ────────────────────────────────────────────────────────
  // Show a spinner while Supabase resolves the session.
  // Never returns null — that's what caused the blank dark screen.
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: 16,
        background: '#0e0e0d',
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '2px solid #252523',
          borderTopColor: '#00d4ff',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 11,
          color: '#4a5878',
          letterSpacing: '0.08em',
        }}>
          // connecting…
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="flex bg-[#0f0f0f] text-gray-300 h-screen">
      {!hideSidebar && <Sidebar />}

      <div className="flex-1 bg-[#121212] overflow-y-auto">
        <Routes>
          {/* ── auth ── */}
          <Route path="/"                 element={<AuthPage />} />
          <Route path="/auth"             element={<AuthPage />} />
          <Route path="/auth/callback"    element={<AuthCallback />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />

          {/* ── feed ── */}
          <Route path="/feed"           element={<FeedWithModal />} />
          <Route path="/explore"        element={<Explore />} />
          <Route path="/post/:type/:id" element={<FeedWithModal />} />

          {/* ── communities ── */}
          <Route path="/communities"                element={<CommunitiesPage />} />
          <Route path="/community/:id"              element={<CommunityPageView />} />
          <Route path="/community/:id/post/:postId" element={<CommunityPageView />} />
          <Route path="/communities/admin/community-requests"   element={<AdminCommunityRequests />} />

          {/* ── challenges ── */}
          <Route path="/challenges"                     element={<Challenges />} />
          <Route path="/challenges/admin/game-creation" element={<GameCreationAdmin />} />

          {/* ── other protected routes ── */}
          <Route path="/upload"         element={<UploadPost />} />
          <Route path="/profile"        element={<Profile />} />
          <Route path="/user/:username" element={<UserProfile />} />
          <Route path="/user/id/:id"    element={<UserProfile />} />

          {/* Docs */}
          <Route path='/docs' element={<DocsPage/>} />
          <Route path='/docs/admin' element={<DocsAdmin/>} />
        </Routes>
      </div>
    </div>
  );
};

// ── App ───────────────────────────────────────────────────────────────────────
const App = () => (
  <Router>
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </Router>
);

export default App;