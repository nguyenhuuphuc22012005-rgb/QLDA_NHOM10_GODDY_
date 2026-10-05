const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

const dbDialect = process.env.DB_DIALECT || 'mssql';

let sequelize;

if (dbDialect === 'postgres' || dbDialect === 'postgresql') {
  if (process.env.DATABASE_URL) {
    sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: process.env.DB_SSL === 'false' ? false : {
          require: true,
          rejectUnauthorized: false
        }
      },
      logging: false
    });
  } else {
    sequelize = new Sequelize(
      process.env.DB_NAME || 'postgres',
      process.env.DB_USER || 'postgres',
      process.env.DB_PASSWORD || '',
      {
        host: process.env.DB_SERVER || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        dialect: 'postgres',
        dialectOptions: {
          ssl: process.env.DB_SSL === 'false' ? false : {
            require: true,
            rejectUnauthorized: false
          }
        },
        logging: false
      }
    );
  }
} else if (dbDialect === 'mssql') {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'QLDA_NHOM10_GODDY',
    process.env.DB_USER || 'sa',
    process.env.DB_PASSWORD || '123456',
    {
      host: process.env.DB_SERVER || 'localhost',
      port: parseInt(process.env.DB_PORT) || 1433,
      dialect: 'mssql',
      dialectOptions: {
        instanceName: process.env.DB_INSTANCE || undefined,
        options: {
          encrypt: process.env.DB_ENCRYPT === 'true',
          trustServerCertificate: true,
          enableArithAbort: true
        }
      },
      logging: false
    }
  );
} else {
  // SQLite Portable Fallback (Zero-config)
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', 'database.sqlite'),
    logging: false
  });
}

module.exports = sequelize;
