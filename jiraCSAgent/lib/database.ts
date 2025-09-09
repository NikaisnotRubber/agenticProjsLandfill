import { prisma } from './prisma'
import { 
  EmailSource, 
  Priority, 
  IntentCategory, 
  ProcessingStatus, 
  ReplyStatus,
  Email,
  ProcessingResult,
  EmailReply,
  Feedback
} from '@prisma/client'

export type EmailWithProcessingResult = Email & {
  processingResult: ProcessingResult | null
  attachments: Array<{
    id: string
    name: string
    content: string | null
    type: string
  }>
}

export type ProcessingResultWithEmail = ProcessingResult & {
  email: Email
  feedback: Feedback | null
  emailReply: EmailReply | null
}

// Email CRUD Operations
export class EmailService {
  static async create(data: {
    subject: string
    body: string
    sender: string
    receiver: string
    timestamp: Date
    source: EmailSource
    priority?: Priority
    hasLogs?: boolean
    attachments?: Array<{
      name: string
      content?: string
      type: string
    }>
  }) {
    return await prisma.email.create({
      data: {
        subject: data.subject,
        body: data.body,
        sender: data.sender,
        receiver: data.receiver,
        timestamp: data.timestamp,
        source: data.source,
        priority: data.priority || 'MEDIUM',
        hasLogs: data.hasLogs || false,
        attachments: data.attachments ? {
          create: data.attachments
        } : undefined
      },
      include: {
        attachments: true,
        processingResult: true
      }
    })
  }

  static async findAll(limit?: number) {
    return await prisma.email.findMany({
      take: limit,
      orderBy: { timestamp: 'desc' },
      include: {
        attachments: true,
        processingResult: {
          include: {
            feedback: true,
            emailReply: true
          }
        }
      }
    })
  }

  static async findById(id: string) {
    return await prisma.email.findUnique({
      where: { id },
      include: {
        attachments: true,
        processingResult: {
          include: {
            feedback: true,
            emailReply: true
          }
        }
      }
    })
  }

  static async update(id: string, data: Partial<{
    subject: string
    body: string
    sender: string
    receiver: string
    timestamp: Date
    source: EmailSource
    priority: Priority
    hasLogs: boolean
  }>) {
    return await prisma.email.update({
      where: { id },
      data,
      include: {
        attachments: true,
        processingResult: true
      }
    })
  }

  static async delete(id: string) {
    return await prisma.email.delete({
      where: { id }
    })
  }
}

// Processing Result CRUD Operations
export class ProcessingResultService {
  static async create(data: {
    emailId: string
    category: IntentCategory
    confidence: number
    reasoning: string
    keyIndicators: string[]
    suggestedAction: string
    agentResponse: string
    processingTime: number
    status?: ProcessingStatus
  }) {
    return await prisma.processingResult.create({
      data: {
        emailId: data.emailId,
        category: data.category,
        confidence: data.confidence,
        reasoning: data.reasoning,
        keyIndicators: data.keyIndicators,
        suggestedAction: data.suggestedAction,
        agentResponse: data.agentResponse,
        processingTime: data.processingTime,
        status: data.status || 'COMPLETED'
      },
      include: {
        email: true,
        feedback: true,
        emailReply: true
      }
    })
  }

  static async findAll(limit?: number) {
    return await prisma.processingResult.findMany({
      take: limit,
      orderBy: { processedAt: 'desc' },
      include: {
        email: {
          include: {
            attachments: true
          }
        },
        feedback: true,
        emailReply: true
      }
    })
  }

  static async findByEmailId(emailId: string) {
    return await prisma.processingResult.findUnique({
      where: { emailId },
      include: {
        email: {
          include: {
            attachments: true
          }
        },
        feedback: true,
        emailReply: true
      }
    })
  }

  static async findById(id: string) {
    return await prisma.processingResult.findUnique({
      where: { id },
      include: {
        email: {
          include: {
            attachments: true
          }
        },
        feedback: true,
        emailReply: true
      }
    })
  }

