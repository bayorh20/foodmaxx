/**
 * FOODMAXX AI AVATAR GENERATION & ASSIGNMENT SERVICE
 * 
 * Provides automated AI avatar assignment for registered customers,
 * multi-style neural AI generation (3D Pixar, African Gourmet, Cyber Bot, Anime Chibi),
 * and custom prompt-based AI foodie avatar synthesis.
 */

// Melanin-rich Nigerian / African skin tones (rich brown, bronze, deep espresso, warm chestnut)
export const BLACK_SKIN_PALETTES = [
  '3b2219', '4a2d21', '593325', '6b4423', '7d4b29', '8d5524', '9b6238', 'a66c43', '2b1a13'
];

export const BLACK_HAIR_PALETTES = [
  '0e0e0e', '1a1a1a', '241c11', '1f1712'
];

/**
 * Supported AI Avatar Art Styles
 */
export const AI_AVATAR_STYLES = [
  {
    id: '3d_pixar',
    name: '3D Pixar Foodie',
    engine: 'dicebear_adventurer',
    icon: '✨',
    badge: '3D Pixar',
    desc: 'Vibrant, friendly 3D animated character'
  },
  {
    id: 'african_gourmet',
    name: 'African Gourmet',
    engine: 'dicebear_personas',
    icon: '🍲',
    badge: 'African Chef',
    desc: 'Melanin-rich Nigerian foodie connoisseur'
  },
  {
    id: 'anime_chibi',
    name: 'Anime Chibi',
    engine: 'dicebear_lorelei',
    icon: '🌸',
    badge: 'Anime Chibi',
    desc: 'Cute Japanese-inspired gourmet diner'
  },
  {
    id: 'cyber_bot',
    name: 'Cyber Foodie Bot',
    engine: 'dicebear_bottts',
    icon: '🤖',
    badge: 'AI Droid',
    desc: 'Futuristic AI kitchen and culinary droid'
  },
  {
    id: 'fun_3d',
    name: '3D Expressive',
    engine: 'dicebear_fun_emoji',
    icon: '😋',
    badge: '3D Fun',
    desc: 'Playful, joyful 3D foodie expression'
  },
  {
    id: 'neural_flux',
    name: 'Neural AI Art',
    engine: 'pollinations_flux',
    icon: '🎨',
    badge: 'Neural AI',
    desc: 'Ultra-stylized photorealistic AI generated art'
  }
];

/**
 * Hash string to positive integer for deterministic seed generation
 */
