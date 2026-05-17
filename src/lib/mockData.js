const VOCABULARY = [
  'cat',
  'cat house',
  'house',
  'bed',
  'wrinkle',
  'blanket',
  'sofa',
  'indoor',
  'man',
  'businessman',
  'tie',
  'coworker',
  'suited',
  'beard',
  'woman',
  'pregnant',
  'hair',
  'stockings',
  'lingerie',
  'hairstyle',
  'portrait',
  'outdoor',
  'kitchen',
  'office',
  'suit',
  'dress',
  'smile',
  'pet',
];

/**
 * @param {string} query
 * @returns {{ id: string, label: string }[]}
 */
export function getMockConcepts(query) {
  const normalizedQuery = query.toLowerCase();

  return VOCABULARY.filter((item) => item.includes(normalizedQuery))
    .slice(0, 8)
    .map((item) => ({
      id: item.replace(/\s+/g, '-'),
      label: item,
    }));
}

/**
 * @param {{ id: string, label: string, weight: number }[]} concepts
 * @param {number} topK
 * @returns {{ images: { id: string, url: string, caption: string, score: number }[], unexpectedConcepts: { id: string, label: string, meanWeight: number, baselineWeight: number, ratio: number }[] }}
 */
export function getMockRetrievalResults(concepts, topK) {
  const labels = concepts.map((concept) => concept.label.toLowerCase());

  if (labels.includes('woman')) {
    return buildWomanScenario(topK);
  }

  if (labels.includes('man')) {
    return buildManScenario(topK);
  }

  if (labels.includes('cat') || labels.includes('house') || labels.includes('cat house')) {
    return buildCatScenario(topK);
  }

  return buildGenericScenario(concepts, topK);
}

/**
 * @param {number} topK
 */
function buildCatScenario(topK) {
  return {
    images: buildImages(
      [
        'tabby cat on a bed',
        'cat curled beside a blanket',
        'house cat on a sofa',
        'indoor cat near a window',
        'cat resting on a comforter',
        'cat on couch armrest',
        'sleepy cat in bedroom',
        'striped cat on quilt',
        'cat next to pillows',
        'cat indoors on chair',
        'cat by folded blanket',
        'cat lounging at home',
      ],
      topK,
      ['#d2b48c', '#e8d4b0']
    ),
    unexpectedConcepts: [
      createUnexpectedConcept('bed', 0.015, 0.0043, 3.5),
      createUnexpectedConcept('wrinkle', 0.012, 0.0039, 3.1),
      createUnexpectedConcept('blanket', 0.017, 0.0065, 2.6),
      createUnexpectedConcept('sofa', 0.013, 0.0059, 2.2),
      createUnexpectedConcept('indoor', 0.028, 0.0164, 1.7),
    ],
  };
}

/**
 * @param {number} topK
 */
function buildManScenario(topK) {
  return {
    images: buildImages(
      [
        'man in a business meeting',
        'portrait of businessman with tie',
        'bearded man in office',
        'suited coworker at desk',
        'man speaking in conference room',
        'business portrait with blazer',
        'office worker in tie',
        'man with beard and suit jacket',
        'coworkers in hallway',
        'professional portrait',
        'man seated at desk',
        'team meeting close-up',
      ],
      topK,
      ['#8fa6b3', '#dbe5eb']
    ),
    unexpectedConcepts: [
      createUnexpectedConcept('businessman', 0.021, 0.0063, 3.3),
      createUnexpectedConcept('tie', 0.017, 0.0055, 3.1),
      createUnexpectedConcept('coworker', 0.013, 0.0051, 2.5),
      createUnexpectedConcept('suited', 0.015, 0.0062, 2.4),
      createUnexpectedConcept('beard', 0.012, 0.0054, 2.2),
    ],
  };
}

/**
 * @param {number} topK
 */
