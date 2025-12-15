import { NextResponse, NextRequest } from 'next/server';
import { writeLeaderboard } from '@/lib/database';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'; // ⚠️ CHANGE THIS!

export async function DELETE(request: NextRequest) {
  try {
    // Check admin password
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.includes(`Bearer ${ADMIN_PASSWORD}`)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Reset leaderboard to empty array
    await writeLeaderboard([]);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Leaderboard has been reset successfully' 
    });
  } catch (error) {
    console.error('Error resetting leaderboard:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset leaderboard' },
      { status: 500 }
    );
  }
}
