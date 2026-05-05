import * as XLSX from 'xlsx';
import * as fs from 'fs';

const filePath = 'e:/GitHub/NetPlus Manager/ntc_nodes_2026-05-05.xlsx';
const fileBuffer = fs.readFileSync(filePath);
const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('Total Rows in Excel:', data.length);
data.forEach((row: any, i) => {
    console.log(`Row ${i+1}: Node ID = "${row['Node ID']}", Name = "${row['Site Name']}"`);
});
