import { supabase } from '../supabase';
import type { IssueProgress } from '../types';

export const progressService = {
  async listByIssue(issueId: string): Promise<IssueProgress[]> {
    const { data, error } = await supabase
      .from('issue_progress')
      .select('*')
      .eq('issue_id', issueId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async create(progress: {
    issue_id: string;
    stage_name: string;
    description?: string;
    status?: string;
    sort_order?: number;
  }): Promise<IssueProgress> {
    // 自动获取下一个 sort_order
    if (progress.sort_order === undefined) {
      const { data: existing } = await supabase
        .from('issue_progress')
        .select('sort_order')
        .eq('issue_id', progress.issue_id)
        .order('sort_order', { ascending: false })
        .limit(1);

      progress.sort_order = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;
    }

    const { data, error } = await supabase
      .from('issue_progress')
      .insert(progress)
      .select()
      .single();

    if (error) throw error;
    return data as IssueProgress;
  },

  async update(id: string, updates: Partial<IssueProgress>): Promise<void> {
    const { error } = await supabase
      .from('issue_progress')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('issue_progress').delete().eq('id', id);
    if (error) throw error;
  },
};
