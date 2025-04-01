import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

console.log("Veritabanı bağlantı bilgileri:");
console.log("Host:", process.env.DB_HOST);
console.log("Database:", process.env.DB_NAME);
console.log("Port:", process.env.DB_PORT);
console.log("User:", process.env.DB_USER);
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Ayarlanmış" : "Ayarlanmamış");

// Railway bağlantı URL'si
const DATABASE_URL = 'postgresql://postgres:YlKAZqJYqlXRJxRKqOgTMrSVbglXFSax@centerbeam.proxy.rlwy.net:18121/railway';

// Varsayılan boş bir pool oluştur
let pool: pkg.Pool;

// Railway ve diğer hosting platformları için DATABASE_URL değişkenini kontrol et
try {
  console.log("DATABASE_URL kullanılıyor");
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  console.log("DATABASE_URL ile veritabanı havuzu oluşturuldu");

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
} catch (error) {
  console.error("Veritabanı havuzu oluşturma hatası:", error);
  // Hata durumunda varsayılan bir pool oluştur ki uygulama çökmesin
  pool = new Pool({
    // Boş bir havuz
    max: 1
  });
}

export default pool;