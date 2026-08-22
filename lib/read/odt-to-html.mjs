import fs from 'node:fs/promises'
import JSZip from 'jszip'
import { DOMParser } from '@xmldom/xmldom'

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function attr(node, name) {
  return node?.getAttribute?.(name) || ''
}

function elementChildren(node) {
  return Array.from(node?.childNodes || []).filter((child) => child.nodeType === 1)
}

function firstChildByLocalName(node, localName) {
  return elementChildren(node).find((child) => child.localName === localName) || null
}

function collectStyleDefinitions(documents) {
  const styles = new Map()
  const defaultStyles = new Map()

  for (const document of documents) {
    const all = Array.from(document.getElementsByTagName('*'))
    for (const node of all) {
      if (node.localName !== 'style' && node.localName !== 'default-style') continue
      const family = attr(node, 'style:family') || 'paragraph'
      const textProperties = firstChildByLocalName(node, 'text-properties')
      const paragraphProperties = firstChildByLocalName(node, 'paragraph-properties')
      const definition = {
        family,
        parent: attr(node, 'style:parent-style-name'),
        displayName: attr(node, 'style:display-name'),
        bold: /^(?:bold|[6-9]00)$/i.test(attr(textProperties, 'fo:font-weight')),
        italic: /^italic$/i.test(attr(textProperties, 'fo:font-style')),
        underline: attr(textProperties, 'style:text-underline-style') && attr(textProperties, 'style:text-underline-style') !== 'none',
        align: attr(paragraphProperties, 'fo:text-align'),
      }

      if (node.localName === 'default-style') {
        defaultStyles.set(family, definition)
      } else {
        const name = attr(node, 'style:name')
        if (name) styles.set(name, definition)
      }
    }
  }

  const resolved = new Map()
  function resolve(name, seen = new Set()) {
    if (!name) return {}
    if (resolved.has(name)) return resolved.get(name)
    if (seen.has(name)) return {}
    seen.add(name)
    const current = styles.get(name)
    if (!current) return {}
    const inherited = current.parent ? resolve(current.parent, seen) : (defaultStyles.get(current.family) || {})
    const merged = {
      ...inherited,
      ...Object.fromEntries(Object.entries(current).filter(([, value]) => value !== '' && value !== false)),
      bold: current.bold || inherited.bold || false,
      italic: current.italic || inherited.italic || false,
      underline: current.underline || inherited.underline || false,
    }
    resolved.set(name, merged)
    return merged
  }

  return { resolve, styles }
}

function parseXml(xml, label) {
  const errors = []
  const parser = new DOMParser({
    errorHandler: {
      warning: (message) => errors.push(`${label}: ${message}`),
      error: (message) => errors.push(`${label}: ${message}`),
      fatalError: (message) => errors.push(`${label}: ${message}`),
    },
  })
  const document = parser.parseFromString(xml, 'application/xml')
  if (errors.length) throw new Error(errors.join('\n'))
  return document
}

