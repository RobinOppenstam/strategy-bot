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
    const pool = new pg_1.Pool({ connectionString });
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