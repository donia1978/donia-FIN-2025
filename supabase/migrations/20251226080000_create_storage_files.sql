-- Create storage_files table for Donia Cloud
CREATE TABLE IF NOT EXISTS storage_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  path text NOT NULL UNIQUE,
  size bigint NOT NULL DEFAULT 0,
  mime_type text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  folder text,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_storage_files_user_id ON storage_files(user_id);
CREATE INDEX IF NOT EXISTS idx_storage_files_category ON storage_files(category);
CREATE INDEX IF NOT EXISTS idx_storage_files_folder ON storage_files(folder);
CREATE INDEX IF NOT EXISTS idx_storage_files_created_at ON storage_files(created_at DESC);

-- Enable Row Level Security
ALTER TABLE storage_files ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own files
CREATE POLICY "Users can view their own files"
  ON storage_files
  FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

-- Users can insert their own files
CREATE POLICY "Users can insert their own files"
  ON storage_files
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own files
CREATE POLICY "Users can update their own files"
  ON storage_files
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own files
CREATE POLICY "Users can delete their own files"
  ON storage_files
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_storage_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER storage_files_updated_at
  BEFORE UPDATE ON storage_files
  FOR EACH ROW
  EXECUTE FUNCTION update_storage_files_updated_at();

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-files', 'user-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket policies
-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload their own files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'user-files' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to update their own files
CREATE POLICY "Users can update their own files storage"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'user-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own files storage"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'user-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow users to read their own files or public files
CREATE POLICY "Users can read their own files or public files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'user-files'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM storage_files
        WHERE storage_files.path = storage.objects.name
        AND storage_files.is_public = true
      )
    )
  );
