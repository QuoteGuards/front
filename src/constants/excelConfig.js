export const COL_LETTERS = 'ABCDEFG'.split('')

export const SHEET_CONFIGS = [
  {
    name: '견적 정보',
    colLetters: ['A', 'B'],
    colWidths: ['w-32', 'w-80'],
    headerRow: 0,
    sectionRows: [7, 15],
    summaryRows: [],
  },
  {
    name: '견적 품목',
    colLetters: COL_LETTERS,
    colWidths: ['w-10', 'w-56', 'w-52', 'w-14', 'w-12', 'w-36', 'w-36'],
    headerRow: 0,
    sectionRows: [],
    summaryRows: [6, 7, 8, 9],
  },
]
