/**
 * Utilitários para geração de relatórios em PDF e CSV.
 */
import { jsPDF } from 'jspdf'

const PRIMARY_COLOR = [15, 118, 110]   // #0f766e (teal)
const HEADER_BG     = [240, 253, 250]  // teal-50
const ALT_ROW_BG    = [248, 250, 252]  // gray-50
const TEXT_COLOR    = [15, 23, 42]     // slate-900
const MUTED_COLOR   = [100, 116, 139]  // slate-500
const LINE_COLOR    = [226, 232, 240]  // slate-200

/**
 * Exporta dados como arquivo CSV.
 * @param {Object} opts
 * @param {string[]} opts.headers - Cabeçalhos das colunas
 * @param {Array<string[]>} opts.rows - Linhas de dados (strings)
 * @param {string} opts.filename - Nome do arquivo (sem extensão)
 */
export function generateCSV({ headers, rows, filename }) {
  const escape = (v) => {
    const s = String(v ?? '').replace(/"/g, '""')
    return /[,"\n]/.test(s) ? `"${s}"` : s
  }
  const lines = [
    headers.map(escape).join(','),
    ...rows.map((r) => r.map(escape).join(',')),
  ]
  const bom = '\uFEFF'
  const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Gera um PDF simples com seções (cada seção = título + tabela).
 * @param {Object} opts
 * @param {string} opts.title - Título principal do relatório
 * @param {string} [opts.subtitle] - Subtítulo / descrição
 * @param {Array<{title: string, headers: string[], rows: string[][], summary?: string}>} opts.sections
 * @param {string} opts.filename - Nome do arquivo (sem extensão)
 * @param {'portrait'|'landscape'} [opts.orientation]
 */
export function generatePDF({ title, subtitle, sections, filename, orientation = 'portrait' }) {
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const marginX = 14
  const contentW = pageW - marginX * 2

  let y = 14

  // --- Cabeçalho ---
  doc.setFillColor(...PRIMARY_COLOR)
  doc.rect(0, 0, pageW, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(title, marginX, 14)
  if (subtitle) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(subtitle, marginX, 19)
  }
  y = 28

  // Data de geração
  doc.setTextColor(...MUTED_COLOR)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  const now = new Date().toLocaleString('pt-BR')
  doc.text(`Gerado em: ${now}`, pageW - marginX, 27, { align: 'right' })

  const addPageIfNeeded = (neededH) => {
    if (y + neededH > pageH - 10) {
      doc.addPage()
      y = 14
    }
  }

  sections.forEach((section, sIdx) => {
    // Título da seção
    addPageIfNeeded(14)
    if (sIdx > 0) y += 4
    doc.setFillColor(...HEADER_BG)
    doc.roundedRect(marginX, y, contentW, 8, 1, 1, 'F')
    doc.setTextColor(...PRIMARY_COLOR)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(section.title, marginX + 3, y + 5.5)
    y += 10

    if (section.summary) {
      doc.setTextColor(...MUTED_COLOR)
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(7.5)
      doc.text(section.summary, marginX, y + 3)
      y += 6
    }

    const headers = section.headers
    const rows = section.rows
    if (!rows || rows.length === 0) {
      doc.setTextColor(...MUTED_COLOR)
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8)
      doc.text('Nenhum dado encontrado.', marginX + 3, y + 4)
      y += 8
      return
    }

    const FONT_SIZE   = 8
    const LINE_H      = 4.5   // mm entre baselines consecutivas (fontSize 8)
    const PAD_H       = 2.5   // padding horizontal por célula
    const PAD_TOP     = 2.2   // padding vertical topo
    const PAD_BOT     = 2.0   // padding vertical base
    const BASELINE    = 3.0   // offset baseline para fontSize 8pt (ascent ≈ 8×0.352×0.85)
    const MIN_ROW_H   = PAD_TOP + BASELINE + PAD_BOT  // altura mínima de 1 linha
    const headerH     = 7
    const INDEX_COL_W = 12    // largura fixa da coluna '#'
    const MIN_COL_W   = 16    // mínimo para qualquer outra coluna

    // ── Cálculo de larguras proporcional ao conteúdo real ──────────────────
    // Estima o comprimento máximo (em chars) de cada coluna
    const CHAR_W = 1.62  // mm/char para helvetica 8pt (calibrado empiricamente)
    const maxChars = headers.map((h, i) => {
      const headerLen = String(h).length
      const dataLen   = rows.reduce((m, r) => Math.max(m, String(r[i] ?? '').length), 0)
      return Math.max(headerLen, dataLen)
    })

    // Coluna 0 sempre fixa; demais recebem espaço proporcional ao conteúdo
    const finalWidths = (() => {
      const w = new Array(headers.length).fill(0)
      w[0] = INDEX_COL_W
      const remaining    = contentW - INDEX_COL_W
      const totalNeeded  = maxChars.slice(1).reduce((s, c) => s + c * CHAR_W + PAD_H * 2, 0)
      for (let i = 1; i < headers.length; i++) {
        const needed = maxChars[i] * CHAR_W + PAD_H * 2
        w[i] = Math.max(MIN_COL_W, (needed / totalNeeded) * remaining)
      }
      // Normaliza para preencher contentW exato
      const total = w.reduce((s, v) => s + v, 0)
      const scale = contentW / total
      return w.map((v) => v * scale)
    })()

    // ── Pré-quebra o texto de cada célula com a largura REAL da coluna ─────
    doc.setFontSize(FONT_SIZE)
    doc.setFont('helvetica', 'normal')

    const splitRows = rows.map((row) =>
      row.map((cell, i) => doc.splitTextToSize(String(cell ?? ''), finalWidths[i] - PAD_H * 2))
    )

    // Altura real de cada row baseada no máximo de linhas de qualquer célula
    const rowHeights = splitRows.map((cells) => {
      const maxLines = Math.max(...cells.map((l) => l.length), 1)
      return Math.max(MIN_ROW_H, PAD_TOP + maxLines * LINE_H + PAD_BOT)
    })

    // ── Cabeçalho da tabela ────────────────────────────────────────────────
    addPageIfNeeded(headerH + (rowHeights[0] ?? MIN_ROW_H))
    doc.setFillColor(...PRIMARY_COLOR)
    doc.rect(marginX, y, contentW, headerH, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(FONT_SIZE)
    let xPos = marginX
    headers.forEach((h, i) => {
      // Centraliza verticalmente no cabeçalho
      doc.text(String(h), xPos + PAD_H, y + (headerH + BASELINE) / 2)
      xPos += finalWidths[i]
    })
    y += headerH

    // ── Linhas de dados ────────────────────────────────────────────────────
    splitRows.forEach((cells, rIdx) => {
      const rowH = rowHeights[rIdx]
      addPageIfNeeded(rowH)

      if (rIdx % 2 === 1) {
        doc.setFillColor(...ALT_ROW_BG)
        doc.rect(marginX, y, contentW, rowH, 'F')
      }
      doc.setDrawColor(...LINE_COLOR)
      doc.line(marginX, y + rowH, marginX + contentW, y + rowH)

      doc.setTextColor(...TEXT_COLOR)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(FONT_SIZE)
      xPos = marginX
      cells.forEach((lines, i) => {
        lines.forEach((line, li) => {
          doc.text(line, xPos + PAD_H, y + PAD_TOP + BASELINE + li * LINE_H)
        })
        xPos += finalWidths[i]
      })

      y += rowH
    })

    y += 4
  })

  doc.save(`${filename}.pdf`)
}
