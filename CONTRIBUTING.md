# Contributing to hackTime

Thanks for contributing to hackTime. This project includes a Next.js frontend for organizers, participants, and stage screens, plus an Express and MongoDB backend for auth and room state.

This guide is here to help contributors get productive quickly and keep changes consistent with the current app.

## Repository Layout

- `hackclock/` contains the Next.js frontend
- `backend/` contains the Express API and MongoDB models
- `README.md` contains the main product overview and local setup instructions

## Before You Start

Make sure you have:

- Node.js installed
- npm installed
- a MongoDB instance available locally or remotely

## Local Setup

### 1. Install dependencies

```bash
cd hackclock
npm install
```

```bash
cd backend
npm install
```

### 2. Configure environment variables

Create `backend/.env`:

```env
MONGODB_URI=your_mongodb_connection_string
PORT=5000
```

Create `hackclock/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXTAUTH_SECRET=replace_with_a_long_random_secret
GITHUB_ID=
GITHUB_SECRET=
```

### 3. Run the backend

```bash
cd backend
npm run dev
```

### 4. Run the frontend

```bash
cd hackclock
npm run dev
```

Frontend: `http://localhost:3000`  
Backend: `http://localhost:5000`

## Recommended Contribution Flow

1. Create a branch for your work.
2. Make focused changes with a clear goal.
3. Verify the affected flows locally.
4. Run linting for frontend changes.
5. Open a pull request with a short explanation of what changed and how you tested it.

## Coding Expectations

### General

- Keep changes scoped to the task you are solving.
- Avoid unrelated refactors in the same pull request.
- Preserve existing user flows unless the change intentionally updates them.
- Favor readable code over clever code.

### Frontend

- The frontend uses Next.js App Router and TypeScript.
- Styling is done with Tailwind CSS and existing project utility classes.
- Keep the current product tone and visual direction consistent with `hackclock/BRAND-GUIDELINES.md`.
- Reuse existing UI components when possible before introducing new ones.

### Backend

- The backend uses Express and Mongoose.
- Keep API behavior predictable and avoid breaking existing response shapes unless the frontend is updated with it.
- Validate request data when adding new routes or actions.

## Verification

Before submitting a PR, check the parts you changed.

### For frontend changes

Run:

```bash
cd hackclock
npm run lint
```

Then manually verify relevant pages such as:

- `/login`
- `/dashboard`
- `/flow`
- `/stage`
- `/room/<ROOM_ID>/clock`
- `/room/<ROOM_ID>/stage`

### For backend changes

Manually verify impacted API flows, for example:

- registration and login
- creating or updating hackathon flows
- joining a room
- room state actions like pause, resume, next phase, stop, and announce

## Pull Request Guidelines

Please include:

- a concise summary of the change
- why the change was needed
- screenshots for UI updates when helpful
- notes about setup changes or new environment variables
- a short testing summary

## Good First Contribution Ideas

- improve empty states or error handling
- tighten form validation
- improve accessibility on existing screens
- clean up inconsistent copy in the UI
- add missing documentation
- fix layout issues across mobile and desktop

## Reporting Bugs

When reporting a bug, include:

- what you expected to happen
- what actually happened
- steps to reproduce it
- screenshots or recordings if the issue is visual
- any relevant browser, OS, or environment details

## Questions

If something in the codebase is unclear, start by checking:

- [README.md]
- [hackclock/README.md]
- [hackclock/BRAND-GUIDELINES.md]

Small, well-explained pull requests are the easiest to review and merge.
