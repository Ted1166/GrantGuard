import { NextRequest, NextResponse } from 'next/server'
import { runAuditorAgent } from '@/lib/agents/auditor'
import { prisma } from '@/lib/db'
import type { AuditInput, ReviewResult, DistributionResult } from '@/types/agent'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { milestoneId } = body

    if (!milestoneId) {
      return NextResponse.json({ error: 'milestoneId required' }, { status: 400 })
    }

    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
    })

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    // Get review result
    const reviewTask = await prisma.agentTask.findFirst({
      where: { milestoneId, type: 'review', status: 'done' },
      orderBy: { createdAt: 'desc' },
    })

    // Get distribution result
    const distributeTask = await prisma.agentTask.findFirst({
      where: { milestoneId, type: 'distribute', status: 'done' },
      orderBy: { createdAt: 'desc' },
    })

    const reviewResult: ReviewResult = reviewTask?.result
      ? JSON.parse(reviewTask.result)
      : { milestoneId, approved: true, score: 100, reasoning: '', summary: 'Manual audit' }

    const distributionResult: DistributionResult = distributeTask?.result
      ? JSON.parse(distributeTask.result)
      : {
          milestoneId,
          txHash: milestone.txHash ?? '',
          oneshotTaskId: '',
          status: milestone.status === 4 ? 'confirmed' : 'pending',
        }

    const task = await prisma.agentTask.create({
      data: { type: 'audit', milestoneId, status: 'running' },
    })

    const auditInput: AuditInput = {
      milestoneId,
      distributionResult,
      reviewResult,
    }

    const report = await runAuditorAgent(auditInput)

    await prisma.agentTask.update({
      where: { id: task.id },
      data: { status: 'done', result: JSON.stringify(report) },
    })

    return NextResponse.json({ taskId: task.id, report })
  } catch (err) {
    console.error('[audit agent]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}