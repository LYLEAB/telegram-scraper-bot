import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const excelDataStr = formData.get('excelData');
    const filenameStr = formData.get('filename');

    if (!excelDataStr || typeof excelDataStr !== 'string') {
      return NextResponse.json({ error: 'Missing excelData' }, { status: 400 });
    }

    const excelData: any[][] = JSON.parse(excelDataStr);
    const filename = typeof filenameStr === 'string' ? filenameStr : 'Export.xlsx';

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Submissions');

    const headers = excelData[1]; // Index 1 is headers since Index 0 is title

    // Add rows
    excelData.forEach((row, index) => {
      worksheet.addRow(row);
    });

    // Merge title row
    worksheet.mergeCells(`A1:${String.fromCharCode(64 + headers.length)}1`);
    const titleCell = worksheet.getCell('A1');
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002060' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Set column widths
    worksheet.columns.forEach((col, i) => {
      const headerName = headers[i];
      if (i === 0) col.width = 12; // Date
      else if (headerName === 'Brand') col.width = 25;
      else if (headerName === 'Notes' || headerName === 'Remark' || headerName === 'Other') col.width = 35;
      else col.width = 18;
    });

    // Style headers (Row 2)
    const headerRow = worksheet.getRow(2);
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF002060' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
      };
    });

    // Style data rows (Row 3 onwards)
    for (let r = 3; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      const isEven = (r - 2) % 2 === 0; // Data index starts from 1
      row.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 10 };
        if (cell.value && typeof cell.value === 'object' && 'hyperlink' in cell.value) {
          cell.font = { ...cell.font, color: { argb: 'FF0563C1' }, underline: true };
        }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFF2CC' : 'FFD9E1F2' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFB4C6E7' } },
          bottom: { style: 'thin', color: { argb: 'FFB4C6E7' } },
          left: { style: 'thin', color: { argb: 'FFB4C6E7' } },
          right: { style: 'thin', color: { argb: 'FFB4C6E7' } }
        };
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error('Error generating Excel:', error);
    return NextResponse.json({ error: 'Failed to generate Excel file' }, { status: 500 });
  }
}
