import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { CardType } from '@/types';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'; // ⚠️ CHANGE THIS!

interface Question {
  question: string;
  answer: string;
  options?: string[];
}

// Allowed card types aligned with game definitions
const ALLOWED_CARD_TYPES: CardType[] = [
  'tu-bi',
  'bat-dong-tam',
  'nhan-qua',
  'loi-cau-nguyen',
  'phep-la',
  'thap-tu-giao',
  'tam-giao-hop-nhat',
  'thien-nhan',
  'tu-tai-gia',
  'tinh-than-dan-toc',
  'an-dien',
  'truyen-giao',
  'bon-cung-thanh-mau',
  'hau-dong',
];

function initQuestionsStore(): Record<CardType, Question[]> {
  const store = {} as Record<CardType, Question[]>;
  for (const t of ALLOWED_CARD_TYPES) {
    store[t] = [];
  }
  return store;
}

export async function POST(request: NextRequest) {
  try {
    // Check admin password
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.includes(`Bearer ${ADMIN_PASSWORD}`)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Read CSV content
    const content = await file.text();
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return NextResponse.json(
        { success: false, error: 'CSV file is empty or invalid' },
        { status: 400 }
      );
    }

    // Parse CSV (expected format: type,question,answer,option1,option2,option3,option4)
    // Types aligned with CardType in the app
    const questions: Record<CardType, Question[]> = initQuestionsStore();

    let imported = 0;
    let errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',').map(p => p.trim());
      
      if (parts.length < 3) {
        errors.push(`Line ${i + 1}: Invalid format (need at least type, question, answer)`);
        continue;
      }

      const [type, question, answer, ...options] = parts;

      if (!ALLOWED_CARD_TYPES.includes(type as CardType)) {
        errors.push(`Line ${i + 1}: Invalid card type '${type}'. Expected one of: ${ALLOWED_CARD_TYPES.join(', ')}`);
        continue;
      }

      questions[type as CardType].push({
        question,
        answer,
        options: options.filter(o => o.length > 0)
      });
      
      imported++;
    }

    // Save to questions.json
    const questionsPath = path.join(process.cwd(), 'data', 'questions.json');
    await fs.writeFile(questionsPath, JSON.stringify(questions, null, 2));

    return NextResponse.json({ 
      success: true, 
      message: `Imported ${imported} questions successfully`,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error importing questions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import questions' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check admin password
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.includes(`Bearer ${ADMIN_PASSWORD}`)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const questionsPath = path.join(process.cwd(), 'data', 'questions.json');
    const content = await fs.readFile(questionsPath, 'utf-8');
    const questions = JSON.parse(content);
    
    return NextResponse.json({ success: true, questions });
  } catch (error) {
    console.error('Error reading questions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to read questions' },
      { status: 500 }
    );
  }
}
