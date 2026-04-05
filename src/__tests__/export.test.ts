import { describe, it, expect, vi, afterEach } from 'vitest'
import { importFromJson, exportToJson } from '../utils/export'

describe('importFromJson', () => {
  it('parses a valid export file', async () => {
    const data = {
      tripDays: 5,
      listTitle: 'My custom list',
      sections: [{
        id: 'sec-1',
        title: 'Repair Kit',
        items: [{
          id: 'item-1',
          title: 'Tape',
          quantity: 2,
          perDay: false,
          description: 'Gaffer tape',
          checked: true,
        }],
      }],
    }
    const file = new File([JSON.stringify(data)], 'kit.json', { type: 'application/json' })
    const result = await importFromJson(file)

    expect(result.days).toBe(5)
    expect(result.listTitle).toBe('My custom list')
    expect(result.sections).toHaveLength(1)
    expect(result.sections[0].title).toBe('Repair Kit')
    expect(result.sections[0].items[0].title).toBe('Tape')
    expect(result.sections[0].items[0].quantity).toBe(2)
    expect(result.sections[0].items[0].checked).toBe(true)
  })

  it('defaults missing item fields', async () => {
    const data = {
      sections: [{
        id: 's1',
        title: 'Test',
        items: [{ id: 'i1', title: 'Minimal item' }],
      }],
    }
    const file = new File([JSON.stringify(data)], 'kit.json')
    const result = await importFromJson(file)
    const item = result.sections[0].items[0]

    expect(item.quantity).toBe(1)
    expect(item.perDay).toBe(false)
    expect(item.checked).toBe(false)
    expect(item.description).toBe('')
  })

  it('defaults listTitle to "Bikepacking kit list" when missing', async () => {
    const data = { sections: [] }
    const file = new File([JSON.stringify(data)], 'kit.json')
    const result = await importFromJson(file)
    expect(result.listTitle).toBe('Bikepacking kit list')
  })

  it('defaults tripDays to 7 when missing', async () => {
    const data = { sections: [] }
    const file = new File([JSON.stringify(data)], 'kit.json')
    const result = await importFromJson(file)
    expect(result.days).toBe(7)
  })

  it('rejects when sections is not an array', async () => {
    const file = new File([JSON.stringify({ sections: 'nope' })], 'kit.json')
    await expect(importFromJson(file)).rejects.toThrow('missing sections array')
  })

  it('rejects when a section is missing its title', async () => {
    const data = { sections: [{ id: 'x', items: [] }] }
    const file = new File([JSON.stringify(data)], 'kit.json')
    await expect(importFromJson(file)).rejects.toThrow()
  })

  it('rejects invalid JSON', async () => {
    const file = new File(['not valid json {{'], 'kit.json')
    await expect(importFromJson(file)).rejects.toThrow()
  })
})

describe('exportToJson', () => {
  afterEach(() => vi.restoreAllMocks())

  it('triggers a file download with the correct filename', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const mockClick = vi.fn()
    vi.spyOn(document, 'createElement').mockImplementationOnce((tag: string) => {
      const el = document.createElement(tag)
      el.click = mockClick
      return el
    })

    exportToJson([], 7, 'Test list')

    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(mockClick).toHaveBeenCalled()
  })

  it('includes tripDays, listTitle and section data in the export', async () => {
    let capturedBlob: Blob | undefined
    vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => {
      capturedBlob = b as Blob
      return 'blob:test'
    })
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(document, 'createElement').mockImplementationOnce((tag: string) => {
      const el = document.createElement(tag)
      el.click = vi.fn()
      return el
    })

    exportToJson([{ id: 's1', title: 'Repair', items: [] }], 4, 'My trip')

    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsText(capturedBlob!)
    })
    const parsed = JSON.parse(text)
    expect(parsed.tripDays).toBe(4)
    expect(parsed.listTitle).toBe('My trip')
    expect(parsed.sections[0].title).toBe('Repair')
  })
})