function buildWomanScenario(topK) {
  return {
    images: buildImages(
      [
        'woman portrait in studio light',
        'woman smiling outdoors',
        'close-up portrait with styled hair',
        'woman seated in interior space',
        'editorial portrait',
        'woman in profile',
        'fashion portrait with hairstyle',
        'woman leaning near window',
        'portrait with patterned clothing',
        'woman standing indoors',
        'portrait with soft lighting',
        'woman photographed in hallway',
      ],
      topK,
      ['#d7b7bf', '#f1dfe3']
    ),
    unexpectedConcepts: [
      createUnexpectedConcept('pregnant', 0.014, 0.0039, 3.6),
      createUnexpectedConcept('hair', 0.020, 0.0064, 3.1),
      createUnexpectedConcept('stockings', 0.011, 0.0038, 2.9),
      createUnexpectedConcept('lingerie', 0.009, 0.0034, 2.6),
      createUnexpectedConcept('hairstyle', 0.013, 0.0051, 2.5),
    ],
  };
}

/**
 * @param {{ id: string, label: string, weight: number }[]} concepts
 * @param {number} topK
 */
function buildGenericScenario(concepts, topK) {
  const descriptor = concepts.map((concept) => concept.label).join(' + ');
  return {
    images: buildImages(
      [
        `${descriptor} result 1`,
        `${descriptor} result 2`,
        `${descriptor} result 3`,
        `${descriptor} result 4`,
        `${descriptor} result 5`,
        `${descriptor} result 6`,
        `${descriptor} result 7`,
        `${descriptor} result 8`,
        `${descriptor} result 9`,
        `${descriptor} result 10`,
        `${descriptor} result 11`,
        `${descriptor} result 12`,
      ],
      topK,
      ['#bfcab9', '#e6ece2']
    ),
    unexpectedConcepts: [
      createUnexpectedConcept('context', 0.012, 0.0051, 2.4),
      createUnexpectedConcept('texture', 0.010, 0.0048, 2.1),
      createUnexpectedConcept('indoor', 0.014, 0.0083, 1.7),
      createUnexpectedConcept('object', 0.011, 0.0072, 1.5),
    ],
  };
}

/**
 * @param {string[]} captions
 * @param {number} topK
 * @param {[string, string]} colors
 */
function buildImages(captions, topK, colors) {
  return captions.slice(0, topK).map((caption, index) => ({
    id: `${String(index + 1).padStart(9, '0')}.jpg`,
    url: createMockImageUrl(caption, colors[0], colors[1]),
    caption,
    score: Number((0.96 - index * 0.03).toFixed(2)),
  }));
}

/**
 * @param {string} label
 * @param {number} meanWeight
 * @param {number} baselineWeight
 * @param {number} ratio
 */
function createUnexpectedConcept(label, meanWeight, baselineWeight, ratio) {
  return {
    id: label.replace(/\s+/g, '-'),
    label,
    meanWeight,
    baselineWeight,
    ratio,
  };
}

/**
 * @param {string} caption
 * @param {string} startColor
 * @param {string} endColor
 */
function createMockImageUrl(caption, startColor, endColor) {
  const lines = splitCaption(caption);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${startColor}" />
          <stop offset="100%" stop-color="${endColor}" />
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#bg)" rx="36" />
      <circle cx="660" cy="120" r="92" fill="rgba(255,255,255,0.16)" />
      <circle cx="170" cy="470" r="138" fill="rgba(255,255,255,0.1)" />
      <rect x="64" y="64" width="672" height="472" rx="28" fill="rgba(255,255,255,0.18)" />
      <text x="92" y="428" fill="#1f2a24" font-size="28" font-family="Arial, sans-serif" opacity="0.78">mock retrieval preview</text>
      <text x="92" y="470" fill="#101713" font-size="42" font-family="Georgia, serif" font-weight="700">${lines[0]}</text>
      <text x="92" y="516" fill="#101713" font-size="42" font-family="Georgia, serif" font-weight="700">${lines[1]}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/**
 * @param {string} caption
 */
function splitCaption(caption) {
  const words = caption.split(' ');
  const midpoint = Math.ceil(words.length / 2);
  return [words.slice(0, midpoint).join(' '), words.slice(midpoint).join(' ')].map((line) =>
    escapeXml(line)
  );
}

/**
 * @param {string} value
 */
function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
