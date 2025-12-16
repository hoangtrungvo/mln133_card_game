import { Card, CardType } from '@/types';
import fs from 'fs';
import path from 'path';

// Load questions from JSON file
function loadQuestions(): Record<CardType, Array<{ question: string; answer: string; options?: string[]; points?: number }>> {
  try {
    const questionsPath = path.join(process.cwd(), 'data', 'questions.json');
    const fileContent = fs.readFileSync(questionsPath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error loading questions.json:', error);
    // Fallback to default questions if file doesn't exist
    return {} as Record<CardType, Array<{ question: string; answer: string; options?: string[]; points?: number }>>;
  }
}

// Load card definitions from JSON file
function loadCardDefinitions(): Record<CardType, Omit<Card, 'id' | 'question' | 'correctAnswer' | 'options'>> {
  try {
    const cardsPath = path.join(process.cwd(), 'data', 'cards.json');
    const fileContent = fs.readFileSync(cardsPath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error loading cards.json:', error);
    // Fallback to empty if file doesn't exist
    return {} as Record<CardType, Omit<Card, 'id' | 'question' | 'correctAnswer' | 'options'>>;
  }
}

// Export card definitions loaded from JSON
export const CARD_DEFINITIONS = loadCardDefinitions();

// Generate a random card with question
export function generateCard(cardType?: CardType): Card {
  const QUESTIONS_BY_TYPE = loadQuestions();
  
  const types: CardType[] = [
    'tu-bi', 'bat-dong-tam', 'nhan-qua',
    'loi-cau-nguyen', 'phep-la', 'thap-tu-giao',
    'tam-giao-hop-nhat', 'thien-nhan',
    'tu-tai-gia', 'tinh-than-dan-toc',
    'an-dien', 'truyen-giao',
    'bon-cung-thanh-mau', 'hau-dong'
  ];
  const selectedType = cardType || types[Math.floor(Math.random() * types.length)];
  
  // Get random question for this card type
  const questions = QUESTIONS_BY_TYPE[selectedType];
  if (!questions || questions.length === 0) {
    throw new Error(`No questions available for card type: ${selectedType}`);
  }
  
  const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
  
  return {
    id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    ...CARD_DEFINITIONS[selectedType],
    question: randomQuestion.question,
    correctAnswer: randomQuestion.answer,
    options: randomQuestion.options,
    points: randomQuestion.points || 10, // Load points from question, default 10
  };
}

// Generate a hand of cards
export function generateCardHand(count: number): Card[] {
  const cards: Card[] = [];
  for (let i = 0; i < count; i++) {
    cards.push(generateCard());
  }
  return cards;
}

// Apply card effect to a player
export function applyCardEffect(
  currentHealth: number,
  maxHealth: number,
  card: Card
): { newHealth: number; effectDescription: string } {
  let newHealth = currentHealth + card.value;
  
  // Ensure health stays within bounds
  newHealth = Math.max(0, Math.min(maxHealth, newHealth));
  
  const effectDescription = card.value > 0
    ? `${card.name}: +${card.value} HP (${currentHealth} → ${newHealth})`
    : `${card.name}: ${card.value} HP (${currentHealth} → ${newHealth})`;
  
  return { newHealth, effectDescription };
}

// Calculate score based on game outcome
export function calculateScore(
  won: boolean,
  remainingHealth: number,
  cardsUsed: number,
  gameDuration: number, // in milliseconds
  questionPoints: number = 0 // Points from correct answers
): number {
  // Score is based only on question points
  return questionPoints;
}
