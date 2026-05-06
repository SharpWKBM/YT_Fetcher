export const NICHES = [
  'Gaming',
  'Tech & Science',
  'Education',
  'Entertainment',
  'Music',
  'Sports & Fitness',
  'News & Politics',
  'Cooking & Food',
  'Travel & Adventure',
  'Fashion & Beauty',
  'Health & Wellness',
  'Finance & Business',
  'DIY & Crafts',
  'Vlog & Lifestyle',
  'Comedy',
  'Animation',
  'Film & TV',
  'Automotive',
  'Pets & Animals',
  'Kids & Family',
] as const;

export type Niche = typeof NICHES[number];

// Multi-language keyword support
const NICHE_KEYWORDS: Record<Niche, string[]> = {
  'Gaming': [
    // English
    'game', 'gaming', 'gameplay', 'gamer', 'esports', 'minecraft', 'fortnite', 'valorant', 'league', 'dota', 'cs:go', 'pubg', 'cod', 'fifa', 'nba2k', 'lets play', 'walkthrough', 'speedrun',
    // Russian
    'игра', 'игры', 'геймплей', 'прохождение', 'летсплей', 'стрим', 'геймер', 'майнкрафт', 'киберспорт',
    // Spanish
    'juego', 'juegos', 'jugando', 'jugador',
    // Portuguese
    'jogo', 'jogos', 'jogando', 'jogador',
  ],
  'Tech & Science': [
    // English
    'tech', 'technology', 'science', 'programming', 'coding', 'software', 'hardware', 'review', 'unboxing', 'gadget', 'phone', 'computer', 'ai', 'machine learning', 'developer', 'tutorial',
    // Russian
    'технологии', 'обзор', 'распаковка', 'гаджет', 'смартфон', 'компьютер', 'программирование', 'наука',
    // Spanish
    'tecnología', 'programación', 'ciencia',
    // Portuguese
    'tecnologia', 'programação', 'ciência',
  ],
  'Education': [
    // English
    'tutorial', 'learn', 'education', 'course', 'lesson', 'teach', 'study', 'school', 'university', 'math', 'physics', 'chemistry', 'biology', 'history', 'lecture',
    // Russian
    'урок', 'обучение', 'курс', 'учеба', 'образование', 'математика', 'история', 'лекция',
    // Spanish
    'tutorial', 'lección', 'curso', 'educación', 'matemáticas',
    // Portuguese
    'tutorial', 'lição', 'curso', 'educação', 'matemática',
  ],
  'Entertainment': [
    // English
    'entertainment', 'fun', 'funny', 'challenge', 'prank', 'reaction', 'meme', 'viral', 'trending',
    // Russian
    'развлечение', 'смешно', 'челлендж', 'пранк', 'реакция', 'мем',
    // Spanish
    'entretenimiento', 'gracioso', 'desafío', 'broma',
    // Portuguese
    'entretenimento', 'engraçado', 'desafio', 'pegadinha',
  ],
  'Music': [
    // English
    'music', 'song', 'cover', 'remix', 'beat', 'instrumental', 'lyrics', 'album', 'concert', 'live', 'official', 'audio', 'mv',
    // Russian
    'музыка', 'песня', 'кавер', 'ремикс', 'концерт', 'альбом',
    // Spanish
    'música', 'canción', 'concierto', 'álbum',
    // Portuguese
    'música', 'canção', 'concerto', 'álbum',
  ],
  'Sports & Fitness': [
    // English
    'sport', 'fitness', 'workout', 'gym', 'training', 'exercise', 'football', 'basketball', 'soccer', 'tennis', 'boxing', 'mma', 'yoga', 'running',
    // Russian
    'спорт', 'фитнес', 'тренировка', 'зал', 'футбол', 'баскетбол', 'бокс', 'йога',
    // Spanish
    'deporte', 'entrenamiento', 'gimnasio', 'fútbol',
    // Portuguese
    'esporte', 'treino', 'academia', 'futebol',
  ],
  'News & Politics': [
    // English
    'news', 'politics', 'political', 'election', 'government', 'breaking', 'current', 'affairs', 'debate', 'analysis',
    // Russian
    'новости', 'политика', 'выборы', 'правительство', 'дебаты',
    // Spanish
    'noticias', 'política', 'elección', 'gobierno',
    // Portuguese
    'notícias', 'política', 'eleição', 'governo',
  ],
  'Cooking & Food': [
    // English
    'cooking', 'recipe', 'food', 'chef', 'kitchen', 'baking', 'meal', 'dish', 'restaurant', 'cuisine', 'tasty', 'delicious',
    // Russian
    'кулинария', 'рецепт', 'еда', 'повар', 'кухня', 'блюдо', 'ресторан',
    // Spanish
    'cocina', 'receta', 'comida', 'restaurante',
    // Portuguese
    'cozinha', 'receita', 'comida', 'restaurante',
  ],
  'Travel & Adventure': [
    // English
    'travel', 'adventure', 'trip', 'tour', 'explore', 'destination', 'vacation', 'journey', 'backpack', 'vlog', 'world',
    // Russian
    'путешествие', 'поездка', 'отпуск', 'приключение', 'тур',
    // Spanish
    'viaje', 'vacaciones', 'aventura', 'destino',
    // Portuguese
    'viagem', 'férias', 'aventura', 'destino',
  ],
  'Fashion & Beauty': [
    // English
    'fashion', 'beauty', 'makeup', 'style', 'outfit', 'haul', 'skincare', 'cosmetic', 'trend', 'lookbook', 'grwm',
    // Russian
    'мода', 'стиль', 'красота', 'макияж', 'уход', 'лукбук',
    // Spanish
    'moda', 'estilo', 'belleza', 'maquillaje',
    // Portuguese
    'moda', 'estilo', 'beleza', 'maquiagem',
  ],
  'Health & Wellness': [
    // English
    'health', 'wellness', 'mental', 'meditation', 'mindfulness', 'therapy', 'self-care', 'healing', 'nutrition',
    // Russian
    'здоровье', 'велнес', 'медитация', 'терапия', 'питание',
    // Spanish
    'salud', 'bienestar', 'meditación', 'terapia', 'nutrición',
    // Portuguese
    'saúde', 'bem-estar', 'meditação', 'terapia', 'nutrição',
  ],
  'Finance & Business': [
    // English
    'finance', 'business', 'money', 'invest', 'stock', 'crypto', 'trading', 'entrepreneur', 'startup', 'marketing', 'passive income',
    // Russian
    'бизнес', 'финансы', 'деньги', 'инвестиции', 'стартап', 'маркетинг', 'крипто',
    // Spanish
    'negocio', 'finanzas', 'dinero', 'inversión', 'startup',
    // Portuguese
    'negócio', 'finanças', 'dinheiro', 'investimento', 'startup',
  ],
  'DIY & Crafts': [
    // English
    'diy', 'craft', 'handmade', 'creative', 'art', 'project', 'build', 'make', 'tutorial', 'how to',
    // Russian
    'своими руками', 'рукоделие', 'хендмейд', 'творчество', 'искусство',
    // Spanish
    'bricolaje', 'manualidades', 'hecho a mano', 'arte',
    // Portuguese
    'faça você mesmo', 'artesanato', 'feito à mão', 'arte',
  ],
  'Vlog & Lifestyle': [
    // English
    'vlog', 'lifestyle', 'daily', 'routine', 'day in life', 'morning', 'night', 'family', 'personal',
    // Russian
    'влог', 'лайфстайл', 'день из жизни', 'рутина', 'влогер',
    // Spanish
    'vlog', 'estilo de vida', 'día en la vida', 'rutina',
    // Portuguese
    'vlog', 'estilo de vida', 'dia na vida', 'rotina',
  ],
  'Comedy': [
    // English
    'comedy', 'funny', 'humor', 'laugh', 'joke', 'stand-up', 'sketch', 'parody', 'satire',
    // Russian
    'комедия', 'смешно', 'стендап', 'скетч', 'пародия', 'юмор',
    // Spanish
    'comedia', 'gracioso', 'stand up', 'humor',
    // Portuguese
    'comédia', 'engraçado', 'stand up', 'humor',
  ],
  'Animation': [
    // English
    'animation', 'animated', 'cartoon', 'anime', 'manga', '2d', '3d', 'motion graphics',
    // Russian
    'анимация', 'мультфильм', 'аниме', 'манга', 'мультик',
    // Spanish
    'animación', 'animado', 'anime', 'manga',
    // Portuguese
    'animação', 'animado', 'anime', 'mangá',
  ],
  'Film & TV': [
    // English
    'movie', 'film', 'cinema', 'tv', 'series', 'show', 'episode', 'trailer', 'review', 'recap',
    // Russian
    'фильм', 'кино', 'сериал', 'трейлер', 'обзор',
    // Spanish
    'película', 'cine', 'serie', 'trailer',
    // Portuguese
    'filme', 'cinema', 'série', 'trailer',
  ],
  'Automotive': [
    // English
    'car', 'auto', 'vehicle', 'drive', 'racing', 'motor', 'bike', 'motorcycle', 'truck', 'supercar',
    // Russian
    'машина', 'авто', 'автомобиль', 'гонки', 'мотоцикл',
    // Spanish
    'coche', 'auto', 'vehículo', 'carreras', 'moto',
    // Portuguese
    'carro', 'auto', 'veículo', 'corrida', 'moto',
  ],
  'Pets & Animals': [
    // English
    'pet', 'animal', 'dog', 'cat', 'puppy', 'kitten', 'cute', 'wildlife', 'zoo', 'rescue',
    // Russian
    'питомец', 'животное', 'собака', 'кот', 'щенок', 'котенок', 'зоопарк',
    // Spanish
    'mascota', 'animal', 'perro', 'gato', 'cachorro', 'gatito',
    // Portuguese
    'animal de estimação', 'animal', 'cachorro', 'gato', 'filhote',
  ],
  'Kids & Family': [
    // English
    'kids', 'children', 'family', 'baby', 'toddler', 'parent', 'mom', 'dad', 'toy', 'nursery rhyme',
    // Russian
    'дети', 'семья', 'ребенок', 'малыш', 'родители', 'мама', 'папа', 'игрушка',
    // Spanish
    'niños', 'familia', 'bebé', 'padres', 'mamá', 'papá', 'juguete',
    // Portuguese
    'crianças', 'família', 'bebê', 'pais', 'mãe', 'pai', 'brinquedo',
  ],
};

export function classifyChannelNiche(
  title: string,
  description: string,
  tags: string[] = []
): Niche {
  const text = `${title} ${description} ${tags.join(' ')}`.toLowerCase();

  const scores: Record<Niche, number> = {} as Record<Niche, number>;

  for (const niche of NICHES) {
    let score = 0;
    const keywords = NICHE_KEYWORDS[niche];

    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        score += matches.length;
      }
    }

    scores[niche] = score;
  }

  let maxScore = 0;
  let bestNiche: Niche = 'Entertainment';

  for (const [niche, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestNiche = niche as Niche;
    }
  }

  return bestNiche;
}

export function getNicheKeywords(niche: Niche): string[] {
  return NICHE_KEYWORDS[niche];
}
