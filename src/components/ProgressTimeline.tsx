import { useState } from 'react';
import { Timeline, Button, Modal, Input, Select, Form, message, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { progressService } from '../services/progress.service';
import type { IssueProgress } from '../types';
import { PROGRESS_STATUSES } from '../types';

interface Props {
  progress: IssueProgress[];
  issueId: string;
  onProgressChange: (progress: IssueProgress[]) => void;
}

export default function ProgressTimeline({ progress, issueId, onProgressChange }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IssueProgress | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const values = await form.validateFields();
    setSaving(true);

    try {
      if (editingItem) {
        await progressService.update(editingItem.id, values);
        message.success('进度已更新');
      } else {
        await progressService.create({ ...values, issue_id: issueId });
        message.success('进度已添加');
      }
      const updated = await progressService.listByIssue(issueId);
      onProgressChange(updated);
      setModalOpen(false);
      form.resetFields();
      setEditingItem(null);
    } catch (err) {
      message.error('操作失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await progressService.remove(id);
    const updated = await progressService.listByIssue(issueId);
    onProgressChange(updated);
    message.success('已删除');
  };

  const openEdit = (item: IssueProgress) => {
    setEditingItem(item);
    form.setFieldsValue(item);
    setModalOpen(true);
  };

  const openNew = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({ status: '进行中' });
    setModalOpen(true);
  };

  const sorted = [...progress].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>改进进度</strong>
        <Button type="link" icon={<PlusOutlined />} onClick={openNew}>
          添加阶段
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div style={{ color: '#999', padding: '12px 0' }}>暂无进度记录</div>
      ) : (
        <Timeline
          className="progress-timeline"
          items={sorted.map((p) => ({
            color: p.status === '已完成' ? 'green' : 'blue',
            children: (
              <div>
                <div style={{ fontWeight: 500 }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '0 6px',
                    borderRadius: 4,
                    fontSize: 12,
                    background: p.status === '已完成' ? '#f6ffed' : '#e6f7ff',
                    color: p.status === '已完成' ? '#52c41a' : '#1890ff',
                    border: `1px solid ${p.status === '已完成' ? '#b7eb8f' : '#91d5ff'}`,
                    marginRight: 8,
                  }}>
                    {p.status}
                  </span>
                  {p.stage_name}
                </div>
                {p.description && (
                  <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>{p.description}</div>
                )}
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                  {new Date(p.created_at).toLocaleString('zh-CN')}
                  <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(p)}>
                    编辑
                  </Button>
                  <Popconfirm title="确定删除此进度记录？" onConfirm={() => handleDelete(p.id)}>
                    <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                      删除
                    </Button>
                  </Popconfirm>
                </div>
              </div>
            ),
          }))}
        />
      )}

      <Modal
        title={editingItem ? '编辑进度' : '添加进度阶段'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingItem(null); form.resetFields(); }}
        onOk={handleSave}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="stage_name" label="阶段名称" rules={[{ required: true, message: '请输入阶段名称' }]}>
            <Input placeholder="如：原因分析、方案制定、措施实施、效果验证" />
          </Form.Item>
          <Form.Item name="description" label="阶段描述">
            <Input.TextArea rows={3} placeholder="详细描述该阶段的处理情况" />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select options={PROGRESS_STATUSES.map((s) => ({ label: s, value: s }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
