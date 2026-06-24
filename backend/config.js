require('dotenv').config();



module.exports = {

  jwtSecret: process.env.JWT_SECRET || 'tpi-dev-secret-change-in-production',

  /** Short-lived access token (Bearer). */
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',

  /** Long-lived refresh token (opaque, stored hashed). */
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',

  appConfig: {

    districtId: process.env.DISTRICT_ID || 'tirap'

  },

  db: {

    user: process.env.DB_USER || 'sa',

    password: process.env.DB_PASSWORD || 'password',

    server: process.env.DB_SERVER || 'localhost',

    database: process.env.DB_NAME || 'DistrictDB4',

    options: {

      instanceName: process.env.DB_INSTANCE || 'SQLEXPRESS',

      trustServerCertificate: true

    }

  }

};

