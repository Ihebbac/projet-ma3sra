'use client'
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  Image,
  Table,
} from 'react-bootstrap'
import Link from 'next/link'
import { TbCircleFilled, TbDotsVertical, TbFileExport, TbPlus } from 'react-icons/tb'

import Rating from '@/components/Rating'
import TablePagination from '@/components/table/TablePagination'
import { products, type ProductType } from '../data'
import {
  ColumnFiltersState,
  createColumnHelper,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useState } from 'react'
import DataTable from '@/components/table/DataTable'

const columnHelper = createColumnHelper<ProductType>()

const ProductInventory = () => {
  const columns = [
    columnHelper.accessor('name', {
      cell: ({ row }) => (
        <div className="d-flex align-items-center">
          <Image src={row.original.image.src} className="avatar-sm rounded-circle me-2" alt={row.original.name} />
          <div>
            <span className="text-muted fs-xs">{row.original.category}</span>
            <h5 className="fs-base mb-0">
              <Link href="/products/1" className="text-body">
                {row.original.name}
              </Link>
            </h5>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('stock', {
      cell: ({ row }) => (
        <>
          <span className="text-muted fs-xs">Stock</span>
          <h5 className="fs-base mb-0 fw-normal">{row.original.stock}</h5>
        </>
      ),
    }),
    columnHelper.accessor('price', {
      cell: ({ row }) => (
        <>
          <span className="text-muted fs-xs">Price</span>
          <h5 className="fs-base mb-0 fw-normal">{row.original.price}</h5>
        </>
      ),
    }),
    columnHelper.accessor('ratings', {
      cell: ({ row }) => (
        <>
          <span className="text-muted fs-xs">Ratings</span>
          <h5 className="fs-base mb-0 fw-normal">
            <Rating rating={row.original.ratings} />
            <span className="ms-1">
              <Link href="/reviews" className="link-reset fw-semibold">
                ({row.original.reviews})
              </Link>
            </span>
          </h5>
        </>
      ),
    }),

    columnHelper.accessor('status', {
      cell: ({ row }) => (
        <>
          <span className="text-muted fs-xs">Status</span>
          <h5 className="fs-base mb-0 fw-normal">
            <TbCircleFilled className={`fs-xs text-${row.original.statusVariant}`} /> {row.original.status}
          </h5>
        </>
      ),
    }),
    columnHelper.accessor('id', {
      cell: ({ row }) => (
        <Dropdown>
          <DropdownToggle as="button" className="bg-transparent border-transparent border-0 text-muted drop-arrow-none card-drop p-0">
            <TbDotsVertical className="fs-lg" />
          </DropdownToggle>
          <DropdownMenu align={'start'} className="dropdown-menu-end">
            <DropdownItem href="#">Edit Product</DropdownItem>
            <DropdownItem href="#">Remove</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      ),
    }),
  ]

  const [data, setData] = useState<ProductType[]>(() => [...products])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 7 })

  const table = useReactTable({
    data,
    columns,
    state: { columnFilters, pagination },
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalItems = table.getFilteredRowModel().rows.length

  const start = pageIndex * pageSize + 1
  const end = Math.min(start + pageSize - 1, totalItems)

  return (
    <Card>
      <CardHeader className="justify-content-between align-items-center border-dashed">
        <CardTitle as="h4" className="mb-0">
          Product Inventory
        </CardTitle>
        <div className="d-flex gap-2">
          <Link href="/add-product" passHref>
            <Button variant="soft-secondary" size="sm">
              <TbPlus className="me-1" /> Add Product
            </Button>
          </Link>
          <Button  variant="primary" size="sm">
            <TbFileExport className="me-1" /> Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        <DataTable<ProductType> table={table} emptyMessage="No records found" showHeaders={false} />
      </CardBody>
      {table.getRowModel().rows.length > 0 && (
        <CardFooter className="border-0">
          <TablePagination
            totalItems={totalItems}
            start={start}
            end={end}
            className={'pagination-sm'}
            showInfo
            itemsName="products"
            previousPage={table.previousPage}
            canPreviousPage={table.getCanPreviousPage()}
            pageCount={table.getPageCount()}
            pageIndex={table.getState().pagination.pageIndex}
            setPageIndex={table.setPageIndex}
            nextPage={table.nextPage}
            canNextPage={table.getCanNextPage()}
          />
        </CardFooter>
      )}
    </Card>
  )
}

export default ProductInventory
