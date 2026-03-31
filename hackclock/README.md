# hackclock frontend

This folder contains the Next.js app for hackTime. It powers the organizer dashboard, flow builder, login screens, participant clock, and stage display.

For the full product overview and combined setup instructions, see the root [README](/data/programing/GitHub/HackClock/hacktime/README.md).

## Live Deployment

- Experimental: `https://hackclock.vercel.app/`
- Production: `https://hacktime.vercel.app/`

## Run Locally

Install dependencies:

```bash
npm install
```

Create `hackclock/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXTAUTH_SECRET=replace_with_a_long_random_secret
GITHUB_ID=
GITHUB_SECRET=
```

Start the app:

```bash
npm run dev
```

## Main Routes

- `/login` for organizer sign-in, sign-up, and guest room join
- `/dashboard` for live event control
- `/flow` for creating or editing a hackathon flow
- `/stage` for organizer stage standby and redirect behavior
- `/room/<ROOM_ID>/clock` for the participant clock
- `/room/<ROOM_ID>/stage` for the public stage display
