import { PrismaClient } from "@prisma/client";
export declare const prisma: PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/client").DefaultArgs>;
export declare function disconnectPrisma(): Promise<void>;
export declare function testConnection(): Promise<boolean>;
