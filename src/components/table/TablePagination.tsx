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
  // Pagination control props
  previousPage: () => void
  canPreviousPage: boolean
  pageCount: number
  pageIndex: number
  setPageIndex: (index: number) => void
  nextPage: () => void
  canNextPage: boolean
  className?: string
  // New props for page size selection
  pageSize?: number
  setPageSize?: (size: number) => void
  pageSizeOptions?: number[]
}

const TablePagination = ({
  totalItems,
  start,
  end,
  itemsName = 'items',
  showInfo,
  previousPage,
  canPreviousPage,
  pageCount,
  pageIndex,
  setPageIndex,
  nextPage,
  canNextPage,
  className,
  // New props with default values
  pageSize = 10,
  setPageSize,
  pageSizeOptions = [5, 10, 25, 50, 100]
}: TablePaginationProps) => {
  return (
    <Row className={clsx('align-items-center text-center text-sm-start', showInfo ? 'justify-content-between' : 'justify-content-end')}>
      {showInfo && (
        <Col sm>
          <div className="text-muted">
            Partie <span className="fw-semibold">{start}</span> sur <span className="fw-semibold">{end}</span> de {' '}
            <span className="fw-semibold">{totalItems}</span> {itemsName}
          </div>
        </Col>
      )}
      
      {/* Page size selector */}
      {setPageSize && (
        <Col sm="auto" className="mt-3 mt-sm-0">
          <div className="d-flex align-items-center">
            <span className="text-muted me-2">Afficher :</span>
            <select 
              className="form-select form-select-sm"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPageIndex(0) // Reset to first page when changing page size
              }}
              style={{ width: 'auto' }}
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </Col>
      )}

      <Col sm="auto" className="mt-3 mt-sm-0">
        <div>
          <ul className={clsx('pagination pagination-boxed mb-0 justify-content-center pagination-sm', className)}>
            <li className="page-item">
              <button className="page-link" onClick={() => previousPage()} disabled={!canPreviousPage}>
                <TbChevronLeft />
              </button>
            </li>

            {Array.from({ length: pageCount }).map((_, index) => (
              <li key={index} className={`page-item ${pageIndex === index ? 'active' : ''}`}>
                <button className="page-link" onClick={() => setPageIndex(index)}>
                  {index + 1}
                </button>
              </li>
            ))}

            <li className="page-item">
              <button className="page-link" onClick={() => nextPage()} disabled={!canNextPage}>
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