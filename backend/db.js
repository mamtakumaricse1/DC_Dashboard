const sql = require('mssql');

const config = {
  user: 'sa',
  password: 'password',
  server: 'localhost',
  database: 'DistrictDB4',
  options: {
    instanceName: 'SQLEXPRESS',
    trustServerCertificate: true
  }
};

let pool;

async function getPool() {
  if (pool) return pool;

  try {
    pool = await new sql.ConnectionPool(config).connect();
    console.log("✅ DB Connected");
    return pool;
  } catch (err) {
    console.log("❌ DB failed. Retrying in 3s...", err.message);
    await new Promise(res => setTimeout(res, 3000));
    return getPool();
  }
}

module.exports = { sql, getPool };