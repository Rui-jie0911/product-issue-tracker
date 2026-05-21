import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Input, Spin, message, Empty, Popconfirm, Badge, Typography, Dropdown, Space,
} from 'antd';
import {
  SearchOutlined, PlusOutlined, DownOutlined, RightOutlined,
  ExportOutlined, SettingOutlined, LogoutOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { modelService } from '../services/model.service';
import { batchService } from '../services/batch.service';
import { issueService } from '../services/issue.service';
import { useAuth } from '../auth/AuthContext';
import type { VehicleModel, Batch, Issue } from '../types';

const { Title, Text } = Typography;

// 展开状态：车型id -> Set<批次id>
type ExpandState = Record<string, Set<string>>;

export default function HomePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  // 数据
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [batchesMap, setBatchesMap] = useState<Record<string, Batch[]>>({});
  const [issuesMap, setIssuesMap] = useState<Record<string, Issue[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // 展开状态
  const [expandState, setExpandState] = useState<ExpandState>({});

  // 加载车型
  const loadModels = async () => {
    setLoading(true);
    try {
      setModels(await modelService.list());
    } catch { message.error('加载失败'); }
    setLoading(false);
  };

  useEffect(() => { loadModels(); }, []);

  // 展开/折叠车型 → 加载批次
  const toggleModel = async (modelId: string) => {
    const current = expandState[modelId];
    if (current) {
      // 折叠
      const next = { ...expandState };
      delete next[modelId];
      setExpandState(next);
    } else {
      // 展开，加载批次
      try {
        const batches = await batchService.listByModel(modelId);
        setBatchesMap((prev) => ({ ...prev, [modelId]: batches }));
        setExpandState((prev) => ({ ...prev, [modelId]: new Set() }));
      } catch { message.error('加载批次失败'); }
    }
  };

  // 展开/折叠批次 → 加载问题
  const toggleBatch = async (modelId: string, batchId: string) => {
    const currentSet = expandState[modelId];
    if (currentSet?.has(batchId)) {
      // 折叠
      const nextSet = new Set(currentSet);
      nextSet.delete(batchId);
      setExpandState((prev) => ({ ...prev, [modelId]: nextSet }));
    } else {
      // 展开，加载问题
      try {
        const issues = await issueService.listByBatch(batchId);
        setIssuesMap((prev) => ({ ...prev, [batchId]: issues }));
        setExpandState((prev) => ({
          ...prev,
          [modelId]: new Set([...(prev[modelId] || []), batchId]),
        }));
      } catch { message.error('加载问题失败'); }
    }
  };

  // 删除问题
  const handleDeleteIssue = async (issueId: string, batchId: string) => {
    await issueService.remove(issueId);
    const issues = await issueService.listByBatch(batchId);
    setIssuesMap((prev) => ({ ...prev, [batchId]: issues }));
    message.success('问题已删除');
  };

  // 状态颜色
  const statusColor: Record<string, string> = {
    '待处理': '#faad14',
    '处理中': '#1890ff',
    '已解决': '#52c41a',
    '已关闭': '#999',
  };

  // 过滤搜索
  const filteredModels = search
    ? models.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))
    : models;

  if (loading) {
    return <div style={{ textAlign: 'center', paddingTop: '40vh' }}><Spin size="large" /></div>;
  }

  return (
    <div style={{ background: '#fff', minHeight: '100vh', paddingBottom: 24 }}>
      {/* 头部 */}
      <div style={{
        background: '#1677ff', color: '#fff', padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Title level={5} style={{ color: '#fff', margin: 0 }}>产品问题追踪</Title>
        <Dropdown menu={{
          items: [
            { key: 'data', icon: <SettingOutlined />, label: '数据维护', onClick: () => navigate('/data-manage') },
            { type: 'divider' },
            { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: signOut },
          ],
        }}>
          <Button type="text" style={{ color: '#fff' }}>{user?.email}</Button>
        </Dropdown>
      </div>

      {/* 搜索栏 */}
      <div style={{ padding: '8px 16px', background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索车型..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{ borderRadius: 20 }}
        />
      </div>

      {/* 三级目录 */}
      {filteredModels.length === 0 ? (
        <Empty description="暂无车型数据" style={{ marginTop: 60 }}>
          <Button type="primary" onClick={() => navigate('/data-manage')}>前往数据维护</Button>
        </Empty>
      ) : (
        <div>
          {filteredModels.map((model) => {
            const isModelExpanded = !!expandState[model.id];
            const batches = batchesMap[model.id] || [];

            return (
              <div key={model.id}>
                {/* 一级：车型 */}
                <div className="tree-item" onClick={() => toggleModel(model.id)}
                  style={{ background: isModelExpanded ? '#f0f5ff' : undefined }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isModelExpanded ? <DownOutlined style={{ fontSize: 12, color: '#999' }} /> : <RightOutlined style={{ fontSize: 12, color: '#999' }} />}
                    <Text strong>{model.name}</Text>
                    {batches.length > 0 && (
                      <Badge count={batches.length} size="small" style={{ backgroundColor: '#1677ff' }} />
                    )}
                  </div>
                </div>

                {/* 二级：批次 */}
                {isModelExpanded && (
                  <div style={{ paddingLeft: 24 }}>
                    {batches.length === 0 ? (
                      <div style={{ padding: 12, color: '#999', fontSize: 13 }}>暂无批次，请前往数据维护添加</div>
                    ) : (
                      batches.map((batch) => {
                        const isBatchExpanded = expandState[model.id]?.has(batch.id);
                        const issues = issuesMap[batch.id] || [];
                        const doneCount = issues.filter((i) => i.completion_status === '已解决' || i.completion_status === '已关闭').length;

                        return (
                          <div key={batch.id}>
                            {/* 批次行 */}
                            <div className="tree-item" onClick={() => toggleBatch(model.id, batch.id)}
                              style={{ background: isBatchExpanded ? '#fffbe6' : undefined }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {isBatchExpanded ? <DownOutlined style={{ fontSize: 12, color: '#999' }} /> : <RightOutlined style={{ fontSize: 12, color: '#999' }} />}
                                <Text>{batch.batch_number}</Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>(台套: {batch.unit_count})</Text>
                                {issues.length > 0 && (
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    问题 {doneCount}/{issues.length}
                                  </Text>
                                )}
                              </div>
                              <Space>
                                <Button type="link" size="small" icon={<ExportOutlined />}
                                  onClick={(e) => { e.stopPropagation(); navigate(`/export?batch_id=${batch.id}`); }}>
                                  导出
                                </Button>
                              </Space>
                            </div>

                            {/* 三级：问题表格 */}
                            {isBatchExpanded && (
                              <div style={{ paddingLeft: 16, paddingBottom: 12 }}>
                                <div style={{ marginBottom: 8 }}>
                                  <Button type="dashed" icon={<PlusOutlined />} size="small"
                                    onClick={() => navigate(`/issues/new?batch_id=${batch.id}`)}>
                                    新建问题
                                  </Button>
                                </div>

                                {issues.length === 0 ? (
                                  <div style={{ padding: 12, color: '#999', fontSize: 13 }}>该批次暂无问题记录</div>
                                ) : (
                                  <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                      <thead>
                                        <tr style={{ background: '#fafafa' }}>
                                          <th style={thStyle}>序号</th>
                                          <th style={thStyle}>问题描述</th>
                                          <th style={thStyle}>完成情况</th>
                                          <th style={thStyle}>记录人</th>
                                          <th style={thStyle}>记录时间</th>
                                          <th style={thStyle}>操作</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {issues.map((issue) => (
                                          <tr key={issue.id} style={{ cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
                                            onClick={() => navigate(`/issues/${issue.id}`)}>
                                            <td style={tdStyle}>{issue.serial_number}</td>
                                            <td style={{ ...tdStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                              {issue.brief_description}
                                            </td>
                                            <td style={tdStyle}>
                                              <span style={{
                                                display: 'inline-block', padding: '1px 8px', borderRadius: 10, fontSize: 12,
                                                background: `${statusColor[issue.completion_status]}20`,
                                                color: statusColor[issue.completion_status],
                                                border: `1px solid ${statusColor[issue.completion_status]}40`,
                                              }}>
                                                {issue.completion_status}
                                              </span>
                                            </td>
                                            <td style={tdStyle}>{issue.recorder_name || '—'}</td>
                                            <td style={{ ...tdStyle, fontSize: 12, color: '#999' }}>
                                              {new Date(issue.recorded_at).toLocaleDateString('zh-CN')}
                                            </td>
                                            <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                                              <Popconfirm title="确定删除此问题？" onConfirm={() => handleDeleteIssue(issue.id, batch.id)}>
                                                <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                                              </Popconfirm>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 底部 FAB 按钮 (移动端友好) */}
      <Button type="primary" shape="circle" size="large" icon={<PlusOutlined />}
        style={{
          position: 'fixed', bottom: 24, right: 24, width: 56, height: 56,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 10,
        }}
        onClick={() => navigate('/issues/new')}
      />
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '6px 8px', textAlign: 'left', fontWeight: 600, borderBottom: '2px solid #e8e8e8', whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '6px 8px', verticalAlign: 'middle',
};
