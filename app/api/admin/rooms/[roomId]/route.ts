import { NextResponse } from 'next/server';
import { deleteRoom } from '@/lib/database';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  await deleteRoom(roomId);
  return NextResponse.json({ success: true });
}
