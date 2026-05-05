import * as XLSX from 'xlsx';
import * as fs from 'fs';

const filePath = '/Users/subin/Github/NetPlusSiteManager/ntc_nodes_2026-05-05.xlsx';

try {
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  if (data.length > 0) {
    console.log('Headers found:', Object.keys(data[0] as object));
    console.log('Sample Row:', JSON.stringify(data[0], null, 2));
    console.log('Total Rows:', data.length);
  } else {
    console.log('No data found in sheet.');
  }
} catch (error) {
  console.error('Error reading Excel:', error);
}
