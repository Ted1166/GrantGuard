import { NextRequest, NextResponse } from 'next/server'
import { runReviewerAgent } from '@/lib/agents/reviewer'
import { prisma } from '@/lib/db'
import type { ReviewInput } from '@/types/agent'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { milestoneId, githubRepo } = body

    if (!milestoneId) {
      return NextResponse.json({ error: 'milestoneId required' }, { status: 400 })
    }

    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
    })

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    if (!milestone.evidenceCid) {
      return NextResponse.json({ error: 'No evidence submitted' }, { status: 400 })
    }

    const task = await prisma.agentTask.create({
      data: { type: 'review', milestoneId, status: 'running' },
    })

    const input: ReviewInput = {
      milestoneId,
      grantId: milestone.grantId,
      builder: milestone.builder,
      amount: BigInt(milestone.amount),
      evidenceCid: milestone.evidenceCid,
      githubRepo,
      milestoneDescription: (milestone as any).description ?? undefined,
    }

    const result = await runReviewerAgent(input)

    await prisma.agentTask.update({
      where: { id: task.id },
      data: { status: 'done', result: JSON.stringify(result) },
    })

    await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        status: result.approved ? 3 : 5,
        reviewNotes: result.summary,
        reviewedAt: new Date(),
      },
    })

    return NextResponse.json({ taskId: task.id, result })
  } catch (err) {
    console.error('[review agent]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
