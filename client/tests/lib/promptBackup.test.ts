import { describe, it, expect, vi, beforeEach } from 'vitest'
import JSZip from 'jszip'
import {
  buildExportZip,
  exportZipName,
  downloadBlob,
  readImportFile,
  normalizeImportEntries,
  toApiEntries,
  toApiEntry,
  ImportFileError,
  PROMPTS_FILE_NAME,
  PROMPT_LIMITS,
  IMPORT_FILE_MAX_SIZE
} from '@/lib/promptBackup.js'

const samplePayload = {
  format: 'prompthub-export',
  version: 1,
  exportedAt: '2025-01-02T03:04:05.000Z',
  exporter: { id: 'u1', name: 'Alice', email: 'alice@example.com' },
  prompts: [
    {
      id: 'id-1',
      clientId: 'uuid-1',
      title: 'First',
      content: 'content one',
      categoryId: 'cat-1',
      categoryName: 'Tech',
      tags: ['a', 'b'],
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T01:00:00.000Z'
    }
  ]
}

async function makeZipFile(fileName: string, entries: Record<string, string>) {
  const zip = new JSZip()
  for (const [name, text] of Object.entries(entries)) {
    zip.file(name, text)
  }
  const bytes = await zip.generateAsync({ type: 'uint8array' })
  return new File([bytes], fileName)
}

