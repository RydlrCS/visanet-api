const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

let pool = null;

/**
 * Initialize MariaDB/MySQL connection pool
 */
const initializeDatabase = async () => {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'rydlr',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'rydlr_locapay',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      // Charset for emoji support
      charset: 'utf8mb4',
      // Timezone
      timezone: '+00:00',
      // Connection timeout
      connectTimeout: 10000,
      // Automatically reconnect
      acquireTimeout: 10000,
    });

    // Test connection
    const connection = await pool.getConnection();
    logger.info('✓ MariaDB database connected successfully');
    console.log('✅ Database connected');
    connection.release();

    return pool;
  } catch (error) {
    logger.error('✗ MariaDB connection error:', error);
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
};

/**
 * Get connection pool instance
 */
const getPool = () => {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return pool;
};

/**
 * Execute a query with automatic connection handling
 */
const query = async (sql, params = []) => {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    logger.error('Database query error:', error);
    throw error;
  }
};

/**
 * Execute a transaction
 */
const transaction = async (callback) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    logger.error('Transaction error:', error);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Get a single connection for complex operations
 */
const getConnection = async () => {
  return await pool.getConnection();
};

/**
 * Close database connection pool
 */
const closeDatabase = async () => {
  if (pool) {
    await pool.end();
    logger.info('Database connection pool closed');
  }
};

/**
 * Helper function to generate UUID v4
 */
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Helper function to escape identifiers
 */
const escapeId = (identifier) => {
  return '`' + identifier.replace(/`/g, '``') + '`';
};

/**
 * Helper function to build WHERE clause from object
 */
const buildWhereClause = (conditions) => {
  if (!conditions || Object.keys(conditions).length === 0) {
    return { where: '', params: [] };
  }

  const parts = [];
  const params = [];

  for (const [key, value] of Object.entries(conditions)) {
    if (value === null) {
      parts.push(`${escapeId(key)} IS NULL`);
    } else if (Array.isArray(value)) {
      parts.push(`${escapeId(key)} IN (?)`);
      params.push(value);
    } else {
      parts.push(`${escapeId(key)} = ?`);
      params.push(value);
    }
  }

  return {
    where: `WHERE ${parts.join(' AND ')}`,
    params
  };
};

/**
 * Helper function to build INSERT query
 */
const buildInsert = (table, data) => {
  const keys = Object.keys(data);
  const values = Object.values(data);
  
  const columns = keys.map(escapeId).join(', ');
  const placeholders = keys.map(() => '?').join(', ');
  
  const sql = `INSERT INTO ${escapeId(table)} (${columns}) VALUES (${placeholders})`;
  
  return { sql, params: values };
};

/**
 * Helper function to build UPDATE query
 */
const buildUpdate = (table, data, conditions) => {
  const keys = Object.keys(data);
  const values = Object.values(data);
  
  const setParts = keys.map(key => `${escapeId(key)} = ?`).join(', ');
  const { where, params: whereParams } = buildWhereClause(conditions);
  
  const sql = `UPDATE ${escapeId(table)} SET ${setParts} ${where}`;
  const params = [...values, ...whereParams];
  
  return { sql, params };
};

/**
 * Helper function for SELECT queries
 */
const buildSelect = (table, columns = '*', conditions = {}, options = {}) => {
  const { where, params } = buildWhereClause(conditions);
  
  const columnStr = Array.isArray(columns) 
    ? columns.map(escapeId).join(', ')
    : columns;
  
  let sql = `SELECT ${columnStr} FROM ${escapeId(table)} ${where}`;
  
  // Add ORDER BY
  if (options.orderBy) {
    const orderParts = Array.isArray(options.orderBy) 
      ? options.orderBy.map(o => `${escapeId(o.field)} ${o.direction || 'ASC'}`).join(', ')
      : `${escapeId(options.orderBy)} ASC`;
    sql += ` ORDER BY ${orderParts}`;
  }
  
  // Add LIMIT
  if (options.limit) {
    sql += ` LIMIT ?`;
    params.push(parseInt(options.limit));
  }
  
  // Add OFFSET
  if (options.offset) {
    sql += ` OFFSET ?`;
    params.push(parseInt(options.offset));
  }
  
  return { sql, params };
};

/**
 * Generic CRUD operations
 */
const db = {
  // Initialize
  init: initializeDatabase,
  close: closeDatabase,
  
  // Get pool/connection
  pool: getPool,
  getConnection,
  
  // Query execution
  query,
  transaction,
  
  // Helpers
  generateUUID,
  escapeId,
  
  // Query builders
  buildWhereClause,
  buildInsert,
  buildUpdate,
  buildSelect,
  
  // Convenient CRUD operations
  async findOne(table, conditions = {}) {
    const { sql, params } = buildSelect(table, '*', conditions, { limit: 1 });
    const rows = await query(sql, params);
    return rows.length > 0 ? rows[0] : null;
  },
  
  async findMany(table, conditions = {}, options = {}) {
    const { sql, params } = buildSelect(table, '*', conditions, options);
    return await query(sql, params);
  },
  
  async findById(table, id) {
    return await this.findOne(table, { id });
  },
  
  async create(table, data) {
    // Add UUID if not present
    if (!data.id) {
      data.id = generateUUID();
    }
    
    // Add timestamps
    const now = new Date();
    if (!data.createdAt) data.createdAt = now;
    if (!data.updatedAt) data.updatedAt = now;
    
    const { sql, params } = buildInsert(table, data);
    await query(sql, params);
    
    return await this.findById(table, data.id);
  },
  
  async update(table, id, data) {
    // Update timestamp
    data.updatedAt = new Date();
    
    const { sql, params } = buildUpdate(table, data, { id });
    const result = await query(sql, params);
    
    if (result.affectedRows === 0) {
      return null;
    }
    
    return await this.findById(table, id);
  },
  
  async delete(table, id) {
    const sql = `DELETE FROM ${escapeId(table)} WHERE id = ?`;
    const result = await query(sql, [id]);
    return result.affectedRows > 0;
  },
  
  async count(table, conditions = {}) {
    const { where, params } = buildWhereClause(conditions);
    const sql = `SELECT COUNT(*) as count FROM ${escapeId(table)} ${where}`;
    const rows = await query(sql, params);
    return rows[0].count;
  },
  
  async exists(table, conditions) {
    const count = await this.count(table, conditions);
    return count > 0;
  }
};

// For backward compatibility with the old API
const connectDB = async () => {
  return await initializeDatabase();
};

module.exports = connectDB;
module.exports.db = db;
module.exports.initializeDatabase = initializeDatabase;
module.exports.closeDatabase = closeDatabase;
module.exports.getPool = getPool;
module.exports.query = query;
module.exports.transaction = transaction;
