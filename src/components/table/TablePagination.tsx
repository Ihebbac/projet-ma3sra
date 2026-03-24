'use client'
import clsx from 'clsx'
import { Col, Row } from 'react-bootstrap'
import { TbChevronLeft, TbChevronRight } from 'react-icons/tb'

export type TablePaginationProps = {
  totalItems: number
  start: number
  end: number
  itemsName?: string
  showInfo?: boolean

  previousPage: () => void
  canPreviousPage: boolean
  pageCount: number
  pageIndex: number // 0-based
  setPageIndex: (index: number) => void
  nextPage: () => void
  canNextPage: boolean
  className?: string

  pageSize?: number
  setPageSize?: (size: number) => void
  pageSizeOptions?: number[]
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

/**
 * Construit une pagination compacte avec "…"
 * Exemple: 1 … 7 8 9 10 11 … 99
 */
function buildPages(pageCount: number, pageIndex: number, siblingCount = 2): Array<number | '...'> {
  if (pageCount <= 1) return [1]

  // si peu de pages, on affiche tout
  if (pageCount <= 9) {
    return Array.from({ length: pageCount }, (_, i) => i + 1)
  }

  const current = pageIndex + 1
  const last = pageCount

  const left = Math.max(2, current - siblingCount)
  const right = Math.min(last - 1, current + siblingCount)

  const pages: Array<number | '...'> = [1]

  if (left > 2) pages.push('...')

  for (let p = left; p <= right; p++) pages.push(p)

  if (right < last - 1) pages.push('...')

  pages.push(last)

  return pages
}

const TablePagination = ({
  totalItems,
  start,
  end,
  itemsName = 'items',
  showInfo = true,

  previousPage,
  canPreviousPage,
  pageCount,
  pageIndex,
  setPageIndex,
  nextPage,
  canNextPage,

  className,

  pageSize = 10,
  setPageSize,
  pageSizeOptions = [5, 10, 25, 50, 100],
}: TablePaginationProps) => {
  // sécurité (si filtre change et pageIndex devient hors range)
  const safePageIndex = clamp(pageIndex, 0, Math.max(pageCount - 1, 0))
  const pages = buildPages(pageCount, safePageIndex, 2)

  return (
    <Row
      className={clsx(
        'align-items-center',
        showInfo ? 'justify-content-between' : 'justify-content-end',
        'g-2', // ✅ spacing bootstrap
      )}
    >
      {showInfo && (
        <Col sm>
          <div className="text-muted">
            Partie <span className="fw-semibold">{start}</span> sur <span className="fw-semibold">{end}</span> de{' '}
            <span className="fw-semibold">{totalItems}</span> {itemsName}
          </div>
        </Col>
      )}

      {/* Page size selector */}
      {setPageSize && (
        <Col sm="auto">
          <div className="d-flex align-items-center justify-content-center justify-content-sm-start">
            <span className="text-muted me-2">Afficher :</span>
            <select
              className="form-select form-select-sm"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPageIndex(0)
              }}
              style={{ width: 'auto' }}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </Col>
      )}

      <Col sm="auto">
        {/* ✅ IMPORTANT: centrer + wrap + overflow propre */}
        <div className="d-flex justify-content-center">
          <ul
            className={clsx(
              'pagination pagination-boxed mb-0 pagination-sm',
              'justify-content-center flex-wrap', // ✅ centre + wrap
              className,
            )}
            style={{ maxWidth: '100%', rowGap: 6 }} // ✅ évite la ligne trop serrée
          >
            <li className={clsx('page-item', !canPreviousPage && 'disabled')}>
              <button className="page-link" onClick={previousPage} disabled={!canPreviousPage} aria-label="Previous">
                <TbChevronLeft />
              </button>
            </li>

            {pages.map((p, idx) =>
              p === '...' ? (
                <li key={`dots-${idx}`} className="page-item disabled">
                  <span className="page-link">…</span>
                </li>
              ) : (
                <li key={p} className={clsx('page-item', safePageIndex === p - 1 && 'active')}>
                  <button className="page-link" onClick={() => setPageIndex(p - 1)}>
                    {p}
                  </button>
                </li>
              ),
            )}

            <li className={clsx('page-item', !canNextPage && 'disabled')}>
              <button className="page-link" onClick={nextPage} disabled={!canNextPage} aria-label="Next">
                <TbChevronRight />
              </button>
            </li>
          </ul>
        </div>
      </Col>
    </Row>
  )
}

export default TablePagination