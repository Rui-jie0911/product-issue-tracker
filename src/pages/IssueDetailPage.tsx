import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Spin, message, Typography, Card, Select, Descriptions, Popconfirm, Tag,
} from 'antd';
import { ArrowLeftOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { issueService } from '../services/issue.service';
import { COMPLETION_STATUSES, type Issue, type IssuePhoto, type IssueProgress } from '../types';
import PhotoGallery from '../components/PhotoGallery';
import PhotoUpload from '../components/PhotoUpload';
import ProgressTimeline from '../components/ProgressTimeline';

const { Title, Text } = Typography;

export default function IssueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<IssuePhoto[]>([]);
  const [progress, setProgress] = useState<IssueProgress[]>([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadIssue = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await issueService.getById(id);
      setIssue(data);
      setPhotos(data.photos || []);
      setProgress(data.progress || []);
    } catch { message.error('加载问题详情失败'); }
    setLoading(false);
  };

  useEffect(() => { loadIssue(); }, [id]);

  const handleStatusChange = async (status: string) => {
    if (!id) return;
    setUpdatingStatus(true);
    try {
      await issueService.update(id, { completion_status: status as Issue['completion_status'] });
      setIssue((prev) => prev ? { ...prev, completion_status: status as Issue['completion_status'] } : null);
      message.success('状态已更新');
    } catch { message.error('更新失败'); }
    setUpdatingStatus(false);
  };

  const handleDelete = async () => {
    if (!id) return;
    await issueService.remove(id);
    message.success('问题已删除');
    navigate('/');
  };

  const statusColor: Record<string, string> = {
    '待处理': '#faad14',
    '处理中': '#1890ff',
    '已解决': '#52c41a',
    '已关闭': '#999',
  };

  if (loading) {
    return <div style={{ textAlign: 'center', paddingTop: '40vh' }}><Spin size="large" /></div>;
  }

  if (!issue) {
    return <div style={{ textAlign: 'center', paddingTop: '40vh' }}>问题不存在</div>;
  }

  return (
    <div style={{ background: '#fff', minHeight: '100vh', padding: 16 }}>
      {/* 头部 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} type="text" />
          <Title level={4} style={{ margin: 0 }}>问题 #{issue.serial_number}</Title>
        </div>
        <div>
          <Button icon={<EditOutlined />} size="small"
            onClick={() => navigate(`/issues/${id}/edit?edit_id=${id}`)}>
            编辑
          </Button>
          <Popconfirm title="确定删除此问题？" onConfirm={handleDelete}>
            <Button danger icon={<DeleteOutlined />} size="small" style={{ marginLeft: 8 }}>删除</Button>
          </Popconfirm>
        </div>
      </div>

      {/* 基本信息 */}
      <Card size="small" title="基本信息" style={{ marginBottom: 12 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="问题简述">
            <Text strong>{issue.brief_description}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="详细描述">
            <Text>{issue.detailed_description || '—'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="涉及物料">
            <Text>{issue.related_materials || '—'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="问题分类">
            <span style={{
              display: 'inline-block', padding: '1px 8px', borderRadius: 10, fontSize: 12,
              background: '#e6f7ff', color: '#1890ff', border: '1px solid #91d5ff',
            }}>
              {issue.category || '—'}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="责任人">
            <Text strong>{issue.responsible_person || '—'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="问题性质">
            {issue.issue_nature ? (
              <Tag color={issue.issue_nature === '个例' ? 'orange' : 'blue'}>{issue.issue_nature}</Tag>
            ) : <Text type="secondary">—</Text>}
          </Descriptions.Item>
          {issue.issue_nature === '个例' && (
            <Descriptions.Item label="车架号">
              <Text code>{issue.vin || '—'}</Text>
            </Descriptions.Item>
          )}
          <Descriptions.Item label="完成情况">
            <Select
              value={issue.completion_status}
              onChange={handleStatusChange}
              loading={updatingStatus}
              size="small"
              style={{ width: 120 }}
              options={COMPLETION_STATUSES.map((s) => ({ label: s, value: s }))}
            />
            <span style={{
              display: 'inline-block', marginLeft: 8, padding: '1px 8px', borderRadius: 10, fontSize: 12,
              background: `${statusColor[issue.completion_status]}20`,
              color: statusColor[issue.completion_status],
              border: `1px solid ${statusColor[issue.completion_status]}40`,
            }}>
              {issue.completion_status}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="记录人">{issue.recorder_name || '—'}</Descriptions.Item>
          <Descriptions.Item label="记录时间">
            {new Date(issue.recorded_at).toLocaleString('zh-CN')}
          </Descriptions.Item>
          {issue.updated_at !== issue.created_at && (
            <Descriptions.Item label="最后更新">
              {new Date(issue.updated_at).toLocaleString('zh-CN')}
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* 照片 */}
      <Card size="small" title="问题照片" style={{ marginBottom: 12 }}>
        <PhotoGallery photos={photos} />
        {id && (
          <div style={{ marginTop: 12 }}>
            <PhotoUpload photos={photos} issueId={id} onPhotosChange={setPhotos} />
          </div>
        )}
      </Card>

      {/* 改进进度 */}
      <Card size="small" title="改进进度">
        {id && (
          <ProgressTimeline progress={progress} issueId={id} onProgressChange={setProgress} />
        )}
      </Card>
    </div>
  );
}
