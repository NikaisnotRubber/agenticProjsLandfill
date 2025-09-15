import { NextRequest, NextResponse } from 'next/server'
import { EmailService } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const email = await EmailService.findById(id)
    
    if (!email) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email not found' 
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: email
    })
  } catch (error) {
    console.error('Error fetching email:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch email' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await EmailService.delete(id)
    
    return NextResponse.json({
      success: true,
      message: 'Email deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting email:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete email' 
      },
      { status: 500 }
    )
  }
}