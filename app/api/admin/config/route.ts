import { NextResponse } from 'next/server';
import { readConfig, writeConfig } from '@/lib/database';

export async function GET() {
  const config = await readConfig();
  return NextResponse.json(config);
}

export async function POST(request: Request) {
  const body = await request.json();
  const config = await readConfig();
  
  const updatedConfig = {
    ...config,
    ...body,
  };
  
  await writeConfig(updatedConfig);
  return NextResponse.json(updatedConfig);
}
