import { prisma } from "./prisma";
import type { Config } from "../types";
import {
  Timeframe,
  TradingMode,
  SessionStatus,
  Session,
} from "@prisma/client";

// Map string timeframe to Prisma enum
function mapTimeframe(tf: string): Timeframe {
  const mapping: Record<string, Timeframe> = {
    Min1: "Min1",
    Min5: "Min5",
    Min15: "Min15",
    Min30: "Min30",
    Min60: "Min60",
    Hour4: "Hour4",
    Day1: "Day1",
  };
  return mapping[tf] ?? "Min15";
}

export interface CreateSessionInput {
  config: Config;
  name?: string;
  description?: string;
}

// Get or create a trading session - reuses existing active session by name
export async function createSession(
  input: CreateSessionInput
): Promise<Session> {
  const { config, name, description } = input;
  const sessionName = name ?? config.name ?? `${config.symbol} ${config.timeframe}`;

  // Check if an active session with this name already exists
  const existingSession = await prisma.session.findFirst({
    where: {
      name: sessionName,
      status: SessionStatus.ACTIVE,
    },
  });

  if (existingSession) {
    console.log(`📊 Session resumed: ${existingSession.id} (${existingSession.name})`);
    return existingSession;
  }

  // Create new session only if none exists
  const session = await prisma.session.create({
    data: {
      name: sessionName,
      description,
      mode: config.paperTrading ? TradingMode.PAPER : TradingMode.LIVE,
      status: SessionStatus.ACTIVE,
      symbol: config.symbol,
      timeframe: mapTimeframe(config.timeframe),
      bankrollUsd: config.bankrollUsd,
      riskPercent: config.riskPercent,
      leverage: config.leverage,
      riskRewardRatio: config.riskRewardRatio,
      swingLength: config.swingLength,
      slDistance: config.slDistance,
      fastMAPeriod: config.fastMAPeriod,
      slowMAPeriod: config.slowMAPeriod,
      allowTrendContinuation: config.allowTrendContinuation,
      exitOnZoneChange: config.exitOnZoneChange,
      initialBalance: config.initialBalance,
      currentBalance: config.initialBalance,
    },
  });

  console.log(`📊 Session created: ${session.id} (${session.name})`);
  return session;
}

// Get session by ID
export async function getSession(sessionId: string): Promise<Session | null> {
  return prisma.session.findUnique({
    where: { id: sessionId },
  });
}

// Get active sessions
export async function getActiveSessions(): Promise<Session[]> {
  return prisma.session.findMany({
    where: { status: SessionStatus.ACTIVE },
    orderBy: { startedAt: "desc" },
  });
}

// Update session balance
export async function updateSessionBalance(
  sessionId: string,
  newBalance: number
): Promise<Session> {
  return prisma.session.update({
    where: { id: sessionId },
    data: { currentBalance: newBalance },
  });
}

// End a session
export async function endSession(sessionId: string): Promise<Session> {
  return prisma.session.update({
    where: { id: sessionId },
    data: {
      status: SessionStatus.COMPLETED,
      endedAt: new Date(),
    },
  });
}

// Pause a session
export async function pauseSession(sessionId: string): Promise<Session> {
  return prisma.session.update({
    where: { id: sessionId },
    data: { status: SessionStatus.PAUSED },
  });
}

// Resume a session
export async function resumeSession(sessionId: string): Promise<Session> {
  return prisma.session.update({
    where: { id: sessionId },
    data: { status: SessionStatus.ACTIVE },
  });
}

// Get sessions by symbol and timeframe for comparison
export async function getSessionsByConfig(
  symbol: string,
  timeframe?: string
): Promise<Session[]> {
  return prisma.session.findMany({
    where: {
      symbol,
      ...(timeframe && { timeframe: mapTimeframe(timeframe) }),
    },
    orderBy: { startedAt: "desc" },
    include: {
      _count: {
        select: { trades: true },
      },
    },
  });
}

// Get all sessions with basic stats
export async function getAllSessionsWithStats() {
  return prisma.session.findMany({
    orderBy: { startedAt: "desc" },
    include: {
      _count: {
        select: { trades: true },
      },
      snapshots: {
        orderBy: { snapshotTime: "desc" },
        take: 1,
      },
    },
  });
}
