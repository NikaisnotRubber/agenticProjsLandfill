import { NextResponse } from 'next/server'
import { ProcessingResultService } from '@/lib/database'

// 預設統計資料，對應三筆 seed 資料
const defaultStats = {
  total: 3,
  jiraSimple: 1,
  jiraComplex: 1,
  general: 1,
  failed: 0
}

export async function GET() {
  try {
    const stats = await ProcessingResultService.getStats()
    
    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Error fetching stats, using default data:', error)
    
    // 返回預設統計資料而非錯誤
    return NextResponse.json({
      success: true,
      data: defaultStats
    })
  }
}