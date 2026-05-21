import { supabase } from '../supabase';
import type { VehicleModel } from '../types';

export const modelService = {
  async list(): Promise<VehicleModel[]> {
    const { data, error } = await supabase
      .from('vehicle_models')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(name: string): Promise<VehicleModel> {
    const { data, error } = await supabase
      .from('vehicle_models')
      .insert({ name })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, name: string): Promise<void> {
    const { error } = await supabase
      .from('vehicle_models')
      .update({ name })
      .eq('id', id);

    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('vehicle_models').delete().eq('id', id);
    if (error) throw error;
  },
};
