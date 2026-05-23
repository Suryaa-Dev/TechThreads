// src/features/docs/data/guideContent.js
// ─────────────────────────────────────────────────────────────────────────────
// TechThreads User Guide — beginner-focused content.
// Each section = one topic in the left sidebar nav.
// Each section has:
//   - intro        : 1–2 sentence "what is this?" for beginners
//   - purpose      : why this feature exists / what problem it solves
//   - steps        : ordered how-to steps, each with optional mediaSlot
//   - tips         : power-user callouts
//   - faqs         : common beginner questions
//
// mediaSlot shape:
//   { id: string, type: 'image'|'video', caption: string, aspectRatio: '16/9'|'4/3'|'1/1' }
//   → rendered as a styled placeholder. Replace with real src when ready.
// ─────────────────────────────────────────────────────────────────────────────

export const GUIDE_SECTIONS = [
  // ── 0. Getting Started ────────────────────────────────────────────────────
  {
    id: 'getting-started',
    icon: '🚀',
    title: 'Getting Started',
    accent: '#00d4ff',
    intro:
      'Welcome to TechThreads — the social platform built for developers. This guide walks you through everything you need to know to get up and running in minutes.',
    purpose:
      'TechThreads is your developer home: share code snippets, showcase projects, join coding challenges, and connect with other developers — all in one place. Whether you\'re a student, indie hacker, or senior engineer, this is where your dev story lives.',
    steps: [
      {
        id: 'gs-1',
        title: 'Sign in with GitHub',
        description:
          'TechThreads uses your GitHub account for sign-in — no password needed. Click the "Continue with GitHub" button on the home screen. GitHub will ask you to authorize TechThreads. Click "Authorize" and you\'ll be brought straight back.',
        mediaSlot: {
          id: 'gs-signin',
          type: 'image',
          caption: 'The TechThreads sign-in screen with the GitHub button',
          aspectRatio: '16/9',
        },
      },
      {
        id: 'gs-2',
        title: 'Set up your profile',
        description:
          'After signing in for the first time, you\'ll land on the Profile Setup page. Fill in your username (this is your @handle — pick something you\'re happy with), your display name, and a short bio. You can also add links to your GitHub and portfolio. Hit "Save" when done.',
        mediaSlot: {
          id: 'gs-profile-setup',
          type: 'image',
          caption: 'The profile setup form on first login',
          aspectRatio: '16/9',
        },
      },
      {
        id: 'gs-3',
        title: 'Land on your Feed',
        description:
          'Once your profile is set, you\'ll be taken to the Feed — your main home screen. At first it\'ll be quiet (you haven\'t followed anyone yet). Head to Explore in the left sidebar to discover developers and start following them.',
        mediaSlot: {
          id: 'gs-feed-empty',
          type: 'image',
          caption: 'An empty feed prompting you to follow developers',
          aspectRatio: '16/9',
        },
      },
    ],
    tips: [
      'Your GitHub username is just used to authenticate — your @handle on TechThreads can be completely different.',
      'You can always edit your profile later from the Profile page.',
    ],
    faqs: [
      {
        q: 'Do I need to pay to use TechThreads?',
        a: 'No — TechThreads is completely free to use.',
      },
      {
        q: 'Can I sign in without a GitHub account?',
        a: 'Not currently. GitHub is the only sign-in method. Create a free GitHub account at github.com if you don\'t have one.',
      },
    ],
  },

  // ── 1. Feed ───────────────────────────────────────────────────────────────
  {
    id: 'feed',
    icon: '⚡',
    title: 'Your Feed',
    accent: '#00d4ff',
    intro:
      'Your Feed is your personalised stream of posts from developers you follow. Think of it like a Twitter/X timeline — but everything posted is code, projects, and dev content.',
    purpose:
      'The Feed keeps you up to date with what developers in your network are building and sharing. It shows two types of posts: Code Posts (syntax-highlighted code snippets) and Project Posts (full project showcases with screenshots and links). Real-time updates mean new posts appear automatically — no refresh needed.',
    steps: [
      {
        id: 'feed-1',
        title: 'Reading your Feed',
        description:
          'Scroll down to browse posts. Each card shows the author\'s name and avatar, when they posted, and the content. Code Posts show a highlighted code block. Project Posts show a cover image, project name, tech stack tags, and links to the live site and GitHub repo.',
        mediaSlot: {
          id: 'feed-scroll',
          type: 'image',
          caption: 'The Feed showing a mix of Code Posts and Project Posts',
          aspectRatio: '16/9',
        },
      },
      {
        id: 'feed-2',
        title: 'Liking and commenting on a post',
        description:
          'At the bottom of every post card you\'ll see a ❤️ like button and a 💬 comment button. Click ❤️ to like a post — the count updates instantly. Click 💬 or anywhere on the card to open the full post view, where you can read and write threaded comments.',
        mediaSlot: {
          id: 'feed-like-comment',
          type: 'image',
          caption: 'Post action buttons — like, comment, and share',
          aspectRatio: '4/3',
        },
      },
      {
        id: 'feed-3',
        title: 'Opening a post in full',
        description:
          'Click on any post card to open it in a full-screen modal. Here you\'ll see the complete code or project details, all comments in a thread, and a text box to add your own comment. Press Escape or click the background to close and return to the feed.',
        mediaSlot: {
          id: 'feed-modal',
          type: 'video',
          caption: 'Demo: opening a post and leaving a comment',
          aspectRatio: '16/9',
        },
      },
      {
        id: 'feed-4',
        title: 'Sharing a post',
        description:
          'Every post has a shareable URL. Click the Share icon on a post card to copy a direct link. Anyone who opens that link will see the post — even if they aren\'t logged in.',
        mediaSlot: {
          id: 'feed-share',
          type: 'image',
          caption: 'Copying a share link from a post',
          aspectRatio: '4/3',
        },
      },
    ],
    tips: [
      'New posts from people you follow appear at the top automatically — no page refresh needed.',
      'The Spotlight Banner that appears every few posts highlights trending projects across the whole platform.',
    ],
    faqs: [
      {
        q: 'My feed is empty — what do I do?',
        a: 'You need to follow some developers first. Go to Explore in the sidebar to discover people and hit the Follow button on their profiles.',
      },
      {
        q: 'What\'s the difference between a Code Post and a Project Post?',
        a: 'A Code Post is a single snippet — great for sharing a function, algorithm, or tip. A Project Post showcases an entire project with images, a description, and links.',
      },
    ],
  },

  // ── 2. Explore ───────────────────────────────────────────────────────────
  {
    id: 'explore',
    icon: '🧭',
    title: 'Explore',
    accent: '#818cf8',
    intro:
      'Explore shows you all public posts from every developer on TechThreads — not just people you follow. It\'s the best place to discover new developers and trending content.',
    purpose:
      'Explore is your discovery engine. Use it to find developers working in your tech stack, see what\'s trending, search for specific topics, and decide who to follow. The more you explore, the better your Feed becomes.',
    steps: [
      {
        id: 'exp-1',
        title: 'Browsing all posts',
        description:
          'Open Explore from the left sidebar. You\'ll see a grid of all recent posts across the platform. Scroll to browse. The newest posts appear at the top.',
        mediaSlot: {
          id: 'exp-browse',
          type: 'image',
          caption: 'The Explore grid showing posts from all developers',
          aspectRatio: '16/9',
        },
      },
      {
        id: 'exp-2',
        title: 'Searching for topics or developers',
        description:
          'Use the search bar at the top of Explore. Type a technology (e.g. "react", "python"), a developer\'s username, or a keyword from a post. Results filter instantly as you type — no need to hit Enter.',
        mediaSlot: {
          id: 'exp-search',
          type: 'video',
          caption: 'Demo: searching for "typescript" in Explore',
          aspectRatio: '16/9',
        },
      },
      {
        id: 'exp-3',
        title: 'Using the Tag Cloud',
        description:
          'On the right side of Explore you\'ll see a Tag Cloud — a cluster of technology tags sized by how popular they are. Click any tag (e.g. "rust", "nextjs") to filter the feed to posts that use that technology.',
        mediaSlot: {
          id: 'exp-tags',
          type: 'image',
          caption: 'The Tag Cloud with popular technology tags',
          aspectRatio: '4/3',
        },
      },
      {
        id: 'exp-4',
        title: 'Finding developers to follow via DevRadar',
        description:
          'The DevRadar panel on the right shows the most active developers on the platform. Click any developer\'s name or avatar to visit their profile, see their posts, and follow them.',
        mediaSlot: {
          id: 'exp-devadar',
          type: 'image',
          caption: 'DevRadar showing top active developers',
          aspectRatio: '4/3',
        },
      },
    ],
    tips: [
      'Tag Cloud updates in real time — the bigger the tag, the more posts use it right now.',
      'Combine search + tag filter to narrow down exactly what you\'re looking for.',
    ],
    faqs: [
      {
        q: 'How is Explore different from my Feed?',
        a: 'Your Feed only shows posts from developers you follow. Explore shows everyone\'s public posts — it\'s how you discover new people.',
      },
    ],
  },

  // ── 3. Creating Posts ─────────────────────────────────────────────────────
  {
    id: 'upload',
    icon: '📤',
    title: 'Creating a Post',
    accent: '#00e676',
    intro:
      'Sharing your work on TechThreads is how you build your developer profile and connect with the community. You can post code snippets or full project showcases.',
    purpose:
      'Posts are your portfolio on TechThreads. A well-crafted code post can help another developer solve a problem they\'ve been stuck on for hours. A project post is a great way to get feedback, attract collaborators, and show what you\'re capable of building.',
    steps: [
      {
        id: 'up-1',
        title: 'Open the Upload page',
        description:
          'Click "Upload Post" in the left sidebar. You\'ll see a toggle at the top letting you choose between "Code Post" and "Project Post". Select the type you want to create.',
        mediaSlot: {
          id: 'up-open',
          type: 'image',
          caption: 'The Upload page with the Code/Project toggle',
          aspectRatio: '16/9',
        },
      },
      {
        id: 'up-2',
        title: 'Creating a Code Post',
        description:
          'Select "Code Post". Fill in: (1) a caption — describe what your code does and why it\'s useful; (2) the programming language from the dropdown; (3) paste your code snippet in the code editor. A live preview on the right shows exactly how it will appear in the feed.',
        mediaSlot: {
          id: 'up-code',
          type: 'video',
          caption: 'Demo: creating a Code Post from start to publish',
          aspectRatio: '16/9',
        },
      },
      {
        id: 'up-3',
        title: 'Creating a Project Post',
        description:
          'Select "Project Post". Fill in: (1) Project title; (2) a description of what your project does; (3) tech stack — pick the technologies you used; (4) live URL if the project is deployed; (5) GitHub repo link; (6) optionally upload a cover image. The preview on the right updates as you type.',
        mediaSlot: {
          id: 'up-project',
          type: 'video',
          caption: 'Demo: creating a Project Post with cover image',
          aspectRatio: '16/9',
        },
      },
      {
        id: 'up-4',
        title: 'Publishing your post',
        description:
          'Once you\'re happy with the preview, click the "Publish" button. Your post will appear in your followers\' feeds immediately and in Explore for everyone else. You\'ll see a confirmation and be redirected to your feed.',
        mediaSlot: {
          id: 'up-publish',
          type: 'image',
          caption: 'The Publish button and confirmation state',
          aspectRatio: '4/3',
        },
      },
    ],
    tips: [
      'Keep code posts focused — one concept per post performs much better than large multi-purpose snippets.',
      'Always add a cover image to project posts. Posts with images get significantly more views.',
      'Your caption is your hook — lead with the problem your code solves, not just what it is.',
    ],
    faqs: [
      {
        q: 'Can I edit or delete a post after publishing?',
        a: 'Yes. Go to your Profile, find the post in your grid, and use the options menu (⋯) on the post card.',
      },
      {
        q: 'What languages are supported for Code Posts?',
        a: 'All major languages are supported: JavaScript, TypeScript, Python, Go, Rust, Java, C++, CSS, SQL, and many more.',
      },
      {
        q: 'Is there a limit to how long my code snippet can be?',
        a: 'The feed displays up to 22 lines with syntax highlighting. Longer snippets are truncated in the preview but fully visible in the post modal.',
      },
    ],
  },

  // ── 4. Dev Arena ─────────────────────────────────────────────────────────
  {
    id: 'challenges',
    icon: '⚔️',
    title: 'Dev Arena (Challenges)',
    accent: '#f5a623',
    intro:
      'Dev Arena is TechThreads\' gamified coding challenge system. Pick a topic, complete levels, earn XP, and unlock badges — all inside a built-in code editor.',
    purpose:
      'Dev Arena makes sharpening your coding skills feel like a game rather than homework. Each "Game" is a topic (like React Hooks or Data Structures). Each game has levels of increasing difficulty. Completing levels earns you XP that contributes to your rank and unlocks achievement badges shown on your public profile.',
    steps: [
      {
        id: 'ch-1',
        title: 'Navigate to Dev Arena',
        description:
          'Click "Challenges" in the left sidebar. You\'ll land on the Dev Arena home screen — a grid of available Games, each showing the topic, difficulty level, and your progress.',
        mediaSlot: {
          id: 'ch-home',
          type: 'image',
          caption: 'Dev Arena home — the game selection screen',
          aspectRatio: '16/9',
        },
      },
      {
        id: 'ch-2',
        title: 'Choose a Game and level',
        description:
          'Click on any Game card to open Level Select. You\'ll see all levels displayed as a path — completed ones are lit up, locked ones are greyed out. Start with Level 1. Click a level node to open the challenge.',
        mediaSlot: {
          id: 'ch-levels',
          type: 'image',
          caption: 'Level Select showing completed and locked levels',
          aspectRatio: '16/9',
        },
      },
      {
        id: 'ch-3',
        title: 'Solve the challenge',
        description:
          'Each challenge shows you the problem description on the left and the SpellbookEditor (a VS Code-style code editor) on the right. Read the problem, write your solution in the editor, then click "Run" to test it. When you\'re confident, click "Submit".',
        mediaSlot: {
          id: 'ch-editor',
          type: 'video',
          caption: 'Demo: reading a challenge and writing a solution in the editor',
          aspectRatio: '16/9',
        },
      },
      {
        id: 'ch-4',
        title: 'Earn XP and track your streak',
        description:
          'Each completed level awards XP. Completing at least one level per day keeps your streak alive — your streak count is shown in the top bar with a 🔥 flame. Your total XP determines your rank displayed on your profile.',
        mediaSlot: {
          id: 'ch-xp',
          type: 'image',
          caption: 'The XP and streak counter in the Dev Arena top bar',
          aspectRatio: '4/3',
        },
      },
    ],
    tips: [
      'You must complete each level in order — you can\'t skip ahead.',
      'Submitting the correct answer on your very first attempt awards a "Perfect Run" badge — rare and worth going for.',
      'Your daily streak resets at midnight — complete at least one level each day to keep it alive.',
    ],
    faqs: [
      {
        q: 'What is a "Game" in Dev Arena?',
        a: 'A Game is a topic-based challenge collection — for example "React Fundamentals" or "Algorithm Basics". Each game has multiple levels of increasing difficulty.',
      },
      {
        q: 'Which programming languages can I use in the editor?',
        a: 'The SpellbookEditor supports JavaScript, TypeScript, Python, and more depending on the challenge. The available language is shown in the editor toolbar.',
      },
      {
        q: 'Does XP from challenges show on my profile?',
        a: 'Yes — your XP total and rank tier are visible on your public profile page.',
      },
    ],
  },

  // ── 5. Communities ────────────────────────────────────────────────────────
  {
    id: 'communities',
    icon: '🏘️',
    title: 'Communities',
    accent: '#f472b6',
    intro:
      'Communities are topic-based groups where developers discuss, post, and collaborate around a shared interest — like a subreddit but built for dev conversations.',
    purpose:
      'Communities let you go deeper on specific topics you care about. Instead of scrolling a general feed, you can jump into the "Open Source" community to find collaboration opportunities, or the "System Design" community to discuss architecture patterns with people who care about the same things you do.',
    steps: [
      {
        id: 'com-1',
        title: 'Find and browse Communities',
        description:
          'Click "Communities" in the left sidebar. You\'ll see a list of all communities with their name, description, member count, and tags. Browse through to find topics that interest you.',
        mediaSlot: {
          id: 'com-browse',
          type: 'image',
          caption: 'The Communities page listing all available groups',
          aspectRatio: '16/9',
        },
      },
      {
        id: 'com-2',
        title: 'Join a Community',
        description:
          'Click the "Join" button on any community card. You\'re now a member — the community moves to the top of your list. Inside the community, you\'ll see its own feed of posts from all members.',
        mediaSlot: {
          id: 'com-join',
          type: 'image',
          caption: 'Joining a community with the Join button',
          aspectRatio: '4/3',
        },
      },
      {
        id: 'com-3',
        title: 'Post inside a Community',
        description:
          'Once you\'re inside a community, click "Create Post". You can write a text post or upload an image. This post will appear in the community\'s feed for all members to see and respond to.',
        mediaSlot: {
          id: 'com-post',
          type: 'video',
          caption: 'Demo: creating a post inside a community',
          aspectRatio: '16/9',
        },
      },
 {
        id: 'pro-4',
        title: 'Direct Messages',
        description:
          'Click the "Messages" tab on your profile to see your DM conversations. Click a conversation to open the chat. You can only message developers who follow you back (mutual follow). Type in the box at the bottom and press Send.',
        mediaSlot: {
          id: 'pro-messages',
          type: 'image',
          caption: 'The Messages tab and a DM conversation',
          aspectRatio: '4/3',
        },
      },
      {
        id: 'pro-5',
        title: 'Notifications',
        description:
          'Click the "Notifications" tab to see all your recent activity: new followers, likes and comments on your posts, badge awards, and community mentions. Unread notifications show a count badge in the sidebar.',
        mediaSlot: {
          id: 'pro-notifs',
          type: 'image',
          caption: 'The Notifications tab listing recent activity',
          aspectRatio: '4/3',
        },
      },
      {
        id: 'pro-6',
        title: 'Share your profile',
        description:
          'Your public profile URL is techthreads.app/user/yourusername. Share this link as your developer portfolio — visitors can see your posts and badges without needing to log in.',
        mediaSlot: {
          id: 'pro-share',
          type: 'image',
          caption: 'A public profile viewed by someone not logged in',
          aspectRatio: '16/9',
        },
      },
    ],
    tips: [
      'A fully completed profile (all fields + avatar) unlocks the "Complete Profile" badge.',
      'Share your /user/username URL in your GitHub bio, LinkedIn, or resume as a dev portfolio.',
      'Following developers you admire often leads to them following you back.',
    ],
    faqs: [
      {
        q: 'Can other people see my messages?',
        a: 'No. DMs are private between you and the other person only.',
      },
      {
        q: 'How do I earn points?',
        a: 'Points are earned by posting, receiving likes and comments, completing challenges, and joining communities. Your points total is shown in the sidebar under your name.',
      },
      {
        q: 'Can I change my username?',
        a: 'Yes — edit your profile and update the username field. Note that your shareable profile URL will change when you do.',
      },
    ],
  },
];

export default GUIDE_SECTIONS;