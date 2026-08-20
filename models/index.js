import { Sequelize } from 'sequelize';
import sqlJsAsSqlite3 from 'sql.js-as-sqlite3';
import fs from 'fs';
import path from 'path';

const isUsingRDS = process.env.RDS_HOSTNAME && process.env.RDS_USERNAME && process.env.RDS_PASSWORD;
const dbType = process.env.DB_TYPE || 'mysql';
const defaultPorts = {
  mysql: 3306,
  postgres: 5432,
};
const defaultPort = defaultPorts[dbType];

export let sequelize;

if (isUsingRDS) {
  sequelize = new Sequelize({
    database: process.env.RDS_DB_NAME,
    username: process.env.RDS_USERNAME,
    password: process.env.RDS_PASSWORD,
    host: process.env.RDS_HOSTNAME,
    port: process.env.RDS_PORT || defaultPort,
    dialect: dbType,
    logging: false
  });
} else {
  // Use /tmp for SQLite on Render/Linux, or local project directory in development
  const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER;
  const dbPath = isProduction
    ? '/tmp/database.sqlite'
    : path.join(process.cwd(), 'database.sqlite');

  sequelize = new Sequelize({
    dialect: 'sqlite',
    dialectModule: sqlJsAsSqlite3,
    storage: dbPath,
    logging: false
  });

  // Non-blocking save helper to prevent unhandled promise rejections
  const safeSave = () => {
    saveDatabaseToFile(dbPath).catch((err) => {
      console.error('Database persist warning:', err.message);
    });
  };

  // Attach hooks safely
  sequelize.addHook('afterCreate', safeSave);
  sequelize.addHook('afterDestroy', safeSave);
  sequelize.addHook('afterUpdate', safeSave);
  sequelize.addHook('afterSave', safeSave);
  sequelize.addHook('afterUpsert', safeSave);
  sequelize.addHook('afterBulkCreate', safeSave);
  sequelize.addHook('afterBulkDestroy', safeSave);
  sequelize.addHook('afterBulkUpdate', safeSave);
}

export async function saveDatabaseToFile(targetPath) {
  try {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER;
    const dbPath = targetPath || (
      isProduction
        ? '/tmp/database.sqlite'
        : path.join(process.cwd(), 'database.sqlite')
    );

    const dbInstance = await sequelize.connectionManager.getConnection();
    if (dbInstance && dbInstance.database) {
      const binaryArray = dbInstance.database.export();
      const buffer = Buffer.from(binaryArray);
      fs.writeFileSync(dbPath, buffer);
    }
  } catch (error) {
    console.error('Failed to write SQLite database to file:', error.message);
  }
}