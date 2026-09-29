import dotenv from 'dotenv';
dotenv.config();
import bcrypt from 'bcryptjs';
import { connectDB, pool } from './config/db.js';

const run = async () => {
  await connectDB();

  // Create tables if not exist
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

    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Employees' AND xtype='U')
    CREATE TABLE Employees(
      id INT IDENTITY(1,1) PRIMARY KEY,
      matricule NVARCHAR(50) UNIQUE NOT NULL,
      nom NVARCHAR(255) NOT NULL,
      prenom NVARCHAR(255) NOT NULL,
      photo NVARCHAR(500) NULL,
      chaine NVARCHAR(20) NULL,
      dateEmbauche DATE NULL,
      active BIT DEFAULT 1
    );

    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
    CREATE TABLE Users(
      id INT IDENTITY(1,1) PRIMARY KEY,
      username NVARCHAR(50) UNIQUE NOT NULL,
      password NVARCHAR(255) NOT NULL,
      role NVARCHAR(20) NOT NULL,
      employeeId INT NULL,
      actif BIT DEFAULT 1
    );

    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Productions' AND xtype='U')
    CREATE TABLE Productions(
      id INT IDENTITY(1,1) PRIMARY KEY,
      employeeId INT NOT NULL,
      operationId INT NOT NULL,
      chaine NVARCHAR(50) NOT NULL,
      date DATE NOT NULL,
      heureDebut NVARCHAR(5) NOT NULL,
      heureFin NVARCHAR(5) NOT NULL,
      nbLots INT NOT NULL,
      totalPieces INT NULL,
      heuresTravail FLOAT NULL,
      piecesParHeure FLOAT NULL,
      rendement FLOAT NULL,
      valide BIT DEFAULT 0,
      validePar INT NULL
    );

    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Attendance' AND xtype='U')
    CREATE TABLE Attendance(
      id INT IDENTITY(1,1) PRIMARY KEY,
      employeeId INT NOT NULL,
      date DATE NOT NULL,
      present BIT NOT NULL DEFAULT 1,
      remark NVARCHAR(500) NULL,
      createdAt DATETIME DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Orders' AND xtype='U')
    CREATE TABLE Orders(
      id INT IDENTITY(1,1) PRIMARY KEY,
      numeroOF NVARCHAR(50) UNIQUE NOT NULL,
      numeroCommande NVARCHAR(50) NULL,
      reference NVARCHAR(255) NULL,
      client NVARCHAR(255) NULL,
      dateOF DATE NULL,
      semaineLiv NVARCHAR(10) NULL,
      quantiteTotale INT NOT NULL DEFAULT 0,
      statut NVARCHAR(20) NOT NULL DEFAULT 'en_attente',
      usine NVARCHAR(100) NULL,
      ficheTechUrl NVARCHAR(500) NULL,
      notes NVARCHAR(500) NULL,
      createdAt DATETIME DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='OrderShipments' AND xtype='U')
    CREATE TABLE OrderShipments(
      id INT IDENTITY(1,1) PRIMARY KEY,
      orderId INT NOT NULL,
      codeLivraison NVARCHAR(50) NULL,
      dateLivraison DATE NULL,
      quantite INT NOT NULL DEFAULT 0,
      commentaire NVARCHAR(500) NULL,
      createdAt DATETIME DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='OrderFlows' AND xtype='U')
    CREATE TABLE OrderFlows(
      id INT IDENTITY(1,1) PRIMARY KEY,
      orderId INT NOT NULL,
      chaine NVARCHAR(50) NULL,
      date DATE NOT NULL,
      qtyEntree INT NULL,
      qtySortie INT NULL,
      remarque NVARCHAR(500) NULL,
      createdAt DATETIME DEFAULT GETDATE()
    );
  `);

  const defaultOps = [
    { code: 'OP01', nom: 'Piquage droit', tailleLot: 20, objectifHeure: 50 },
    { code: 'OP02', nom: 'Surjet', tailleLot: 25, objectifHeure: 60 },
    { code: 'OP03', nom: 'Pose fermeture', tailleLot: 10, objectifHeure: 30 },
    { code: 'OP04', nom: 'Montage manche', tailleLot: 15, objectifHeure: 35 },
    { code: 'OP05', nom: 'Surpiqûre', tailleLot: 20, objectifHeure: 45 },
    { code: 'OP06', nom: 'Ourlet', tailleLot: 30, objectifHeure: 70 }
  ];

  await pool.query('DELETE FROM Productions');
  await pool.query('DELETE FROM Operations');
  for (const op of defaultOps) {
    await pool
      .request()
      .input('code', op.code)
      .input('nom', op.nom)
      .input('tailleLot', op.tailleLot)
      .input('objectifHeure', op.objectifHeure)
      .query('INSERT INTO Operations (code, nom, tailleLot, objectifHeure, active) VALUES (@code,@nom,@tailleLot,@objectifHeure,1)');
  }

  await pool.query('DELETE FROM Users');
  const hash = await bcrypt.hash('admin123', 10);
  await pool
    .request()
    .input('username', 'admin')
    .input('password', hash)
    .input('role', 'admin')
    .query('INSERT INTO Users (username, password, role, actif) VALUES (@username,@password,@role,1)');

  console.log('Seed done');
  process.exit(0);
};

run();
