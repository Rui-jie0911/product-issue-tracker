import { useRef, useState } from 'react';
import { Button, message, Image } from 'antd';
import { CameraOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { photoService } from '../services/photo.service';
import type { IssuePhoto } from '../types';

interface Props {
  // 已保存的照片列表（编辑模式从数据库加载的，或新建模式已上传的）
  photos: IssuePhoto[];
  // 新建模式下 issueId 为空，照片只上传到存储不写数据库
  issueId?: string;
  onPhotosChange: (photos: IssuePhoto[]) => void;
}

export default function PhotoUpload({ photos, issueId, onPhotosChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        // 上传文件到存储
        const url = await photoService.upload(file);

        if (issueId) {
          // 编辑模式：直接写入数据库
          const photo = await photoService.create(issueId, url);
          photos = [...photos, photo];
        } else {
          // 新建模式：暂时用临时 ID，等保存时再写入数据库
          const tempPhoto: IssuePhoto = {
            id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            issue_id: '',
            photo_url: url,
            created_at: new Date().toISOString(),
          };
          photos = [...photos, tempPhoto];
        }
      }
      onPhotosChange(photos);
      message.success('照片上传成功');
    } catch (err) {
      message.error('上传失败: ' + (err as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (photo: IssuePhoto) => {
    try {
      if (photo.id.startsWith('temp-')) {
        // 临时照片，只从列表中移除
        onPhotosChange(photos.filter((p) => p.id !== photo.id));
      } else {
        await photoService.remove(photo.id, photo.photo_url);
        onPhotosChange(photos.filter((p) => p.id !== photo.id));
        message.success('照片已删除');
      }
    } catch {
      message.error('删除失败');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          style={{ display: 'none' }}
          id="photo-file-input"
        />

        <Button
          icon={<CameraOutlined />}
          onClick={() => fileInputRef.current?.click()}
          loading={uploading}
        >
          拍照
        </Button>
        <Button
          icon={<UploadOutlined />}
          onClick={() => document.getElementById('photo-file-input')?.click()}
          loading={uploading}
        >
          上传照片
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {photos.map((photo) => (
          <div key={photo.id} style={{ position: 'relative', display: 'inline-block', margin: 4 }}>
            <Image
              src={photo.photo_url}
              alt="问题照片"
              width={80}
              height={80}
              style={{ objectFit: 'cover', borderRadius: 6 }}
              preview={{ mask: <span>查看</span> }}
            />
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(photo)}
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                background: '#fff',
                borderRadius: '50%',
                padding: 0,
                minWidth: 20,
                height: 20,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
