import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button, Spin, message, Typography, Divider } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined } from '@ant-design/icons';
import { issueService } from '../services/issue.service';
import { batchService } from '../services/batch.service';
import { modelService } from '../services/model.service';
import { exportToExcel } from '../services/export.service';
import FieldSelector from '../components/FieldSelector';
import type { Issue, ExportFieldOption, VehicleModel, Batch } from '../types';

const { Title, Text } = Typography;

const DEFAULT_FIELDS: ExportFieldOption[] = [
  { key: 'serial_number', label: '序号', checked: true },
  { key: 'category', label: '问题分类', checked: true },
  { key: 'brief_description', label: '问题简述', checked: true },
  { key: 'detailed_description', label: '详细描述', checked: true },
  { key: 'completion_status', label: '完成情况', checked: true },
  { key: 'responsible_person', label: '责任人', checked: true },
  { key: 'recorder_name', label: '记录人', checked: true },
  { key: 'recorded_at', label: '记录时间', checked: true },
  { key: 'related_materials', label: '涉及物料', checked: false },
  { key: 'progress', label: '改进进度', checked: true },
  { key: 'photos', label: '问题图片', checked: true, isImage: true },
];

export default function ExportPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const batchId = searchParams.get('batch_id');

  const [model, setModel] = useState<VehicleModel | null>(null);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [fields, setFields] = useState<ExportFieldOption[]>([...DEFAULT_FIELDS]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!batchId) {
      message.error('缺少批次参数');
      navigate('/');
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const issuesData = await issueService.listByBatch(batchId);

        // 查找该批次所属的车型
        const models = await modelService.list();
        let foundModel: VehicleModel | null = null;
        let foundBatch: Batch | null = null;

        for (const m of models) {
          const batches = await batchService.listByModel(m.id);
          const b = batches.find((b) => b.id === batchId);
          if (b) {
            foundModel = m;
            foundBatch = b;
            break;
          }
        }

        // 尝试获取记录人邮箱（从 auth.users 不可直接查询，先用 ID 显示）
        for (const issue of issuesData) {
          if (issue.recorder_id) {
            issue.recorder_name = issue.recorder_id;
          }
        }

        setModel(foundModel);
        setBatch(foundBatch);
        setIssues(issuesData);
      } catch (err) {
        message.error('加载数据失败');
      }
      setLoading(false);
    })();
  }, [batchId]);

  const handleExport = async () => {
    if (!model || !batch) return;
    if (!fields.some((f) => f.checked)) {
      message.warning('请至少选择一个导出字段');
      return;
    }

    setExporting(true);
    try {
      await exportToExcel(model.name, batch.batch_number, issues, fields);
      message.success('导出成功');
    } catch (err) {
      message.error('导出失败: ' + (err as Error).message);
    }
    setExporting(false);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', paddingTop: '40vh' }}><Spin size="large" /></div>;
  }

  return (
    <div style={{ background: '#fff', minHeight: '100vh', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} type="text" />
        <Title level={4} style={{ margin: 0 }}>导出问题报告</Title>
      </div>

      {/* 导出标题预览 */}
      <div style={{
        background: '#f0f5ff', padding: 16, borderRadius: 8, marginBottom: 16,
        textAlign: 'center',
      }}>
        <Text type="secondary">导出文件标题</Text>
        <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>
          {model?.name || '—'} - {batch?.batch_number || '—'} - 问题追踪报告
        </div>
        <Text type="secondary" style={{ fontSize: 12 }}>
          共 {issues.length} 条问题记录 | 台套数：{batch?.unit_count || '—'}
        </Text>
      </div>

      {/* 字段选择 */}
      <FieldSelector fields={fields} onChange={setFields} />

      <Divider />

      {/* 预览：已选列 */}
      <div style={{ marginBottom: 16 }}>
        <Text strong>将导出以下字段：</Text>
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {fields.filter((f) => f.checked).map((f) => (
            <span key={f.key} style={{
              padding: '2px 10px', background: '#e6f7ff', borderRadius: 12,
              fontSize: 12, color: '#1890ff', border: '1px solid #91d5ff',
            }}>
              {f.label}
            </span>
          ))}
        </div>
      </div>

      {/* 导出按钮 */}
      <Button type="primary" icon={<DownloadOutlined />} loading={exporting}
        onClick={handleExport} block size="large">
        生成并下载 Excel 文件
      </Button>

      <div style={{ marginTop: 12, color: '#999', fontSize: 12, textAlign: 'center' }}>
        导出为 .xlsx 格式，可用 WPS Office 或 Microsoft Excel 打开
      </div>
    </div>
  );
}
