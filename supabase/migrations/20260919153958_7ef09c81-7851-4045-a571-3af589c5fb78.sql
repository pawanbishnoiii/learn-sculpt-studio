CREATE TABLE public.chapter_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  chapter_name text,
  topic text,
  title text NOT NULL,
  storage_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text NOT NULL DEFAULT 'application/pdf',
  position integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chapter_notes TO authenticated;
GRANT ALL ON public.chapter_notes TO service_role;

ALTER TABLE public.chapter_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own chapter notes"
ON public.chapter_notes FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX chapter_notes_user_subject_idx ON public.chapter_notes (user_id, subject_id, chapter_name, position);

CREATE TRIGGER chapter_notes_set_updated_at
BEFORE UPDATE ON public.chapter_notes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();