export function hashString(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Generate a single AI Avatar URL for a specific name/seed and style
 */
export function generateAIAvatar(nameOrSeed = '', styleId = '3d_pixar') {
  const cleanSeed = (String(nameOrSeed || '').trim() || `fmx_ai_${Date.now()}`);
  const h = hashString(cleanSeed);
  const skinTone = BLACK_SKIN_PALETTES[h % BLACK_SKIN_PALETTES.length];
  const hairTone = BLACK_HAIR_PALETTES[h % BLACK_HAIR_PALETTES.length];

  switch (styleId) {
    case 'african_gourmet':
      return `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(cleanSeed)}&skinColor=${skinTone}&hairColor=${hairTone}`;

    case 'anime_chibi':
      return `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(cleanSeed)}&hairColor=${hairTone}`;

    case 'cyber_bot':
      return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanSeed)}`;

    case 'fun_3d':
      return `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${encodeURIComponent(cleanSeed)}`;

    case 'neural_flux': {
      const prompt = `cute 3d pixar style foodie avatar portrait of young smiling african person with culinary hat eating delicious meal vibrant lighting 4k resolution`;
      return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=256&height=256&nologo=true&seed=${h % 99999}`;
    }

    case '3d_pixar':
    default:
      return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(cleanSeed)}&skinColor=${skinTone}&hairColor=${hairTone}`;
  }
}

/**
 * Automatically assigns an AI avatar to a customer upon registration.
 * Creates an intelligent seed combining their name and phone.
 */
export function generateAIAvatarForUser(fullName = '', phone = '', preferredStyle = '3d_pixar') {
  const cleanName = (fullName || 'FoodMaxx Diner').trim();
  const cleanPhone = (phone || '').replace(/\D/g, '');
  const combinedSeed = `${cleanName}_${cleanPhone || Date.now()}`;
  const h = hashString(combinedSeed);
  const look = NIGERIAN_GENZ_LOOKS[h % NIGERIAN_GENZ_LOOKS.length];
  return look ? look.url : '/avatars/genz_guy_01.png';
}

/**
 * Generates an AI Avatar from a custom user prompt (e.g. "Pepper Soup Queen", "Asun Master")
 */
export function generateCustomPromptAIAvatar(customPrompt = '', seedModifier = 1) {
  const cleanPrompt = (customPrompt || 'joyful foodie diner').trim();
  const seed = hashString(cleanPrompt) + Number(seedModifier || 0);

  // If prompt suggests cyber/robot
  if (/bot|robot|droid|cyber|tech/i.test(cleanPrompt)) {
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanPrompt + '_' + seed)}`;
  }

  // If prompt suggests anime
  if (/anime|manga|chibi|kawaii/i.test(cleanPrompt)) {
    return `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(cleanPrompt + '_' + seed)}`;
  }

  // If prompt asks for realistic or neural
  if (/real|photo|neural|flux|hd/i.test(cleanPrompt)) {
    const fullPrompt = `3d pixar style character avatar portrait of ${cleanPrompt} smiling colorful studio lighting 4k`;
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=256&height=256&nologo=true&seed=${seed}`;
  }

  // Default to vibrant 3D adventurer with African melanin palette
  const skinTone = BLACK_SKIN_PALETTES[seed % BLACK_SKIN_PALETTES.length];
  const hairTone = BLACK_HAIR_PALETTES[seed % BLACK_HAIR_PALETTES.length];
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(cleanPrompt + '_' + seed)}&skinColor=${skinTone}&hairColor=${hairTone}`;
}

/**
 * Generate a diverse batch of AI Avatars for users to pick from
 */
export function generateAIAvatarBatch(baseSeed = '', count = 8, styleId = '3d_pixar') {
  const results = [];
  const base = (baseSeed || 'FoodMaxx_AI').trim();

  for (let i = 0; i < count; i++) {
    const variationSeed = `${base}_variant_${i + 1}`;
    const effectiveStyle = styleId === 'all' 
      ? AI_AVATAR_STYLES[i % AI_AVATAR_STYLES.length].id 
      : styleId;

    results.push({
      id: `ai_gen_${effectiveStyle}_${i}`,
      styleId: effectiveStyle,
      name: `${AI_AVATAR_STYLES.find(s => s.id === effectiveStyle)?.name || 'AI'} #${i + 1}`,
      badge: AI_AVATAR_STYLES.find(s => s.id === effectiveStyle)?.badge || 'AI Avatar',
      url: generateAIAvatar(variationSeed, effectiveStyle)
    });
  }

  return results;
}

/**
 * Pre-curated showcase of high quality AI avatars ready for 1-tap selection
 */
