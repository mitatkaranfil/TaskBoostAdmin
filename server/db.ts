import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

console.log("Veritabanı bağlantı bilgileri:");
console.log("Host:", process.env.DB_HOST);
console.log("Database:", process.env.DB_NAME);
console.log("Port:", process.env.DB_PORT);
console.log("User:", process.env.DB_USER);
console.log("URL:", process.env.DATABASE_URL);

let pool;

// Railway ve diğer hosting platformları için DATABASE_URL değişkenini kontrol et
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
} else {
  // Yerel geliştirme ortamı için ayrı değişkenleri kullan
  pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '5432'),
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

// Bağlantıyı test et
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Veritabanı bağlantı hatası:', err);
  } else {
    console.log('Veritabanı bağlantısı başarılı:', res.rows[0]);
  }
});

// Bağlantı hatalarını dinle
pool.on('error', (err) => {
  console.error('Veritabanı havuzu hatası:', err);
});

export default pool; 