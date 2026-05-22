// ===== 车型 =====
export interface VehicleModel {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

// ===== 批次 =====
export interface Batch {
  id: string;
  model_id: string;
  batch_number: string;
  unit_count: number;
  created_by: string;
  created_at: string;
  // 联查时带出的车型名称
  model_name?: string;
}

// ===== 问题 =====
export interface Issue {
  id: string;
  batch_id: string;
  serial_number: number;
  brief_description: string;
  category: string | null;
  completion_status: '待处理' | '处理中' | '已解决' | '已关闭';
  responsible_person: string | null;
  recorder_id: string;
  recorded_at: string;
  detailed_description: string | null;
  related_materials: string | null;
  created_at: string;
  updated_at: string;
  // 联查字段
  recorder_name?: string;
  batch_number?: string;
  model_name?: string;
  photos?: IssuePhoto[];
  progress?: IssueProgress[];
}

// ===== 改进进度 =====
export interface IssueProgress {
  id: string;
  issue_id: string;
  stage_name: string;
  description: string | null;
  status: '进行中' | '已完成';
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ===== 照片 =====
export interface IssuePhoto {
  id: string;
  issue_id: string;
  photo_url: string;
  created_at: string;
}

// ===== 用户（简化，来自 Supabase Auth） =====
export interface AppUser {
  id: string;
  email: string;
}

// ===== 导出字段选项 =====
export interface ExportFieldOption {
  key: string;
  label: string;
  checked: boolean;
  isImage?: boolean;
}

// ===== 问题分类常量 =====
export const ISSUE_CATEGORIES = [
  '设计问题',
  '工艺问题',
  '来料质量问题',
  '装配问题',
  '采购进度问题',
] as const;

// ===== 完成状态常量 =====
export const COMPLETION_STATUSES = ['待处理', '处理中', '已解决', '已关闭'] as const;

// ===== 进度阶段状态 =====
export const PROGRESS_STATUSES = ['进行中', '已完成'] as const;
