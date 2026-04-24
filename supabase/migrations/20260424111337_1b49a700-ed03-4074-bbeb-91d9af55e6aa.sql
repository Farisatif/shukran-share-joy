-- Add status column for moderation
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- Auto-approve existing comments so nothing disappears
UPDATE public.comments SET status = 'approved' WHERE status = 'pending';

-- Index for fast filtering
CREATE INDEX IF NOT EXISTS comments_status_created_idx
  ON public.comments (status, created_at DESC);

-- Replace public read policy: only approved comments visible publicly
DROP POLICY IF EXISTS comments_read_all ON public.comments;
CREATE POLICY comments_read_approved
  ON public.comments
  FOR SELECT
  USING (status = 'approved');

-- Allow admins to update (approve/reject) comments
DROP POLICY IF EXISTS comments_update_admin ON public.comments;
CREATE POLICY comments_update_admin
  ON public.comments
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));