function inlineStyle(node, resolveStyle, warnings) {
  if (!node) return { html: '', text: '' }
  if (node.nodeType === 3 || node.nodeType === 4) {
    const value = node.data || ''
    return { html: escapeHtml(value), text: value }
  }
  if (node.nodeType !== 1) return { html: '', text: '' }

  const localName = node.localName
  if (localName === 's') {
    const count = Math.max(1, Number.parseInt(attr(node, 'text:c') || '1', 10) || 1)
    return { html: '&nbsp;'.repeat(count), text: ' '.repeat(count) }
  }
  if (localName === 'tab') return { html: '&emsp;', text: '\t' }
  if (localName === 'line-break') return { html: '<br>', text: '\n' }
  if (
    localName === 'soft-page-break' ||
    localName === 'bookmark' ||
    localName === 'bookmark-start' ||
    localName === 'bookmark-end' ||
    localName === 'change-start' ||
    localName === 'change-end' ||
    localName === 'annotation' ||
    localName === 'annotation-end'
  ) {
    return { html: '', text: '' }
  }
  if (localName === 'image') {
    warnings.add('Embedded images are not yet imported into the reading page.')
    return { html: '', text: '' }
  }

  const children = Array.from(node.childNodes || []).map((child) => inlineStyle(child, resolveStyle, warnings))
  let html = children.map((part) => part.html).join('')
  const text = children.map((part) => part.text).join('')

  if (localName === 'a') {
    const href = attr(node, 'xlink:href')
    if (href && /^(?:https?:|mailto:|#)/i.test(href)) {
      html = `<a href="${escapeHtml(href)}">${html}</a>`
    }
  }

  if (localName === 'span') {
    const style = resolveStyle(attr(node, 'text:style-name'))
    if (style.underline) html = `<u>${html}</u>`
    if (style.italic) html = `<em>${html}</em>`
    if (style.bold) html = `<strong>${html}</strong>`
  }

  return { html, text }
}

function paragraphTag(node, style) {
  if (node.localName === 'h') {
    const level = Math.min(3, Math.max(1, Number.parseInt(attr(node, 'text:outline-level') || '2', 10) || 2))
    return `h${level}`
  }
  const name = `${attr(node, 'text:style-name')} ${style.displayName || ''}`.toLowerCase()
  if (/\btitle\b/.test(name)) return 'h1'
  if (/\bsubtitle\b/.test(name)) return 'h2'
  if (/heading\s*1|heading_20_1/.test(name)) return 'h2'
  if (/heading\s*2|heading_20_2/.test(name)) return 'h3'
  return 'p'
}

function blockToHtml(node, resolveStyle, warnings) {
  if (!node || node.nodeType !== 1) return { html: '', text: '' }
  const localName = node.localName
  if (localName === 'tracked-changes' || localName === 'annotation') return { html: '', text: '' }

  if (localName === 'p' || localName === 'h') {
    const style = resolveStyle(attr(node, 'text:style-name'))
    const content = inlineStyle(node, resolveStyle, warnings)
    if (!content.text.trim() && !content.html.trim()) return { html: '', text: '' }
    const tag = paragraphTag(node, style)
    const alignment = ['center', 'right', 'justify'].includes(style.align) ? ` style="text-align:${style.align}"` : ''
    let paragraphHtml = content.html
    if (style.underline) paragraphHtml = `<u>${paragraphHtml}</u>`
    if (style.italic) paragraphHtml = `<em>${paragraphHtml}</em>`
    if (style.bold) paragraphHtml = `<strong>${paragraphHtml}</strong>`
    return { html: `<${tag}${alignment}>${paragraphHtml}</${tag}>`, text: content.text }
  }

  if (localName === 'list') {
    const ordered = /number/i.test(attr(node, 'text:style-name'))
    const tag = ordered ? 'ol' : 'ul'
    const items = elementChildren(node).filter((child) => child.localName === 'list-item').map((item) => {
      const converted = elementChildren(item).map((child) => blockToHtml(child, resolveStyle, warnings))
      return {
        html: `<li>${converted.map((part) => part.html).join('')}</li>`,
        text: converted.map((part) => part.text).join('\n'),
      }
    })
    return { html: `<${tag}>${items.map((item) => item.html).join('')}</${tag}>`, text: items.map((item) => item.text).join('\n') }
  }

  if (localName === 'table') {
    warnings.add('A table was imported in simplified form.')
    const rows = Array.from(node.getElementsByTagName('*')).filter((child) => child.localName === 'table-row').map((row) => {
      const cells = elementChildren(row).filter((child) => child.localName === 'table-cell' || child.localName === 'covered-table-cell').map((cell) => {
        const converted = elementChildren(cell).map((child) => blockToHtml(child, resolveStyle, warnings))
        return { html: `<td>${converted.map((part) => part.html).join('')}</td>`, text: converted.map((part) => part.text).join(' ') }
      })
      return { html: `<tr>${cells.map((cell) => cell.html).join('')}</tr>`, text: cells.map((cell) => cell.text).join('\t') }
    })
    return { html: `<table><tbody>${rows.map((row) => row.html).join('')}</tbody></table>`, text: rows.map((row) => row.text).join('\n') }
  }

  const children = elementChildren(node).map((child) => blockToHtml(child, resolveStyle, warnings))
  return { html: children.map((part) => part.html).join('\n'), text: children.map((part) => part.text).filter(Boolean).join('\n\n') }
}

export async function convertOdtBufferToHtml(sourceBuffer) {
  const zip = await JSZip.loadAsync(sourceBuffer)
  const contentFile = zip.file('content.xml')
  if (!contentFile) throw new Error('The ODT does not contain content.xml.')

  const contentXml = await contentFile.async('string')
  const stylesXml = zip.file('styles.xml') ? await zip.file('styles.xml').async('string') : null
  const contentDocument = parseXml(contentXml, 'content.xml')
  const stylesDocument = stylesXml ? parseXml(stylesXml, 'styles.xml') : null
  const { resolve } = collectStyleDefinitions([stylesDocument, contentDocument].filter(Boolean))
  const officeText = Array.from(contentDocument.getElementsByTagName('*')).find((node) => node.localName === 'text' && /office/.test(node.namespaceURI || ''))
  if (!officeText) throw new Error('The ODT does not contain an office:text body.')

  const warnings = new Set()
  const converted = elementChildren(officeText)
    .map((node) => blockToHtml(node, resolve, warnings))
    .filter((part) => part.html.trim() || part.text.trim())
  const html = converted.map((part) => part.html).filter(Boolean).join('\n')
  const rawText = converted.map((part) => part.text).filter(Boolean).join('\n\n')

  if (!rawText.trim()) throw new Error('The ODT did not contain readable manuscript text.')
  return { html, rawText, blocks: converted, warnings: Array.from(warnings) }
}

export async function convertOdtToHtml(sourcePath) {
  return convertOdtBufferToHtml(await fs.readFile(sourcePath))
}
