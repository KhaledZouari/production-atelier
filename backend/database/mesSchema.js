import { pool } from '../config/db.js';

export const ensureMesSchema = async () => {
  await pool.query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MesWorkshops' AND xtype='U')
    CREATE TABLE MesWorkshops(
      id INT IDENTITY(1,1) PRIMARY KEY,
      code NVARCHAR(50) UNIQUE NOT NULL,
      name NVARCHAR(255) NOT NULL,
      active BIT NOT NULL DEFAULT 1,
      createdAt DATETIME NOT NULL DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MesProductionLines' AND xtype='U')
    CREATE TABLE MesProductionLines(
      id INT IDENTITY(1,1) PRIMARY KEY,
      workshopId INT NULL,
      code NVARCHAR(50) UNIQUE NOT NULL,
      name NVARCHAR(255) NOT NULL,
      teamName NVARCHAR(100) NULL,
      active BIT NOT NULL DEFAULT 1,
      createdAt DATETIME NOT NULL DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MesWorkstations' AND xtype='U')
    CREATE TABLE MesWorkstations(
      id INT IDENTITY(1,1) PRIMARY KEY,
      lineId INT NULL,
      code NVARCHAR(50) UNIQUE NOT NULL,
      name NVARCHAR(255) NOT NULL,
      active BIT NOT NULL DEFAULT 1,
      createdAt DATETIME NOT NULL DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MesEmployeeAssignments' AND xtype='U')
    CREATE TABLE MesEmployeeAssignments(
      id INT IDENTITY(1,1) PRIMARY KEY,
      employeeId INT NOT NULL,
      workshopId INT NULL,
      lineId INT NULL,
      workstationId INT NULL,
      teamName NVARCHAR(100) NULL,
      startDate DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
      endDate DATE NULL,
      active BIT NOT NULL DEFAULT 1,
      createdAt DATETIME NOT NULL DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MesOperationStandards' AND xtype='U')
    CREATE TABLE MesOperationStandards(
      id INT IDENTITY(1,1) PRIMARY KEY,
      operationId INT NULL,
      articleReference NVARCHAR(255) NULL,
      articleDesignation NVARCHAR(255) NULL,
      color NVARCHAR(100) NULL,
      size NVARCHAR(50) NULL,
      samMinutes DECIMAL(10,2) NOT NULL,
      active BIT NOT NULL DEFAULT 1,
      createdAt DATETIME NOT NULL DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MesTrackingSheets' AND xtype='U')
    CREATE TABLE MesTrackingSheets(
      id INT IDENTITY(1,1) PRIMARY KEY,
      sheetNumber NVARCHAR(50) UNIQUE NOT NULL,
      sheetDate DATE NOT NULL,
      orderId INT NULL,
      articleReference NVARCHAR(255) NULL,
      articleDesignation NVARCHAR(255) NULL,
      client NVARCHAR(255) NULL,
      color NVARCHAR(100) NULL,
      size NVARCHAR(50) NULL,
      orderQuantity INT NOT NULL DEFAULT 0,
      producedQuantity INT NOT NULL DEFAULT 0,
      status NVARCHAR(30) NOT NULL DEFAULT 'en_attente',
      createdAt DATETIME NOT NULL DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MesBarcodeSequences' AND xtype='U')
    CREATE TABLE MesBarcodeSequences(
      year INT PRIMARY KEY,
      lastNumber INT NOT NULL DEFAULT 0
    );

    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MesProductionBaskets' AND xtype='U')
    CREATE TABLE MesProductionBaskets(
      id INT IDENTITY(1,1) PRIMARY KEY,
      basketCode NVARCHAR(50) UNIQUE NOT NULL,
      barcodeValue NVARCHAR(100) NOT NULL,
      qrPayload NVARCHAR(MAX) NOT NULL,
      trackingSheetId INT NULL,
      orderId INT NULL,
      articleReference NVARCHAR(255) NULL,
      articleDesignation NVARCHAR(255) NULL,
      color NVARCHAR(100) NULL,
      size NVARCHAR(50) NULL,
      quantity INT NOT NULL DEFAULT 0,
      currentOperationId INT NULL,
      currentOperationName NVARCHAR(255) NULL,
      nextOperationId INT NULL,
      nextOperationName NVARCHAR(255) NULL,
      employeeId INT NULL,
      workshopId INT NULL,
      lineId INT NULL,
      workshopName NVARCHAR(255) NULL,
      lineName NVARCHAR(255) NULL,
      createdAt DATETIME NOT NULL DEFAULT GETDATE(),
      status NVARCHAR(30) NOT NULL DEFAULT 'en_attente',
      blockedReason NVARCHAR(500) NULL
    );

    IF EXISTS (SELECT * FROM sysobjects WHERE name='MesProductionBaskets' AND xtype='U')
      AND COL_LENGTH('MesProductionBaskets', 'color') IS NULL
      ALTER TABLE MesProductionBaskets ADD color NVARCHAR(100) NULL;
    IF EXISTS (SELECT * FROM sysobjects WHERE name='MesProductionBaskets' AND xtype='U')
      AND COL_LENGTH('MesProductionBaskets', 'size') IS NULL
      ALTER TABLE MesProductionBaskets ADD size NVARCHAR(50) NULL;
    IF EXISTS (SELECT * FROM sysobjects WHERE name='MesProductionBaskets' AND xtype='U')
      ALTER TABLE MesProductionBaskets ALTER COLUMN qrPayload NVARCHAR(MAX) NOT NULL;

    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MesTrackingSheetOperations' AND xtype='U')
    CREATE TABLE MesTrackingSheetOperations(
      id INT IDENTITY(1,1) PRIMARY KEY,
      trackingSheetId INT NOT NULL,
      operationId INT NULL,
      operationName NVARCHAR(255) NOT NULL,
      sequenceNo INT NOT NULL DEFAULT 1,
      basketId INT NULL,
      employeeId INT NULL,
      workstationName NVARCHAR(255) NULL,
      quantity INT NOT NULL DEFAULT 0,
      entryTime DATETIME NULL,
      exitTime DATETIME NULL,
      status NVARCHAR(30) NOT NULL DEFAULT 'en_attente',
      createdAt DATETIME NOT NULL DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MesProductionEntries' AND xtype='U')
    CREATE TABLE MesProductionEntries(
      id INT IDENTITY(1,1) PRIMARY KEY,
      employeeId INT NOT NULL,
      operationId INT NULL,
      workshopId INT NULL,
      lineId INT NULL,
      workstationId INT NULL,
      trackingSheetId INT NULL,
      basketId INT NULL,
      entryDate DATE NOT NULL,
      startTime NVARCHAR(5) NOT NULL,
      endTime NVARCHAR(5) NOT NULL,
      samMinutes DECIMAL(10,2) NOT NULL,
      quantityProduced INT NOT NULL DEFAULT 0,
      realWorkedMinutes DECIMAL(10,2) NOT NULL,
      efficiency DECIMAL(10,2) NOT NULL,
      createdBy INT NULL,
      createdAt DATETIME NOT NULL DEFAULT GETDATE()
    );

    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MesProductionTraces' AND xtype='U')
    CREATE TABLE MesProductionTraces(
      id INT IDENTITY(1,1) PRIMARY KEY,
      basketId INT NULL,
      trackingSheetId INT NULL,
      productionEntryId INT NULL,
      employeeId INT NULL,
      operationId INT NULL,
      operationName NVARCHAR(255) NULL,
      traceDate DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
      traceTime DATETIME NOT NULL DEFAULT GETDATE(),
      quantity INT NOT NULL DEFAULT 0,
      status NVARCHAR(30) NULL,
      note NVARCHAR(500) NULL
    );

    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MesAlerts' AND xtype='U')
    CREATE TABLE MesAlerts(
      id INT IDENTITY(1,1) PRIMARY KEY,
      alertType NVARCHAR(50) NOT NULL,
      severity NVARCHAR(20) NOT NULL DEFAULT 'warning',
      title NVARCHAR(255) NOT NULL,
      message NVARCHAR(1000) NULL,
      entityType NVARCHAR(50) NULL,
      entityId INT NULL,
      thresholdValue DECIMAL(10,2) NULL,
      actualValue DECIMAL(10,2) NULL,
      status NVARCHAR(30) NOT NULL DEFAULT 'open',
      createdAt DATETIME NOT NULL DEFAULT GETDATE(),
      acknowledgedAt DATETIME NULL,
      acknowledgedBy INT NULL
    );

    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_MesProductionEntries_DateEmployee')
      CREATE INDEX IX_MesProductionEntries_DateEmployee ON MesProductionEntries(entryDate, employeeId);
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_MesProductionTraces_Basket')
      CREATE INDEX IX_MesProductionTraces_Basket ON MesProductionTraces(basketId, traceTime);
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IX_MesBaskets_Status')
      CREATE INDEX IX_MesBaskets_Status ON MesProductionBaskets(status, createdAt);
  `);
};
