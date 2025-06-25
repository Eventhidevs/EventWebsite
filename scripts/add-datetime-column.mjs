import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to convert date+time in IST to UTC ISO string (same logic as api/events.js)
function toUTC(date, time) {
  if (!date || !time) return undefined;
  time = time.trim();
  
  // Convert date to YYYY-MM-DD if it's in M/D/YYYY or D/M/YYYY format
  let dateParts = date.split('/');
  let year, month, day;
  if (dateParts.length === 3) {
    // If year is first (YYYY/MM/DD), use as is
    if (dateParts[0].length === 4) {
      year = dateParts[0];
      month = dateParts[1].padStart(2, '0');
      day = dateParts[2].padStart(2, '0');
    } else {
      // Assume M/D/YYYY format
      month = dateParts[0].padStart(2, '0');
      day = dateParts[1].padStart(2, '0');
      year = dateParts[2];
    }
    date = `${year}-${month}-${day}`;
  }
  
  // Parse time and convert to 24-hour format
  let hour, minute;
  const timeMatch = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (timeMatch) {
    hour = parseInt(timeMatch[1]);
    minute = parseInt(timeMatch[2]);
    const period = timeMatch[3].toUpperCase();
    
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
  } else {
    return undefined;
  }
  
  // Create IST datetime string
  const istString = `${date}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00+05:30`;
  
  try {
    // Parse and convert to UTC
    const istDate = new Date(istString);
    if (isNaN(istDate.getTime())) {
      console.log(`Invalid IST date: { date: '${date}', time: '${time}', istString: '${istString}' }`);
      return undefined;
    }
    return istDate.toISOString();
  } catch (error) {
    console.log(`Error parsing date: { date: '${date}', time: '${time}', istString: '${istString}' }`);
    return undefined;
  }
}

async function addDatetimeColumn() {
  try {
    // Read the CSV file
    const csvPath = path.join(__dirname, '..', 'data', 'dataBase.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    
    // Parse CSV
    const results = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true
    });
    
    console.log(`Processing ${results.data.length} events...`);
    
    // Add start_datetime_utc to each row
    let validCount = 0;
    let invalidCount = 0;
    
    results.data.forEach((row, index) => {
      const utcString = toUTC(row.start_date, row.start_time);
      row.start_datetime_utc = utcString;
      
      if (utcString) {
        validCount++;
      } else {
        invalidCount++;
        console.log(`Row ${index + 1}: Could not parse date for "${row.event_name}"`);
      }
    });
    
    console.log(`\nResults:`);
    console.log(`✅ Valid dates: ${validCount}`);
    console.log(`❌ Invalid dates: ${invalidCount}`);
    
    // Convert back to CSV
    const updatedCsv = Papa.unparse(results.data);
    
    // Write back to file
    await fs.writeFile(csvPath, updatedCsv);
    
    console.log(`\n✅ Successfully added start_datetime_utc column to ${csvPath}`);
    console.log(`📊 Total events processed: ${results.data.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

addDatetimeColumn(); 