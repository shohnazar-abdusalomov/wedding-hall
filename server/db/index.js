// PostgreSQL data layer.
//
// The rest of the codebase was written against nedb-promises, which exposes a
// small Mongo-style API per "collection" (findOne / find / count / insert /
// update / remove). To switch the storage engine to PostgreSQL without
// rewriting every route, we keep that exact API surface here and back each
// collection with a JSONB document table:
//
//   CREATE TABLE <name> (_id TEXT PRIMARY KEY, doc JSONB NOT NULL)
//
// The thin query translator below supports only the operators the app actually
// uses: equality on top-level string fields, $or, $in, and RegExp matching for
// queries; $set (incl. dot-notation nested paths) and $inc for updates.

const crypto = require('crypto');
const { Pool } = require('pg');

const COLLECTIONS = ['users', 'owners', 'venues', 'bookings', 'otps'];

// Connection: prefer DATABASE_URL, else fall back to standard PG* env vars with
// a sensible local default database name.
const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.PGHOST || undefined,
        port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : undefined,
        user: process.env.PGUSER || undefined,
        password: process.env.PGPASSWORD || undefined,
        database: process.env.PGDATABASE || 'toyxona',
      }
);

// nedb generates 16-char alphanumeric ids; mimic that so existing references
// (and any UI assumptions) keep working.
function genId() {
  return crypto.randomBytes(12).toString('base64url').slice(0, 16);
}

// Field/key names are only ever supplied by our own code (never user input),
// but guard anyway so they can be safely interpolated into SQL identifiers.
function safeKey(key) {
  if (!/^[a-zA-Z0-9_]+$/.test(key)) {
    throw new Error(`Unsupported field name in query: ${key}`);
  }
  return key;
}

function jsonPath(dottedKey) {
  return '{' + dottedKey.split('.').map(safeKey).join(',') + '}';
}

// Translate a Mongo-style query object into a SQL WHERE fragment. Pushes any
// bound values onto `params` and returns the fragment (without the WHERE word),
// or '' when the query is empty.
function buildWhere(query, params) {
  const clauses = [];

  for (const [key, val] of Object.entries(query || {})) {
    if (key === '$or') {
      const ors = (val || []).map((sub) => {
        const subClauses = Object.entries(sub).map(([k, v]) => {
          params.push(v);
          return `doc->>'${safeKey(k)}' = $${params.length}`;
        });
        return '(' + (subClauses.join(' AND ') || 'TRUE') + ')';
      });
      clauses.push('(' + (ors.join(' OR ') || 'FALSE') + ')');
    } else if (val instanceof RegExp) {
      params.push(val.source);
      // ~* = POSIX regex match, case-insensitive (matches nedb's /i usage).
      clauses.push(`doc->>'${safeKey(key)}' ~* $${params.length}`);
    } else if (val && typeof val === 'object' && Array.isArray(val.$in)) {
      if (val.$in.length === 0) {
        clauses.push('FALSE');
      } else {
        const placeholders = val.$in.map((item) => {
          params.push(item);
          return `$${params.length}`;
        });
        clauses.push(`doc->>'${safeKey(key)}' IN (${placeholders.join(',')})`);
      }
    } else {
      params.push(val);
      clauses.push(`doc->>'${safeKey(key)}' = $${params.length}`);
    }
  }

  return clauses.length ? clauses.join(' AND ') : '';
}

function collection(name) {
  const table = safeKey(name);

  return {
    async findOne(query = {}) {
      const params = [];
      const where = buildWhere(query, params);
      const sql = `SELECT doc FROM ${table}${where ? ' WHERE ' + where : ''} LIMIT 1`;
      const { rows } = await pool.query(sql, params);
      return rows.length ? rows[0].doc : null;
    },

    async find(query = {}) {
      const params = [];
      const where = buildWhere(query, params);
      const sql = `SELECT doc FROM ${table}${where ? ' WHERE ' + where : ''}`;
      const { rows } = await pool.query(sql, params);
      return rows.map((r) => r.doc);
    },

    async count(query = {}) {
      const params = [];
      const where = buildWhere(query, params);
      const sql = `SELECT COUNT(*)::int AS c FROM ${table}${where ? ' WHERE ' + where : ''}`;
      const { rows } = await pool.query(sql, params);
      return rows[0].c;
    },

    async insert(doc) {
      const _id = doc._id || genId();
      const full = { ...doc, _id };
      await pool.query(`INSERT INTO ${table} (_id, doc) VALUES ($1, $2)`, [
        _id,
        JSON.stringify(full),
      ]);
      return full;
    },

    async update(query, update = {}) {
      const params = [];
      let expr = 'doc';

      if (update.$set) {
        for (const [k, v] of Object.entries(update.$set)) {
          params.push(JSON.stringify(v));
          expr = `jsonb_set(${expr}, '${jsonPath(k)}', $${params.length}::jsonb, true)`;
        }
      }
      if (update.$inc) {
        for (const [k, by] of Object.entries(update.$inc)) {
          params.push(Number(by) || 0);
          const path = jsonPath(k);
          expr = `jsonb_set(${expr}, '${path}', to_jsonb(COALESCE((${expr} #>> '${path}')::numeric, 0) + $${params.length}::numeric), true)`;
        }
      }

      const where = buildWhere(query, params);
      const sql = `UPDATE ${table} SET doc = ${expr}${where ? ' WHERE ' + where : ''}`;
      const res = await pool.query(sql, params);
      return res.rowCount;
    },

    async remove(query, options = {}) {
      const params = [];
      const where = buildWhere(query, params);
      // nedb deletes a single doc unless { multi: true }; emulate with LIMIT via
      // a subquery when not multi.
      let sql;
      if (options.multi) {
        sql = `DELETE FROM ${table}${where ? ' WHERE ' + where : ''}`;
      } else {
        sql = `DELETE FROM ${table} WHERE _id IN (SELECT _id FROM ${table}${where ? ' WHERE ' + where : ''} LIMIT 1)`;
      }
      const res = await pool.query(sql, params);
      return res.rowCount;
    },
  };
}

// Create the document tables (and a couple of helpful indexes) if absent.
async function init() {
  for (const name of COLLECTIONS) {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS ${name} (_id TEXT PRIMARY KEY, doc JSONB NOT NULL)`
    );
  }
  // Indexes on the fields most often filtered on.
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_venues_owner ON venues ((doc->>'ownerId'))`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookings_venue ON bookings ((doc->>'venueId'))`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings ((doc->>'userId'))`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_otps_lookup ON otps ((doc->>'purpose'), (doc->>'target'))`);
}

const db = {
  users: collection('users'),
  owners: collection('owners'),
  venues: collection('venues'),
  bookings: collection('bookings'),
  otps: collection('otps'),
  init,
  pool,
};

module.exports = db;
