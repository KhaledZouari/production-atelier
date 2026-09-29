import { pool } from '../config/db.js';

export const ensureOperationSchema = async () => {
  await pool.query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Operations' AND xtype='U')
    CREATE TABLE Operations(
      id INT IDENTITY(1,1) PRIMARY KEY,
      code NVARCHAR(20) UNIQUE NOT NULL,
      nom NVARCHAR(255) NOT NULL,
      tailleLot INT NOT NULL,
      objectifHeure FLOAT NOT NULL,
      tempsMinutes FLOAT NULL,
      active BIT DEFAULT 1
    );

    IF COL_LENGTH('Operations','objectifHeure') IS NOT NULL
      ALTER TABLE Operations ALTER COLUMN objectifHeure FLOAT NOT NULL;

    IF COL_LENGTH('Operations','tempsMinutes') IS NULL
      ALTER TABLE Operations ADD tempsMinutes FLOAT NULL;

    IF COL_LENGTH('Operations','tempsMinutes') IS NOT NULL
      ALTER TABLE Operations ALTER COLUMN tempsMinutes FLOAT NULL;
  `);
};
