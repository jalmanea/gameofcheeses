import type { Board, Category } from './types';

const VALUES = [200, 400, 600, 800, 1000];

function category(name: string, pairs: [clue: string, answer: string][]): Category {
  return {
    name,
    clues: pairs.map(([clue, answer], i) => ({ value: VALUES[i], clue, answer })),
  };
}

/** Hardcoded board for milestone 1; replaced by the board library in milestone 2. */
export const SAMPLE_BOARD: Board = {
  id: 'sample-board',
  title: 'Sample Board',
  categories: [
    category('Geography', [
      ['This is the largest ocean on Earth.', 'The Pacific Ocean'],
      ['This country has the most people in South America.', 'Brazil'],
      ['The Danube flows into this sea.', 'The Black Sea'],
      ['This is the capital city of Canada.', 'Ottawa'],
      ['This African country was formerly known as Abyssinia.', 'Ethiopia'],
    ]),
    category('Science', [
      ['H2O is the chemical formula for this.', 'Water'],
      ['This planet is known as the Red Planet.', 'Mars'],
      ['This is the hardest natural substance.', 'Diamond'],
      ['This part of the cell is called its powerhouse.', 'The mitochondrion'],
      ['This element has the atomic number 1.', 'Hydrogen'],
    ]),
    category('History', [
      ['This ship sank on its maiden voyage in 1912.', 'The Titanic'],
      ['He was the first President of the United States.', 'George Washington'],
      ['This wall fell in 1989.', 'The Berlin Wall'],
      ['This ancient wonder stood in the harbor of Rhodes.', 'The Colossus of Rhodes'],
      ['This 1215 charter limited the power of the English king.', 'The Magna Carta'],
    ]),
    category('Words', [
      ['This word means the opposite of "ancient".', 'Modern'],
      ['A word that reads the same backward, like "level".', 'A palindrome'],
      ['This punctuation mark ends a question.', 'The question mark'],
      ['"Hangry" blends these two words.', 'Hungry and angry'],
      ['This is the longest word you can type with only the top letter row.', 'Typewriter'],
    ]),
    category('Sports', [
      ['This sport uses a shuttlecock.', 'Badminton'],
      ['A marathon is about this many kilometers long, to the nearest whole number.', '42'],
      ['This country has won the most FIFA World Cups.', 'Brazil'],
      ['In tennis, this word means a score of zero.', 'Love'],
      ['This city hosted the first modern Olympic Games in 1896.', 'Athens'],
    ]),
    category('Arts & Music', [
      ['Leonardo da Vinci painted this famous smiling portrait.', 'The Mona Lisa'],
      ['This instrument has 88 keys.', 'The piano'],
      ['He composed "The Four Seasons".', 'Antonio Vivaldi'],
      ['This Dutch painter cut off part of his own ear.', 'Vincent van Gogh'],
      ['This opera by Bizet is set in Seville.', 'Carmen'],
    ]),
  ],
  platterPrompts: [],
  cheeseSettings: {
    randomCount: 0,
    pool: [],
    fixed: [],
    platterPotMultiplier: 2,
  },
};
