import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx-js-style';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const excelData = JSON.parse(formData.get('excelData') as string);
    const filename = formData.get('filename') as string;

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);

    // Merge title
    const headerRowLength = excelData[1] ? excelData[1].length : 10;
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: headerRowLength - 1 } });

    // Set column widths
    ws['!cols'] = excelData[1].map((h: string, i: number) => {
      if (i === 0) return { wch: 6 };
      if (h === 'Brand') return { wch: 25 };
      if (h === 'Notes' || h === 'Remark' || h === 'Other') return { wch: 30 };
      return { wch: 15 };
    });

    // Add Styles
    for (let R = 0; R < excelData.length; ++R) {
      for (let C = 0; C < headerRowLength; ++C) {
        const cell_address = {c: C, r: R};
        const cell_ref = XLSX.utils.encode_cell(cell_address);
        if (!ws[cell_ref]) ws[cell_ref] = { t: 's', v: '' }; // Fallback

        if (R === 0) {
          // Title
          ws[cell_ref].s = {
            font: { name: 'Arial', sz: 14, bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "002060" } },
            alignment: { vertical: "center", horizontal: "center" }
          };
        } else if (R === 1) {
          // Headers
          ws[cell_ref].s = {
            font: { name: 'Arial', sz: 10, bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "002060" } },
            alignment: { vertical: "center", horizontal: "center" },
            border: {
              top: { style: 'thin', color: { rgb: "FFFFFF" } },
              bottom: { style: 'thin', color: { rgb: "FFFFFF" } },
              left: { style: 'thin', color: { rgb: "FFFFFF" } },
              right: { style: 'thin', color: { rgb: "FFFFFF" } }
            }
          };
        } else {
          // Data
          const isEven = R % 2 === 0;
          ws[cell_ref].s = {
            font: { name: 'Arial', sz: 10 },
            fill: { fgColor: { rgb: isEven ? "FFF2CC" : "D9E1F2" } },
            alignment: { vertical: "center", horizontal: "center" },
            border: {
              top: { style: 'thin', color: { rgb: "B4C6E7" } },
              bottom: { style: 'thin', color: { rgb: "B4C6E7" } },
              left: { style: 'thin', color: { rgb: "B4C6E7" } },
              right: { style: 'thin', color: { rgb: "B4C6E7" } }
            }
          };
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Submissions');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    return new NextResponse(wbout, {
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
