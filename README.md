# The Wall

A simple, real-time community wall built with Next.js and Supabase.

## Supabase setup

Set these values in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-project-anon-key
```

In the Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql) to create the posts table, enable row-level security, and add the table to the Realtime publication. The wall permits anonymous reading and posting.

## Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
