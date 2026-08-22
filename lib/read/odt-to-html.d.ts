export interface OdtBlock {
  html: string
  text: string
}

export interface OdtConversion {
  html: string
  rawText: string
  blocks: OdtBlock[]
  warnings: string[]
}

export function convertOdtBufferToHtml(sourceBuffer: ArrayBuffer | Uint8Array | Buffer): Promise<OdtConversion>
export function convertOdtToHtml(sourcePath: string): Promise<OdtConversion>
