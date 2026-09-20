DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Bnoy users read own chapter media') THEN
    CREATE POLICY "Bnoy users read own chapter media" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'chapter-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Bnoy users upload own chapter media') THEN
    CREATE POLICY "Bnoy users upload own chapter media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chapter-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Bnoy users update own chapter media') THEN
    CREATE POLICY "Bnoy users update own chapter media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'chapter-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'chapter-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Bnoy users delete own chapter media') THEN
    CREATE POLICY "Bnoy users delete own chapter media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'chapter-pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);
  END IF;
END $$;