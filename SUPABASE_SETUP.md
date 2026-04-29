# Supabase Setup Guide

To enable the **Share Trip** feature, you need to create a table in your Supabase database.

## 1. Create the `shared_trips` table

Run the following SQL in your Supabase SQL Editor:

```sql
CREATE TABLE shared_trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  stops JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE shared_trips ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read shared trips (for the link to work)
CREATE POLICY "Allow public read access" ON shared_trips
  FOR SELECT USING (true);

-- Allow anyone to insert shared trips (for the share button to work)
-- Note: In production, you might want to restrict this
CREATE POLICY "Allow public insert access" ON shared_trips
  FOR INSERT WITH CHECK (true);
```

## 2. Environment Variables

Ensure your `.env.local` file has the following variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

You can find these in your Supabase Project Settings -> API.
