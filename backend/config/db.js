import sql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Ensure env is loaded before reading it (module is imported before server config runs).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

// Legacy support: SQL_SERVER can be "HOST" or "HOST\\INSTANCE"
const legacyServer = process.env.SQL_SERVER || '';
const [legacyHost, legacyInstance] = legacyServer.includes('\\') ? legacyServer.split('\\') : [legacyServer, undefined];

const serverHost = process.env.SQL_HOST || legacyHost || 'localhost';
const port = process.env.SQL_PORT ? Number(process.env.SQL_PORT) : undefined;
const instanceName = port ? undefined : process.env.SQL_INSTANCE || legacyInstance;
const useTrusted = (process.env.SQL_TRUSTED || '').toLowerCase() === 'true';

const config = {
  server: serverHost,
  database: process.env.SQL_DB || 'production_atelier',
  port,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    instanceName: instanceName || undefined,
    enableArithAbort: true
  }
};

if (useTrusted) {
  // Windows auth (NTLM). Provide domain/user/password if required by the SQL Server instance.
  config.authentication = {
    type: 'ntlm',
    options: {
      domain: process.env.SQL_DOMAIN || undefined,
      userName: process.env.SQL_USER || '',
      password: process.env.SQL_PASSWORD || ''
    }
  };
} else {
  // Default to SQL login
  config.user = process.env.SQL_USER || 'sa';
  config.password = process.env.SQL_PASSWORD || '';
}

// Debug the effective DB config (without sensitive data) to spot env issues.
console.log('DB config:', {
  server: config.server,
  database: config.database,
  port: config.port,
  instanceName: config.options.instanceName,
  auth: useTrusted ? 'ntlm' : 'sql',
  user: useTrusted ? process.env.SQL_USER : config.user
});

export const pool = new sql.ConnectionPool(config);

export const connectDB = async () => {
  if (pool.connected) return pool;
  const target = `${serverHost}${instanceName ? '\\\\' + instanceName : ''}${port ? ':' + port : ''}`;
  const authMode = useTrusted ? 'ntlm' : 'sql';
  try {
    console.log(`Connecting to SQL -> ${target} [auth=${authMode}]`);
    await pool.connect();
    console.log(`SQL Server connected -> ${target}`);
    return pool;
  } catch (err) {
    console.error(`SQL connection failed -> ${target} [auth=${authMode}]`);
    throw err;
  }
};

export { sql };
