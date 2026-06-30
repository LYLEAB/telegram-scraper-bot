const XLSX = require('xlsx');

const workbook = XLSX.readFile('supabase/seed/MI Competitor Price Update Monthly - Copy.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
for (let i = 0; i < 10; i++) {
  if (data[i]) {
    console.log(`--- ROW ${i} ---`);
    console.log(JSON.stringify(data[i], null, 2));
  }
}
