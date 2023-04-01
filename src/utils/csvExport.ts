import { createObjectCsvWriter } from 'csv-writer';
import { logger } from '../logger/index.js';

interface CsvData {
    [key: string]: string | number;
}
interface Header {
    id: string
    title: string
}

export const csvExport = async (path: string, data: CsvData[], headers: Header[]) => {
    const csvWriter = createObjectCsvWriter({
        path,
        header: headers
    });

    try {
        await csvWriter.writeRecords(data);
        return true
    } catch (error) {
        logger.error(error);
        return false
    }
}