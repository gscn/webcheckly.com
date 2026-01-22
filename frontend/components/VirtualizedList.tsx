"use client"

import { useMemo, useRef, useEffect, useState } from "react"

interface VirtualizedListProps<T> {
  items: T[]
  itemHeight?: number
  containerHeight?: number
  overscan?: number
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T, index: number) => string | number
}

/**
 * 虚拟滚动列表组件
 * 用于优化大量数据的渲染性能
 */
export default function VirtualizedList<T>({
  items,
  itemHeight = 50,
  containerHeight = 400,
  overscan = 5,
  renderItem,
  keyExtractor,
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // 计算可见范围
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight)
    const end = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight)
    )
    return {
      start: Math.max(0, start - overscan),
      end: Math.min(items.length - 1, end + overscan),
    }
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan])

  // 可见项
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1)
  }, [items, visibleRange.start, visibleRange.end])

  // 总高度
  const totalHeight = items.length * itemHeight

  // 偏移量
  const offsetY = visibleRange.start * itemHeight

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }

  return (
    <div
      ref={containerRef}
      style={{
        height: containerHeight,
        overflow: "auto",
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = visibleRange.start + index
            return (
              <div
                key={keyExtractor(item, actualIndex)}
                style={{ height: itemHeight }}
              >
                {renderItem(item, actualIndex)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

