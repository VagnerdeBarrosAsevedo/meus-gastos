-- ══════════════════════════════════════════════════════════════════════════════
-- FinanAI — Supabase Database Schema & RLS Policies
-- ══════════════════════════════════════════════════════════════════════════════

-- Enable Row Level Security (RLS) on all tables

-- ── 1. ACCOUNTS ──
CREATE TABLE IF NOT EXISTS public.accounts (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  type TEXT,
  bank TEXT,
  balance NUMERIC,
  color TEXT,
  icon TEXT,
  "cdiRate" NUMERIC,
  "createdAt" TEXT,
  "updatedAt" TEXT,
  PRIMARY KEY (id)
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own accounts" 
  ON public.accounts 
  FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);


-- ── 2. CARDS ──
CREATE TABLE IF NOT EXISTS public.cards (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  bank TEXT,
  "limit" NUMERIC,
  used NUMERIC,
  closing NUMERIC,
  "dueDate" NUMERIC,
  "lastDigits" TEXT,
  color TEXT,
  "createdAt" TEXT,
  "updatedAt" TEXT,
  PRIMARY KEY (id)
);

ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own cards" 
  ON public.cards 
  FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);


-- ── 3. TRANSACTIONS ──
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT,
  description TEXT,
  category TEXT,
  "parentCategory" TEXT,
  "categoryIcon" TEXT,
  "categoryColor" TEXT,
  amount NUMERIC,
  date TEXT,
  account TEXT,
  recurrent BOOLEAN DEFAULT false,
  "createdAt" TEXT,
  "updatedAt" TEXT,
  PRIMARY KEY (id)
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own transactions" 
  ON public.transactions 
  FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);


-- ── 4. INVESTMENTS ──
CREATE TABLE IF NOT EXISTS public.investments (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT,
  name TEXT,
  type TEXT,
  category TEXT,
  quantity NUMERIC,
  "avgPrice" NUMERIC,
  "currentPrice" NUMERIC,
  icon TEXT,
  "createdAt" TEXT,
  "updatedAt" TEXT,
  PRIMARY KEY (id)
);

ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own investments" 
  ON public.investments 
  FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);


-- ── 5. GOALS ──
CREATE TABLE IF NOT EXISTS public.goals (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  emoji TEXT,
  target NUMERIC,
  current NUMERIC,
  deadline TEXT,
  "monthlyContribution" NUMERIC,
  "createdAt" TEXT,
  "updatedAt" TEXT,
  PRIMARY KEY (id)
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own goals" 
  ON public.goals 
  FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);


-- ── 6. BUDGETS ──
CREATE TABLE IF NOT EXISTS public.budgets (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT,
  "limit" NUMERIC,
  icon TEXT,
  color TEXT,
  "createdAt" TEXT,
  "updatedAt" TEXT,
  PRIMARY KEY (id)
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own budgets" 
  ON public.budgets 
  FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);


-- ── 7. ACHIEVEMENTS ──
CREATE TABLE IF NOT EXISTS public.achievements (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  description TEXT,
  icon TEXT,
  unlocked BOOLEAN DEFAULT false,
  date TEXT,
  "createdAt" TEXT,
  "updatedAt" TEXT,
  PRIMARY KEY (id)
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own achievements" 
  ON public.achievements 
  FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);


-- ── 8. SETTINGS ──
CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value JSONB,
  "createdAt" TEXT,
  "updatedAt" TEXT,
  PRIMARY KEY (key, user_id)
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own settings" 
  ON public.settings 
  FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);
