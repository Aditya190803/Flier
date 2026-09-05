import type { EmojiMap } from "./types";

/**
 * Common emoji name to Unicode character mapping.
 */
export const EMOJI_NAME_MAP: EmojiMap = {
  smile: "😊",
  grin: "😀",
  laugh: "😂",
  joy: "😂",
  wink: "😉",
  blush: "😊",
  heart_eyes: "😍",
  love: "😍",
  cool: "😎",
  sunglasses: "😎",
  thinking: "🤔",
  neutral: "😐",
  expressionless: "😑",
  unamused: "😒",
  sweat: "😅",
  worried: "😟",
  cry: "😢",
  sob: "😭",
  angry: "😠",
  rage: "😡",
  scream: "😱",
  flushed: "😳",
  dizzy: "😵",
  mask: "😷",
  clown: "🤡",
  poop: "💩",
  ghost: "👻",
  skull: "💀",
  alien: "👽",
  robot: "🤖",
  cat: "🐱",
  dog: "🐶",
  monkey: "🐵",
  "thumbs-up": "👍",
  thumbsup: "👍",
  "+1": "👍",
  "thumbs-down": "👎",
  thumbsdown: "👎",
  "-1": "👎",
  clap: "👏",
  wave: "👋",
  ok: "👌",
  ok_hand: "👌",
  point_up: "☝️",
  point_down: "👇",
  point_left: "👈",
  point_right: "👉",
  raised_hands: "🙌",
  pray: "🙏",
  handshake: "🤝",
  muscle: "💪",
  fist: "✊",
  heart: "❤️",
  red_heart: "❤️",
  orange_heart: "🧡",
  yellow_heart: "💛",
  green_heart: "💚",
  blue_heart: "💙",
  purple_heart: "💜",
  black_heart: "🖤",
  white_heart: "🤍",
  broken_heart: "💔",
  sparkling_heart: "💖",
  heartbeat: "💓",
  heartpulse: "💗",
  two_hearts: "💕",
  star: "⭐",
  stars: "🌟",
  sparkles: "✨",
  fire: "🔥",
  flame: "🔥",
  check: "✅",
  checkmark: "✅",
  white_check_mark: "✅",
  cross: "❌",
  x: "❌",
  warning: "⚠️",
  info: "ℹ️",
  question: "❓",
  exclamation: "❗",
  rocket: "🚀",
  email: "📧",
  mail: "📧",
  envelope: "✉️",
  party: "🎉",
  tada: "🎉",
  confetti: "🎊",
  balloon: "🎈",
  gift: "🎁",
  trophy: "🏆",
  medal: "🏅",
  crown: "👑",
  gem: "💎",
  money: "💰",
  moneybag: "💰",
  dollar: "💵",
  bulb: "💡",
  idea: "💡",
  book: "📖",
  books: "📚",
  pencil: "✏️",
  memo: "📝",
  calendar: "📅",
  clock: "🕐",
  hourglass: "⏳",
  phone: "📱",
  computer: "💻",
  keyboard: "⌨️",
  sun: "☀️",
  sunny: "☀️",
  moon: "🌙",
  cloud: "☁️",
  rain: "🌧️",
  rainbow: "🌈",
  snowflake: "❄️",
  zap: "⚡",
  lightning: "⚡",
  earth: "🌍",
  globe: "🌎",
  tree: "🌳",
  flower: "🌸",
  rose: "🌹",
  coffee: "☕",
  tea: "🍵",
  beer: "🍺",
  wine: "🍷",
  pizza: "🍕",
  burger: "🍔",
  fries: "🍟",
  cake: "🎂",
  cookie: "🍪",
  apple: "🍎",
  banana: "🍌",
};

const EMOJI_PATTERNS = {
  altWithClass: /<img[^>]*alt="([^"]*)"[^>]*class="[^"]*emoji[^"]*"[^>]*>/gi,
  classWithAlt: /<img[^>]*class="[^"]*emoji[^"]*"[^>]*alt="([^"]*)"[^>]*>/gi,
  dataEmoji: /<img[^>]*data-emoji="([^"]*)"[^>]*>/gi,
  dataEmojiWithAlt: /<img[^>]*data-emoji="[^"]*"[^>]*alt="([^"]*)"[^>]*>/gi,
  altWithDataEmoji: /<img[^>]*alt="([^"]*)"[^>]*data-emoji="[^"]*"[^>]*>/gi,
  srcEmojiWithAlt: /<img[^>]*src="[^"]*emoji[^"]*"[^>]*alt="([^"]*)"[^>]*>/gi,
  altWithSrcEmoji: /<img[^>]*alt="([^"]*)"[^>]*src="[^"]*emoji[^"]*"[^>]*>/gi,
  unicodeInPath:
    /<img[^>]*src="[^"]*[/\\]([0-9a-f]{4,6})\.(?:png|svg|gif)"[^>]*>/gi,
  unicodeWithPrefix:
    /<img[^>]*src="[^"]*\/u([0-9a-f]{4,6})\.(?:png|svg|gif)"[^>]*>/gi,
  namedEmoji:
    /<img[^>]*src="[^"]*emoji[^"]*[/\\]([^"/\\]+)\.(?:png|svg|gif)"[^>]*>/gi,
  emojiClassOnly: /<img[^>]*class="[^"]*emoji[^"]*"[^>]*>/gi,
  emojiInTag: /<img[^>]*emoji[^>]*>/gi,
  emojiInSrc: /<img[^>]*src="[^"]*emoji[^"]*"[^>]*>/gi,
} as const;

export function convertEmojisToUnicode(html: string): string {
  if (!html) {
    return "";
  }

  let result = html;

  result = result
    .replace(EMOJI_PATTERNS.altWithClass, "$1")
    .replace(EMOJI_PATTERNS.classWithAlt, "$1");

  result = result
    .replace(EMOJI_PATTERNS.dataEmojiWithAlt, "$1")
    .replace(EMOJI_PATTERNS.altWithDataEmoji, "$1")
    .replace(EMOJI_PATTERNS.dataEmoji, "$1");

  result = result
    .replace(EMOJI_PATTERNS.srcEmojiWithAlt, "$1")
    .replace(EMOJI_PATTERNS.altWithSrcEmoji, "$1");

  result = result
    .replace(EMOJI_PATTERNS.unicodeInPath, (_match, unicode) => {
      try {
        return String.fromCodePoint(parseInt(unicode, 16));
      } catch {
        return "";
      }
    })
    .replace(EMOJI_PATTERNS.unicodeWithPrefix, (_match, unicode) => {
      try {
        return String.fromCodePoint(parseInt(unicode, 16));
      } catch {
        return "";
      }
    });

  result = result.replace(
    EMOJI_PATTERNS.namedEmoji,
    (_match, emojiName: string) => {
      const normalizedName = emojiName.toLowerCase().replace(/[-_]/g, "_");
      return (
        EMOJI_NAME_MAP[normalizedName] ||
        EMOJI_NAME_MAP[emojiName.toLowerCase()] ||
        ""
      );
    },
  );

  result = result
    .replace(EMOJI_PATTERNS.emojiClassOnly, "")
    .replace(EMOJI_PATTERNS.emojiInTag, "")
    .replace(EMOJI_PATTERNS.emojiInSrc, "");

  return result;
}
