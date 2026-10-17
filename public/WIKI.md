# ESTT Community Platform - Complete Wiki

**Last Updated**: June 17, 2026  
**Version**: 1.26.1  
**Status**: Production

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Tech Stack & Architecture](#tech-stack--architecture)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Core Features](#core-features)
5. [Database Structure](#database-structure)
6. [API Reference](#api-reference)
7. [Frontend Architecture](#frontend-architecture)
8. [Admin & Moderation Features](#admin--moderation-features)
9. [Integrations](#integrations)
10. [Configuration & Deployment](#configuration--deployment)

---

## Platform Overview

### Purpose & Vision

ESTT Community is a comprehensive web platform designed for students of **EST Tétouan (École Supérieure de Technologie de Tétouan)**. It has evolved from a simple resource-sharing platform to a complete campus engagement ecosystem that combines:

- **Academic Resources Library**: Centralized knowledge base organized by field of study, semester, and module
- **Campus Clubs Ecosystem**: Dedicated spaces for student organizations with pages, events, and forms
- **Event Management & Ticketing**: Calendar with registration, ticket sales via Stripe, and certificate generation
- **Student Notifications System**: Global announcements, personal messages, and real-time chat
- **Student Advertising Portal**: Peer-to-peer marketplace for services and opportunities
- **Project Hub**: Challenge-based learning where students can submit implementations and vote
- **PWA Experience**: Installable web app with offline capabilities and mobile-like experience

### Key Statistics

- **Tech Stack**: Next.js 14, React 18, Firebase, Stripe
- **Users**: EST Tétouan student body
- **Resources**: Academic materials organized by curriculum
- **Clubs**: Multiple active student organizations
- **Events**: Regular campus events with ticketing
- **Deployment**: Vercel (production: https://estt.ma)

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ESTT COMMUNITY PLATFORM                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────┐         ┌─────────────────────┐   │
│  │   Next.js Frontend   │◄────────┤   Firebase Realtime  │   │
│  │   (App Router)       │         │   Database (RTDB)    │   │
│  │   - Pages Router     │◄────────┤                      │   │
│  │   - API Routes       │         └─────────────────────┘   │
│  └──────────────────────┘                  │                 │
│         │       │       │                  │                 │
│         │       │       └──────────────────┼─────────────────┤
│         │       │                          │                 │
│    ┌────┴──┐   │                   ┌──────▼──────┐           │
│    │ Auth  │   │                   │   File Store  │           │
│    │Context│   │                   │   Google Drive│           │
│    │       │   │                   │   & Supabase │           │
│    └────────┘   │                   └───────────────┘          │
│                 │                                             │
│        ┌────────┴──────────┐                                  │
│        │   Third-Party     │                                  │
│        │   Integrations    │                                  │
│        ├──────────────────┤                                  │
│        │ - Stripe         │                                  │
│        │ - Google OAuth   │                                  │
│        │ - Slack Webhooks │                                  │
│        │ - Email (Gmail)  │                                  │
│        │ - Google Drive   │                                  │
│        │ - Groq AI (LLM)  │                                  │
│        └──────────────────┘                                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack & Architecture

### Core Technologies

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Frontend** | Next.js | 14.0.4 | React meta-framework with App Router |
| **UI Framework** | React | 18.2.0 | Component library & state management |
| **Styling** | Tailwind CSS | 3.4.1 | Utility-first CSS framework |
| **UI Components** | Radix UI + shadcn/ui | - | Accessible, unstyled components |
| **Database** | Firebase Realtime DB | 10.7.1 | NoSQL real-time database |
| **Authentication** | Firebase Auth | 10.7.1 | User authentication & session |
| **Storage** | Google Drive API | 171.4.0 | File uploads (primary) |
| **Legacy Storage** | Supabase | 2.39.0 | Secondary storage for HTML/images |
| **Payments** | Stripe | 20.1.2 | Payment processing for tickets & ads |
| **Email** | Nodemailer | 7.0.12 | Transactional emails via Gmail SMTP |
| **AI/ML** | Groq SDK | 1.1.2 | LLM for assistant features |
| **Real-time Chat** | Firebase RTDB | - | Live messaging & presence |
| **Notifications** | Browser API | - | PWA push notifications |
| **Markdown** | React Markdown | 10.1.0 | Content rendering |
| **PDF Generation** | jsPDF | 4.2.0 | Certificate & document exports |
| **QR Codes** | qrcode | 1.5.4 | Ticket & check-in QR generation |
| **PWA** | next-pwa | 5.6.0 | App installation & offline support |
| **Charts** | Recharts | 3.8.1 | Dashboard analytics visualization |

### Framework Architecture: Next.js 14 App Router

The application uses the **App Router** (modern approach) with the following structure:

```
app/
├── (marketing)/          # Public marketing pages
│   ├── layout.js         # Marketing layout
│   ├── page.js          # Homepage
│   ├── browse/          # Resource browser
│   ├── contribute/      # Resource submission
│   ├── search/          # Search interface
│   ├── ads-portal/      # Student advertising
│   ├── download/        # App download page
│   ├── docs/            # Documentation
│   ├── report-bug/      # Bug reporting
│   ├── remerciements/   # Contributors hall of fame
│   └── [other pages]/
│
├── (auth)/              # Authentication pages
│   ├── layout.js
│   ├── login/
│   ├── signup/
│   └── verify-success/
│
├── (core)/              # Main app features
│   ├── layout.js        # Main nav & sidebar
│   ├── resources/       # Resource detail
│   ├── resource/        # Resource detail page
│   ├── clubs/          # Club browser & detail
│   ├── events/         # Event calendar
│   ├── chat/           # Room-based messaging
│   ├── messages/       # Direct messaging
│   ├── notifications/  # Notification center
│   ├── profile/        # User profiles
│   ├── projects/       # Project hub
│   └── [other features]/
│
├── (admin)/             # Admin-only pages
│   ├── admin/          # Admin dashboard
│   ├── moderator/      # Moderation console
│   ├── chat-stickers/  # Sticker management
│   └── [admin routes]/
│
├── (legal)/             # Legal pages
│   ├── privacy/
│   └── terms/
│
├── api/                 # API routes
│   ├── auth/           # Authentication endpoints
│   ├── checkout/       # Stripe checkout
│   ├── webhook/        # Stripe webhooks
│   ├── send-email/     # Email sending
│   ├── drive/          # Google Drive integration
│   ├── upload-drive/   # File uploads
│   ├── estt-ai/        # AI assistant
│   ├── export-data/    # Data export (GDPR)
│   └── [other routes]/
│
├── layout.js           # Root layout
├── page.js             # Root page
├── globals.css         # Global styles
└── sitemap.js          # Sitemap generation
```

### Configuration Files

- **next.config.js**: PWA setup, image remoting, redirects
- **tailwind.config.js**: Color system, animations, theming
- **tsconfig.json**: TypeScript configuration with path aliases (@/*)
- **postcss.config.js**: CSS processing pipeline
- **components.json**: Radix UI/shadcn-ui config

---

## User Roles & Permissions

### Role Hierarchy

| Role | Description | Key Permissions |
|------|-------------|------------------|
| **Student (Default)** | Regular platform user | Browse resources, create clubs, register for events, contribute resources, messaging, chat |
| **Club Officer** | Club leadership | Create/edit club page, manage members, create events/forms, publish announcements, approve join requests |
| **Moderator** | Content moderator | Review pending resources, moderate chat, handle reports, approve/reject club requests |
| **Admin** | Platform administrator | Full access, user management, global announcements, platform settings, monitor all activity |

### Authentication & Authorization System

#### Login/Signup Flow

```javascript
// Authentication Context (AuthContext.js)
- Email/Password signup via Firebase Auth
- Email verification (6-digit OTP sent to email)
- Google OAuth integration
- Firebase session persistence
```

#### Email Verification

1. User signs up → OTP sent to email
2. User enters 6-digit code
3. `POST /api/auth/verify-email` → Validates code (10-min expiry)
4. Profile marked as `verifiedEmail: true`
5. Redirected to setup profile

#### Session Management

- Firebase handles token refresh automatically
- Tokens expire in 1 hour (auto-refresh on use)
- `AuthContext` maintains user state globally
- `useAuth()` hook provides `user`, `profile`, `loading` states

### Data Access Control

| Resource | Public | Authenticated | Author | Admin |
|----------|--------|---|--------|-------|
| Resources | Browse (non-unverified only) | ✓ | Edit own | Approve/Reject |
| Clubs | View list & public info | Join, Subscribe | Manage | Approve/Delete |
| Events | View details | Register | Create, Manage | Delete |
| Chat Rooms | - | Join room-based chats | - | - |
| Messages | - | Send/receive to users | View own | - |
| Profiles | View public info | Edit own | View full | Delete |
| Admin Panel | ✗ | ✗ | ✗ | ✓ |

---

## Core Features

### 1. Resources (Knowledge Base)

#### Overview

A comprehensive library of academic materials organized by:
- **Field of Study** (10+ disciplines)
- **Semester** (S1-S4 across 2 years)
- **Module** (50+ modules per field)

#### Resource Types

- **PDF**: Course notes, lecture slides, summaries
- **Image**: Diagrams, charts, exam papers
- **Video**: Tutorial links, lecture recordings
- **Link**: External resources, articles
- **HTML**: Web-based content, interactive materials

#### Metadata Per Resource

```javascript
{
  id: "resource-uuid",
  title: "String",
  description: "String",
  type: "pdf|image|video|link|html",
  docType: "Cours|TD|TP|Exam|Autres",
  url: "String (file link)",
  file: "String (filename)",
  fileName: "String",
  professor: "String",
  
  // Organization
  field: "String (field ID)",
  semester: "S1|S2|S3|S4",
  module: "String (shortened name)",
  fullModuleName: "String (full name)",
  moduleId: "String (unique module ID)",
  fields: [
    { fieldId: "String", moduleId: "String" }
  ],
  
  // User info
  authorId: "Firebase UID",
  authorName: "String",
  anonymous: "Boolean",
  
  // Status & Verification
  unverified: "Boolean (pending moderation)",
  createdAt: "Timestamp",
  
  // Ratings
  ratingAverage: "Number (0-5)",
  ratingCount: "Number",
  
  // Storage type
  storageType: "google-drive|supabase"
}
```

#### User Workflows

**Browsing Resources**
1. User navigates `/browse`
2. Selects Field → Semester → Module
3. Resources display categorized by type (Cours, TD, TP, Exam)
4. Click resource → opens in new tab or views details

**Contributing Resources**
1. User navigates `/contribute`
2. Fills form: Field, Semester, Module, Title, Description, Type
3. Uploads file or provides URL
4. (Optional) Add to multiple modules
5. Submit → Status: "unverified" (awaiting moderation)
6. Email confirmation sent
7. Once approved → appears in browse

**Resource Moderation**
1. Admin navigates Moderator Dashboard
2. Reviews unverified resources
3. Checks metadata quality & file validity
4. Approves → `unverified` = false, resource appears
5. Rejects → resource hidden, email sent to author

**Resource Ratings**
1. User views resource detail page
2. Submits rating (1-5 stars)
3. Rating added to `ratingAverage` & `ratingCount`
4. Displayed on resource cards throughout platform

#### Database Paths

- `/resources/{resourceId}` - Resource documents
- `/module_resources/{moduleId}/{resourceId}` - Module mappings (fast filtering)
- `/metadata/keywords/{fieldId}/{resourceId}` - Search index
- `/userFavorites/{userId}/{resourceId}` - User saved resources
- `/resourceViews/{resourceId}/views` - View tracking

#### API Endpoints

- `GET /api/resources` - Fetch resources (no direct endpoint, uses Firebase)
- Uses Firebase Realtime DB queries directly
- Google Drive API for file uploads: `/api/upload-drive`

---

### 2. Clubs & Organizations

#### Club Structure

```javascript
{
  id: "club-uuid",
  name: "String (e.g., 'Tech Club')",
  description: "String (long description)",
  themeColor: "#HexColor (brand color)",
  logo: "URL",
  coverImage: "URL",
  
  // Organizational
  president: { name, email },
  organizationalChart: {
    "member-id": {
      name: "String",
      email: "String",
      role: "Président|Trésorier|Secrétaire|Membre",
      photoUrl: "URL"
    }
  },
  members: [
    { name, email, joinedAt }
  ],
  
  // Settings
  status: "active|inactive|requesting_approval",
  membershipRequirement: "open|restricted",
  joinFormQuestions: [
    { id, label, type, required }
  ],
  
  // Pages
  events: { eventId: {...} },
  posts: { postId: {...} },
  forms: { formId: {...} },
  
  createdAt: "Timestamp"
}
```

#### Club Features

**Club Directory**
- Browse all clubs with filters
- Search by name
- View club profiles (logo, description, members count)

**Club Profile Page**
- Cover image banner
- Club info & description
- Latest announcements & activities
- Upcoming events
- Officer organizational chart
- Member list
- Join/Subscribe button

**Club Management Dashboard** (for officers)
- Edit club info, logo, theme color
- Manage members & join requests
- Create/publish posts (announcements, activities, articles)
- Create & manage events
- Create custom forms for applications
- View form submissions
- Generate membership certificates
- Email members

**Posts & Announcements**
- Types: Announcement, Activity, Article
- Each post has image, title, content
- Posts support linked forms (e.g., event sign-ups)
- Members can react/comment

**Custom Forms**
- Officers create forms for:
  - Join requests
  - Event registrations
  - Interest surveys
- Dynamic field types: text, textarea, email, select, radio, checkbox
- Auto-save submissions
- Export submissions as PDF
- CSV export capability

**Join Requests**
- Students submit join request with custom questions
- Officers review & approve/reject
- Approved members get notification
- Rejection reasons can be provided

#### Database Paths

- `/clubs/{clubId}` - Club data
- `/clubPosts/{clubId}` - Posts
- `/clubs/{clubId}/events/{eventId}` - Events
- `/clubs/{clubId}/forms/{formId}` - Custom forms
- `/clubs/{clubId}/joinRequests` - Membership requests

---

### 3. Events & Ticketing

#### Event Structure

```javascript
{
  id: "event-uuid",
  clubId: "club-uuid",
  clubName: "String",
  clubLogo: "URL",
  clubThemeColor: "#HexColor",
  
  // Details
  title: "String",
  description: "String (detailed)",
  date: "YYYY-MM-DD",
  time: "HH:MM",
  location: "String",
  imageUrl: "URL",
  
  // Capacity & Pricing
  maxCapacity: "Number (0 = unlimited)",
  registrationCount: "Number",
  isPaid: "Boolean",
  price: "Number (MAD currency)",
  
  // Status
  status: "published|draft",
  createdAt: "Timestamp",
  
  // Registration form fields
  fields: [
    { id, label, type: "text|email|tel|select", required }
  ]
}
```

#### Ticket System

```javascript
// Ticket document structure
{
  id: "ticket-uuid",
  eventId: "event-uuid",
  eventName: "String",
  clubId: "club-uuid",
  clubName: "String",
  
  userId: "Firebase UID",
  userEmail: "String",
  firstName: "String",
  lastName: "String",
  
  status: "pending|valid|rejected|awaiting_payment",
  paid: "Boolean",
  price: "Number",
  
  // Registration data
  formData: { fieldId: "value", ... },
  
  eventDate: "String",
  eventTime: "String",
  eventLocation: "String",
  
  createdAt: "Timestamp",
  stripeSessionId: "String (if paid)",
  updatedAt: "Timestamp"
}
```

#### User Workflow

**Event Registration (Free)**
1. User views event details on club page
2. Clicks "Register"
3. Fills event-specific form (name, email, custom fields)
4. Submits → Ticket created with status "pending"
5. Confirmation email sent
6. Can download/view ticket with QR code

**Event Registration (Paid)**
1. User views event details
2. Clicks "Buy Ticket"
3. Fills form
4. Redirected to Stripe checkout → `/api/checkout?type=ticket&...`
5. Pays via card
6. Stripe webhook fires → `/api/webhook/stripe`
7. Ticket status → "valid"
8. Confirmation email with ticket/QR code
9. User can view ticket at `/tickets/{ticketId}`

**Admin Features**
- Create events with custom forms
- Set capacity & pricing
- Auto-send email reminders 24hrs before event
- Generate certificates for attendees
- Reject tickets (e.g., no-show policy)

#### Database Paths

- `/clubs/{clubId}/events/{eventId}` - Event data
- `/tickets/{ticketId}` - Ticket records
- `/eventAttendees/{eventId}/{userId}` - Attendance tracking

---

### 4. Chat System

#### Room-Based Chat

```javascript
// Discussion room
{
  roomId: "filiere-year (e.g., IDD-S1)",
  name: "String",
  filiere: "String",
  year: "S1|S2|S3|S4"
}

// Messages in room
{
  id: "message-uuid",
  userId: "Firebase UID",
  text: "String",
  timestamp: "Timestamp",
  mentions: ["uid1", "uid2"]  // @mention tags
}
```

#### Features

- **Filière-based Rooms**: Automatic rooms per field of study & year
- **Real-time Messaging**: Messages sync instantly
- **User Presence**: Online status displayed
- **@Mentions**: Tag users with notifications
- **Message Moderation**: Admins can delete problematic messages
- **View History**: Load earlier messages (pagination)
- **Browser Notifications**: Mention notifications when unfocused

#### Database Paths

- `/discussions/{roomId}/messages/{messageId}` - Messages
- `/discussions/{roomId}/presence/{userId}` - Online status
- `/onlineUsers/{filiere}-{year}/{userId}` - Aggregate presence

---

### 5. Direct Messaging

#### Conversation Structure

```javascript
{
  roomId: "dm_user1_user2", // Alphabetically sorted UIDs
  
  messages: {
    messageId: {
      senderId: "UID",
      recipientId: "UID",
      text: "String (encrypted)",
      timestamp: "Timestamp",
      read: "Boolean"
    }
  },
  
  presence: {
    userId: { online: Boolean, lastSeen: Timestamp }
  }
}

// Conversation metadata (in user profile)
{
  conversations: {
    other_user_id: {
      lastMessage: "String",
      lastMessageId: "UUID",
      lastMessageTimestamp: "Timestamp",
      unread: "Boolean",
      createdAt: "Timestamp"
    }
  }
}
```

#### Features

- **1-on-1 Messaging**: Private messages between users
- **Encryption**: Messages encrypted using shared key derivation (user UIDs)
- **Presence Tracking**: See when user is online/offline
- **Unread Indicators**: Track unread conversations
- **Message History**: Load message history on demand
- **AI Chat**: Special conversation with ESTT AI assistant
- **Notifications**: Browser notifications for new messages

#### Database Paths

- `/direct_messages/{roomId}/messages/{messageId}` - DM messages
- `/direct_messages/{roomId}/presence/{userId}` - DM presence
- `/users/{userId}/conversations/{otherUserId}` - Metadata

---

### 6. Notifications System

#### Types of Notifications

| Type | Triggered By | Delivery |
|------|-------------|----------|
| Global Announcement | Admin broadcasts | In-app, Email, Slack |
| Personal Notification | Various events | In-app, Browser push, Email |
| Chat Mention | @user in chat room | In-app, Browser push |
| DM Notification | New private message | In-app, Browser push |
| Event Reminder | Event admin | Email (24hrs before) |
| Club Post | New club announcement | In-app if subscribed |
| Resource Approved | Moderator action | Email, In-app |
| Ticket Confirmation | Registration/Payment | Email |

#### Notification Center

Centralized hub at `/notifications` showing:
- All personal notifications
- Global announcements
- Filterable by type/date
- Mark as read/archive
- Click → navigate to context

#### Database Paths

- `/notifications/{userId}/{notificationId}` - Personal notifications
- `/globalNotifications/{notificationId}` - Global announcements
- `/metadata/announcements` - Admin announcement broadcast

---

### 7. Student Advertising Portal

#### Ad Structure

```javascript
{
  id: "ad-uuid",
  title: "String (max 100 chars)",
  description: "String (max 500 chars)",
  category: "service|offer|project|other",
  type: "image|video",
  url: "URL (to image/video)",
  link: "URL (redirect link)",
  whatsapp: "Phone number",
  
  publisher: "Firebase UID",
  publisherEmail: "String",
  publisherName: "String",
  
  status: "draft|under_review|payment_required|live|expired|refused",
  createdAt: "Timestamp",
  
  // Pricing
  duration: "Number (days)",
  price: "Number (MAD)",
  paymentStatus: "pending|paid",
  
  // Lifecycle
  expirationDate: "Date",
  invoiceId: "String",
  stripeSessionId: "String"
}
```

#### Pricing Plans

| Plan | Duration | Price | Features |
|------|----------|-------|----------|
| 7 Days | 7 days | 50 MAD | Homepage display |
| 30 Days (Popular) | 30 days | 150 MAD | Homepage display |
| 60 Days | 60 days | 250 MAD | Homepage display |

#### Workflow

1. **Create Ad** → `/ads-portal/submit`
   - Fill form: title, description, category
   - Upload image/video (max 10MB)
   - Provide WhatsApp contact & redirect link
2. **Moderation** → Admin reviews (< 24hrs)
   - Checks content quality & appropriateness
   - Approves → status = "payment_required"
   - Rejects → status = "refused"
3. **Payment** → `/api/checkout?type=ad`
   - User pays via Stripe
   - Webhook confirms → status = "live"
   - Invoice generated & emailed
4. **Display** → Homepage ad slots (randomized)
   - Ad shows for duration specified
   - Auto-expires based on expirationDate
5. **Dashboard** → `/ads-portal/dashboard`
   - Users manage all their ads
   - View status, analytics, deactivate early

#### Database Paths

- `/studentAds/{adId}` - Ad documents
- `/studentAds?status=live&expirationDate>now` - Live ads query

---

### 8. Search System

#### Search Capabilities

User can search across:
- **Modules**: By name/ID within selected field
- **Resources**: By title using keyword index
- **Clubs**: By name
- **Users**: By name/email (in future)

#### Workflow

1. User navigates `/search`
2. (Optional) Selects Field of Study
3. Types search query
4. Results display in categories:
   - Modules matching query
   - Resources matching query
   - Opportunities/Ads (randomized)
5. Click result → navigates to detail

#### Search Index

- **Module Search**: Static data (fast)
- **Resource Search**: Firebase keywords index
  - Path: `/metadata/keywords/{fieldId}/{resourceId}`
  - Stores: `{ title, resourceId }`
  - Enables: Fast field-scoped search

#### Database Paths

- `/metadata/keywords/{fieldId}` - Searchable resources per field

---

### 9. Projects Hub (Advanced Feature)

#### Project Challenge Structure

```javascript
{
  id: "project-uuid",
  title: "String",
  summary: "String (2-3 sentences)",
  description: "String (detailed problem statement)",
  
  // Metadata
  tags: ["tag1", "tag2"],
  skills: ["Skill1", "Skill2"],
  difficulty: "beginner|intermediate|advanced",
  
  // Requirements
  requirements: ["req1", "req2"],
  evaluationCriteria: ["criteria1"],
  
  // Lifecycle
  createdBy: "Firebase UID",
  authorName: "String",
  createdAt: "Timestamp",
  deadline: "Timestamp (optional)",
  status: "open|closed",
  
  coverImage: "URL",
  featured: "Boolean",
  submissionCount: "Number",
  voteMode: "per_person" // Each user gets 1 vote
}
```

#### Project Submission Structure

```javascript
{
  id: "submission-uuid",
  projectId: "project-uuid",
  projectTitle: "String",
  
  authorId: "Firebase UID",
  authorName: "String",
  
  title: "String (implementation title)",
  description: "String",
  techStack: ["React", "Node.js", ...],
  
  githubUrl: "URL",
  demoUrl: "URL",
  coverImage: "URL",
  screenshots: ["url1", "url2", ...],
  notes: "String (additional notes)",
  
  createdAt: "Timestamp",
  status: "approved|rejected|pending",
  votesCount: "Number",
  commentsCount: "Number"
}
```

#### Features

- **Project Discovery**: Browse active challenges
- **Submission**: Users can submit implementations with demo links
- **Voting**: Community votes on best implementations
- **Rankings**: Top submissions featured (sorted by votes)
- **Portfolio**: Submissions appear on user profile
- **Comments**: Feedback on implementations

#### Database Paths

- `/projects/{projectId}` - Project briefs
- `/projectSubmissions/{submissionId}` - User implementations
- `/projectVotes/{projectId}/{userId}` - User votes
- `/projectShowcases/{showcaseId}` - Portfolio items

---

### 10. User Profiles

#### Profile Data

```javascript
{
  userId: "Firebase UID",
  email: "String",
  
  // Personal Info
  firstName: "String",
  lastName: "String",
  filiere: "String (field of study)",
  startYear: "String (year started)",
  headline: "String (e.g., 'Designer & Developer')",
  photoUrl: "URL",
  bannerUrl: "URL",
  
  // Metadata
  verifiedEmail: "Boolean",
  verifiedAt: "Timestamp",
  createdAt: "Timestamp",
  
  // Public Settings
  visibility: "public|private",
  
  // Stats (denormalized for performance)
  contributionsCount: "Number",
  stars: "Number (profile likes)",
  starredBy: { userId: true }
}
```

#### Profile Features

- **Public Profiles**: View other students' profiles
- **Activity Feed**: Show user's contributions & projects
- **Favorites Tab**: Resources user has saved
- **Contributions Tab**: Resources user has uploaded
- **Projects Tab**: User's project submissions & showcases
- **Achievements**: (Future) Badges/reputation
- **Edit Profile**: Update info, photo, banner (for own profile)

#### Database Paths

- `/users/{userId}` - Profile data
- `/users/{userId}/contributions/{resourceId}` - User's resources
- `/userFavorites/{userId}/{resourceId}` - Saved resources
- `/users/{userId}/projectSubmissions/{submissionId}` - User's projects

---

## Database Structure

### Firebase Realtime Database (RTDB) Architecture

ESTT Community uses **Firebase Realtime Database** as the primary data store. Key characteristics:

- **Real-time Sync**: Changes broadcast instantly to all clients
- **JSON Structure**: Denormalized, hierarchical data model
- **Security Rules**: Row-level access control
- **Offline Support**: Local caching & sync
- **Scalable**: Handles thousands of concurrent users

### Core Data Model

```
estt-community-default-rtdb/
├── users/
│   ├── {uid}/
│   │   ├── firstName, lastName, email, filiere, ...
│   │   ├── contributions/
│   │   │   └── {resourceId}: {...}
│   │   ├── projectBriefs/
│   │   │   └── {projectId}: {...}
│   │   ├── projectSubmissions/
│   │   │   └── {submissionId}: {...}
│   │   └── conversations/
│   │       └── {otherId}: {...}
│
├── resources/
│   └── {resourceId}/
│       ├── title, description, type, ...
│       ├── authorId, authorName, ...
│       ├── field, module, moduleId, ...
│       └── unverified: Boolean (moderation status)
│
├── module_resources/
│   └── {moduleId}/
│       └── {resourceId}: true
│
├── clubs/
│   └── {clubId}/
│       ├── name, description, themeColor, ...
│       ├── events/
│       │   └── {eventId}: {...}
│       ├── posts/
│       │   └── {postId}: {...}
│       ├── forms/
│       │   └── {formId}: {...}
│       ├── joinRequests/
│       │   └── {requestId}: {...}
│       └── formSubmissions/
│           └── {formId}/
│               └── {submissionId}: {...}
│
├── tickets/
│   └── {ticketId}/
│       ├── eventId, clubId, userId, ...
│       ├── status, paid, price, ...
│       └── formData: {...}
│
├── discussions/
│   └── {roomId}/
│       ├── messages/
│       │   └── {messageId}: {text, userId, timestamp}
│       └── presence/
│           └── {userId}: {online, lastSeen}
│
├── direct_messages/
│   └── {roomId}/
│       ├── messages/
│       │   └── {messageId}: {text, senderId, ...}
│       └── presence/
│           └── {userId}: {...}
│
├── notifications/
│   └── {userId}/
│       └── {notificationId}: {...}
│
├── globalNotifications/
│   └── {notificationId}: {...}
│
├── studentAds/
│   └── {adId}/
│       ├── title, description, ...
│       ├── status, price, duration, ...
│       └── publisher, publisherEmail, ...
│
├── projects/
│   └── {projectId}/
│       ├── title, description, ...
│       ├── createdBy, authorName, ...
│       └── difficulty, skills, tags, ...
│
├── projectSubmissions/
│   └── {submissionId}/
│       ├── projectId, authorId, ...
│       ├── title, description, techStack, ...
│       └── votesCount, commentsCount
│
├── projectVotes/
│   └── {projectId}/
│       └── {userId}: {submissionId, timestamp}
│
├── projectShowcases/
│   └── {showcaseId}: {...}
│
├── tickets/
│   └── {ticketId}: {...}
│
├── bugReports/
│   └── {reportId}: {...}
│
├── metadata/
│   ├── professors: [...]
│   ├── keywords/
│   │   └── {fieldId}/
│   │       └── {resourceId}: {title}
│   ├── announcements: {...}
│   └── [admin settings]
│
├── resourceViews/
│   └── {resourceId}/
│       ├── viewCount: Number
│       └── views/
│           └── {viewId}: {uid, ip, email, name, viewedAt}
│
├── emailVerifications/
│   └── {uid}: {code, expiresAt, email}
│
├── dataExports/
│   └── {token}: {uid, email, createdAt, expiresAt, used}
│
└── adminSettings/
    └── driveConfig: {refreshToken, lastConfigured}
```

### Data Organization Principles

1. **Denormalization**: Data duplicated for performance (e.g., club name in event)
2. **Hierarchical Organization**: Logical grouping by feature/ownership
3. **Metadata Indices**: Separate nodes for fast queries (keywords, module_resources)
4. **User Privacy**: Sensitive data (emails) in nested nodes with ACL rules
5. **Real-time Listeners**: Subscriptions on specific paths for auto-sync

### Key Indexes

Firebase Realtime Database supports these index types:

```json
{
  "users": {
    ".indexOn": ["email", "filiere"]
  },
  "tickets": {
    ".indexOn": ["userId", "eventId", "clubId"]
  },
  "projectSubmissions": {
    ".indexOn": ["projectId", "authorId", "status"]
  },
  "clubs": {
    ".indexOn": ["username"]
  }
}
```

---

## API Reference

### Authentication APIs

#### Email Verification

**Endpoint**: `POST /api/auth/verify-email`

**Request Body**:
```javascript
{
  action: "send|verify",
  uid: "Firebase UID",
  email: "user@example.com",
  firstName: "String (for email)",
  code: "String (6 digits, for verify action)"
}
```

**Response**:
```javascript
// Send action
{ success: true, message: "Code envoyé" }

// Verify action
{ success: true, message: "Email vérifié avec succès" }

// Error
{ error: "Code expiré" }
```

**Logic**:
- **Send**: Generate 6-digit code, save to `/emailVerifications/{uid}` with 10-min TTL, send email
- **Verify**: Check code validity, check expiry, update user profile, cleanup token

---

### File Upload APIs

#### Upload to Google Drive

**Endpoint**: `POST /api/upload-drive`

**Request**: `multipart/form-data`

```
file: File object
fieldName: String (e.g., "IDD")
semester: String (e.g., "S1")
moduleName: String (e.g., "Développement Web")
professorName: String (optional)
displayTitle: String (optional)
isBugReport: Boolean (optional)
```

**Response**:
```javascript
{
  success: true,
  id: "Google Drive file ID",
  name: "filename.pdf",
  publicUrl: "Google Drive webViewLink",
  downloadUrl: "Google Drive webContentLink"
}
```

**Folder Structure Created**:
```
ESTT Community/
├── IDD/
│   ├── S1/
│   │   └── Développement Web/
│   │       ├── Prof Name/
│   │       │   └── file.pdf
│   │       └── Autres/
│   └── S2/
├── ICD/
└── Bug Reports/
```

**Auth**: Uses refresh token from Firebase or `process.env.GOOGLE_DRIVE_REFRESH_TOKEN`

---

#### GET Authorization Link

**Endpoint**: `GET /api/drive/auth`

**Response**: Redirects to Google OAuth consent screen

**Callback**: `/api/drive/callback?code=...` → Saves refresh token to Firebase

---

### Checkout & Payments API

#### Create Stripe Checkout Session

**Endpoint**: `POST /api/checkout`

**Request Body**:
```javascript
// For Tickets
{
  type: "ticket",
  ticketId: "UUID",
  clubId: "UUID",
  eventId: "UUID",
  eventName: "String",
  price: "Number (MAD)",
  userEmail: "String"
}

// For Ads
{
  type: "ad",
  adId: "UUID",
  adTitle: "String",
  price: "Number (MAD)",
  userEmail: "String"
}
```

**Response**:
```javascript
{ url: "https://checkout.stripe.com/pay/cs_live_..." }
```

**Success URL**: Redirects user to `/tickets/{ticketId}?success=true` or `/ads-portal/dashboard?success=true`

---

#### Stripe Webhook Handler

**Endpoint**: `POST /api/webhook/stripe`

**Events Handled**:
- `checkout.session.completed` → Validates payment, updates ticket/ad status

**Response**: `{ received: true }`

**Logic for Tickets**:
1. Get checkout session from Stripe
2. If `payment_status === "paid"`:
   - Update ticket: `status = "valid"`, `paid = true`
   - Increment event registration count
   - Send confirmation email with QR code
   - Notify Slack #finance channel

**Logic for Ads**:
1. Get checkout session
2. If paid:
   - Update ad: `status = "live"`, `paymentStatus = "paid"`
   - Set expiration date (30 days from now)
   - Generate invoice number
   - Send invoice email to publisher
   - Notify Slack #finance

---

### Email APIs

#### Send Email

**Endpoint**: `POST /api/send-email`

**Request Body**:
```javascript
{
  to: "recipient@example.com",
  subject: "Email Subject",
  html: "HTML email content"
}
```

**Response**:
```javascript
{ success: true, messageId: "String (from Nodemailer)" }
```

**Provider**: Gmail SMTP (credentials in env)

**Email Templates** (in `/lib/email-templates/`):
- `welcomeEmail()` - Signup confirmation
- `verifyEmailTemplate()` - Verification code
- `ticketConfirmationEmail()` - Ticket purchase
- `ticketValidatedEmail()` - After payment confirmation
- `clubRequestApprovedEmail()` - Club approval notification
- `resourceApprovedEmail()` - Resource publish notification
- `eventReminderEmail()` - 24-hour before event
- `adInvoiceEmail()` - Ad payment invoice
- `dataExportEmail()` - Data export link

---

### Data Export API (GDPR)

#### Request Data Export

**Endpoint**: `POST /api/export-data`

**Request Body**:
```javascript
{
  uid: "Firebase UID",
  firstName: "String",
  email: "user@example.com",
  username: "email prefix"
}
```

**Response**:
```javascript
{ success: true }
```

**Process**:
1. Generate 32-byte cryptographic token
2. Store in `/dataExports/{token}` with 24-hour TTL
3. Generate profile screenshot
4. Upload to ImgBB for email embedding
5. Send email with download link
6. User clicks link → `/download-export/{token}`

---

#### Verify Export Token

**Endpoint**: `POST /api/export-data/verify`

**Request Body**:
```javascript
{ token: "hex-string" }
```

**Response**:
```javascript
{
  valid: true,
  uid: "Firebase UID",
  firstName: "String",
  email: "String",
  username: "String"
}
```

**Security**:
- One-time use (marked as used immediately)
- Expires after 24 hours
- Returns user data only on valid token

---

### AI Assistant API

#### Chat with ESTT AI

**Endpoint**: `POST /api/estt-ai`

**Request (JSON)** - Chat:
```javascript
{
  message: "User question",
  history: [
    { role: "user|assistant", content: "..." }
  ],
  userProfile: {
    firstName: "String",
    lastName: "String",
    filiere: "String"
  },
  purpose: "chat"
}
```

**Request (FormData)** - PDF Analysis:
```
purpose: "pdf-analysis"
file: File object (PDF)
context: String (system prompt)
```

**Response**:
```javascript
{
  reply: "AI response text",
  action: {
    action: "read|search|suggest",
    target: "resources|clubs|events",
    query: "String",
    data: {...}
  },
  model: "gemma4:31b-cloud" // or "ollama"
}
```

**AI Provider**: Groq LLM (fallback: Ollama Cloud)

**Capabilities**:
- General chat
- Resource search & recommendations
- Club information lookup
- Event details & registration help
- Academic guidance
- PDF summarization & analysis

**System Prompt** (`/lib/estt-ai.js`):
- Context about ESTT Community
- User's field of study & academic level
- Helpful suggestions for navigation

---

### Bug Report API

#### Submit Bug Report

**Endpoint**: `POST /api/report-bug`

**Request Body**:
```javascript
{
  title: "String (bug title)",
  description: "String (detailed description)",
  stepsToReproduce: "String",
  severity: "low|medium|high|critical",
  appVersion: "String",
  os: "String",
  browser: "String",
  deviceType: "String",
  
  userId: "Firebase UID (if logged in)",
  email: "String"
}
```

**With Attachments**:
```
// Multipart form data
title: String
description: String
... (other fields)
attachments[]: File[] (images, screenshots)
```

**Response**:
```javascript
{
  success: true,
  referenceId: "BUG-XXXXXX"
}
```

**Process**:
1. Auto-detect: OS, Browser, Device, App Version
2. Generate reference ID (BUG-XXXXXX)
3. Upload attachments to Google Drive (isBugReport folder)
4. Store in `/bugReports/{reportId}`
5. Send Slack notification to #bugs channel
6. Email confirmation to reporter

---

### Additional Utility APIs

#### Get User IP

**Endpoint**: `GET /api/utils/ip`

**Response**:
```javascript
{ ip: "192.168.1.1" }
```

**Used For**:
- View tracking (differentiate anonymous users)
- Bug report metadata
- Analytics

---

## Frontend Architecture

### Component Structure

```
components/
├── ui/                    # Radix UI + shadcn/ui components
│   ├── button.jsx
│   ├── card.jsx
│   ├── dialog.jsx
│   ├── input.jsx
│   ├── select.jsx
│   ├── badge.jsx
│   ├── tabs.jsx
│   ├── dropdown-menu.jsx
│   └── [other UI components]
│
├── layout/               # Layout components
│   ├── Header.jsx
│   ├── Navigation.jsx
│   ├── Sidebar.jsx
│   └── Footer.jsx
│
├── features/            # Feature-specific components
│   ├── resources/
│   │   ├── ResourceCard.jsx
│   │   ├── ResourceBrowser.jsx
│   │   └── ResourceDetail.jsx
│   ├── clubs/
│   │   ├── ClubCard.jsx
│   │   ├── ClubPage.jsx
│   │   └── ClubAdmin.jsx
│   ├── events/
│   │   ├── EventCard.jsx
│   │   └── EventRegistration.jsx
│   ├── admin/
│   │   ├── Dashboard.jsx
│   │   ├── ModeratorDashboard.jsx
│   │   └── [admin components]
│   └── [other features]
│
├── profile/             # Profile components
│   ├── ProfileHeader.jsx
│   ├── ProfileCard.jsx
│   └── ProfileSettings.jsx
│
└── providers/           # Context/provider wrappers
    ├── AuthProvider.jsx
    ├── DialogProvider.jsx
    └── ThemeProvider.jsx
```

### Context APIs (State Management)

#### AuthContext (`context/AuthContext.js`)

Manages global authentication state:

```javascript
const { user, profile, loading } = useAuth();

// Properties
user: {
  uid: String,
  email: String,
  displayName: String,
  photoUrl: String
}

profile: {
  firstName: String,
  lastName: String,
  filiere: String,
  ...
}

loading: Boolean
```

**Methods**:
- `signIn(email, password)` - Firebase email auth
- `signUp(email, password)` - Create account
- `signOut()` - Logout
- `signInWithGoogle()` - OAuth
- `sendVerification(user)` - Send verification email

---

#### DialogContext (`context/DialogContext.js`)

Global dialog/modal management:

```javascript
const { showDialog, showWarning, showSuccess, showError, showConfirm } = useDialog();

showDialog(title, message, options)
showWarning(message) 
showSuccess(message)
showError(message)
showConfirm(question, options) → Boolean
```

---

#### NotificationContext (`context/NotificationContext.js`)

Notification state & subscriptions:

```javascript
const { notifications, unreadCount } = useNotification();
```

---

### Hooks

#### useAuth()

Access authentication context globally.

#### useDialog()

Trigger toast-like dialogs throughout app.

#### useLocalStorage()

Persist state to browser localStorage.

#### Custom Hooks Examples

```javascript
// Fetch resources from module
useResources(moduleId)

// Fetch club data
useClub(clubId)

// Fetch user profile
useProfile(userId)

// Listen to real-time chat
useRoomChat(roomId)

// Listen to direct messages
useDirectMessages(otherId)

// Track notifications
useNotifications(userId)
```

---

### Styling & Theming

#### Tailwind CSS

- **Color System**: HSL custom properties for dark mode support
- **Dark Mode**: Class-based (`dark:` prefix)
- **Components**: Built with Tailwind + Radix UI
- **Configuration**: `/tailwind.config.js`

#### Component Library

**Radix UI** + **shadcn/ui**:
- Accessible, unstyled base components
- Tailwind-styled wrapper components
- Copy-paste components (not npm package)

Example:
```jsx
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function Example() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Title</CardTitle>
      </CardHeader>
      <CardContent>
        <Input placeholder="..." />
        <Button>Submit</Button>
      </CardContent>
    </Card>
  );
}
```

---

### Page Structure

#### Marketing Pages (`app/(marketing)`)

- Public, no auth required
- SEO optimized with metadata
- Examples: Browse, Contribute, Search, Download

#### Core Pages (`app/(core)`)

- Protected by auth guard
- Main app features
- Examples: Resources, Clubs, Events, Chat, Messages

#### Admin Pages (`app/(admin)`)

- Auth required + admin role check
- Admin-only dashboards
- Examples: Admin Dashboard, Moderator Console

---

### Responsive Design

**Breakpoints** (Tailwind defaults):
- `sm`: 640px
- `md`: 768px  
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

**Mobile-First Approach**:
- Design for mobile first
- Use `md:`, `lg:` prefixes for larger screens
- Example: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

---

### Performance Optimizations

1. **Image Optimization**: Next.js Image component with srcSet
2. **Code Splitting**: Route-based bundle splitting
3. **Dynamic Imports**: `dynamic()` for non-critical components
4. **Caching**: Firebase local cache + browser cache
5. **Lazy Loading**: Infinite scroll for lists
6. **Debouncing**: Search input, form validation

---

## Admin & Moderation Features

### Admin Dashboard

Full platform control at `/admin`:

**Sections**:
1. **User Management**
   - View all users
   - Search/filter by field, status
   - Deactivate/promote users
   - View user activity

2. **Resource Moderation**
   - Pending resources queue
   - Bulk approve/reject
   - Edit metadata
   - Ban inappropriate content

3. **Club Management**
   - Club requests queue
   - Approve/deny club creation
   - Edit club info
   - Manage club disputes

4. **Announcements**
   - Create global announcements
   - Broadcast via email/Slack
   - Schedule future announcements
   - View delivery status

5. **Event Management**
   - View all events
   - Cancel events
   - Manage ticket issues
   - Send reminders

6. **Ad Management**
   - Review submitted ads
   - Approve/reject ads
   - Monitor ad performance
   - Manage ad disputes

7. **Analytics**
   - Platform metrics (users, resources, events)
   - Activity graphs
   - Popular resources
   - User engagement trends

8. **Settings**
   - Platform configuration
   - Email templates
   - Feature flags
   - API keys/secrets management

---

### Moderator Console

Content moderation at `/moderator`:

**Responsibilities**:
- Review pending resources
- Moderate chat messages
- Handle user reports
- Approve club requests
- Reject inappropriate content

**Workflow**:
1. View queue of pending items
2. Review content & metadata
3. Approve with feedback or Reject with reason
4. Auto-send notification to creator

---

### Moderation Tools

**Resource Moderation**:
- Check file validity
- Verify metadata quality
- Scan for plagiarism
- Review description

**Chat Moderation**:
- Flag inappropriate messages
- Delete/hide messages
- Mute users
- Log incidents

**Report Handling**:
- Review reported content
- Investigate user reports
- Take action (delete, mute, ban)
- Notify reporting user

---

### Logging & Auditing

**Moderator Actions**:
- All mod actions logged to `/moderator-logs`
- Timestamp, moderator UID, action, target, reason
- Immutable audit trail

**System Events**:
- User signup/login (basic logging)
- Payment transactions
- Resource uploads
- Club approvals

---

## Integrations

### Firebase Integration

#### Initialization

```javascript
// lib/firebase.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  databaseURL: "...",
  projectId: "...",
  // ...
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
```

#### Common Operations

```javascript
import { db, ref, get, set, onValue, query, where } from '@/lib/firebase';

// Read once
const snapshot = await get(ref(db, 'path/to/data'));
if (snapshot.exists()) {
  const data = snapshot.val();
}

// Real-time listener
const unsubscribe = onValue(ref(db, 'path'), (snapshot) => {
  const data = snapshot.val();
});

// Write
await set(ref(db, 'path/to/data'), { key: 'value' });

// Query
const q = query(ref(db, 'resources'), where('unverified', '==', true));
const snapshot = await get(q);
```

---

### Google Drive Integration

#### Setup

1. Create OAuth 2.0 credentials in Google Cloud Console
2. Set authorized redirect URI: `http://localhost:3000/api/drive/callback`
3. Store CLIENT_ID, CLIENT_SECRET in env

#### Auth Flow

```javascript
// User clicks "Authorize Drive"
// → GET /api/drive/auth
// → Redirects to Google OAuth consent
// → User approves
// → GET /api/drive/callback?code=...
// → Exchange code for refresh token
// → Save to Firebase: /adminSettings/driveConfig/refreshToken
```

#### File Upload

```javascript
// Client calls uploadResourceFileToDrive(file, metadata)
// → POST /api/upload-drive (server-side)
// → Uses refresh token to authenticate
// → Creates folder structure (Field/Semester/Module/...)
// → Uploads file to Google Drive
// → Sets public permissions
// → Returns publicUrl
```

#### Folder Structure

```
ESTT Community (root folder)
└── IDD (Field)
    ├── S1 (Semester)
    │   ├── Développement Web (Module)
    │   │   ├── Prof. Ahmed (or "Autres")
    │   │   │   └── file.pdf
    │   │   └── Autres
    │   └── [other modules]
    └── S2
└── ICD
└── ...
```

---

### Stripe Integration

#### Setup

1. Create Stripe account
2. Generate API keys (public & secret)
3. Store in environment: `STRIPE_PUBLIC_KEY`, `STRIPE_SECRET_KEY`
4. Configure webhook endpoint in Stripe dashboard

#### Checkout Flow

```javascript
// 1. Client initiates payment
const response = await fetch('/api/checkout', {
  method: 'POST',
  body: JSON.stringify({
    type: 'ticket',
    ticketId, eventId, price, ...
  })
});

// 2. Server creates Stripe session
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [{ price_data, quantity: 1 }],
  mode: 'payment',
  success_url: '...',
  cancel_url: '...',
  metadata: { ticketId, ... }
});

// 3. Redirect user to checkout
window.location.href = session.url;

// 4. User enters card info
// → Stripe processes payment
// → Fires webhook: POST /api/webhook/stripe
// → Redirects to success_url
```

#### Webhook Handling

```javascript
// POST /api/webhook/stripe
export async function POST(req) {
  const sig = req.headers.get('stripe-signature');
  
  const event = stripe.webhooks.constructEvent(
    payload,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  );
  
  if (event.type === 'checkout.session.completed') {
    // Update ticket/ad status
    // Send confirmation emails
    // Notify Slack
  }
}
```

---

### Email Integration (Nodemailer)

#### Setup

```javascript
// lib/email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'estt.community@gmail.com',
    pass: 'app-specific-password' // Generated in Google Account settings
  }
});
```

#### Send Email

```javascript
await transporter.sendMail({
  from: '"ESTT Community" <estt.community@gmail.com>',
  to: 'user@example.com',
  subject: 'Email Subject',
  html: '<h1>HTML content</h1>'
});
```

#### Email Templates

All templates in `/lib/email-templates/`:
- HTML email structure
- Responsive design (mobile-friendly)
- Brand colors & logo
- Footer with links

---

### Slack Integration

#### Setup

1. Create Slack App in workspace
2. Enable Webhooks for Channels
3. Generate webhook URLs for each channel
4. Store URLs in environment or `/adminSettings`

#### Channel Webhooks

```javascript
const SLACK_CHANNELS = {
  MODERATION: process.env.SLACK_WEBHOOK_MODERATION,
  FINANCE: process.env.SLACK_WEBHOOK_FINANCE,
  COMMUNITY: process.env.SLACK_WEBHOOK_COMMUNITY,
  BUGS: process.env.SLACK_WEBHOOK_BUGS
};
```

#### Send Notification

```javascript
import { notifySlack, SLACK_CHANNELS } from '@/lib/slack';

await notifySlack(SLACK_CHANNELS.FINANCE, {
  title: '💰 New Payment',
  message: 'Ticket purchased for Event X',
  user: { name, email },
  resource: { title, type }
});
```

#### Notification Events

- **#moderation**: Resource pending, club requests, reports
- **#finance**: Ticket sales, ad payments, refunds
- **#community**: Major user activity milestones
- **#bugs**: Bug reports, errors, system alerts

---

### AI Integration (Groq & Ollama)

#### LLM Provider

Primary: **Groq Cloud** (fast LLM inference)  
Fallback: **Ollama Cloud** (open-source model)

#### Setup

```javascript
// Groq
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Ollama
const OLLAMA_URL = 'https://ollama.com/api/generate';
const OLLAMA_KEY = process.env.OLLAMA_KEY;
const OLLAMA_MODEL = 'gemma4:31b-cloud';
```

#### AI Features

1. **General Chat**: Answer questions about platform
2. **Resource Search**: Find relevant resources by query
3. **Club Recommendations**: Suggest clubs based on interests
4. **Academic Guidance**: Help with study planning
5. **PDF Analysis**: Summarize uploaded documents

#### System Prompt

```
You are ESTT-AI, an intelligent assistant for EST Tétouan.
You help students navigate our platform:
- Find academic resources organized by field, semester, module
- Discover clubs and events
- Get academic guidance specific to their program

Current user context:
- Name: {firstName} {lastName}
- Field: {filiere}
- Year/Level: {level}

Always be helpful, accurate, and guide users to relevant features.
Suggest actions like "Browse resources for XYZ" or "Check out Club ABC".
```

---

## Configuration & Deployment

### Environment Variables

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_DATABASE_URL=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...

# Google Drive
GOOGLE_DRIVE_REFRESH_TOKEN=...
GOOGLE_DRIVE_FOLDER_ID=...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...

# Email
GMAIL_USER=...
GMAIL_PASSWORD=...

# Slack
SLACK_WEBHOOK_MODERATION=...
SLACK_WEBHOOK_FINANCE=...
SLACK_WEBHOOK_COMMUNITY=...
SLACK_WEBHOOK_BUGS=...

# AI/LLM
GROQ_API_KEY=...
OLLAMA_KEY=...

# Site
NEXT_PUBLIC_SITE_URL=https://estt.ma
NODE_ENV=production
```

---

### Build & Deployment

#### Build Process

```bash
# Install dependencies
npm install

# Build Next.js app (optimizes, generates static pages)
npm run build

# Start production server
npm start
```

#### Deployment (Vercel)

1. **Connect Repository**: Link GitHub repo to Vercel
2. **Set Environment Variables**: Configure all .env variables
3. **Deploy**: Auto-deploy on git push to main
4. **Domains**: Configure custom domain (estt.ma)
5. **HTTPS**: Auto-enabled via Vercel's SSL

#### Deployment Checklist

- [ ] Environment variables set in Vercel
- [ ] Firebase config matches production DB
- [ ] Stripe keys are production keys (not sandbox)
- [ ] Google Drive folder created with correct structure
- [ ] Email credentials configured
- [ ] Slack webhooks created for all channels
- [ ] Domain DNS records updated
- [ ] SSL certificate valid
- [ ] Backup strategy in place
- [ ] Monitoring alerts configured

---

### Performance Monitoring

#### Firebase Console

- Real-time DB usage & bandwidth
- Authentication metrics
- Storage usage

#### Vercel Analytics

- Page performance metrics
- Error tracking
- Deployment history

#### Custom Monitoring

- Slack alerts for errors
- Email notifications for critical issues
- Manual review of logs

---

### Scaling Considerations

**Current Bottlenecks**:
1. Firebase RTDB pricing at scale
2. Real-time chat bandwidth
3. Google Drive API quotas (1M queries/day)
4. Stripe API rate limits

**Optimization Strategies**:
1. Migrate to Firestore (better indexing, pricing)
2. Implement Redis cache layer
3. Batch Google Drive operations
4. Queue long-running tasks (Bull, RabbitMQ)
5. CDN for static assets
6. Database sharding/partitioning

---

## Key Files Reference

### Frontend Entry Points

| Path | Purpose |
|------|---------|
| `app/layout.js` | Root layout wrapper |
| `app/page.js` | Homepage |
| `app/(marketing)/**` | Public pages |
| `app/(core)/**` | Main app features |
| `app/(admin)/**` | Admin console |
| `app/api/**` | Backend API routes |

### Configuration Files

| File | Purpose |
|------|---------|
| `next.config.js` | Next.js configuration |
| `tailwind.config.js` | Tailwind styling |
| `tsconfig.json` | TypeScript settings |
| `postcss.config.js` | CSS processing |
| `components.json` | shadcn/ui config |

### Core Libraries

| Path | Purpose |
|------|---------|
| `lib/firebase.js` | Firebase initialization |
| `lib/stripe.js` | Stripe helpers |
| `lib/utils.js` | Utility functions |
| `lib/data.js` | Static data (fields, modules) |
| `context/AuthContext.js` | Auth state |

### Email Templates

| Path | Purpose |
|------|---------|
| `lib/email-templates/index.js` | Template exports |
| `lib/email-templates/layout.js` | Email HTML wrapper |
| `lib/email-templates/*.js` | Individual templates |

### Components

| Path | Purpose |
|------|---------|
| `components/ui/` | UI component library |
| `components/layout/` | Layout components |
| `components/features/` | Feature components |
| `components/profile/` | Profile components |
| `components/providers/` | Context providers |

---

## Common Patterns & Best Practices

### Authentication Pattern

```javascript
import { useAuth } from '@/context/AuthContext';

export default function ProtectedComponent() {
  const { user, profile, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!user) return <Redirect to="/login" />;
  
  return (
    <div>
      Welcome, {profile.firstName}!
    </div>
  );
}
```

### Real-time Data Pattern

```javascript
import { useEffect, useState } from 'react';
import { db, ref, onValue } from '@/lib/firebase';

export function useRealTimeData(path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const unsubscribe = onValue(ref(db, path), (snapshot) => {
      setData(snapshot.exists() ? snapshot.val() : null);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [path]);
  
  return { data, loading };
}
```

### Form Submission Pattern

```javascript
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError(null);
  
  try {
    // Validate form
    if (!formData.title) throw new Error('Title required');
    
    // Submit data
    await fetch('/api/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    // Success
    router.push('/success-page');
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

### Modal/Dialog Pattern

```javascript
const { showDialog, showConfirm } = useDialog();

const handleDelete = async (id) => {
  const confirmed = await showConfirm(
    'Are you sure?',
    { type: 'danger', title: 'Delete Item' }
  );
  
  if (confirmed) {
    await delete(id);
    showSuccess('Deleted successfully');
  }
};
```

---

## Error Codes & Troubleshooting

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Firebase not initialized" | Firebase config invalid/missing | Check env variables |
| "User not authenticated" | No valid session | Redirect to login |
| "Permission denied" | Firebase security rules | Check RTDB rules |
| "Drive quota exceeded" | Too many API calls | Implement caching |
| "Stripe key invalid" | Wrong API key | Verify env variables |
| "Email sending failed" | Gmail config issue | Check SMTP credentials |

### Debugging Tips

1. **Firebase**: Check Firebase Console Realtime DB
2. **Vercel**: View deployment logs in Vercel dashboard
3. **Client**: Browser console for React errors
4. **Email**: Check Gmail account "Security" for app permissions
5. **API**: Test endpoints with Postman or curl

---

## Future Enhancements

### Planned Features

- [ ] Direct resource contact/questions
- [ ] Advanced analytics dashboards
- [ ] ML-powered recommendations
- [ ] Mobile app (React Native)
- [ ] Video conferencing (for remote events)
- [ ] Advanced search with filters
- [ ] Reputation/karma system
- [ ] Badges & achievements
- [ ] Gamification elements

### Technical Debt

- [ ] Migrate Firebase RTDB → Firestore
- [ ] Implement Redis caching layer
- [ ] Better error handling & monitoring
- [ ] E2E tests (Cypress/Playwright)
- [ ] Performance optimizations
- [ ] Code documentation

---

## Contact & Support

**Platform Admin**: ESTT Community Team  
**Email**: estt.community@gmail.com  
**Repository**: GitHub (internal)  
**Documentation**: This Wiki  
**Status Page**: https://estt.ma/status

---

## Glossary

| Term | Definition |
|------|-----------|
| **RTDB** | Firebase Realtime Database |
| **UID** | Firebase User ID (unique identifier) |
| **Filière** | Field of study (IDD, ICD, etc.) |
| **Semester** | Academic term (S1-S4) |
| **Module** | Course/subject (e.g., Développement Web) |
| **Metadata** | Additional information (professor, docType, etc.) |
| **Denormalization** | Storing data in multiple places for performance |
| **JWT** | JSON Web Token (Firebase uses these) |
| **API Route** | Next.js backend endpoint |
| **SSR** | Server-Side Rendering |
| **ISR** | Incremental Static Regeneration |
| **Stripe Session** | Checkout session for payment |
| **Webhook** | Event notification from third-party (Stripe, GitHub) |
| **OAuth** | Delegated authorization (Google login) |
| **SMTP** | Email protocol (Gmail SMTP) |

---

**Document Version**: 1.0  
**Last Updated**: June 17, 2026  
**Maintained By**: ESTT Community Development Team

This wiki serves as the single source of truth for ESTT Community platform. For updates, corrections, or additions, please submit a PR or contact the development team.