  static async update(id: string, data: Partial<{
    category: IntentCategory
    confidence: number
    reasoning: string
    keyIndicators: string[]
    suggestedAction: string
    agentResponse: string
    status: ProcessingStatus
    processingTime: number
  }>) {
    return await prisma.processingResult.update({
      where: { id },
      data,
      include: {
        email: true,
        feedback: true,
        emailReply: true
      }
    })
  }

  static async delete(id: string) {
    return await prisma.processingResult.delete({
      where: { id }
    })
  }

  static async getStats() {
    const [total, jiraSimple, jiraComplex, general, failed] = await Promise.all([
      prisma.processingResult.count(),
      prisma.processingResult.count({ where: { category: 'JIRA_SIMPLE' } }),
      prisma.processingResult.count({ where: { category: 'JIRA_COMPLEX' } }),
      prisma.processingResult.count({ where: { category: 'GENERAL' } }),
      prisma.processingResult.count({ where: { status: 'FAILED' } })
    ])

    return {
      total,
      jiraSimple,
      jiraComplex,
      general,
      failed
    }
  }
}

// Email Reply CRUD Operations  
export class EmailReplyService {
  static async create(data: {
    processingResultId: string
    replyContent: string
    recipientEmail: string
    subject: string
    status?: ReplyStatus
  }) {
    return await prisma.emailReply.create({
      data: {
        processingResultId: data.processingResultId,
        replyContent: data.replyContent,
        recipientEmail: data.recipientEmail,
        subject: data.subject,
        status: data.status || 'DRAFT'
      },
      include: {
        processingResult: {
          include: {
            email: true
          }
        }
      }
    })
  }

  static async markAsSent(id: string) {
    return await prisma.emailReply.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date()
      },
      include: {
        processingResult: {
          include: {
            email: true
          }
        }
      }
    })
  }

  static async markAsFailed(id: string) {
    return await prisma.emailReply.update({
      where: { id },
      data: {
        status: 'FAILED'
      },
      include: {
        processingResult: {
          include: {
            email: true
          }
        }
      }
    })
  }
}

// Feedback CRUD Operations
export class FeedbackService {
  static async create(data: {
    processingResultId: string
    content: string
    rating?: number
  }) {
    return await prisma.feedback.create({
      data: {
        processingResultId: data.processingResultId,
        content: data.content,
        rating: data.rating
      },
      include: {
        processingResult: {
          include: {
            email: true
          }
        }
      }
    })
  }

  static async findByProcessingResultId(processingResultId: string) {
    return await prisma.feedback.findUnique({
      where: { processingResultId },
      include: {
        processingResult: {
          include: {
            email: true
          }
        }
      }
    })
  }
}

// Helper function to convert enum values
export const convertToDbFormat = {
  emailSource: (source: string): EmailSource => {
    switch (source.toLowerCase()) {
      case 'outlook':
        return 'OUTLOOK'
      case 'gmail':
        return 'GMAIL'
      default:
        return 'OUTLOOK'
    }
  },
  priority: (priority: string): Priority => {
    switch (priority.toLowerCase()) {
      case 'low':
        return 'LOW'
      case 'medium':
        return 'MEDIUM'
      case 'high':
        return 'HIGH'
      default:
        return 'MEDIUM'
    }
  },
  intentCategory: (category: string): IntentCategory => {
    switch (category) {
      case 'jira_simple':
        return 'JIRA_SIMPLE'
      case 'jira_complex':
        return 'JIRA_COMPLEX'
      case 'general':
        return 'GENERAL'
      default:
        return 'GENERAL'
    }
  }
}

// Helper function to convert from DB format to display format
export const convertFromDbFormat = {
  emailSource: (source: EmailSource): string => {
    return source.toLowerCase()
  },
  priority: (priority: Priority): string => {
    return priority.toLowerCase()
  },
  intentCategory: (category: IntentCategory): string => {
    switch (category) {
      case 'JIRA_SIMPLE':
        return 'jira_simple'
      case 'JIRA_COMPLEX':
        return 'jira_complex'
      case 'GENERAL':
        return 'general'
      default:
        return 'general'
    }
  }
}