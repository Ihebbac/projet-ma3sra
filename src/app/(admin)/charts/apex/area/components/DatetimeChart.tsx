'use client'
import { datetimeData, getAreaChartDateTimeChart } from '@/app/(admin)/charts/apex/area/data'
import ComponentCard from '@/components/cards/ComponentCard'
import ApexChartClient from '@/components/client-wrapper/ApexChartClient'
import { useState } from 'react'
import { Button } from 'react-bootstrap'

const DatetimeChart = () => {
  const [filteredData, setFilteredData] = useState(datetimeData)
  const [activeRange, setActiveRange] = useState('1Y')

  const filterChartRange = (range: string) => {
    const now = new Date(datetimeData[datetimeData.length - 1][0])
    let fromDate

    switch (range) {
      case '1M':
        fromDate = new Date(now)
        fromDate.setMonth(now.getMonth() - 1)
        break
      case '6M':
        fromDate = new Date(now)
        fromDate.setMonth(now.getMonth() - 6)
        break
      case '1Y':
        fromDate = new Date(now)
        fromDate.setFullYear(now.getFullYear() - 1)
        break
      case 'YTD':
        fromDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        fromDate = new Date(datetimeData[0][0])
    }

    const filtered = datetimeData.filter((point) => point[0] >= fromDate.getTime())
    setFilteredData(filtered)
    setActiveRange(range)
  }

  return (
    <ComponentCard title="Area Chart - Datetime X-axis">
      <div className="toolbar apex-toolbar" style={{ display: 'flex', gap: '4px' }}>
        {['1M', '6M', '1Y', 'YTD', 'ALL'].map((range) => (
          <Button variant="light" size="sm" key={range} className={activeRange === range ? 'active' : ''} onClick={() => filterChartRange(range)}>
            {range}
          </Button>
        ))}
      </div>
      <ApexChartClient
        getOptions={() => getAreaChartDateTimeChart(filteredData)}
        series={[{ name: 'Ubold', data: filteredData }]}
        type="area"
        height={350}
      />
    </ComponentCard>
  )
}

export default DatetimeChart
