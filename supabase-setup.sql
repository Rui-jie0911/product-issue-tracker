-- =============================================
-- 产品问题追踪系统 — Supabase 数据库建表脚本
-- 在 Supabase SQL Editor 中执行此文件
-- =============================================

-- 启用 UUID 扩展（如未启用）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. 车型表
-- =============================================
CREATE TABLE vehicle_models (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        text NOT NULL,
  created_by  uuid REFERENCES auth.users NOT NULL DEFAULT auth.uid(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vehicle_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有认证用户可读取车型"
  ON vehicle_models FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "所有认证用户可创建车型"
  ON vehicle_models FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "所有认证用户可更新车型"
  ON vehicle_models FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "所有认证用户可删除车型"
  ON vehicle_models FOR DELETE
  TO authenticated
  USING (true);

-- =============================================
-- 2. 批次表
-- =============================================
CREATE TABLE batches (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id        uuid REFERENCES vehicle_models ON DELETE CASCADE NOT NULL,
  batch_number    text NOT NULL,
  unit_count      integer NOT NULL CHECK (unit_count > 0),
  created_by      uuid REFERENCES auth.users NOT NULL DEFAULT auth.uid(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有认证用户可读取批次"
  ON batches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "所有认证用户可创建批次"
  ON batches FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "所有认证用户可更新批次"
  ON batches FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "所有认证用户可删除批次"
  ON batches FOR DELETE
  TO authenticated
  USING (true);

-- =============================================
-- 3. 问题表
-- =============================================
CREATE TABLE issues (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id            uuid REFERENCES batches ON DELETE CASCADE NOT NULL,
  serial_number       integer NOT NULL,
  brief_description   text NOT NULL,
  category            text,
  completion_status   text NOT NULL DEFAULT '待处理',
  responsible_person  text,
  recorder_id         uuid REFERENCES auth.users NOT NULL DEFAULT auth.uid(),
  recorded_at         timestamptz NOT NULL DEFAULT now(),
  detailed_description text,
  related_materials   text,
  issue_nature        text,
  vin                 text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- 如果 issues 表已存在，用以下语句追加新列（不会覆盖已有数据）
-- ALTER TABLE issues ADD COLUMN IF NOT EXISTS category text;
-- ALTER TABLE issues ADD COLUMN IF NOT EXISTS responsible_person text;
-- ALTER TABLE issues ADD COLUMN IF NOT EXISTS issue_nature text;
-- ALTER TABLE issues ADD COLUMN IF NOT EXISTS vin text;

ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有认证用户可读取问题"
  ON issues FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "所有认证用户可创建问题"
  ON issues FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "所有认证用户可更新问题"
  ON issues FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "所有认证用户可删除问题"
  ON issues FOR DELETE
  TO authenticated
  USING (true);

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER issues_updated_at
  BEFORE UPDATE ON issues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 4. 改进进度表
-- =============================================
CREATE TABLE issue_progress (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id    uuid REFERENCES issues ON DELETE CASCADE NOT NULL,
  stage_name  text NOT NULL,
  description text,
  status      text NOT NULL DEFAULT '进行中',
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE issue_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有认证用户可读取进度"
  ON issue_progress FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "所有认证用户可创建进度"
  ON issue_progress FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "所有认证用户可更新进度"
  ON issue_progress FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "所有认证用户可删除进度"
  ON issue_progress FOR DELETE
  TO authenticated
  USING (true);

CREATE TRIGGER issue_progress_updated_at
  BEFORE UPDATE ON issue_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 5. 问题照片表
-- =============================================
CREATE TABLE issue_photos (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id    uuid REFERENCES issues ON DELETE CASCADE NOT NULL,
  photo_url   text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE issue_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "所有认证用户可读取照片"
  ON issue_photos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "所有认证用户可创建照片"
  ON issue_photos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "所有认证用户可删除照片"
  ON issue_photos FOR DELETE
  TO authenticated
  USING (true);

-- =============================================
-- 6. 存储桶 RLS 策略（先在 Supabase Dashboard → Storage 中手动创建桶）
--    桶名称: issue-photos，勾选"Public bucket"
--    创建完桶后，执行以下策略
-- =============================================

-- 允许认证用户上传文件到 issue-photos 桶
CREATE POLICY "认证用户可上传照片"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'issue-photos');

-- 允许认证用户读取 issue-photos 桶中的文件
CREATE POLICY "任何人可查看照片"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'issue-photos');

-- 允许认证用户删除自己上传的文件
CREATE POLICY "认证用户可删除自己上传的照片"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'issue-photos');