describe('promptBackup (export/import file handling)', () => {
  describe('buildExportZip', () => {
    it('produces a ZIP blob containing prompts.json with the payload', async () => {
      const blob = await buildExportZip(samplePayload)
      expect(blob).toBeInstanceOf(Blob)

      const zip = await JSZip.loadAsync(await blob.arrayBuffer())
      const entry = zip.file(PROMPTS_FILE_NAME)
      expect(entry).toBeTruthy()
      const parsed = JSON.parse(await entry!.async('string'))
      expect(parsed).toEqual(samplePayload)
    })

    it('deflate-compresses the payload (the zip must beat the raw JSON size)', async () => {
      // Repetitive content is exactly what prompts look like in practice;
      // an uncompressed (STORE) zip would weigh ~the same as the JSON.
      const bulky = {
        format: 'prompthub-export',
        version: 1,
        prompts: Array.from({ length: 50 }, (_, i) => ({
          id: `id-${i}`,
          clientId: `uuid-${i}`,
          title: `Prompt ${i}`,
          content: 'You are a helpful assistant. '.repeat(100),
          tags: ['a', 'b']
        }))
      }
      const jsonBytes = new Blob([JSON.stringify(bulky, null, 2)]).size
      const zipBlob = await buildExportZip(bulky)
      expect(zipBlob.size).toBeLessThan(jsonBytes / 2)
    })
  })

  describe('exportZipName', () => {
    it('uses a deterministic date-stamped name', () => {
      expect(exportZipName(new Date('2025-06-07T12:00:00.000Z'))).toBe(
        'prompthub-export-2025-06-07.zip'
      )
    })
  })

  describe('downloadBlob', () => {
    let createObjectURL: ReturnType<typeof vi.fn>
    let revokeObjectURL: ReturnType<typeof vi.fn>

    beforeEach(() => {
      createObjectURL = vi.fn(() => 'blob:fake')
      revokeObjectURL = vi.fn()
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        value: createObjectURL
      })
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        value: revokeObjectURL
      })
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
        this: HTMLAnchorElement
      ) {
        // no navigation in the test
        return
      })
    })

    it('attaches, clicks and cleans up a download anchor', () => {
      const blob = new Blob(['x'])
      downloadBlob(blob, 'file.zip')

      expect(createObjectURL).toHaveBeenCalledWith(blob)
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake')
      expect(document.querySelectorAll('a[download="file.zip"]')).toHaveLength(0)
    })
  })

  describe('readImportFile', () => {
    function withSize(file: File, size: number) {
      Object.defineProperty(file, 'size', { value: size, configurable: true })
      return file
    }

    it('rejects files above the size cap before parsing', async () => {
      const file = withSize(new File(['dummy'], 'backup.zip'), IMPORT_FILE_MAX_SIZE + 1)
      await expect(readImportFile(file)).rejects.toThrow(ImportFileError)
      await expect(readImportFile(file)).rejects.toMatchObject({ code: 'TOO_LARGE' })
    })

    it('accepts a file exactly at the size cap', async () => {
      const file = withSize(
        new File([JSON.stringify(samplePayload)], 'backup.json'),
        IMPORT_FILE_MAX_SIZE
      )
      await expect(readImportFile(file)).resolves.toEqual(samplePayload)
    })

    it('reads a ZIP containing prompts.json', async () => {
      const file = await makeZipFile('backup.zip', {
        [PROMPTS_FILE_NAME]: JSON.stringify(samplePayload)
      })
      await expect(readImportFile(file)).resolves.toEqual(samplePayload)
    })

    it('prefers prompts.json over other JSON entries', async () => {
      const file = await makeZipFile('backup.zip', {
        'other.json': '{"unrelated": true}',
        [PROMPTS_FILE_NAME]: JSON.stringify(samplePayload)
      })
      const payload = await readImportFile(file)
      expect(payload).toEqual(samplePayload)
    })

    it('accepts a bare .json file', async () => {
      const file = new File([JSON.stringify(samplePayload)], 'backup.json')
      await expect(readImportFile(file)).resolves.toEqual(samplePayload)
    })

    it('rejects a file that is neither zip nor json', async () => {
      const file = new File(['not a zip at all'], 'backup.bin')
      await expect(readImportFile(file)).rejects.toThrow(ImportFileError)
      await expect(readImportFile(file)).rejects.toMatchObject({ code: 'READ' })
    })

    it('rejects invalid JSON', async () => {
      const file = new File(['{broken'], 'backup.json')
      await expect(readImportFile(file)).rejects.toMatchObject({ code: 'PARSE' })
    })

    it('rejects an unknown format identifier', async () => {
      const file = new File(
        [JSON.stringify({ ...samplePayload, format: 'other-app' })],
        'backup.json'
      )
      await expect(readImportFile(file)).rejects.toMatchObject({ code: 'FORMAT' })
    })

    it('rejects an unsupported version', async () => {
      const file = new File([JSON.stringify({ ...samplePayload, version: 99 })], 'backup.json')
      await expect(readImportFile(file)).rejects.toMatchObject({ code: 'VERSION' })
    })

    it('rejects an empty prompt list', async () => {
      const file = new File([JSON.stringify({ ...samplePayload, prompts: [] })], 'backup.json')
      await expect(readImportFile(file)).rejects.toMatchObject({ code: 'EMPTY' })
    })

    it('rejects a ZIP without any JSON entry', async () => {
      const file = await makeZipFile('backup.zip', { 'readme.txt': 'hello' })
      await expect(readImportFile(file)).rejects.toMatchObject({ code: 'NO_JSON' })
    })
  })

  describe('normalizeImportEntries', () => {
    function normalize(prompts: unknown[]) {
      return normalizeImportEntries({ ...samplePayload, prompts } as typeof samplePayload)
    }

    it('keeps valid entries with normalized fields', () => {
      const { entries, invalidCount } = normalize([
        {
          clientId: 'uuid-1',
          title: '  Padded  ',
          content: 'c',
          tags: [' x ', '', 'y'],
          categoryId: 'cat-1',
          categoryName: 'Tech',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: 'not-a-date'
        }
      ])
      expect(invalidCount).toBe(0)
      expect(entries).toHaveLength(1)
      const e = entries[0]
      expect(e.status).toBe('ok')
      expect(e.title).toBe('Padded')
      expect(e.tags).toEqual(['x', 'y'])
      expect(e.categoryId).toBe('cat-1')
      expect(e.categoryName).toBe('Tech')
      expect(e.createdAt).toBe('2025-01-01T00:00:00.000Z')
      expect(e.updatedAt).toBeNull()
      expect(e.selected).toBe(false)
    })

    it('flags entries that violate the field caps', () => {
      const { entries, invalidCount } = normalize([
        { title: '', content: 'c' },
        { title: 'x'.repeat(PROMPT_LIMITS.title + 1), content: 'c' },
        { title: 't', content: '' },
        { title: 't', content: 'x'.repeat(PROMPT_LIMITS.content + 1) },
        { title: 't', content: 'c', tags: Array(PROMPT_LIMITS.tags + 1).fill('tag') }
      ])
      expect(invalidCount).toBe(5)
      expect(entries.map((e) => e.status)).toEqual([
        'invalid',
        'invalid',
        'invalid',
        'invalid',
        'invalid'
      ])
      expect(entries[0].invalidReason).toBe('title')
      expect(entries[2].invalidReason).toBe('content')
      expect(entries[4].invalidReason).toBe('tags')
    })

    it('marks in-file duplicates (same clientId or same title)', () => {
      const { entries } = normalize([
        { clientId: 'uuid-1', title: 'A', content: '1' },
        { clientId: 'uuid-1', title: 'A', content: '2' }, // duplicate by clientId
        { title: 'NoId', content: '1' },
        { title: 'NOID', content: '2' } // duplicate by title (case-insensitive)
      ])
      expect(entries.map((e) => e.status)).toEqual(['ok', 'duplicate', 'ok', 'duplicate'])
    })

    it('keeps the original file index on every row', () => {
      const { entries } = normalize([
        { clientId: 'a', title: 'A', content: '1' },
        { clientId: 'b', title: 'B', content: '2' }
      ])
      expect(entries.map((e) => e.index)).toEqual([0, 1])
    })
  })

  describe('toApiEntries / toApiEntry', () => {
    it('sends only the valid entries, in shape without UI fields', () => {
      const { entries } = normalizeImportEntries({
        ...samplePayload,
        prompts: [
          { title: 'Ok', content: 'c' },
          { title: '', content: 'bad' },
          { title: 'Also ok', content: 'c' }
        ] as never
      })
      const api = toApiEntries(entries)
      expect(api).toHaveLength(2)
      expect(api[0]).toEqual({
        clientId: null,
        title: 'Ok',
        content: 'c',
        tags: [],
        categoryId: null,
        categoryName: null,
        createdAt: null,
        updatedAt: null
      })
      expect(api[1].title).toBe('Also ok')
    })

    it('toApiEntry maps a single row to the server shape', () => {
      const row = {
        index: 3,
        clientId: 'u1',
        title: 'T',
        content: 'C',
        tags: ['a'],
        categoryId: null,
        categoryName: null,
        createdAt: null,
        updatedAt: null,
        status: 'exists',
        selected: true,
        existingId: 'x'
      }
      expect(toApiEntry(row)).toEqual({
        clientId: 'u1',
        title: 'T',
        content: 'C',
        tags: ['a'],
        categoryId: null,
        categoryName: null,
        createdAt: null,
        updatedAt: null
      })
    })
  })
})
