"use client"

/**
 * 骨架屏加载组件
 * 用于在内容加载时显示占位符
 */
export function SkeletonCard() {
  return (
    <div className="p-4 bg-tech-surface/50 border border-tech-border/30 rounded-lg animate-pulse">
      <div className="h-4 bg-gray-700/50 rounded w-3/4 mb-3"></div>
      <div className="h-3 bg-gray-700/30 rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-gray-700/30 rounded w-2/3"></div>
    </div>
  )
}

export function SkeletonTable() {
  return (
    <div className="overflow-x-auto rounded-lg border border-tech-border/20">
      <table className="w-full text-sm">
        <thead className="bg-gradient-to-r from-gray-900/80 to-gray-800/50">
          <tr>
            {[1, 2, 3, 4, 5].map((i) => (
              <th key={i} className="py-3 px-4 border-b border-tech-border/20">
                <div className="h-3 bg-gray-700/50 rounded w-20"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4, 5].map((i) => (
            <tr key={i} className="border-b border-tech-border/10">
              {[1, 2, 3, 4, 5].map((j) => (
                <td key={j} className="py-3 px-4">
                  <div className="h-3 bg-gray-700/30 rounded w-full"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SkeletonProgressBar() {
  return (
    <div className="w-full bg-gray-800/50 rounded-full h-2.5 overflow-hidden">
      <div className="h-full bg-tech-cyan/30 rounded-full animate-pulse" style={{ width: "45%" }}></div>
    </div>
  )
}

