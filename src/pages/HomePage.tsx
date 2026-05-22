import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layout, Menu, Table, Select, Input, Button, Spin, message, Empty,
  Popconfirm, Typography, Dropdown, Space, Tag, theme,
} from 'antd';
import {
  SearchOutlined, PlusOutlined, ExportOutlined,
  SettingOutlined, LogoutOutlined, DeleteOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined, CarOutlined,
  OrderedListOutlined, EyeOutlined,
} from '@ant-design/icons';
import { modelService } from '../services/model.service';
import { batchService } from '../services/batch.service';
import { issueService } from '../services/issue.service';
import { useAuth } from '../auth/AuthContext';
import { COMPLETION_STATUSES, ISSUE_CATEGORIES, type VehicleModel, type Batch, type Issue } from '../types';

const { Title, Text } = Typography;
const { Sider, Content, Header } = Layout;

// 状态颜色映射
const STATUS_COLOR: Record<string, string> = {
  '待处理': '#faad14',
  '处理中': '#1890ff',
  '已解决': '#52c41a',
  '已关闭': '#999',
};

export default function HomePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { token } = theme.useToken();

  // === 数据状态 ===
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [batchesByModel, setBatchesByModel] = useState<Record<string, Batch[]>>({});
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuesLoading, setIssuesLoading] = useState(false);

  // === UI 状态 ===
  const [collapsed, setCollapsed] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedBatchInfo, setSelectedBatchInfo] = useState<Batch | null>(null);
  const [selectedModelName, setSelectedModelName] = useState('');

  // === 筛选状态 ===
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterSearch, setFilterSearch] = useState('');

  // 加载车型
  useEffect(() => {
    modelService.list().then(setModels).catch(() => message.error('加载车型失败')).finally(() => setLoading(false));
  }, []);

  // 加载某车型下的批次
  const loadBatches = async (modelId: string) => {
    if (batchesByModel[modelId]) return; // 已加载
    try {
      const batches = await batchService.listByModel(modelId);
      setBatchesByModel((prev) => ({ ...prev, [modelId]: batches }));
    } catch { message.error('加载批次失败'); }
  };

  // 加载某批次下的问题
  const loadIssues = async (batchId: string) => {
    setIssuesLoading(true);
    try {
      setIssues(await issueService.listByBatch(batchId));
    } catch { message.error('加载问题失败'); }
    setIssuesLoading(false);
  };

  // 点击车型节点
  const handleModelClick = (modelId: string, modelName: string) => {
    setSelectedModelId(modelId);
    setSelectedModelName(modelName);
    setSelectedBatchId(null);
    setSelectedBatchInfo(null);
    setIssues([]);
    loadBatches(modelId);
  };

  // 点击批次节点
  const handleBatchClick = (batch: Batch, modelName: string) => {
    setSelectedBatchId(batch.id);
    setSelectedBatchInfo(batch);
    setSelectedModelName(modelName);
    loadIssues(batch.id);
  };

  // 删除问题
  const handleDeleteIssue = async (issueId: string) => {
    if (!selectedBatchId) return;
    await issueService.remove(issueId);
    message.success('问题已删除');
    loadIssues(selectedBatchId);
  };

  // === 构建左侧菜单项 ===
  const menuItems = useMemo(() => {
    return models.map((model) => {
      const batches = batchesByModel[model.id] || [];
      const isExpanded = selectedModelId === model.id;

      return {
        key: `model-${model.id}`,
        icon: <CarOutlined />,
        label: (
          <span onClick={() => handleModelClick(model.id, model.name)}>
            {model.name}
          </span>
        ),
        children: isExpanded
          ? [
              ...batches.map((batch) => ({
                key: `batch-${batch.id}`,
                icon: <OrderedListOutlined />,
                label: (
                  <div
                    onClick={() => handleBatchClick(batch, model.name)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: selectedBatchId === batch.id ? token.colorPrimaryBg : 'transparent',
                      padding: '2px 4px',
                      borderRadius: 4,
                    }}
                  >
                    <span>{batch.batch_number}</span>
                    <Tag style={{ marginLeft: 8, fontSize: 10 }}>台套 {batch.unit_count}</Tag>
                  </div>
                ),
              })),
              // 如果展开但没批次，给个提示
              ...(batches.length === 0
                ? [{ key: `empty-${model.id}`, icon: null, label: <Text type="secondary" style={{ fontSize: 12 }}>暂无批次</Text>, disabled: true }]
                : []),
            ]
          : [],
      };
    });
  }, [models, batchesByModel, selectedModelId, selectedBatchId, token.colorPrimaryBg]);

  // === 筛选后的问题列表 ===
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (filterStatus && issue.completion_status !== filterStatus) return false;
      if (filterCategory && issue.category !== filterCategory) return false;
      if (filterSearch) {
        const kw = filterSearch.toLowerCase();
        const match =
          issue.brief_description?.toLowerCase().includes(kw) ||
          issue.serial_number?.toString().includes(kw) ||
          issue.responsible_person?.toLowerCase().includes(kw);
        if (!match) return false;
      }
      return true;
    });
  }, [issues, filterStatus, filterCategory, filterSearch]);

  // === 统计 ===
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    issues.forEach((i) => {
      counts[i.completion_status] = (counts[i.completion_status] || 0) + 1;
    });
    return counts;
  }, [issues]);

  // === 表格列定义 ===
  const columns = [
    { title: '序号', dataIndex: 'serial_number', key: 'serial_number', width: 60, align: 'center' as const },
    {
      title: '问题描述', dataIndex: 'brief_description', key: 'brief_description',
      ellipsis: true,
      render: (text: string) => <a style={{ fontWeight: 500 }}>{text}</a>,
    },
    {
      title: '分类', dataIndex: 'category', key: 'category', width: 120,
      render: (v: string) => v ? <Tag>{v}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: '完成情况', dataIndex: 'completion_status', key: 'completion_status', width: 100,
      render: (v: string) => (
        <Tag color={STATUS_COLOR[v]}>{v}</Tag>
      ),
    },
    {
      title: '责任人', dataIndex: 'responsible_person', key: 'responsible_person', width: 100,
      render: (v: string | null) => v || <Text type="secondary">—</Text>,
    },
    {
      title: '记录人', dataIndex: 'recorder_name', key: 'recorder_name', width: 100,
      render: (v: string | null) => v || <Text type="secondary">—</Text>,
    },
    {
      title: '记录时间', dataIndex: 'recorded_at', key: 'recorded_at', width: 110,
      render: (v: string) => new Date(v).toLocaleDateString('zh-CN'),
    },
    {
      title: '操作', key: 'actions', width: 120, fixed: 'right' as const,
      render: (_: unknown, record: Issue) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />}
            onClick={() => navigate(`/issues/${record.id}`)}>
            查看
          </Button>
          <Popconfirm title="确定删除此问题？" onConfirm={() => handleDeleteIssue(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  // 右侧内容区域
  const renderContent = () => {
    // 未选择批次
    if (!selectedBatchId) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: 16 }}>
          <Empty description={
            selectedModelId
              ? `「${selectedModelName}」下暂无选中批次，请在左侧展开并选择一个批次`
              : '请在左侧选择一个车型'
          } />
          {selectedModelId && (
            <Button type="primary" onClick={() => navigate('/data-manage')}>前往数据维护添加批次</Button>
          )}
        </div>
      );
    }

    return (
      <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* 标题行 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <Title level={5} style={{ margin: 0, display: 'inline' }}>
              {selectedModelName} — {selectedBatchInfo?.batch_number}
            </Title>
            <Tag style={{ marginLeft: 8 }}>台套 {selectedBatchInfo?.unit_count}</Tag>
            <Text type="secondary" style={{ marginLeft: 8, fontSize: 13 }}>
              共 {issues.length} 条 | 已解决 {statusCounts['已解决'] || 0} | 已关闭 {statusCounts['已关闭'] || 0}
            </Text>
          </div>
          <Space>
            <Button icon={<PlusOutlined />} type="primary"
              onClick={() => navigate(`/issues/new?batch_id=${selectedBatchId}`)}>
              新建问题
            </Button>
            <Button icon={<ExportOutlined />}
              onClick={() => navigate(`/export?batch_id=${selectedBatchId}`)}>
              导出
            </Button>
          </Space>
        </div>

        {/* 筛选栏 */}
        <div style={{
          display: 'flex', gap: 12, marginBottom: 12, padding: '8px 12px',
          background: token.colorBgLayout, borderRadius: 8, flexWrap: 'wrap', alignItems: 'center',
        }}>
          <Select
            placeholder="完成情况"
            allowClear
            style={{ width: 120 }}
            value={filterStatus || undefined}
            onChange={(v) => setFilterStatus(v || '')}
            options={COMPLETION_STATUSES.map((s) => ({ label: s, value: s }))}
          />
          <Select
            placeholder="问题分类"
            allowClear
            style={{ width: 140 }}
            value={filterCategory || undefined}
            onChange={(v) => setFilterCategory(v || '')}
            options={ISSUE_CATEGORIES.map((c) => ({ label: c, value: c }))}
          />
          <Input
            placeholder="搜索序号/描述/责任人"
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 220 }}
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
          />
          {(filterStatus || filterCategory || filterSearch) && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              筛选结果: {filteredIssues.length} 条
            </Text>
          )}
        </div>

        {/* 问题表格 */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Table
            dataSource={filteredIssues}
            columns={columns}
            rowKey="id"
            loading={issuesLoading}
            size="small"
            pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
            scroll={{ x: 900 }}
            locale={{ emptyText: <Empty description="该批次下暂无问题" /> }}
            onRow={(record) => ({
              style: { cursor: 'pointer' },
              onDoubleClick: () => navigate(`/issues/${record.id}`),
            })}
          />
        </div>
      </div>
    );
  };

  return (
    <Layout style={{ height: '100vh' }}>
      {/* 顶部栏 */}
      <Header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', background: token.colorPrimary, height: 48, lineHeight: '48px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ color: '#fff', fontSize: 16 }}
          />
          <Title level={5} style={{ color: '#fff', margin: 0, whiteSpace: 'nowrap' }}>产品问题追踪系统</Title>
        </div>
        <Dropdown menu={{
          items: [
            { key: 'data', icon: <SettingOutlined />, label: '数据维护', onClick: () => navigate('/data-manage') },
            { type: 'divider' },
            { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: signOut },
          ],
        }}>
          <Button type="text" style={{ color: '#fff' }}>{user?.email}</Button>
        </Dropdown>
      </Header>

      <Layout>
        {/* 左侧导航 */}
        <Sider
          width={260}
          collapsible
          collapsed={collapsed}
          trigger={null}
          breakpoint="lg"
          collapsedWidth={0}
          style={{ background: token.colorBgContainer, borderRight: `1px solid ${token.colorBorderSecondary}` }}
        >
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
            <Button type="dashed" icon={<PlusOutlined />} block onClick={() => navigate('/issues/new')}>
              {collapsed ? '' : '新建问题'}
            </Button>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
            {models.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center' }}>
                <Empty description="暂无车型" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                  <Button size="small" type="primary" onClick={() => navigate('/data-manage')}>去添加</Button>
                </Empty>
              </div>
            ) : (
              <Menu
                mode="inline"
                inlineIndent={16}
                style={{ border: 'none' }}
                selectedKeys={selectedBatchId ? [`batch-${selectedBatchId}`] : selectedModelId ? [`model-${selectedModelId}`] : []}
                items={menuItems}
                onClick={({ key }) => {
                  // 点击批次时加载
                  if (key.startsWith('batch-')) {
                    const batchId = key.replace('batch-', '');
                    const model = models.find((m) => selectedModelId === m.id || batchesByModel[m.id]?.some((b) => b.id === batchId));
                    const batch = model && (batchesByModel[model.id] || []).find((b) => b.id === batchId);
                    if (batch && model) handleBatchClick(batch, model.name);
                  }
                }}
              />
            )}
          </div>
        </Sider>

        {/* 右侧内容 */}
        <Content style={{ overflow: 'auto', background: token.colorBgContainer }}>
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
}
