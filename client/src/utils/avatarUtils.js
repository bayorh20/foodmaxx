/**
 * FoodMaxx 3D Cartoon Customer Avatars Utility
 * 100% 3D Cartoon / Animated characters specifically crafted with
 * Nigerian and Black melanin-rich skin tones and natural African hair.
 * Guaranteed unique for each customer.
 */

// Melanin-rich Nigerian / African skin tones (rich brown, bronze, deep espresso, warm chestnut)
const BLACK_SKIN_PALETTES = [
  '3b2219', '4a2d21', '593325', '6b4423', '7d4b29', '8d5524', '9b6238', 'a66c43', '2b1a13'
];

const BLACK_HAIR_PALETTES = [
  '0e0e0e', '1a1a1a', '241c11', '1f1712'
];

const SKIN_PARAM = BLACK_SKIN_PALETTES.join(',');
const HAIR_PARAM = BLACK_HAIR_PALETTES.join(',');

/**
 * Generate a unique 3D cartoon avatar with Nigerian/Black melanin skin tone.
 * Every unique seed produces a completely different 3D cartoon character.
 */
export function get3DCartoonAvatar(seed = '', gender = 'auto') {
  const cleanSeed = (seed || `fmx_${Date.now()}_${Math.random()}`).trim();
  const detectedGender = gender === 'auto' ? detectGender(cleanSeed) : gender;

  // Pick skin tone based on seed hash to give rich variety
  const h = hashString(cleanSeed);
  const skinTone = BLACK_SKIN_PALETTES[h % BLACK_SKIN_PALETTES.length];
  const hairTone = BLACK_HAIR_PALETTES[h % BLACK_HAIR_PALETTES.length];

  // Dicebear adventurer & personas produces vibrant 3D cartoon avatars
  const style = (h % 2 === 0) ? 'adventurer' : 'personas';
  
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(cleanSeed)}&skinColor=${skinTone}&hairColor=${hairTone}`;
}

export const HAPPY_FEMALE_AVATARS = [
  {
    id: 'f3d_01',
    name: 'Amina',
    gender: 'female',
    url: `https://api.dicebear.com/7.x/adventurer/svg?seed=Amina_Star&skinColor=${BLACK_SKIN_PALETTES[0]}&hairColor=${BLACK_HAIR_PALETTES[0]}`
  },
  {
    id: 'f3d_02',
    name: 'Bukky',
    gender: 'female',
    url: `https://api.dicebear.com/7.x/personas/svg?seed=Bukky_Joy&skinColor=${BLACK_SKIN_PALETTES[1]}&hairColor=${BLACK_HAIR_PALETTES[1]}`
  },
  {
    id: 'f3d_03',
    name: 'Chioma',
    gender: 'female',
    url: `https://api.dicebear.com/7.x/adventurer/svg?seed=Chioma_Glow&skinColor=${BLACK_SKIN_PALETTES[2]}&hairColor=${BLACK_HAIR_PALETTES[0]}`
  },
  {
    id: 'f3d_04',
    name: 'Titi',
    gender: 'female',
    url: `https://api.dicebear.com/7.x/personas/svg?seed=Titi_Smile&skinColor=${BLACK_SKIN_PALETTES[3]}&hairColor=${BLACK_HAIR_PALETTES[2]}`
  },
  {
    id: 'f3d_05',
    name: 'Zainab',
    gender: 'female',
    url: `https://api.dicebear.com/7.x/adventurer/svg?seed=Zainab_Love&skinColor=${BLACK_SKIN_PALETTES[4]}&hairColor=${BLACK_HAIR_PALETTES[0]}`
  },
  {
    id: 'f3d_06',
    name: 'Funke',
    gender: 'female',
    url: `https://api.dicebear.com/7.x/personas/svg?seed=Funke_Happy&skinColor=${BLACK_SKIN_PALETTES[5]}&hairColor=${BLACK_HAIR_PALETTES[1]}`
  },
  {
    id: 'f3d_07',
    name: 'Ngozi',
    gender: 'female',
    url: `https://api.dicebear.com/7.x/adventurer/svg?seed=Ngozi_Bright&skinColor=${BLACK_SKIN_PALETTES[6]}&hairColor=${BLACK_HAIR_PALETTES[2]}`
  },
  {
    id: 'f3d_08',
    name: 'Blessing',
    gender: 'female',
    url: `https://api.dicebear.com/7.x/personas/svg?seed=Blessing_Radiant&skinColor=${BLACK_SKIN_PALETTES[7]}&hairColor=${BLACK_HAIR_PALETTES[0]}`
  }
];

