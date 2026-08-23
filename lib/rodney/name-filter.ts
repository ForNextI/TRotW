const PHRASE_BLOCKED = [
  'suckmydick',
  'suckmycock',
  'sckmydck',
  'sckmycck',
  'fuckyou',
  'fckyou',
  'fuckoff',
  'fckoff',
  'eatshit',
]

const WORD_BLOCKED = new Set([
  'fuck',
  'fck',
  'shit',
  'cunt',
  'asshole',
  'bitch',
  'dick',
  'dck',
  'cock',
  'pussy',
  'faggot',
  'fggt',
  'nigger',
  'nggr',
])

const LEET_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  '$': 's',
  '!': 'i',
  '|': 'i',
}

function normalizeLeet(value: string) {
  return value
    .normalize('NFKD')
    .toLocaleLowerCase('en-US')
    .replace(/[013457@$!|]/g, (character) => LEET_MAP[character] || character)
    .replace(/[\u0300-\u036f]/g, '')
}

function compactLetters(value: string) {
  return normalizeLeet(value)
    .replace(/[^a-z]/g, '')
    .replace(/(.)\1{2,}/g, '$1$1')
}

function visibleWords(value: string) {
  return normalizeLeet(value)
    .replace(/[^a-z]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

export function publicWinnerNameProblem(value: string) {
  const compact = compactLetters(value)
  const words = visibleWords(value)
  if (!compact) return 'Enter a winner name using visible letters or numbers.'
  if (/(?:https?:\/\/|www\.|[a-z0-9-]+\.(?:com|net|org)\b)/i.test(value)) {
    return 'Winner names cannot contain web addresses.'
  }
  if (PHRASE_BLOCKED.some((phrase) => compact.includes(phrase))) {
    return 'Choose a name suitable for the public Roll of Fortune.'
  }
  if (words.some((word) => WORD_BLOCKED.has(word)) || WORD_BLOCKED.has(compact)) {
    return 'Choose a name suitable for the public Roll of Fortune.'
  }
  return null
}
