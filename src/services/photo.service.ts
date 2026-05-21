import { supabase } from '../supabase';
import type { IssuePhoto } from '../types';

const BUCKET_NAME = 'issue-photos';

export const photoService = {
  // 上传照片到 Supabase Storage
  async upload(file: File): Promise<string> {
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return publicUrl;
  },

  // 添加照片记录
  async create(issueId: string, photoUrl: string): Promise<IssuePhoto> {
    const { data, error } = await supabase
      .from('issue_photos')
      .insert({ issue_id: issueId, photo_url: photoUrl })
      .select()
      .single();

    if (error) throw error;
    return data as IssuePhoto;
  },

  // 删除照片
  async remove(id: string, photoUrl: string): Promise<void> {
    // 从 storage 删除
    const pathMatch = photoUrl.match(/issue-photos\/([^?]+)/);
    if (pathMatch) {
      await supabase.storage.from(BUCKET_NAME).remove([pathMatch[1]]);
    }

    const { error } = await supabase.from('issue_photos').delete().eq('id', id);
    if (error) throw error;
  },
};
