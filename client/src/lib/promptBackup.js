// JSZip is imported dynamically where it is actually used (buildExportZip /
// readImportFile): it is ~104 KB and must not load with the main chunk
// (PLAN.md P3/22) — a pure-JSON import never pays for it.

// File format contract (SPEC §2.2a): a ZIP archive containing a single JSON
// document (`prompts.json`) with the ExportPayload shape. The ZIP is built
// and parsed in the browser; the server API stays JSON-only.
export const EXPORT_FORMAT = 'prompthub-export'
export const EXPORT_VERSION = 1
export const PROMPTS_FILE_NAME = 'prompts.json'

// Field caps mirroring the server schema (client-side pre-validation; the
// server re-validates as the security boundary).
export const PROMPT_LIMITS = { title: 100, content: 50000, tags: 20, tagLength: 50 }

// Uploaded file size cap (25 MB, a margin above the server's JSON body cap
// IMPORT_BODY_LIMIT=20mb): the client rejects oversized uploads before
// parsing them in browser memory.
export const IMPORT_FILE_MAX_SIZE = 25 * 1024 * 1024

/**
 * Typed error for files that cannot be read/validated. The stable `code`
 * lets the UI map to a localized message without depending on the
 * (English) message text.
 */
export class ImportFileError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'ImportFileError'
    this.code = code
  }
}

/** Builds the export ZIP (prompts.json inside) as a Blob.
 *  uint8array keeps this isomorphic (works in the browser and in Node-based
 *  test runners, where JSZip has no `blob` output type). */
export async function buildExportZip(payload) {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  zip.file(PROMPTS_FILE_NAME, JSON.stringify(payload, null, 2))
  const bytes = await zip.generateAsync({ type: 'uint8array' })
  return new Blob([bytes], { type: 'application/zip' })
}

/** Deterministic download name: `prompthub-export-YYYY-MM-DD.zip`. */
export function exportZipName(date = new Date()) {
  return `prompthub-export-${date.toISOString().slice(0, 10)}.zip`
}

/** Triggers a browser download of the blob. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/**
 * Reads an uploaded file: a ZIP containing a .json entry (preferring
 * `prompts.json`), or a bare .json file. Throws ImportFileError when the
 * file cannot be parsed as the export document.
 */
export async function readImportFile(file) {
  if (file.size > IMPORT_FILE_MAX_SIZE) {
    throw new ImportFileError(
      'TOO_LARGE',
      `The file is ${Math.round(file.size / 1024 / 1024)} MB; the maximum size is ` +
        `${Math.round(IMPORT_FILE_MAX_SIZE / 1024 / 1024)} MB.`
    )
  }
  let text
  if (/\.json$/i.test(file.name)) {
    text = await file.text()
  } else {
    let zip
    try {
      // arrayBuffer() is the stable hand-off to JSZip in every environment.
      const JSZip = (await import('jszip')).default
      zip = await JSZip.loadAsync(await file.arrayBuffer())
    } catch {
      throw new ImportFileError('READ', 'The file could not be read as a ZIP archive.')
    }
    const jsonFiles = Object.values(zip.files).filter((f) => !f.dir && /\.json$/i.test(f.name))
    const entry = jsonFiles.find((f) => f.name === PROMPTS_FILE_NAME) || jsonFiles[0]
    if (!entry) {
      throw new ImportFileError('NO_JSON', 'The ZIP does not contain a JSON file.')
    }
    text = await entry.async('string')
  }

  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new ImportFileError('PARSE', 'The file is not valid JSON.')
  }

  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new ImportFileError('FORMAT', 'The file is not a PromptHub export.')
  }
  if (data.format !== EXPORT_FORMAT) {
    throw new ImportFileError(
      'FORMAT',
      `Not a PromptHub export file (got format "${data.format}").`
    )
  }
  if (data.version !== EXPORT_VERSION) {
    throw new ImportFileError('VERSION', `Unsupported export version ${data.version}.`)
  }
  if (!Array.isArray(data.prompts) || data.prompts.length === 0) {
    throw new ImportFileError('EMPTY', 'The export file contains no prompts.')
  }
  return data
}

function isValidDate(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/**
 * Normalizes the file's prompts into UI rows and pre-validates them locally:
 *  - `ok`       – valid, awaits the server dry-run classification
 *  - `invalid`  – violates a field cap (shown greyed out, never sent)
 *  - `duplicate`– repeats another file entry (same clientId / title)
 * Returns { entries, invalidCount }.
 */
export function normalizeImportEntries(payload) {
  const seen = new Set()

  const entries = payload.prompts.map((raw, index) => {
    const entry = {
      index,
      clientId: null,
      title: '',
      content: '',
      tags: [],
      categoryId: null,
      categoryName: null,
      createdAt: null,
      updatedAt: null,
      status: 'ok',
      invalidReason: null,
      existingId: null,
      existingTitle: null,
      selected: false
    }

    const title = typeof raw?.title === 'string' ? raw.title.trim() : ''
    if (!title || title.length > PROMPT_LIMITS.title) {
      return { ...entry, status: 'invalid', invalidReason: 'title' }
    }
    entry.title = title

    if (
      typeof raw.content !== 'string' ||
      !raw.content ||
      raw.content.length > PROMPT_LIMITS.content
    ) {
      return { ...entry, status: 'invalid', invalidReason: 'content' }
    }
    entry.content = raw.content

    if (raw.tags !== undefined && raw.tags !== null) {
      if (!Array.isArray(raw.tags) || raw.tags.length > PROMPT_LIMITS.tags) {
        return { ...entry, status: 'invalid', invalidReason: 'tags' }
      }
      entry.tags = raw.tags
        .map((t) => String(t).trim())
        .filter(Boolean)
        .slice(0, PROMPT_LIMITS.tags)
    }

    entry.clientId =
      typeof raw.clientId === 'string' && raw.clientId.trim() ? raw.clientId.trim() : null
    entry.categoryId = typeof raw.categoryId === 'string' && raw.categoryId ? raw.categoryId : null
    entry.categoryName =
      typeof raw.categoryName === 'string' && raw.categoryName.trim()
        ? raw.categoryName.trim()
        : null
    entry.createdAt = isValidDate(raw.createdAt)
    entry.updatedAt = isValidDate(raw.updatedAt)

    // In-file duplicates (same clientId, or same title for legacy entries):
    // the first occurrence is kept, the rest are flagged.
    const key = entry.clientId ? `clientId:${entry.clientId}` : `title:${entry.title.toLowerCase()}`
    if (seen.has(key)) {
      return { ...entry, status: 'duplicate', selected: false }
    }
    seen.add(key)
    return entry
  })

  const invalidCount = entries.filter((e) => e.status === 'invalid').length
  return { entries, invalidCount }
}

/** Maps one UI row to the server entry shape (drops UI-only fields). */
export function toApiEntry(entry) {
  return {
    clientId: entry.clientId,
    title: entry.title,
    content: entry.content,
    tags: entry.tags,
    categoryId: entry.categoryId,
    categoryName: entry.categoryName,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt
  }
}

/**
 * The entries sent to the server (only the locally-valid ones — invalid and
 * duplicate rows are resolved client-side). Mirrors the server's entry shape.
 */
export function toApiEntries(entries) {
  return entries.filter((e) => e.status === 'ok').map(toApiEntry)
}
