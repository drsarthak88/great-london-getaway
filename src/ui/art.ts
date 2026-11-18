/**
 * Hand-drawn-style SVG art for the menus and the storybook intro, built from simple
 * shapes in code (no image files to download). Every function returns an SVG string.
 */
const INK = '#2b2118';

/** Marmalade Jack's face: ginger, bandit mask, green eyes, cheeky grin. */
export function jackFace(x = 0, y = 0, s = 1, wink = false): string {
  return `<g transform="translate(${x} ${y}) scale(${s})" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round">
    <path d="M-30 -18 L-34 -50 L-10 -30 Z M30 -18 L34 -50 L10 -30 Z" fill="#e8862a"/>
    <path d="M-27 -26 L-29 -42 L-16 -30 Z M27 -26 L29 -42 L16 -30 Z" fill="#f28c9b" stroke="none"/>
    <ellipse cx="0" cy="0" rx="36" ry="32" fill="#e8862a"/>
    <path d="M-12 -30 Q0 -34 12 -30 M-6 -32 L-4 -22 M6 -32 L4 -22" fill="none" stroke="#b85f17" stroke-width="3"/>
    <rect x="-36" y="-12" width="72" height="14" rx="6" fill="${INK}"/>
    <ellipse cx="-13" cy="-5" rx="7" ry="8" fill="#fff"/>
    ${wink ? '<path d="M7 -5 Q13 -1 19 -5" fill="none"/>' : '<ellipse cx="13" cy="-5" rx="7" ry="8" fill="#fff"/><ellipse cx="13" cy="-4" rx="3" ry="5" fill="#7bc043" stroke="none"/>'}
    <ellipse cx="-13" cy="-4" rx="3" ry="5" fill="#7bc043" stroke="none"/>
    <ellipse cx="0" cy="14" rx="15" ry="10" fill="#fff1d6"/>
    <ellipse cx="0" cy="8" rx="4" ry="3" fill="#f28c9b"/>
    <path d="M-8 16 Q0 24 9 15" fill="none"/>
    <path d="M-16 12 L-36 8 M-16 16 L-36 18 M16 12 L36 8 M16 16 L36 18" stroke-width="1.5"/>
  </g>`;
}

/** Inspector Hemlock Bones: deerstalker, big nose, bushy moustache. */
export function bonesFace(x = 0, y = 0, s = 1): string {
  return `<g transform="translate(${x} ${y}) scale(${s})" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round">
    <ellipse cx="0" cy="4" rx="28" ry="31" fill="#f2c9a0"/>
    <path d="M-30 -10 Q-32 -46 0 -48 Q32 -46 30 -10 Z" fill="#b08a5a"/>
    <path d="M-30 -14 L-46 -6 L-28 -4 Z M30 -14 L46 -6 L28 -4 Z" fill="#9a7448"/>
    <path d="M-22 -40 L22 -16 M-10 -46 L28 -26 M-28 -26 L10 -46" stroke="#6e5236" stroke-width="2"/>
    <circle cx="0" cy="-48" r="4" fill="#6e5236"/>
    <circle cx="-10" cy="-2" r="3.5" fill="${INK}"/>
    <circle cx="10" cy="-2" r="3.5" fill="${INK}"/>
    <path d="M-17 -10 L-4 -8 M17 -10 L4 -8" stroke-width="4" stroke="#6b4426"/>
    <ellipse cx="0" cy="10" rx="8" ry="9" fill="#e8a283"/>
    <path d="M-2 18 Q-16 16 -24 26 Q-12 22 -2 22 Z M2 18 Q16 16 24 26 Q12 22 2 22 Z" fill="#6b4426"/>
  </g>`;
}

export function teapot(x = 0, y = 0, s = 1): string {
  return `<g transform="translate(${x} ${y}) scale(${s})" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round" fill="#f0b429">
    <path d="M22 0 L40 -16 L44 -12 L28 8 Z"/>
    <path d="M-24 -8 Q-44 -6 -40 10 Q-36 22 -22 12" fill="none" stroke-width="6" stroke="${INK}"/>
    <path d="M-24 -8 Q-44 -6 -40 10 Q-36 22 -22 12" fill="none" stroke-width="3" stroke="#f0b429"/>
    <ellipse cx="0" cy="4" rx="28" ry="22"/>
    <path d="M-14 -16 Q0 -28 14 -16 Z"/>
    <circle cx="0" cy="-24" r="4"/>
    <path d="M-12 -2 Q-6 -10 2 -8" fill="none" stroke="#fff" stroke-width="3"/>
  </g>`;
}

