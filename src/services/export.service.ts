import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { Issue, ExportFieldOption } from '../types';

/**
 * 生成并下载问题追踪报告 .xlsx 文件
 * @param modelName    车型名称（用于标题和文件名）
 * @param batchNumber  批次号（用于标题和文件名）
 * @param issues       该批次下所有问题（含照片）
 * @param fields       用户选择的导出字段
 */
export async function exportToExcel(
  modelName: string,
  batchNumber: string,
  issues: Issue[],
  fields: ExportFieldOption[],
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('问题追踪报告');

  const checkedFields = fields.filter((f) => f.checked);

  // === 标题行 ===
  const title = `${modelName}-${batchNumber}-问题追踪报告`;
  sheet.mergeCells(1, 1, 1, checkedFields.length);
  const titleCell = sheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { name: '微软雅黑', size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  titleCell.font = { name: '微软雅黑', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).height = 40;

  // === 表头行 ===
  const headerRowIndex = 2;
  checkedFields.forEach((field, colIndex) => {
    const cell = sheet.getCell(headerRowIndex, colIndex + 1);
    cell.value = field.label;
    cell.font = { name: '微软雅黑', size: 11, bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9E2F3' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
  sheet.getRow(headerRowIndex).height = 28;

  // === 数据行 ===
  const imageColumns: number[] = [];
  let imageRowIndex = headerRowIndex + 1;

  for (const issue of issues) {
    const rowIndex = imageRowIndex;

    // 计算该行是否需要增高以容纳图片
    const hasPhotos = issue.photos && issue.photos.length > 0;
    let rowHeight = 60; // 默认行高

    checkedFields.forEach((field, colIndex) => {
      const cell = sheet.getCell(rowIndex, colIndex + 1);
      let value: string | number = '';

      switch (field.key) {
        case 'serial_number':
          value = issue.serial_number;
          break;
        case 'brief_description':
          value = issue.brief_description;
          break;
        case 'detailed_description':
          value = issue.detailed_description || '';
          break;
        case 'completion_status':
          value = issue.completion_status;
          break;
        case 'recorder_name':
          value = issue.recorder_name || '';
          break;
        case 'recorded_at':
          value = new Date(issue.recorded_at).toLocaleString('zh-CN');
          break;
        case 'related_materials':
          value = issue.related_materials || '';
          break;
        case 'progress':
          value = (issue.progress || [])
            .map((p) => `[${p.status}] ${p.stage_name}: ${p.description || ''}`)
            .join('\n');
          break;
        case 'photos':
          // 图片特殊处理：先写占位文字，再嵌入图片
          value = '';
          break;
      }

      cell.value = value;
      cell.font = { name: '微软雅黑', size: 10 };
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // 嵌入图片
    if (hasPhotos) {
      const photoColIndex = checkedFields.findIndex((f) => f.key === 'photos');
      if (photoColIndex >= 0) {
        imageColumns.push(photoColIndex + 1);

        for (let i = 0; i < issue.photos!.length; i++) {
          try {
            const response = await fetch(issue.photos![i].photo_url);
            const blob = await response.blob();
            const buffer = await blob.arrayBuffer();

            const imgId = workbook.addImage({
              buffer: buffer as ArrayBuffer,
              extension: 'jpeg',
            });

            const imgWidth = 100;
            const imgHeight = 75;

            sheet.addImage(imgId, {
              tl: { col: photoColIndex + i * 0.5, row: rowIndex - 1 },
              ext: { width: imgWidth, height: imgHeight },
              editAs: 'oneCell',
            });

            rowHeight = Math.max(rowHeight, imgHeight + 10);
          } catch {
            // 图片加载失败则跳过
          }
        }
      }
    }

    sheet.getRow(rowIndex).height = rowHeight;
    imageRowIndex++;
  }

  // === 列宽设置 ===
  sheet.getColumn(1).width = 8;   // 序号
  sheet.columns = checkedFields.map((field, idx) => {
    const col = sheet.getColumn(idx + 1);
    switch (field.key) {
      case 'serial_number':
        col.width = 8;
        break;
      case 'brief_description':
        col.width = 30;
        break;
      case 'detailed_description':
        col.width = 40;
        break;
      case 'completion_status':
        col.width = 12;
        break;
      case 'recorder_name':
        col.width = 12;
        break;
      case 'recorded_at':
        col.width = 18;
        break;
      case 'related_materials':
        col.width = 25;
        break;
      case 'progress':
        col.width = 40;
        break;
      case 'photos':
        col.width = 25;
        break;
    }
    return col;
  });

  // === 冻结首行 ===
  sheet.views = [{ state: 'frozen', ySplit: headerRowIndex }];

  // === 下载 ===
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, `${modelName}-${batchNumber}-问题追踪报告.xlsx`);
}
