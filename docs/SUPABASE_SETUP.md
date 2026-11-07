# Supabase Setup Guide for Markdown Live Preview

This guide explains how to connect your Supabase project to Markdown Live Preview for authentication and cloud document persistence.

---

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create or open your project.
2. In your Project Settings -> **API**, locate your:
   - **Project URL**
   - **Project API Anon Key**
3. Create a local `.env.local` file in your repository:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

---

## 2. Create the Database Table & Security Policies

In your Supabase Dashboard, open the **SQL Editor**, paste the following script, and click **Run**:

```sql
-- Create the documents table
create table public.documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default 'Untitled',
  content text not null default '',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Index user_id and updated_at for fast note queries
create index idx_documents_user_updated on public.documents(user_id, updated_at desc);

-- Enable Row Level Security (RLS)
alter table public.documents enable row level security;

-- RLS Policies: Ensure users can ONLY access and modify their own records
create policy "Users can select own documents"
  on public.documents for select
  using (auth.uid() = user_id);

create policy "Users can insert own documents"
  on public.documents for insert
  with check (auth.uid() = user_id);

create policy "Users can update own documents"
  on public.documents for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own documents"
  on public.documents for delete
  using (auth.uid() = user_id);
```

---

## 3. Configure Authentication Providers

In the Supabase Dashboard, go to **Authentication -> Providers**:
- **Email (Magic Link / OTP)**: Enabled by default.
- **Google / GitHub**: Enable either provider by adding your OAuth Client ID and Secret if you want one-click social login.
- **URL Configuration**:
  - Add `http://localhost:5173` to your **Redirect URLs** for local development.
  - Add your production URL (e.g. `https://markdownlivepreview.com`) for production.

---

## 4. Test the Integration

Run your app:
```bash
npm run dev
```

Click **"Sign In"** in the top navigation bar to authenticate. Once logged in, your notes will automatically sync to your private PostgreSQL table!
