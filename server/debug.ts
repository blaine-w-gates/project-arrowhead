import fs from 'fs';
import path from 'path';

const logFile = path.resolve(process.cwd(), 'server-debug.log');

export function debugLog(message: string) {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${message}\n`;
    try {
        fs.appendFileSync(logFile, line);
    } catch (err) {
        // ignore
    }
}
