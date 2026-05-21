import { supabase } from '../supabase';
import type { Issue } from '../types';

export const issueService = {
  // 获取某批次下的所有问题（含记录人姓名）
  async listByBatch(batchId: string): Promise<Issue[]> {
    const { data, error } = await supabase
      .from('issues')
      .select('*, issue_photos(*), issue_progress(*)')
      .eq('batch_id', batchId)
      .order('serial_number', { ascending: true });

    if (error) throw error;

    return (data || []).map((item: Record<string, unknown>) => ({
      ...item,
      photos: (item.issue_photos as Record<string, unknown>[]) || [],
      progress: (item.issue_progress as Record<string, unknown>[]) || [],
    })) as unknown as Issue[];
  },

  // 获取下一个序号
  async getNextSerialNumber(batchId: string): Promise<number> {
    const { data, error } = await supabase
      .from('issues')
      .select('serial_number')
      .eq('batch_id', batchId)
      .order('serial_number', { ascending: false })
      .limit(1);

    if (error) throw error;
    return data && data.length > 0 ? data[0].serial_number + 1 : 1;
  },

  // 创建问题
  async create(issue: {
    batch_id: string;
    serial_number: number;
    brief_description: string;
    detailed_description?: string;
    completion_status?: string;
    related_materials?: string;
  }): Promise<Issue> {
    const { data, error } = await supabase
      .from('issues')
      .insert(issue)
      .select()
      .single();

    if (error) throw error;
    return data as Issue;
  },

  // 获取单个问题详情
  async getById(id: string): Promise<Issue> {
    const { data, error } = await supabase
      .from('issues')
      .select('*, issue_photos(*), issue_progress(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return {
      ...data,
      photos: (data.issue_photos as Record<string, unknown>[]) || [],
      progress: (data.issue_progress as Record<string, unknown>[]) || [],
    } as unknown as Issue;
  },

  // 更新问题
  async update(id: string, updates: Partial<Issue>): Promise<void> {
    const { error } = await supabase
      .from('issues')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  // 删除问题
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('issues').delete().eq('id', id);
    if (error) throw error;
  },
};
