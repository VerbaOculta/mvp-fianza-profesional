import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"], // agrega "query" si quieres ver SQL en dev
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
