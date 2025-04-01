import pool from '../db';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  try {
    console.log('Migrations başlatılıyor...');
    
    // SQL dosyasını oku
    const sqlFilePath = path.join(__dirname, '001_initial_schema.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // SQL komutlarını çalıştır
    await pool.query(sqlContent);
    
    console.log('Migrations başarıyla tamamlandı!');
    return true;
  } catch (error) {
    console.error('Migration hatası:', error);
    return false;
  }
}
