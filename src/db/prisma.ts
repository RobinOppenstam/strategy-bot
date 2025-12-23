import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Create PostgreSQL connection pool
const connectionString = process.env.DATABASE_URL;

// Prisma client singleton
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function createPrismaClient(): PrismaClient {
  if (!connectionString) {
    // Return client without adapter if no database URL (will fail on first query)
    return new PrismaClient({
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "error", "warn"]
          : ["error"],
    });
  }

  const pool = new Pool({
    connectionString,
    max: 5,  // Reduced to avoid exhausting Supabase free tier limits
    min: 1,  // Keep at least 1 connection ready
    idleTimeoutMillis: 60000,  // 60s idle before closing
    connectionTimeoutMillis: 30000,  // 30s to acquire connection
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    allowExitOnIdle: false,  // Don't exit when pool is idle
  });

  pool.on('error', (err) => {
    console.error('Unexpected pool error:', err);
  });

  globalForPrisma.pool = pool;

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

// Connection test
export async function testConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connection successful");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}