export const CURATED_AI_AVATARS = [
  {
    id: 'ai_pixar_01',
    name: 'Jollof King',
    badge: '3D Pixar',
    styleId: '3d_pixar',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Jollof_King_FMX&skinColor=4a2d21&hairColor=0e0e0e'
  },
  {
    id: 'ai_pixar_02',
    name: 'Pepper Soup Queen',
    badge: '3D Pixar',
    styleId: '3d_pixar',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Pepper_Queen_FMX&skinColor=593325&hairColor=1a1a1a'
  },
  {
    id: 'ai_african_01',
    name: 'Suya Specialist',
    badge: 'African Chef',
    styleId: 'african_gourmet',
    url: 'https://api.dicebear.com/7.x/personas/svg?seed=Suya_Master_FMX&skinColor=6b4423&hairColor=0e0e0e'
  },
  {
    id: 'ai_african_02',
    name: 'Amala Connoisseur',
    badge: 'African Chef',
    styleId: 'african_gourmet',
    url: 'https://api.dicebear.com/7.x/personas/svg?seed=Amala_Joy_FMX&skinColor=7d4b29&hairColor=241c11'
  },
  {
    id: 'ai_anime_01',
    name: 'Boba & Chow',
    badge: 'Anime Chibi',
    styleId: 'anime_chibi',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Chibi_Gourmet_FMX'
  },
  {
    id: 'ai_anime_02',
    name: 'Sweet Tooth',
    badge: 'Anime Chibi',
    styleId: 'anime_chibi',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Pastry_Lover_FMX'
  },
  {
    id: 'ai_bot_01',
    name: 'Chef-Bot 3000',
    badge: 'AI Droid',
    styleId: 'cyber_bot',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Chef_Bot_3000'
  },
  {
    id: 'ai_bot_02',
    name: 'Delivery Drone-X',
    badge: 'AI Droid',
    styleId: 'cyber_bot',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Delivery_Drone_X'
  },
  {
    id: 'ai_fun_01',
    name: 'Yum Spark',
    badge: '3D Fun',
    styleId: 'fun_3d',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Yum_Spark_FMX'
  },
  {
    id: 'ai_fun_02',
    name: 'Happy Feast',
    badge: '3D Fun',
    styleId: 'fun_3d',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Happy_Feast_FMX'
  }
];

/**
 * 20 DISTINCT REAL NIGERIAN GEN-Z AI AVATAR LOOKS
 * 10 Babes & 10 Guys with authentic Nigerian Gen-Z styling, melanin palettes & hair
 */
