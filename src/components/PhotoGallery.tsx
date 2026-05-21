import { Image } from 'antd';
import type { IssuePhoto } from '../types';

interface Props {
  photos: IssuePhoto[];
}

export default function PhotoGallery({ photos }: Props) {
  if (photos.length === 0) {
    return <span style={{ color: '#999' }}>暂无照片</span>;
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Image.PreviewGroup>
        {photos.map((photo) => (
          <Image
            key={photo.id}
            src={photo.photo_url}
            alt="问题照片"
            width={100}
            height={100}
            style={{ objectFit: 'cover', borderRadius: 6, cursor: 'pointer' }}
          />
        ))}
      </Image.PreviewGroup>
    </div>
  );
}
