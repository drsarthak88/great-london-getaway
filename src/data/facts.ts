import type { LandmarkId } from './zones';

/**
 * "Did you know?" postcards. Two or three short, accurate facts per landmark, plus a
 * few general London facts for the Case File. Keep every fact checkable and true.
 */
export interface Postcard {
  title: string;
  facts: string[];
}

export const POSTCARDS: Record<LandmarkId, Postcard> = {
  parliament: {
    title: 'Houses of Parliament',
    facts: [
      'The Palace of Westminster has more than 1,100 rooms.',
      'Most of the palace you see today was rebuilt after a great fire in 1834.',
    ],
  },
  bigBen: {
    title: 'Big Ben',
    facts: [
      '"Big Ben" is really the nickname of the giant bell inside the tower, not the tower itself.',
      'The tower was renamed the Elizabeth Tower in 2012 for Queen Elizabeth II\'s Diamond Jubilee.',
      'Each of the four clock faces is 7 metres across.',
    ],
  },
  londonEye: {
    title: 'The London Eye',
    facts: [
      'The London Eye is 135 metres tall and opened to the public in 2000.',
      'It has 32 capsules, one for each of London\'s boroughs.',
      'One full turn of the wheel takes about 30 minutes.',
    ],
  },
  towerOfLondon: {
    title: 'The Tower of London',
    facts: [
      'At least six ravens live at the Tower. Legend says the kingdom will fall if they ever leave!',
      'The Crown Jewels are kept safe at the Tower of London.',
      'The White Tower in the middle was begun by William the Conqueror in the 1070s.',
    ],
  },
  towerBridge: {
    title: 'Tower Bridge',
    facts: [
      'Tower Bridge opened in 1894.',
      'Its two halves, called bascules, lift up so tall ships can sail through.',
      'People often call it London Bridge, but that is a different bridge just upstream.',
    ],
  },
  buckingham: {
    title: 'Buckingham Palace',
    facts: [
      'Buckingham Palace has 775 rooms, including 78 bathrooms.',
      'When the monarch is at home, the Royal Standard flag flies above the palace.',
      'The Changing of the Guard takes place in the palace forecourt.',
    ],
  },
  victoriaMemorial: {
    title: 'The Victoria Memorial',
    facts: [
      'The Victoria Memorial outside the palace was unveiled in 1911.',
      'The golden winged figure on top represents Victory.',
      'The road leading to it, The Mall, is coloured red like a giant red carpet.',
    ],
  },
  nelson: {
    title: "Nelson's Column",
    facts: [
      "Nelson's Column is about 52 metres tall, including the statue on top.",
      'It honours Admiral Lord Nelson, who died at the Battle of Trafalgar in 1805.',
      'The four bronze lions around its base were designed by Sir Edwin Landseer.',
    ],
  },
  piccadilly: {
    title: 'Piccadilly Circus',
    facts: [
      '"Circus" comes from the Latin word for circle: a round open space where streets meet.',
      'Piccadilly Circus has had glowing advertising signs since 1908.',
      'The winged statue people call Eros actually shows his brother, Anteros.',
    ],
  },
  baker221b: {
    title: '221B Baker Street',
    facts: [
      '221B Baker Street is the made-up home of the detective Sherlock Holmes, from Arthur Conan Doyle\'s stories.',
      'When the stories were written, Baker Street\'s house numbers didn\'t go as high as 221.',
      'Baker Street station opened in 1863 on the world\'s first underground railway.',
    ],
  },
  stPauls: {
    title: "St Paul's Cathedral",
    facts: [
      "St Paul's was designed by Sir Christopher Wren and built between 1675 and 1710.",
      'Whisper against the wall of its Whispering Gallery and someone on the far side can hear you!',
      'The top of its cross is 111 metres above the ground.',
    ],
  },
  camden: {
    title: 'Camden Market',
    facts: [
      'Camden Market began in 1974 as a small crafts market by Camden Lock.',
      "Camden Lock is on Regent's Canal, which opened in 1820.",
    ],
  },
  nottingHill: {
    title: 'Notting Hill',
    facts: [
      'The Notting Hill Carnival, held every August, is one of the biggest street festivals in Europe.',
      'Portobello Road Market in Notting Hill is famous for its antiques.',
    ],
  },
};

/** Extra London facts for the Game Over "Case File". */
export const GENERAL_FACTS: string[] = [
  'London taxi drivers must pass "The Knowledge", learning around 25,000 streets by heart.',
  'The classic red telephone box was designed by Sir Giles Gilbert Scott.',
  'Pillar boxes were first painted green, and turned red in 1874.',
  'The River Thames is about 346 kilometres long.',
  'The Shard is about 310 metres tall, one of the tallest buildings in Europe.',
  'The Gherkin\'s real address is 30 St Mary Axe.',
  'The Foot Guards\' tall bearskin hats are about 45 centimetres high.',
  'The London Underground is often called "the Tube".',
];

/** Every fact in a fixed order, for the Case File's "one new fact" rotation. */
export const ALL_FACTS: string[] = [...GENERAL_FACTS, ...Object.values(POSTCARDS).flatMap((c) => c.facts)];

/** The n-th fact in the rotation (wraps around). */
export function pickFact(n: number): string {
  // Step through with a stride coprime to the length so consecutive facts vary by topic.
  const len = ALL_FACTS.length;
  let stride = 7;
  while (len % stride === 0) stride++;
  return ALL_FACTS[(n * stride) % len];
}
