import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Form, Input, Select, Button, message, Typography, Spin,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { modelService } from '../services/model.service';
import { batchService } from '../services/batch.service';
import { issueService } from '../services/issue.service';
import { photoService } from '../services/photo.service';
import VoiceInput from '../components/VoiceInput';
import PhotoUpload from '../components/PhotoUpload';
import { COMPLETION_STATUSES, ISSUE_CATEGORIES, type VehicleModel, type Batch, type IssuePhoto, type Issue } from '../types';

const { Title } = Typography;
const { TextArea } = Input;

interface FormValues {
  model_id: string;
  batch_id: string;
  brief_description: string;
  detailed_description: string;
  category: string;
  responsible_person: string;
  completion_status: string;
  related_materials: string;
}

export default function IssueFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit_id');
  const presetBatchId = searchParams.get('batch_id');

  const [form] = Form.useForm<FormValues>();
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | undefined>();
  const [unitCount, setUnitCount] = useState<number | null>(null);
  const [nextSerial, setNextSerial] = useState<number>(1);
  const [photos, setPhotos] = useState<IssuePhoto[]>([]);
  const [issueId, setIssueId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  // 本地状态——语音输入实时更新用
  const [briefText, setBriefText] = useState('');
  const [detailText, setDetailText] = useState('');

  const isEdit = !!editId;

  useEffect(() => {
    modelService.list().then(setModels).catch(() => message.error('加载车型失败'));
  }, []);

  // 编辑模式：加载问题数据
  useEffect(() => {
    if (!editId) return;
    setLoadingEdit(true);
    issueService.getById(editId).then(async (issue) => {
      const batches_all = await getBatchPath(issue.batch_id);
      setIssueId(editId);

      if (batches_all) {
        const batch = batches_all.batch;
        setSelectedModel(batch.model_id);
        setUnitCount(batch.unit_count);
        setNextSerial(issue.serial_number);
        setPhotos(issue.photos || []);
        setBriefText(issue.brief_description);
        setDetailText(issue.detailed_description || '');

        const bs = await batchService.listByModel(batch.model_id);
        setBatches(bs);

        form.setFieldsValue({
          model_id: batch.model_id,
          batch_id: batch.id,
          brief_description: issue.brief_description,
          detailed_description: issue.detailed_description || '',
          category: issue.category || undefined,
          responsible_person: issue.responsible_person || '',
          completion_status: issue.completion_status,
          related_materials: issue.related_materials || '',
        });
      }
    }).finally(() => setLoadingEdit(false));
  }, [editId]);

  const getBatchPath = async (batchId: string) => {
    const models = await modelService.list();
    for (const model of models) {
      const batches = await batchService.listByModel(model.id);
      const found = batches.find((b) => b.id === batchId);
      if (found) return { model, batch: found };
    }
    return null;
  };

  // 预设批次（从首页"新建问题"进来时）
  useEffect(() => {
    if (isEdit || !presetBatchId) return;
    (async () => {
      const result = await getBatchPath(presetBatchId);
      if (result) {
        setSelectedModel(result.model.id);
        setUnitCount(result.batch.unit_count);

        const bs = await batchService.listByModel(result.model.id);
        setBatches(bs);

        const sn = await issueService.getNextSerialNumber(presetBatchId);
        setNextSerial(sn);

        form.setFieldsValue({
          model_id: result.model.id,
          batch_id: result.batch.id,
          completion_status: '待处理',
        });
      }
    })();
  }, [presetBatchId]);

  const handleModelChange = async (modelId: string) => {
    setSelectedModel(modelId);
    setUnitCount(null);
    form.setFieldsValue({ batch_id: undefined as unknown as string });
    try {
      setBatches(await batchService.listByModel(modelId));
    } catch { message.error('加载批次失败'); }
  };

  const handleBatchChange = async (batchId: string) => {
    const batch = batches.find((b) => b.id === batchId);
    setUnitCount(batch?.unit_count || null);
    try {
      const sn = isEdit ? nextSerial : await issueService.getNextSerialNumber(batchId);
      setNextSerial(sn);
    } catch { message.error('获取序号失败'); }
  };

  const handleSubmit = async (values: FormValues) => {
    if (!values.batch_id) {
      message.warning('请选择批次');
      return;
    }
    setSaving(true);
    try {
      const issueData = {
        batch_id: values.batch_id,
        serial_number: nextSerial,
        brief_description: values.brief_description,
        detailed_description: values.detailed_description || '',
        category: values.category || null,
        responsible_person: values.responsible_person || null,
        completion_status: (values.completion_status || '待处理') as Issue['completion_status'],
        related_materials: values.related_materials || '',
      };

      if (isEdit) {
        await issueService.update(editId, issueData);
        message.success('问题已更新');
        navigate(`/issues/${editId}`);
      } else {
        const created = await issueService.create(issueData);

        // 新建模式下，把暂存的照片关联到新问题
        const pendingUrls = photos.map((p) => p.photo_url);
        if (pendingUrls.length > 0) {
          try {
            await photoService.createBatch(created.id, pendingUrls);
          } catch (err) {
            message.warning('问题已保存，但照片关联失败: ' + (err as Error).message);
          }
        }

        message.success('问题已记录');
        navigate('/');
      }
    } catch (err) {
      message.error('保存失败: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingEdit) {
    return <div style={{ textAlign: 'center', paddingTop: '40vh' }}><Spin size="large" /></div>;
  }

  return (
    <div style={{ background: '#fff', minHeight: '100vh', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} type="text" />
        <Title level={4} style={{ margin: 0 }}>{isEdit ? '编辑问题' : '记录问题'}</Title>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ completion_status: '待处理' }}>
        {/* 车型下拉 */}
        <Form.Item name="model_id" label="车型" rules={[{ required: true, message: '请选择车型' }]}>
          <Select
            placeholder="请选择车型"
            options={models.map((m) => ({ label: m.name, value: m.id }))}
            onChange={handleModelChange}
            showSearch
            filterOption={(input, option) => (option?.label as string)?.toLowerCase().includes(input.toLowerCase())}
          />
        </Form.Item>

        {/* 批次下拉 */}
        <Form.Item name="batch_id" label="批次号" rules={[{ required: true, message: '请选择批次号' }]}>
          <Select
            placeholder={selectedModel ? '请选择批次号' : '请先选择车型'}
            options={batches.map((b) => ({ label: `${b.batch_number}（台套: ${b.unit_count}）`, value: b.id }))}
            onChange={handleBatchChange}
            disabled={!selectedModel}
          />
        </Form.Item>

        {/* 台套数 + 序号 */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
          <div>
            <Typography.Text type="secondary">台套数：</Typography.Text>
            <Typography.Text strong>{unitCount !== null ? unitCount : '—'}</Typography.Text>
          </div>
          <div>
            <Typography.Text type="secondary">序号：</Typography.Text>
            <Typography.Text strong>#{nextSerial}</Typography.Text>
          </div>
        </div>

        {/* 问题简述 + 语音输入 */}
        <Form.Item name="brief_description" label="问题简述" rules={[{ required: true, message: '请输入问题简述' }]}>
          <div>
            <TextArea
              id="brief-desc"
              rows={2}
              placeholder="简短描述问题（可使用语音输入）"
              maxLength={200}
              showCount
              value={briefText}
              onChange={(e) => {
                setBriefText(e.target.value);
                form.setFieldValue('brief_description', e.target.value);
              }}
            />
            <div style={{ marginTop: 4 }}>
              <VoiceInput
                fieldValue={briefText}
                onTextChange={(text) => {
                  setBriefText(text);
                  form.setFieldValue('brief_description', text);
                }}
                inputId="brief-desc"
              />
            </div>
          </div>
        </Form.Item>

        {/* 详细描述 + 语音输入 */}
        <Form.Item name="detailed_description" label="详细描述">
          <div>
            <TextArea
              id="detail-desc"
              rows={4}
              placeholder="详细描述问题的具体情况（可使用语音输入）"
              value={detailText}
              onChange={(e) => {
                setDetailText(e.target.value);
                form.setFieldValue('detailed_description', e.target.value);
              }}
            />
            <div style={{ marginTop: 4 }}>
              <VoiceInput
                fieldValue={detailText}
                onTextChange={(text) => {
                  setDetailText(text);
                  form.setFieldValue('detailed_description', text);
                }}
                inputId="detail-desc"
              />
            </div>
          </div>
        </Form.Item>

        {/* 涉及物料 */}
        <Form.Item name="related_materials" label="涉及物料">
          <TextArea rows={2} placeholder="涉及的物料/零部件名称或编号" />
        </Form.Item>

        {/* 问题分类 */}
        <Form.Item name="category" label="问题分类" rules={[{ required: true, message: '请选择问题分类' }]}>
          <Select
            placeholder="请选择问题类型"
            options={ISSUE_CATEGORIES.map((c) => ({ label: c, value: c }))}
          />
        </Form.Item>

        {/* 责任人 */}
        <Form.Item name="responsible_person" label="责任人" rules={[{ required: true, message: '请填写责任人' }]}>
          <Input placeholder="请输入该问题对应的责任人姓名" />
        </Form.Item>

        {/* 完成情况 */}
        <Form.Item name="completion_status" label="完成情况">
          <Select options={COMPLETION_STATUSES.map((s) => ({ label: s, value: s }))} />
        </Form.Item>

        {/* 照片上传——新建和编辑模式均可使用 */}
        <div style={{ marginBottom: 24 }}>
          <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>问题照片</Typography.Text>
          {isEdit && issueId ? (
            <PhotoUpload photos={photos} issueId={issueId} onPhotosChange={setPhotos} />
          ) : (
            <PhotoUpload photos={photos} onPhotosChange={setPhotos} />
          )}
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
            新建模式下照片会先上传，保存问题后自动关联
          </Typography.Text>
        </div>

        {/* 保存按钮 */}
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} block size="large">
          {isEdit ? '保存修改' : '记录问题'}
        </Button>
      </Form>
    </div>
  );
}
