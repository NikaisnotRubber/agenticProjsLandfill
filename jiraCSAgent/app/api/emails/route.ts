import { NextRequest, NextResponse } from 'next/server'
import { EmailService, convertToDbFormat } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit')
    
    const emails = await EmailService.findAll(limit ? parseInt(limit) : undefined)
    
    return NextResponse.json({
      success: true,
      data: emails
    })
  } catch (error) {
    console.error('Error fetching emails:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch emails' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      subject,
      body: emailBody,
      sender,
      receiver,
      timestamp,
      source,
      priority,
      hasLogs,
      attachments
    } = body

    if (!subject || !emailBody || !sender || !receiver || !timestamp || !source) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields' 
        },
        { status: 400 }
      )
    }

    const email = await EmailService.create({
      subject,
      body: emailBody,
      sender,
      receiver,
      timestamp: new Date(timestamp),
      source: convertToDbFormat.emailSource(source),
      priority: priority ? convertToDbFormat.priority(priority) : undefined,
      hasLogs,
      attachments
    })

    return NextResponse.json({
      success: true,
      data: email
    })
  } catch (error) {
    console.error('Error creating email:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create email' 
      },
      { status: 500 }
    )
  }
}