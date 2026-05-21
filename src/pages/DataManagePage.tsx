import { useEffect, useState } from 'react';
import {
  Tabs, Table, Button, Modal, Input, InputNumber, Form, message,
  Popconfirm, Space, Typography, Empty,
} from 'antd';
import { PlusOutlined, ArrowLeftOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { modelService } from '../services/model.service';
import { batchService } from '../services/batch.service';
import type { VehicleModel, Batch } from '../types';

const { Title } = Typography;

export default function DataManagePage() {
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<VehicleModel | null>(null);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [modelForm] = Form.useForm();
  const [batchForm] = Form.useForm();

  // 加载车型
  const loadModels = async () => {
    setLoadingModels(true);
    try {
      setModels(await modelService.list());
    } catch { message.error('加载车型失败'); }
    setLoadingModels(false);
  };

  // 加载批次
  const loadBatches = async (modelId: string) => {
    setLoadingBatches(true);
    try {
      setBatches(await batchService.listByModel(modelId));
    } catch { message.error('加载批次失败'); }
    setLoadingBatches(false);
  };

  useEffect(() => { loadModels(); }, []);

  // === 车型操作 ===
  const saveModel = async () => {
    const { name } = await modelForm.validateFields();
    try {
      if (editingModel) {
        await modelService.update(editingModel.id, name);
        message.success('车型已更新');
      } else {
        await modelService.create(name);
        message.success('车型已添加');
      }
      setModelModalOpen(false);
      modelForm.resetFields();
      setEditingModel(null);
      loadModels();
    } catch { message.error('操作失败'); }
  };

  // === 批次操作 ===
  const openBatchModal = (modelId: string, batch?: Batch) => {
    setSelectedModelId(modelId);
    setEditingBatch(batch || null);
    if (batch) {
      batchForm.setFieldsValue({ batch_number: batch.batch_number, unit_count: batch.unit_count });
    } else {
      batchForm.resetFields();
    }
    setBatchModalOpen(true);
  };

  const saveBatch = async () => {
    const { batch_number, unit_count } = await batchForm.validateFields();
    if (!selectedModelId) return;
    try {
      if (editingBatch) {
        await batchService.update(editingBatch.id, batch_number, unit_count);
        message.success('批次已更新');
      } else {
        await batchService.create(selectedModelId, batch_number, unit_count);
        message.success('批次已添加');
      }
      setBatchModalOpen(false);
      batchForm.resetFields();
      setEditingBatch(null);
      loadBatches(selectedModelId);
    } catch { message.error('操作失败'); }
  };

  const modelColumns = [
    { title: '车型名称', dataIndex: 'name', key: 'name' },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => new Date(v).toLocaleString('zh-CN') },
    {
      title: '操作', key: 'actions', width: 200, render: (_: unknown, record: VehicleModel) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => {
            setEditingModel(record);
            modelForm.setFieldsValue({ name: record.name });
            setModelModalOpen(true);
          }}>编辑</Button>
          <Popconfirm title="删除车型将同时删除其下所有批次和问题" onConfirm={async () => {
            await modelService.remove(record.id);
            loadModels();
            message.success('已删除');
          }}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const batchColumns = [
    { title: '批次号', dataIndex: 'batch_number', key: 'batch_number' },
    { title: '台套数', dataIndex: 'unit_count', key: 'unit_count' },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => new Date(v).toLocaleString('zh-CN') },
    {
      title: '操作', key: 'actions', width: 180, render: (_: unknown, record: Batch) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openBatchModal(record.model_id, record)}>编辑</Button>
          <Popconfirm title="删除批次将同时删除其下所有问题" onConfirm={async () => {
            await batchService.remove(record.id);
            loadBatches(record.model_id);
            message.success('已删除');
          }}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 批次管理面板：先选车型再显示批次
  const BatchPanel = () => (
    <div>
      <div style={{ marginBottom: 16 }}>
        <span style={{ marginRight: 8 }}>选择车型：</span>
        <select
          value={selectedModelId || ''}
          onChange={(e) => {
            const id = e.target.value;
            setSelectedModelId(id);
            if (id) loadBatches(id);
          }}
          style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #d9d9d9', fontSize: 14, minWidth: 200 }}
        >
          <option value="" disabled>请选择车型</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        {selectedModelId && (
          <Button type="primary" icon={<PlusOutlined />} style={{ marginLeft: 12 }}
            onClick={() => openBatchModal(selectedModelId)}>
            添加批次
          </Button>
        )}
      </div>

      {selectedModelId ? (
        <Table
          dataSource={batches}
          columns={batchColumns}
          rowKey="id"
          loading={loadingBatches}
          size="small"
          locale={{ emptyText: <Empty description="该车型下暂无批次" /> }}
        />
      ) : (
        <Empty description="请先选择一个车型" />
      )}
    </div>
  );

  return (
    <div style={{ padding: 16, background: '#fff', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => window.history.back()} type="text" />
        <Title level={4} style={{ margin: 0 }}>数据维护</Title>
      </div>

      <Tabs
        items={[
          {
            key: 'models',
            label: '车型管理',
            children: (
              <div>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                  setEditingModel(null);
                  modelForm.resetFields();
                  setModelModalOpen(true);
                }} style={{ marginBottom: 12 }}>
                  添加车型
                </Button>
                <Table
                  dataSource={models}
                  columns={modelColumns}
                  rowKey="id"
                  loading={loadingModels}
                  size="small"
                  locale={{ emptyText: <Empty description="暂无车型数据，请先添加" /> }}
                />
              </div>
            ),
          },
          {
            key: 'batches',
            label: '批次管理',
            children: <BatchPanel />,
          },
        ]}
      />

      {/* 车型弹窗 */}
      <Modal
        title={editingModel ? '编辑车型' : '添加车型'}
        open={modelModalOpen}
        onOk={saveModel}
        onCancel={() => { setModelModalOpen(false); setEditingModel(null); modelForm.resetFields(); }}
        destroyOnClose
      >
        <Form form={modelForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="车型名称" rules={[{ required: true, message: '请输入车型名称' }]}>
            <Input placeholder="如：ZR380A旋挖钻机" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 批次弹窗 */}
      <Modal
        title={editingBatch ? '编辑批次' : '添加批次'}
        open={batchModalOpen}
        onOk={saveBatch}
        onCancel={() => { setBatchModalOpen(false); setEditingBatch(null); batchForm.resetFields(); }}
        destroyOnClose
      >
        <Form form={batchForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="batch_number" label="批次号" rules={[{ required: true, message: '请输入批次号' }]}>
            <Input placeholder="如：2026-001" />
          </Form.Item>
          <Form.Item name="unit_count" label="台套数" rules={[{ required: true, message: '请输入台套数' }]}>
            <InputNumber min={1} style={{ width: '100%' }} placeholder="该批次生产数量" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
