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
  // Use /tmp directory on Render/Linux, or local project folder in development
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

  // Save database to file after write operations safely
  sequelize.addHook('afterCreate', () => saveDatabaseToFile(dbPath));
  sequelize.addHook('afterDestroy', () => saveDatabaseToFile(dbPath));
  sequelize.addHook('afterUpdate', () => saveDatabaseToFile(dbPath));
  sequelize.addHook('afterSave', () => saveDatabaseToFile(dbPath));
  sequelize.addHook('afterUpsert', () => saveDatabaseToFile(dbPath));
  sequelize.addHook('afterBulkCreate', () => saveDatabaseToFile(dbPath));
  sequelize.addHook('afterBulkDestroy', () => saveDatabaseToFile(dbPath));
  sequelize.addHook('afterBulkUpdate', () => saveDatabaseToFile(dbPath));
}

export async function saveDatabaseToFile(targetPath) {
  try {
    const dbPath = targetPath || (
      process.env.NODE_ENV === 'production' || process.env.RENDER
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
    console.error('Failed to persist SQLite database to disk:', error);
  }
}