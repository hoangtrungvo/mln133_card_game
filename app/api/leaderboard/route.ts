import { NextResponse } from 'next/server';
import { getLeaderboard } from '@/lib/leaderboard';

export async function GET() {
  const leaderboard = await getLeaderboard(50); // Top 50
  return NextResponse.json(leaderboard);
}
