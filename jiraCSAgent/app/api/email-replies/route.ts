import { NextRequest, NextResponse } from 'next/server'
import { EmailReplyService, FeedbackService } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      processingResultId,
      replyContent,
      recipientEmail,
      subject,
      feedback
    } = body

    if (!processingResultId || !replyContent || !recipientEmail || !subject) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields' 
        },
        { status: 400 }
      )
    }

    // Create email reply
    const emailReply = await EmailReplyService.create({
      processingResultId,
      replyContent,
      recipientEmail,
      subject
    })

    // Create feedback if provided
    if (feedback && feedback.trim()) {
      await FeedbackService.create({
        processingResultId,
        content: feedback
      })
    }

    // Simulate sending email (in real app, integrate with email service)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Mark as sent
    const sentReply = await EmailReplyService.markAsSent(emailReply.id)

    return NextResponse.json({
      success: true,
      data: sentReply
    })
  } catch (error) {
    console.error('Error sending email reply:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send email reply' 
      },
      { status: 500 }
    )
  }
}