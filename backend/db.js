/**

 * SQL Server connection pool (singleton).

 * Retries every 3s if the database is not yet available at startup.

 */

const sql = require('mssql');

const { db: dbConfig } = require('./config');



let pool;
let connecting = null;

async function connectPool() {
  const next = await new sql.ConnectionPool(dbConfig).connect();
  console.log(`DB connected (${dbConfig.database})`);
  return next;
}

async function getPool() {
  if (pool?.connected) return pool;

  if (pool && !pool.connected) {
    try {
      await pool.close();
    } catch {
      /* ignore stale pool close errors */
    }
    pool = null;
  }

  if (connecting) return connecting;

  connecting = (async () => {
    try {
      pool = await connectPool();
      return pool;
    } catch (err) {
      console.log('DB failed, retrying in 3s...', err.message);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      pool = await connectPool();
      return pool;
    } finally {
      connecting = null;
    }
  })();

  return connecting;
}

/** Drop pool after request errors (e.g. connection lost). */
function resetPool() {
  pool = null;
  connecting = null;
}



module.exports = { sql, getPool, resetPool };

