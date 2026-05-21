import { useRef, useState } from 'react';
import { Button, message, Image } from 'antd';
import { CameraOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { photoService } from '../services/photo.service';
import type { IssuePhoto } from '../types';

interface Props {
  photos: IssuePhoto[];
  issueId: string;
  /** 照片增删后的回调 */
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
        const url = await photoService.upload(file);
        const photo = await photoService.create(issueId, url);
        photos = [...photos, photo];
      }
      onPhotosChange(photos);
      message.success('照片上传成功');
    } catch (err) {
      message.error('照片上传失败: ' + (err as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (photo: IssuePhoto) => {
    try {
      await photoService.remove(photo.id, photo.photo_url);
      const updated = photos.filter((p) => p.id !== photo.id);
      onPhotosChange(updated);
      message.success('照片已删除');
    } catch (err) {
      message.error('删除失败');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {/* 相机拍照 (移动端调起相机) */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        {/* PC 端文件选择 */}
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

      {/* 照片预览 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {photos.map((photo) => (
          <div key={photo.id} className="photo-preview">
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
