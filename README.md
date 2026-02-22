# Real-Time Collaborative Notes App

A full-stack web application that allows multiple users to create, edit, and collaborate on notes in real time with JWT authentication, role-based access control, activity tracking, search, and public read-only sharing.

## Live Demo

- **Frontend**: https://collaborative-note-app-ten.vercel.app/
- **Backend**: https://collaborative-note-app-production.up.railway.app/

---

## Tech Stack

- **Frontend**: React, Redux Toolkit, Socket.io-client, React Icons
- **Backend**: Node.js, Express.js, Socket.io, JWT
- **Database**: PostgreSQL via Supabase
- **Deployment**: Vercel (frontend), Railway (backend)

---

## Features

- JWT Authentication with access and refresh tokens
- Role-based access control (Admin, Editor, Viewer)
- Real-time collaboration via WebSockets (Socket.io)
- Activity logging for all user actions
- Full-text search across notes
- Public read-only share links
- Collaborator management with permissions

---

## Architecture

```
collab-notes/
├── frontend/          # React app (deployed on Vercel)
│   ├── src/
│   │   ├── app/           # Redux store
│   │   ├── features/      # Redux slices (auth, notes, search)
│   │   ├── services/      # Axios API instance, Socket.io
│   │   ├── components/    # Reusable components (Auth, Common)
│   │   └── pages/         # Page components
└── backend/           # Express app (deployed on Railway)
    └── src/
        ├── config/        # Database connection
        ├── controllers/   # Route handlers
        ├── middleware/     # Auth, error handling
        ├── routes/        # API routes
        └── socket/        # Socket.io event handlers
```

### How it works

1. User logs in → Backend issues JWT access token (15min) + refresh token (7 days)
2. Frontend stores access token in localStorage
3. On note open → Frontend joins a Socket.io room for that note
4. On edit → Changes broadcast to all users in the room via WebSocket
5. Auto-save triggers every 1.5 seconds of inactivity via REST API
6. All actions logged to activity_logs table in database

---

## Local Setup

### Prerequisites
- Node.js v18+
- A Supabase account (free)

### 1. Clone the repository

```bash
git clone 
cd collab-notes
```

### 2. Setup Supabase Database

