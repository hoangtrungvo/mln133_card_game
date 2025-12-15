import { NextResponse } from 'next/server';
import { getAllRooms } from '@/lib/roomManager';
import { createRoom } from '@/lib/roomManager';

export async function GET() {
  const rooms = await getAllRooms();
  return NextResponse.json(rooms);
}

export async function POST(request: Request) {
  const { name } = await request.json();
  const result = await createRoom(name);
  
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  
  return NextResponse.json(result);
}
