import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AgentiMailCS - 多智能體郵件處理系統',
  description: '基於 OpenAI API 和 LangGraph 的智能郵件分類與處理系統',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body className="antialiased bg-gray-50">
        {children}
      </body>
    </html>
  )
}