export function bigBen(x = 0, y = 0, s = 1): string {
  return `<g transform="translate(${x} ${y}) scale(${s})" stroke="${INK}" stroke-width="2" stroke-linejoin="round">
    <rect x="-12" y="-60" width="24" height="120" fill="#f6cf73"/>
    <rect x="-15" y="-78" width="30" height="22" fill="#ffe7a6"/>
    <circle cx="0" cy="-67" r="8" fill="#fffaf0"/>
    <path d="M0 -67 L0 -72 M0 -67 L4 -65" stroke-width="1.6"/>
    <path d="M-14 -78 L0 -112 L14 -78 Z" fill="#2bb3a3"/>
    <circle cx="0" cy="-114" r="3" fill="#ffc21a"/>
  </g>`;
}

/** A tiny figure of Jack running with the teapot (for story pages). */
export function jackRunning(x = 0, y = 0, s = 1, flip = false): string {
  return `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round">
    <path d="M-8 30 L-22 52 M8 30 L20 50" stroke-width="7" stroke="#e8862a"/>
    <path d="M-8 30 L-22 52 M8 30 L20 50" fill="none"/>
    <path d="M-18 -2 Q-40 -20 -30 -40" fill="none" stroke-width="8" stroke="#b85f17"/>
    <rect x="-16" y="-6" width="32" height="40" rx="14" fill="#f2ead8"/>
    <path d="M-16 6 H16 M-16 18 H16" stroke-width="5" stroke="#2d2a33"/>
    ${teapot(-6, 10, 0.32)}
    <path d="M14 4 L32 -8" stroke-width="7" stroke="#e8862a"/>
    ${jackFace(0, -24, 0.55)}
  </g>`;
}

export function museumScene(): string {
  return `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
    <rect width="320" height="200" fill="#ffe8b8"/>
    <path d="M40 60 L160 20 L280 60 Z" fill="#fff1d0" stroke="${INK}" stroke-width="3"/>
    <rect x="50" y="60" width="220" height="12" fill="#ffe7a6" stroke="${INK}" stroke-width="3"/>
    ${[70, 110, 150, 190, 230].map((x) => `<rect x="${x}" y="72" width="16" height="100" fill="#fff" stroke="${INK}" stroke-width="2.5"/>`).join('')}
    <text x="160" y="52" font-family="Georgia" font-weight="bold" font-size="14" text-anchor="middle" fill="${INK}">MUSEUM OF MARVELLOUS TEAPOTS</text>
    <rect x="0" y="172" width="320" height="28" fill="#c98a2e"/>
    <rect x="128" y="120" width="40" height="52" fill="#9bd7ff" stroke="${INK}" stroke-width="2.5" opacity="0.8"/>
    ${jackRunning(214, 120, 0.9)}
    ${teapot(214, 106, 0.4)}
    <text x="250" y="96" font-family="Georgia" font-size="22" fill="#e63946">✦</text>
  </svg>`;
}

export function spottedScene(): string {
  return `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
    <rect width="320" height="200" fill="#bfe6ff"/>
    <rect x="0" y="150" width="320" height="50" fill="#8a8fa8"/>
    ${bonesFace(96, 92, 1.4)}
    <circle cx="170" cy="98" r="30" fill="#e6f7ff" stroke="#d9a63a" stroke-width="7"/>
    <path d="M150 120 L128 150" stroke="#5b3a1e" stroke-width="9" stroke-linecap="round"/>
    ${jackFace(170, 98, 0.55, true)}
    <text x="250" y="70" font-family="Georgia" font-weight="bold" font-size="30" fill="#e63946" stroke="${INK}" stroke-width="1">!!</text>
  </svg>`;
}

