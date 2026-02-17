import Papa from 'papaparse';
import { createReadStream } from 'fs';
import { readFile } from 'fs/promises';

/**
* Parse CSV file and return array of objects
* @param {string} filepath - Path to CSV file
* @param {object} options - Papa Parse options
* @returns {Promise<Array>} Parsed data
*/
export async function parseCSVFile(filepath, options = {}) {
    const fileContent = await readFile(filepath, 'utf-8');
    
    return new Promise((resolve, reject) => {
    Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        ...options,
        complete: (results) => {
        if (results.errors.length > 0) {
            console.warn(`CSV parsing warnings for ${filepath}:`, results.errors.slice(0, 5));
        }
        resolve(results.data);
        },
        error: (error) => {
        reject(error);
        }
    });
    });
}

/**
* Stream parse large CSV file
* @param {string} filepath - Path to CSV file
* @param {function} onRow - Callback for each row
*/
export function streamParseCSV(filepath, onRow) {
    return new Promise((resolve, reject) => {
    const stream = createReadStream(filepath);
    let rowCount = 0;
    
    Papa.parse(stream, {
        header: true,
        skipEmptyLines: true,
        step: (row) => {
        rowCount++;
        onRow(row.data, rowCount);
        },
        complete: () => {
        console.log(`Processed ${rowCount} rows from ${filepath}`);
        resolve(rowCount);
        },
        error: (error) => {
        reject(error);
        }
    });
    });
}