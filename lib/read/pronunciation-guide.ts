export type ReadAloudSpeechVoice = 'fable' | 'marin'

interface ReadAloudPronunciationEntry {
  terms: readonly string[]
  instruction: string
  speechText: string
  voiceInstructions?: Partial<Record<ReadAloudSpeechVoice, string>>
  voiceSpeechText?: Partial<Record<ReadAloudSpeechVoice, string>>
}

/**
 * Server-side pronunciation guidance for Toril Read Aloud only.
 * Keep visible novel prose unchanged. Add entries when live listening shows
 * that a recurring proper name needs help.
 */
export const READ_ALOUD_PRONUNCIATION_GUIDE: readonly ReadAloudPronunciationEntry[] = [
  {
    terms: ['XiuQing'],
    instruction: 'Pronounce “XiuQing” so it sounds like “shoeCHING”.',
    speechText: 'shoeCHING',
  },
  {
    terms: ['Zhale'],
    instruction: 'Pronounce “Zhale” so it sounds like “ZHAYl”.',
    speechText: 'ZHAYl',
  },
  {
    terms: ['Alastra'],
    instruction: 'Pronounce “Alastra” so it sounds like “aLAHstruh”.',
    speechText: 'aLAHstruh',
  },
  {
    terms: ['Tharad'],
    instruction: 'Pronounce “Tharad” so it sounds like “tha-ROD”.',
    speechText: 'tha-ROD',
  },
]

function includesTerm(text: string, term: string) {
  return text.toLocaleLowerCase('en-US').includes(term.toLocaleLowerCase('en-US'))
}

function escapeRegexLiteral(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isWordCharacter(value: string) {
  return Boolean(value && /[\p{L}\p{N}_]/u.test(value))
}

function replacePronunciationTerm(text: string, term: string, replacement: string) {
  const pattern = new RegExp(escapeRegexLiteral(term), 'giu')
  return text.replace(pattern, (match, offset: number, source: string) => {
    const before = Array.from(source.slice(0, offset)).at(-1) || ''
    const after = Array.from(source.slice(offset + match.length))[0] || ''
    return isWordCharacter(before) || isWordCharacter(after) ? match : replacement
  })
}

/**
 * Returns a temporary speech-only copy of a Toril passage with tested names
 * respelled for the TTS model. The published prose is never modified.
 */
export function readingSpeechText(text: string, voice: ReadAloudSpeechVoice) {
  return READ_ALOUD_PRONUNCIATION_GUIDE.reduce((passage, entry) => {
    const replacement = entry.voiceSpeechText?.[voice] || entry.speechText
    return entry.terms.reduce(
      (current, term) => replacePronunciationTerm(current, term, replacement),
      passage,
    )
  }, text)
}

export function readingPronunciationInstructions(text: string, voice: ReadAloudSpeechVoice) {
  const matching = READ_ALOUD_PRONUNCIATION_GUIDE
    .filter((entry) => entry.terms.some((term) => includesTerm(text, term)))
    .map((entry) => entry.voiceInstructions?.[voice] || entry.instruction)

  if (matching.length === 0) return ''

  return [
    'Reference pronunciations for names in this passage:',
    ...matching.map((instruction) => `- ${instruction}`),
    'Use these pronunciations without changing, spelling out, or commenting on the written text.',
  ].join('\n')
}
