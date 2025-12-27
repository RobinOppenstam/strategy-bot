"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.disconnectPrisma = disconnectPrisma;
exports.testConnection = testConnection;
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
// Create PostgreSQL connection pool
const connectionString = process.env.DATABASE_URL;
// Prisma client singleton
const globalForPrisma = globalThis;
function createPrismaClient() {
    if (!connectionString) {
        // Return client without adapter if no database URL (will fail on first query)
        return new client_1.PrismaClient({
            log: process.env.NODE_ENV === "development"
                ? ["query", "error", "warn"]
                : ["error"],
        });
    }
    const pool = new pg_1.Pool({
        connectionString,
        max: 5, // Reduced to avoid exhausting Supabase free tier limits
        min: 1, // Keep at least 1 connection ready
        idleTimeoutMillis: 60000, // 60s idle before closing
        connectionTimeoutMillis: 30000, // 30s to acquire connection
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
        allowExitOnIdle: false, // Don't exit when pool is idle
    });
    pool.on('error', (err) => {
        console.error('Unexpected pool error:', err);
    });
    globalForPrisma.pool = pool;
    const adapter = new adapter_pg_1.PrismaPg(pool);
    return new client_1.PrismaClient({
        adapter,
        log: process.env.NODE_ENV === "development"
            ? ["query", "error", "warn"]
            : ["error"],
    });
}
exports.prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = exports.prisma;
}
// Graceful shutdown
async function disconnectPrisma() {
    await exports.prisma.$disconnect();
}
// Connection test
async function testConnection() {
    try {
        await exports.prisma.$queryRaw `SELECT 1`;
        console.log("✅ Database connection successful");
        return true;
    }
    catch (error) {
        console.error("❌ Database connection failed:", error);
        return false;
    }
}
//# sourceMappingURL=prisma.js.map