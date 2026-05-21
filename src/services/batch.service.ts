import { supabase } from '../supabase';
import type { Batch } from '../types';

export const batchService = {
  async listByModel(modelId: string): Promise<Batch[]> {
    const { data, error } = await supabase
      .from('batches')
      .select('*')
      .eq('model_id', modelId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(modelId: string, batchNumber: string, unitCount: number): Promise<Batch> {
    const { data, error } = await supabase
      .from('batches')
      .insert({ model_id: modelId, batch_number: batchNumber, unit_count: unitCount })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, batchNumber: string, unitCount: number): Promise<void> {
    const { error } = await supabase
      .from('batches')
      .update({ batch_number: batchNumber, unit_count: unitCount })
      .eq('id', id);

    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('batches').delete().eq('id', id);
    if (error) throw error;
  },
};
