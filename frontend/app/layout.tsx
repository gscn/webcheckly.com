import type { Metadata } from 'next'
import './globals.css'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { AuthProvider } from '@/contexts/AuthContext'

export const metadata: Metadata = {
  title: 'WebCheckly - 网站可用性检测｜页面响应时间测试工具 | Website Availability Check Tool',
  description: '免费的网站可用性与响应时间检测工具，支持内部链接检测、实时结果展示和检测报告导出。Free website availability and response time detection tool with internal link checking, real-time results display, and report export.',
}

// FAQ Schema 移到组件外部，避免每次渲染都重新创建
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "这个网站检测工具是免费的吗？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "是的，该工具无需注册即可免费使用。",
      },
    },
    {
      "@type": "Question",
      name: "检测结果是否实时？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "检测结果会通过实时流式方式展示。",
      },
    },
    {
      "@type": "Question",
      name: "支持哪些导出格式？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "支持JSON、Markdown和Excel三种格式。",
      },
    },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqSchema), // 安全的：内容来自静态数据，不包含用户输入
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <LanguageProvider>
          <AuthProvider>
            <div className="tech-grid"></div>
            <div className="bg-noise"></div>
            <div className="bg-vignette"></div>
            {children}
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}