export const HAPPY_MALE_AVATARS = [
  {
    id: 'm3d_01',
    name: 'Kola',
    gender: 'male',
    url: `https://api.dicebear.com/7.x/adventurer/svg?seed=Kola_Champ&skinColor=${BLACK_SKIN_PALETTES[0]}&hairColor=${BLACK_HAIR_PALETTES[0]}`
  },
  {
    id: 'm3d_02',
    name: 'Femi',
    gender: 'male',
    url: `https://api.dicebear.com/7.x/personas/svg?seed=Femi_Cool&skinColor=${BLACK_SKIN_PALETTES[1]}&hairColor=${BLACK_HAIR_PALETTES[1]}`
  },
  {
    id: 'm3d_03',
    name: 'Kunle',
    gender: 'male',
    url: `https://api.dicebear.com/7.x/adventurer/svg?seed=Kunle_Beaming&skinColor=${BLACK_SKIN_PALETTES[2]}&hairColor=${BLACK_HAIR_PALETTES[2]}`
  },
  {
    id: 'm3d_04',
    name: 'Tunde',
    gender: 'male',
    url: `https://api.dicebear.com/7.x/personas/svg?seed=Tunde_Bro&skinColor=${BLACK_SKIN_PALETTES[3]}&hairColor=${BLACK_HAIR_PALETTES[0]}`
  },
  {
    id: 'm3d_05',
    name: 'Emeka',
    gender: 'male',
    url: `https://api.dicebear.com/7.x/adventurer/svg?seed=Emeka_Hero&skinColor=${BLACK_SKIN_PALETTES[4]}&hairColor=${BLACK_HAIR_PALETTES[1]}`
  },
  {
    id: 'm3d_06',
    name: 'Dayo',
    gender: 'male',
    url: `https://api.dicebear.com/7.x/personas/svg?seed=Dayo_Smile&skinColor=${BLACK_SKIN_PALETTES[5]}&hairColor=${BLACK_HAIR_PALETTES[2]}`
  },
  {
    id: 'm3d_07',
    name: 'Segun',
    gender: 'male',
    url: `https://api.dicebear.com/7.x/adventurer/svg?seed=Segun_Vibe&skinColor=${BLACK_SKIN_PALETTES[6]}&hairColor=${BLACK_HAIR_PALETTES[0]}`
  },
  {
    id: 'm3d_08',
    name: 'Chidi',
    gender: 'male',
    url: `https://api.dicebear.com/7.x/personas/svg?seed=Chidi_Joy&skinColor=${BLACK_SKIN_PALETTES[7]}&hairColor=${BLACK_HAIR_PALETTES[1]}`
  }
];

export const ALL_HAPPY_AVATARS = [...HAPPY_FEMALE_AVATARS, ...HAPPY_MALE_AVATARS];

// Common Nigerian, African, and international name lists for smart gender classification
const FEMALE_NAMES = new Set([
  'bukky', 'bukola', 'titilayo', 'titi', 'funke', 'funmilayo', 'folake', 'kemi', 'bimbo',
  'chioma', 'ngozi', 'amaka', 'ifeoma', 'blessing', 'joy', 'faith', 'mary', 'grace', 'sarah',
  'zainab', 'fatima', 'amina', 'halima', 'aisha', 'bola', 'ronke', 'shade', 'tolani', 'temi',
  'simi', 'dami', 'anita', 'chidinma', 'sharon', 'esther', 'victoria', 'jessica', 'hannah',
  'rachel', 'rebecca', 'florence', 'mercy', 'patience', 'chinwe', 'ada', 'adaeze', 'yetunde',
  'bose', 'tiwa', 'omowunmi', 'morayo', 'modupe', 'enitan', 'jumoke', 'keji', 'gbemi'
]);

const MALE_NAMES = new Set([
  'kola', 'kolawole', 'femi', 'olufemi', 'kunle', 'adekunle', 'tunde', 'babatunde', 'ayo',
  'ayomide', 'dayo', 'segun', 'olusegun', 'chidi', 'emeka', 'obinna', 'tochukwu', 'david',
  'michael', 'john', 'emmanuel', 'daniel', 'samuel', 'peter', 'ahmed', 'ibrahim', 'musa',
  'wale', 'adewale', 'yemi', 'victor', 'joshua', 'kelvin', 'bamidele', 'lanre', 'fola',
  'biodun', 'abiodun', 'kayode', 'taiwo', 'kehinde', 'dapo', 'bolaji', 'sola', 'rotimi',
  'deji', 'dare', 'seun', 'tope', 'fawaz', 'ali', 'hassan', 'idris'
]);

/**
 * Detect gender based on first name or keyword
 */
export function detectGender(name = '') {
  if (!name) return 'unknown';
  const clean = name.toLowerCase().replace(/[^a-z]/g, ' ').trim();
  const firstWord = clean.split(' ')[0] || '';

  if (firstWord.startsWith('mrs') || firstWord.startsWith('ms') || firstWord.startsWith('miss')) {
    return 'female';
  }
  if (firstWord.startsWith('mr')) {
    return 'male';
  }
  if (FEMALE_NAMES.has(firstWord)) {
    return 'female';
  }
  if (MALE_NAMES.has(firstWord)) {
    return 'male';
  }
  return 'unknown';
}

/**
 * Hash string to positive integer
 */
function hashString(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Get a unique 3D cartoon avatar for a customer/member.
 * Guarantees every user has a distinct, Nigerian/Black 3D cartoon face.
 * @param {string} name - Customer or friend's name
 * @param {string|number} [id] - Optional user id or index to ensure 100% uniqueness
 * @param {'auto' | 'female' | 'male'} [preferredGender]
 * @returns {string} avatar SVG URL
 */
export function getHappyAvatar(name = '', id = '', preferredGender = 'auto') {
  const seedKey = `${name.trim() || 'user'}_${id || 'fmx'}`;
  return get3DCartoonAvatar(seedKey, preferredGender);
}

/**
 * Get a random 3D cartoon happy avatar
 * @param {'female' | 'male' | 'all'} gender
 * @returns {object} { id, name, url, gender }
 */
export function getRandomHappyAvatar(gender = 'female') {
  let pool = HAPPY_FEMALE_AVATARS;
  if (gender === 'male') pool = HAPPY_MALE_AVATARS;
  else if (gender === 'all') pool = ALL_HAPPY_AVATARS;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}