1. Go to supabase.com and create a new project
2. Go to SQL Editor and run this schema:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'editor' CHECK (role IN ('admin', 'editor', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL DEFAULT 'Untitled',
  content TEXT DEFAULT '',
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_token VARCHAR(255) UNIQUE,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE note_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission VARCHAR(20) DEFAULT 'viewer' CHECK (permission IN ('editor', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(note_id, user_id)
);

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  note_id UUID REFERENCES notes(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(512) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Setup Backend

```bash
cd backend
npm install
```

Create a `.env` file in the backend folder:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL=your_supabase_connection_string
JWT_ACCESS_SECRET=your_random_secret_min_32_chars
JWT_REFRESH_SECRET=your_different_random_secret
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
FRONTEND_URL=http://localhost:3000
```

Run the backend:

```bash
npm run dev
```

Backend will start on http://localhost:5000

### 4. Setup Frontend

```bash
cd frontend
npm install
```

Create a `.env` file in the frontend folder:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

Run the frontend:

```bash
npm start
```

Frontend will start on http://localhost:3000

---

## Environment Variables

### Backend

| Variable | Description | Example |
|---|---|---|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` or `production` |
| `DATABASE_URL` | Supabase PostgreSQL connection string | `postgresql://...` |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens | Any long random string |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens | Any different long random string |
| `JWT_ACCESS_EXPIRES` | Access token expiry duration | `15m` |
| `JWT_REFRESH_EXPIRES` | Refresh token expiry duration | `7d` |
| `FRONTEND_URL` | Frontend URL for CORS | `https://your-app.vercel.app` |

### Frontend

| Variable | Description | Example |
|---|---|---|
| `REACT_APP_API_URL` | Backend API base URL | `https://your-backend.railway.app/api` |
| `REACT_APP_SOCKET_URL` | Backend socket URL | `https://your-backend.railway.app` |

---

## API Documentation

### Authentication

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login with email and password | No |
| POST | `/api/auth/refresh` | Refresh access token using cookie | No |
| POST | `/api/auth/logout` | Logout and clear refresh token | No |
| GET | `/api/auth/me` | Get current logged in user | Yes |

#### Register Request Body
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "editor"
}
```

#### Login Request Body
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Auth Response
```json
{
  "user": {
    "id": "uuid",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "editor"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiJ9..."
}
```

---

### Notes

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/api/notes` | Get all accessible notes | Yes |
| POST | `/api/notes` | Create a new note | Yes |
| GET | `/api/notes/:id` | Get a note by ID | Yes |
| PUT | `/api/notes/:id` | Update a note | Yes (editor+) |
| DELETE | `/api/notes/:id` | Delete a note | Yes (owner/admin) |
| POST | `/api/notes/:id/collaborators` | Add a collaborator | Yes (owner) |
| DELETE | `/api/notes/:id/collaborators/:userId` | Remove a collaborator | Yes (owner) |
| POST | `/api/notes/:id/share` | Generate public share link | Yes (owner) |
| GET | `/api/notes/public/:token` | View public note | No |

#### Create Note Request Body
```json
{
  "title": "My Note",
  "content": "Note content here"
}
```

#### Add Collaborator Request Body
```json
{
  "email": "collaborator@example.com",
  "permission": "editor"
}
```

---

### Activity Log

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/api/activity` | Get activity logs for current user | Yes |
| GET | `/api/activity?noteId=uuid` | Get activity logs for a specific note | Yes |
| GET | `/api/activity?limit=50` | Limit number of results (max 100) | Yes |

---

### Search

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/api/search?q=keyword` | Search notes by title and content | Yes |

---

## Database Schema

### users
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| email | VARCHAR(255) | Unique email address |
| password_hash | VARCHAR(255) | Bcrypt hashed password |
| name | VARCHAR(255) | Display name |
| role | VARCHAR(20) | admin, editor, or viewer |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### notes
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| title | VARCHAR(500) | Note title |
| content | TEXT | Note content |
| owner_id | UUID | Foreign key to users |
| share_token | VARCHAR(255) | Unique token for public sharing |
| is_public | BOOLEAN | Whether note is publicly shared |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### note_collaborators
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| note_id | UUID | Foreign key to notes |
| user_id | UUID | Foreign key to users |
| permission | VARCHAR(20) | editor or viewer |
| created_at | TIMESTAMP | Creation timestamp |

### activity_logs
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| note_id | UUID | Foreign key to notes |
| action | VARCHAR(50) | create, update, delete, share |
| metadata | JSONB | Additional action data |
| created_at | TIMESTAMP | Timestamp of action |

### refresh_tokens
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| token | VARCHAR(512) | Refresh token string |
| expires_at | TIMESTAMP | Token expiry time |
| created_at | TIMESTAMP | Creation timestamp |

---

## WebSocket Events

| Event | Direction | Description |
|---|---|---|
| `join-note` | Client → Server | Join a note's collaboration room |
| `leave-note` | Client → Server | Leave a note's collaboration room |
| `note-update` | Client → Server | Send note title/content changes |
| `cursor-move` | Client → Server | Send cursor position |
| `note-updated` | Server → Client | Receive changes from other users |
| `active-users` | Server → Client | List of users currently in the note |
| `joined` | Server → Client | Confirmation of joining a room |
| `error` | Server → Client | Error message |

---

## Role-Based Access Control

| Action | Admin | Owner | Editor | Viewer |
|---|---|---|---|---|
| View note | Yes | Yes | Yes | Yes |
| Edit note | Yes | Yes | Yes | No |
| Delete note | Yes | Yes | No | No |
| Manage collaborators | Yes | Yes | No | No |
| Generate share link | Yes | Yes | No | No |

---

## Deployment

### Backend (Railway)
1. Connect GitHub repo to Railway
2. Set root directory to `backend`
3. Add all environment variables
4. Railway auto-deploys on push to main

### Frontend (Vercel)
1. Connect GitHub repo to Vercel
2. Set root directory to `frontend`
3. Add REACT_APP environment variables
4. Vercel auto-deploys on push to main
