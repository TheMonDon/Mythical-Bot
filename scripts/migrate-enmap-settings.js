const path = require('path');
const Database = require('better-sqlite3');
const mysql = require('mysql2/promise');
const config = require('../config.js');

const quoteIdentifier = (identifier) => `\`${identifier.replaceAll('`', '``')}\``;

async function migrate() {
  if (!config.mysql?.host || !config.mysql?.database) {
    throw new Error('MySQL host and database must be configured in config.js.');
  }

  const sqlitePath = path.resolve(__dirname, '../data/enmap.sqlite');
  const sqlite = new Database(sqlitePath, { readonly: true, fileMustExist: true });
  let connection;

  try {
    const legacySettings = sqlite.prepare('SELECT key, value FROM settings').all();
    const setupConnection = await mysql.createConnection({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
    });

    try {
      await setupConnection.query(`CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(config.mysql.database)}`);
    } finally {
      await setupConnection.end();
    }

    connection = await mysql.createConnection({ ...config.mysql, multipleStatements: false });
    await connection.execute(/* sql */ `
      CREATE TABLE IF NOT EXISTS bot_settings (
        setting_id VARCHAR(30) NOT NULL,
        settings JSON NOT NULL,
        PRIMARY KEY (setting_id)
      ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
    `);

    await connection.beginTransaction();
    let imported = 0;
    let skipped = 0;

    for (const { key, value } of legacySettings) {
      const settings = JSON.parse(value);
      if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
        throw new Error(`Enmap setting "${key}" is not a JSON object.`);
      }

      const [result] = await connection.execute(
        /* sql */ `
          INSERT IGNORE INTO bot_settings (setting_id, settings)
          VALUES
            (?, ?)
        `,
        [key, JSON.stringify(settings)],
      );
      if (result.affectedRows === 1) imported++;
      else skipped++;
    }

    await connection.commit();
    console.log(`Settings migration complete. Imported: ${imported}; already present: ${skipped}.`);
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    throw error;
  } finally {
    sqlite.close();
    if (connection) await connection.end();
  }
}

migrate().catch((error) => {
  console.error('Settings migration failed:', error);
  process.exitCode = 1;
});
