import { Checkbox, Card } from 'antd';
import type { ExportFieldOption } from '../types';

interface Props {
  fields: ExportFieldOption[];
  onChange: (fields: ExportFieldOption[]) => void;
}

export default function FieldSelector({ fields, onChange }: Props) {
  const handleToggle = (key: string) => {
    const updated = fields.map((f) =>
      f.key === key ? { ...f, checked: !f.checked } : f,
    );
    onChange(updated);
  };

  const handleSelectAll = (checked: boolean) => {
    onChange(fields.map((f) => ({ ...f, checked })));
  };

  const allChecked = fields.every((f) => f.checked);
  const someChecked = fields.some((f) => f.checked);

  return (
    <Card title="选择导出字段" size="small">
      <div style={{ marginBottom: 8 }}>
        <Checkbox
          checked={allChecked}
          indeterminate={someChecked && !allChecked}
          onChange={(e) => handleSelectAll(e.target.checked)}
        >
          <strong>全选</strong>
        </Checkbox>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {fields.filter((f) => !f.isImage).map((field) => (
          <Checkbox
            key={field.key}
            checked={field.checked}
            onChange={() => handleToggle(field.key)}
          >
            {field.label}
          </Checkbox>
        ))}
      </div>

      {/* 图片选项单独一行 */}
      <div style={{ marginTop: 8, borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
        {fields.filter((f) => f.isImage).map((field) => (
          <Checkbox
            key={field.key}
            checked={field.checked}
            onChange={() => handleToggle(field.key)}
          >
            {field.label} <span style={{ color: '#999', fontSize: 12 }}>（将嵌入图片到表格中，导出可能较慢）</span>
          </Checkbox>
        ))}
      </div>

      <div style={{ marginTop: 8, color: '#ff4d4f', fontSize: 12 }}>
        提示：导出的 .xlsx 文件可用 WPS 或 Excel 打开。
        图片嵌入在单元格内，点击可放大查看，使用鼠标滚轮可缩放。
      </div>
    </Card>
  );
}
