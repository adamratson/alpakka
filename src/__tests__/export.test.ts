import { describe, it, expect, vi, afterEach } from 'vitest'
import { importFromJson, exportToJson } from '../utils/export'
import type { PackingList } from '../data'

describe('importFromJson', () => {
  it('parses a valid new-format export file with lists', async () => {
    const data = {
      exportedAt: new Date().toISOString(),
      activeListId: 'list-1',
      lists: [{
        id: 'list-1',
        title: 'My trip',
        days: 5,
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
      }],
    }
    const file = new File([JSON.stringify(data)], 'kit.json', { type: 'application/json' })
    const result = await importFromJson(file)

    expect(result.lists).toHaveLength(1)
    expect(result.lists[0].days).toBe(5)
    expect(result.lists[0].title).toBe('My trip')
    expect(result.lists[0].sections).toHaveLength(1)
    expect(result.lists[0].sections[0].title).toBe('Repair Kit')
    expect(result.lists[0].sections[0].items[0].title).toBe('Tape')
    expect(result.lists[0].sections[0].items[0].quantity).toBe(2)
    expect(result.lists[0].sections[0].items[0].checked).toBe(true)
    expect(result.activeListId).toBe('list-1')
  })

  it('migrates old-format export file (single list with sections/tripDays)', async () => {
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

    expect(result.lists).toHaveLength(1)
    expect(result.lists[0].days).toBe(5)
    expect(result.lists[0].title).toBe('My custom list')
    expect(result.lists[0].sections[0].items[0].title).toBe('Tape')
    expect(result.activeListId).toBe(result.lists[0].id)
  })

  it('defaults missing item fields', async () => {
    const data = {
      lists: [{
        id: 'list-1',
        title: 'Test',
        days: 7,
        sections: [{
          id: 's1',
          title: 'Test section',
          items: [{ id: 'i1', title: 'Minimal item' }],
        }],
      }],
      activeListId: 'list-1',
    }
    const file = new File([JSON.stringify(data)], 'kit.json')
    const result = await importFromJson(file)
    const item = result.lists[0].sections[0].items[0]

    expect(item.quantity).toBe(1)
    expect(item.perDay).toBe(false)
    expect(item.checked).toBe(false)
    expect(item.description).toBe('')
  })

  it('defaults list days to 7 when missing', async () => {
    const data = {
      lists: [{
        id: 'list-1',
        title: 'Test',
        sections: [],
      }],
      activeListId: 'list-1',
    }
    const file = new File([JSON.stringify(data)], 'kit.json')
    const result = await importFromJson(file)
    expect(result.lists[0].days).toBe(7)
  })

  it('rejects when lists is not an array', async () => {
    const file = new File([JSON.stringify({ lists: 'nope', activeListId: 'x' })], 'kit.json')
    await expect(importFromJson(file)).rejects.toThrow()
  })

  it('rejects when a section is missing its title', async () => {
    const data = {
      lists: [{
        id: 'list-1',
        title: 'Test',
        days: 7,
        sections: [{ id: 'x', items: [] }],
      }],
      activeListId: 'list-1',
    }
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

    const lists: PackingList[] = [{
      id: 'list-1',
      title: 'Test list',
      days: 7,
      sections: [],
    }]
    exportToJson(lists, 'list-1')

    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(mockClick).toHaveBeenCalled()
  })

  it('includes lists and activeListId in the export', async () => {
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

    const lists: PackingList[] = [{
      id: 'list-1',
      title: 'My trip',
      days: 4,
      sections: [{ id: 's1', title: 'Repair', items: [] }],
    }]
    exportToJson(lists, 'list-1')

    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsText(capturedBlob!)
    })
    const parsed = JSON.parse(text)
    expect(parsed.lists).toHaveLength(1)
    expect(parsed.lists[0].days).toBe(4)
    expect(parsed.lists[0].title).toBe('My trip')
    expect(parsed.lists[0].sections[0].title).toBe('Repair')
    expect(parsed.activeListId).toBe('list-1')
  })

  it('computes totalQuantity correctly in export', async () => {
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

    const lists: PackingList[] = [{
      id: 'list-1',
      title: 'Test',
      days: 5,
      sections: [{
        id: 's1',
        title: 'Food',
        items: [
          { id: 'i1', title: 'Meals', quantity: 2, perDay: true, description: '', checked: false },
          { id: 'i2', title: 'Water', quantity: 3, perDay: false, description: '', checked: false },
        ],
      }],
    }]
    exportToJson(lists, 'list-1')

    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsText(capturedBlob!)
    })
    const parsed = JSON.parse(text)
    const items = parsed.lists[0].sections[0].items
    expect(items[0].totalQuantity).toBe(10) // 2 * 5 days
    expect(items[1].totalQuantity).toBe(3)  // 3 (not per day)
  })
})