export function chaseScene(): string {
  return `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
    <rect width="320" height="200" fill="#5ec8ff"/>
    <ellipse cx="60" cy="40" rx="34" ry="14" fill="#fff"/><ellipse cx="250" cy="30" rx="40" ry="15" fill="#fff"/>
    ${bigBen(270, 112, 0.9)}
    <rect x="0" y="160" width="320" height="40" fill="#8a8fa8"/>
    <path d="M0 178 H320" stroke="#fff" stroke-width="4" stroke-dasharray="18 14"/>
    ${jackRunning(180, 110, 0.85)}
    <g transform="translate(70 118)">${bonesFace(0, -6, 0.75)}<rect x="-18" y="18" width="36" height="34" rx="10" fill="#8a6a4a" stroke="${INK}" stroke-width="2.5"/></g>
    <path d="M110 120 L130 118 M110 130 L134 130" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
}

export function yourTurnScene(): string {
  return `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg">
    <rect width="320" height="200" fill="#ffe1f5"/>
    <path d="M160 30 L172 64 L208 64 L179 86 L190 120 L160 99 L130 120 L141 86 L112 64 L148 64 Z" fill="#ffc93c" stroke="${INK}" stroke-width="3"/>
    ${jackFace(160, 78, 0.55)}
    <g font-family="Georgia" font-weight="bold" font-size="17" fill="${INK}" text-anchor="middle">
      <text x="56" y="150">← →</text><text x="56" y="172" font-size="12">change lane</text>
      <text x="160" y="150">↑</text><text x="160" y="172" font-size="12">jump</text>
      <text x="264" y="150">↓</text><text x="264" y="172" font-size="12">roll</text>
    </g>
  </svg>`;
}

/** Small icons for wardrobe items. */
export const OUTFIT_ICONS: Record<string, string> = {
  flatCap: `<svg viewBox="0 0 64 64"><path d="M10 38 Q12 18 34 18 Q54 18 54 34 Z" fill="#8a6a4a" stroke="${INK}" stroke-width="3"/><path d="M8 38 Q30 30 60 40 Q34 46 8 38 Z" fill="#6e5236" stroke="${INK}" stroke-width="3"/><path d="M20 26 L44 34 M30 20 L50 28" stroke="#e0c090" stroke-width="2"/></svg>`,
  bowler: `<svg viewBox="0 0 64 64"><path d="M16 40 Q16 14 32 14 Q48 14 48 40 Z" fill="#26262e" stroke="${INK}" stroke-width="3"/><rect x="16" y="32" width="32" height="6" fill="#e63946"/><ellipse cx="32" cy="42" rx="26" ry="6" fill="#26262e" stroke="${INK}" stroke-width="3"/></svg>`,
  unionScarf: `<svg viewBox="0 0 64 64"><path d="M10 22 Q32 34 54 22 L54 30 Q32 42 10 30 Z" fill="#e63946" stroke="${INK}" stroke-width="3"/><path d="M38 32 L44 58 L52 56 L46 30" fill="#1d4ed8" stroke="${INK}" stroke-width="3"/><path d="M12 26 Q32 36 52 26" stroke="#fff" stroke-width="3" fill="none"/></svg>`,
  pearlyJacket: `<svg viewBox="0 0 64 64"><path d="M14 16 L26 10 L32 18 L38 10 L50 16 L56 56 L8 56 Z" fill="#1c2340" stroke="${INK}" stroke-width="3"/>${[18, 26, 34, 42, 50].map((y) => `<circle cx="22" cy="${y}" r="2.6" fill="#fffaf0"/><circle cx="42" cy="${y}" r="2.6" fill="#fffaf0"/>`).join('')}<circle cx="32" cy="34" r="6" fill="none" stroke="#fffaf0" stroke-width="2.4" stroke-dasharray="2 3"/></svg>`,
  pack: `<svg viewBox="0 0 64 64"><rect x="10" y="20" width="44" height="34" rx="6" fill="#b47cff" stroke="${INK}" stroke-width="3"/><rect x="28" y="20" width="8" height="34" fill="#ffc93c"/><path d="M32 20 Q20 6 14 14 Q12 20 32 20 Q44 4 50 14 Q50 20 32 20" fill="#ffc93c" stroke="${INK}" stroke-width="3"/></svg>`,
};

export const COIN_ICON = `<span class="ui-coin" aria-hidden="true"></span>`;
export const TOKEN_ICON = `<span class="ui-token" aria-hidden="true"></span>`;

/** Menu button icons. */
export const MENU_ICONS = {
  shop: `<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="9" y="5" width="14" height="16" rx="2" fill="#26262e" stroke="${INK}" stroke-width="2"/><rect x="9" y="15" width="14" height="3" fill="#e63946"/><ellipse cx="16" cy="22" rx="13" ry="4" fill="#26262e" stroke="${INK}" stroke-width="2"/></svg>`,
  missions: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 5 H24 Q27 5 27 8 V26 Q27 28 25 28 H8 Q5 28 5 25 V8 Q5 5 8 5 Z" fill="#fff1d0" stroke="${INK}" stroke-width="2"/><path d="M10 12 L13 15 L18 9 M10 21 L13 24 L18 18" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round"/><path d="M20 13 H23 M20 22 H23" stroke="${INK}" stroke-width="2"/></svg>`,
  settings: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4 L19 7 L23 6 L24 10 L28 12 L26 16 L28 20 L24 22 L23 26 L19 25 L16 28 L13 25 L9 26 L8 22 L4 20 L6 16 L4 12 L8 10 L9 6 L13 7 Z" fill="#46b5ff" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><circle cx="16" cy="16" r="5" fill="#fff" stroke="${INK}" stroke-width="2"/></svg>`,
};
