import { betterAuth } from "better-auth";
import Database from "better-sqlite3";
// --- CORRECT IMPORTS: Use the built-in SqliteDialect from 'kysely' ---
// The core 'kysely' package provides SqliteDialect which works with 'better-sqlite3'.
import { Kysely, SqliteDialect } from 'kysely'; 

// 1. Setup a simple local database (creates a file named 'app.db')
const rawDb = new Database("app.db");
// Ensure transactions are safe (recommended practice for sqlite)
rawDb.pragma('journal_mode = WAL');

// 2. Instantiate the Kysely client using the built-in SqliteDialect
// This enables the Kysely engine inside better-auth to run migrations and queries.
const kyselyDb = new Kysely({
    dialect: new SqliteDialect({
        database: rawDb,
    }),
});

// 3. Configure Better Auth, passing the Kysely client
export const auth = betterAuth({
    database: {
        // We pass the correctly initialized Kysely client
        db: kyselyDb,
        type: "sqlite", 
    },
    emailAndPassword: {
        enabled: true,
    },
    // CORS setup is critical when frontend/backend are on different ports
    trustedOrigins: ["http://localhost:5173"], 
});
// --- FIX: This code does not need modification. The fix is to run the CLI. ---
// When using the built-in Kysely adapter, you must run the following command 
// in your server directory to create the tables in 'app.db':
// npx @better-auth/cli@latest migrate