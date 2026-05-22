import { supabase } from '../supabase';
import type { IssuePhoto } from '../types';

const BUCKET_NAME = 'issue-photos';

export const photoService = {
  // 上传照片到 Supabase Storage（只上传，不关联 issue）
  async upload(file: File): Promise<string> {
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      // 给出具体错误提示
      if (error.message.includes('Bucket') || error.message.includes('not found')) {
        throw new Error('存储桶未创建，请在 Supabase → Storage 中创建名为 issue-photos 的公开桶');
      }
      if (error.message.includes('policy') || error.message.includes('permission') || error.message.includes('Unauthorized')) {
        throw new Error('存储权限不足，请确保 issue-photos 桶设为公开，并执行了 supabase-setup.sql');
      }
      throw new Error(error.message);
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return publicUrl;
  },

  // 上传多张照片，返回 URL 数组
  async uploadMultiple(files: File[]): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      urls.push(await this.upload(file));
    }
    return urls;
  },

  // 为已有 issue 批量创建照片记录
  async createBatch(issueId: string, photoUrls: string[]): Promise<IssuePhoto[]> {
    const records = photoUrls.map((url) => ({
      issue_id: issueId,
      photo_url: url,
    }));

    const { data, error } = await supabase
      .from('issue_photos')
      .insert(records)
      .select();

    if (error) {
      if (error.message.includes('policy') || error.message.includes('permission')) {
        throw new Error('数据库权限不足，请在 Supabase SQL Editor 中执行 supabase-setup.sql 建表脚本');
      }
      throw error;
    }
    return data as IssuePhoto[];
  },

  // 添加单张照片记录（编辑模式用）
  async create(issueId: string, photoUrl: string): Promise<IssuePhoto> {
    const results = await this.createBatch(issueId, [photoUrl]);
    return results[0];
  },

  // 删除照片
  async remove(id: string, photoUrl: string): Promise<void> {
    const pathMatch = photoUrl.match(/issue-photos\/([^?]+)/);
    if (pathMatch) {
      try {
        await supabase.storage.from(BUCKET_NAME).remove([pathMatch[1]]);
      } catch {
        // 删除存储文件失败不阻塞
      }
    }

    const { error } = await supabase.from('issue_photos').delete().eq('id', id);
    if (error) throw error;
  },
};