export const NIGERIAN_GENZ_LOOKS = [
  // 10 Nigerian Gen-Z Babes
  {
    id: 'ng_babe_01',
    name: 'Tiwa',
    vibe: 'Blonde Braids',
    gender: 'female',
    badge: 'Babe 💅',
    url: '/avatars/genz_babe_01.png'
  },
  {
    id: 'ng_babe_02',
    name: 'Amina',
    vibe: 'Afro Clips',
    gender: 'female',
    badge: 'Babe 💅',
    url: '/avatars/genz_babe_02.png'
  },
  {
    id: 'ng_babe_03',
    name: 'Kiki',
    vibe: 'Sleek Ponytail',
    gender: 'female',
    badge: 'Babe 💅',
    url: '/avatars/genz_babe_03.png'
  },
  {
    id: 'ng_babe_04',
    name: 'Zainab',
    vibe: 'Satin Durag',
    gender: 'female',
    badge: 'Babe 💅',
    url: '/avatars/genz_babe_04.png'
  },
  {
    id: 'ng_babe_05',
    name: 'Chichi',
    vibe: 'Goddess Braids',
    gender: 'female',
    badge: 'Babe 💅',
    url: '/avatars/genz_babe_05.png'
  },
  {
    id: 'ng_babe_06',
    name: 'Simi',
    vibe: 'Faux Locs',
    gender: 'female',
    badge: 'Babe 💅',
    url: '/avatars/genz_babe_06.png'
  },
  {
    id: 'ng_babe_07',
    name: 'Temi',
    vibe: 'Bantu Knots',
    gender: 'female',
    badge: 'Babe 💅',
    url: '/avatars/genz_babe_07.png'
  },
  {
    id: 'ng_babe_08',
    name: 'Eniola',
    vibe: 'Space Buns',
    gender: 'female',
    badge: 'Babe 💅',
    url: '/avatars/genz_babe_08.png'
  },
  {
    id: 'ng_babe_09',
    name: 'Ronke',
    vibe: 'Curly Afro',
    gender: 'female',
    badge: 'Babe 💅',
    url: '/avatars/genz_babe_09.png'
  },
  {
    id: 'ng_babe_10',
    name: 'Ife',
    vibe: 'High Ponytail',
    gender: 'female',
    badge: 'Babe 💅',
    url: '/avatars/genz_babe_10.png'
  },
  {
    id: 'ng_babe_11',
    name: 'Morayo',
    vibe: 'Satin Crown',
    gender: 'female',
    badge: 'Babe 💅',
    url: '/avatars/genz_babe_11.png'
  },
  {
    id: 'ng_babe_12',
    name: 'Folake',
    vibe: 'Goddess Locs',
    gender: 'female',
    badge: 'Babe 💅',
    url: '/avatars/genz_babe_12.png'
  },
  {
    id: 'ng_babe_13',
    name: 'Damilola',
    vibe: 'Cowrie Curls',
    gender: 'female',
    badge: 'Babe 💅',
    url: '/avatars/genz_babe_13.png'
  },
  {
    id: 'ng_babe_14',
    name: 'Bisola',
    vibe: 'Gold Cuffs',
    gender: 'female',
    badge: 'Babe 💅',
    url: '/avatars/genz_babe_14.png'
  },
  {
    id: 'ng_babe_15',
    name: 'Omolara',
    vibe: 'Playful Buns',
    gender: 'female',
    badge: 'Babe 💅',
    url: '/avatars/genz_babe_15.png'
  },
  {
    id: 'ng_babe_16',
    name: 'Zari',
    vibe: 'Golden Braids',
    gender: 'female',
    badge: 'Babe 💅',
    url: '/avatars/genz_babe_16.png'
  },
  {
    id: 'ng_babe_17',
    name: 'Teni',
    vibe: 'Butterfly Clips',
    gender: 'female',
    badge: 'Babe 💅',
    url: '/avatars/genz_babe_17.png'
  },
  {
    id: 'ng_babe_18',
    name: 'Yetunde',
    vibe: 'Laid Edges',
    gender: 'female',
    badge: 'Babe 💅',
    url: '/avatars/genz_babe_18.png'
  },
  {
    id: 'ng_babe_19',
    name: 'Adanna',
    vibe: 'Bantu Queen',
    gender: 'female',
    badge: 'Babe 💅',
    url: '/avatars/genz_babe_19.png'
  },
  {
    id: 'ng_babe_20',
    name: 'Funke',
    vibe: 'Soft Glam',
    gender: 'female',
    badge: 'Babe 💅',
    url: '/avatars/genz_babe_20.png'
  },
  {
    id: 'ng_babe_21',
    name: 'Adaora',
    vibe: 'Afro Kiss & Specs',
    gender: 'female',
    badge: 'Babe 💅',
    url: '/avatars/genz_babe_21.png'
  },
  {
    id: 'ng_babe_22',
    name: 'Ngozi',
    vibe: 'Locs & Vintage Shades',
    gender: 'female',
    badge: 'Babe 💅',
    url: '/avatars/genz_babe_22.png'
  },

  // 21 Nigerian Gen-Z Guys
  {
    id: 'ng_guy_01',
    name: 'Tobi',
    vibe: 'Blonde Curls',
    gender: 'male',
    badge: 'Guy 🧢',
    url: '/avatars/genz_guy_01.png'
  },
  {
    id: 'ng_guy_02',
    name: 'Faruq',
    vibe: 'Silver Specs',
    gender: 'male',
    badge: 'Guy 🧢',
    url: '/avatars/genz_guy_02.png'
  },
  {
    id: 'ng_guy_03',
    name: 'Dayo',
    vibe: 'Short Twists',
    gender: 'male',
    badge: 'Guy 🧢',
    url: '/avatars/genz_guy_03.png'
  },
  {
    id: 'ng_guy_04',
    name: 'Nonso',
    vibe: 'Dread Fade',
    gender: 'male',
    badge: 'Guy 🧢',
    url: '/avatars/genz_guy_04.png'
  },
  {
    id: 'ng_guy_05',
    name: 'Segun',
    vibe: '360 Waves',
    gender: 'male',
    badge: 'Guy 🧢',
    url: '/avatars/genz_guy_05.png'
  },
  {
    id: 'ng_guy_06',
    name: 'Ebuka',
    vibe: 'Bucket Hat',
    gender: 'male',
    badge: 'Guy 🧢',
    url: '/avatars/genz_guy_06.png'
  },
  {
    id: 'ng_guy_07',
    name: 'Dami',
    vibe: 'Sharp Fade Part',
    gender: 'male',
    badge: 'Guy 🧢',
    url: '/avatars/genz_guy_07.png'
  },
  {
    id: 'ng_guy_08',
    name: 'Bolu',
    vibe: 'Alté Shades',
    gender: 'male',
    badge: 'Guy 🧢',
    url: '/avatars/genz_guy_08.png'
  },
  {
    id: 'ng_guy_09',
    name: 'Victor',
    vibe: 'Clean Cut Specs',
    gender: 'male',
    badge: 'Guy 🧢',
    url: '/avatars/genz_guy_09.png'
  },
  {
    id: 'ng_guy_10',
    name: 'Femi',
    vibe: 'Taper Twists',
    gender: 'male',
    badge: 'Guy 🧢',
    url: '/avatars/genz_guy_10.png'
  },
  {
    id: 'ng_guy_11',
    name: 'Korede',
    vibe: 'Blonde Frost',
    gender: 'male',
    badge: 'Guy 🧢',
    url: '/avatars/genz_guy_11.png'
  },
  {
    id: 'ng_guy_12',
    name: 'Tayo',
    vibe: 'Maroon Hoodie',
    gender: 'male',
    badge: 'Guy 🧢',
    url: '/avatars/genz_guy_12.png'
  },
  {
    id: 'ng_guy_13',
    name: 'Chima',
    vibe: '360 Waves II',
    gender: 'male',
    badge: 'Guy 🧢',
    url: '/avatars/genz_guy_13.png'
  },
  {
    id: 'ng_guy_14',
    name: 'Ayodeji',
    vibe: 'Varsity Street',
    gender: 'male',
    badge: 'Guy 🧢',
    url: '/avatars/genz_guy_14.png'
  },
  {
    id: 'ng_guy_15',
    name: 'Seyi',
    vibe: 'Surgical Part',
    gender: 'male',
    badge: 'Guy 🧢',
    url: '/avatars/genz_guy_15.png'
  },
  {
    id: 'ng_guy_16',
    name: 'Bayo',
    vibe: 'Alté Cuban',
    gender: 'male',
    badge: 'Guy 🧢',
    url: '/avatars/genz_guy_16.png'
  },
  {
    id: 'ng_guy_17',
    name: 'Rotimi',
    vibe: 'Intellect Specs',
    gender: 'male',
    badge: 'Guy 🧢',
    url: '/avatars/genz_guy_17.png'
  },
  {
    id: 'ng_guy_18',
    name: 'Kayode',
    vibe: 'Gold Twists',
    gender: 'male',
    badge: 'Guy 🧢',
    url: '/avatars/genz_guy_18.png'
  },
  {
    id: 'ng_guy_19',
    name: 'Wale',
    vibe: 'Bucket Drip',
    gender: 'male',
    badge: 'Guy 🧢',
    url: '/avatars/genz_guy_19.png'
  },
  {
    id: 'ng_guy_20',
    name: 'Kelechi',
    vibe: 'Clean Fade',
    gender: 'male',
    badge: 'Guy 🧢',
    url: '/avatars/genz_guy_20.png'
  },
  {
    id: 'ng_guy_21',
    name: 'Kunle',
    vibe: 'Beanie Wink & Robex Tee',
    gender: 'male',
    badge: 'Guy 🧢',
    url: '/avatars/genz_guy_21.png'
  }
];

/**
 * Get a random Nigerian Gen-Z avatar look
 */
export function getRandomNigerianGenzAvatar(gender = 'all') {
  let pool = NIGERIAN_GENZ_LOOKS;
  if (gender === 'female') {
    pool = NIGERIAN_GENZ_LOOKS.filter(l => l.gender === 'female');
  } else if (gender === 'male') {
    pool = NIGERIAN_GENZ_LOOKS.filter(l => l.gender === 'male');
  }
  const pick = pool[Math.floor(Math.random() * pool.length)] || NIGERIAN_GENZ_LOOKS[0];
  return pick.url;
}

export default {
  AI_AVATAR_STYLES,
  generateAIAvatar,
  generateAIAvatarForUser,
  generateCustomPromptAIAvatar,
  generateAIAvatarBatch,
  CURATED_AI_AVATARS,
  NIGERIAN_GENZ_LOOKS,
  getRandomNigerianGenzAvatar
};
