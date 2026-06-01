import { NextRequest, NextResponse } from 'next/server'
import { parseWebhookPayload } from '@/lib/oneshot/webhook'
import { prisma } from '@/lib/db'
import { runAuditorAgent } from '@/lib/agents/auditor'
import type { AuditInput, ReviewResult, DistributionResult } from '@/types/agent'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const payload = parseWebhookPayload(body)

    // Find the distribute task that matches this taskId
    const tasks = await prisma.agentTask.findMany({
      where: { type: 'distribute', status: 'done' },
    })

    const matchingTask = tasks.find((t) => {
      try {
        const r = JSON.parse(t.result ?? '{}')
        return r.oneshotTaskId === payload.taskId
      } catch {
        return false
      }
    })

    if (!matchingTask) {
      // Not found — could be a duplicate delivery, return 200 to ack
      return NextResponse.json({ ok: true, note: 'task not found' })
    }

    const distributionResult: DistributionResult = JSON.parse(matchingTask.result!)
    distributionResult.txHash = payload.txHash ?? distributionResult.txHash
    distributionResult.status = payload.status === 'confirmed' ? 'confirmed' : 'failed'

    // Update task result with confirmed txHash
    await prisma.agentTask.update({
      where: { id: matchingTask.id },
      data: { result: JSON.stringify(distributionResult) },
    })

    if (payload.status === 'confirmed' && payload.txHash) {
      // Mark milestone as PAID (status 4)
      await prisma.milestone.update({
        where: { id: matchingTask.milestoneId },
        data: {
          status: 4,
          txHash: payload.txHash,
          paidAt: new Date(),
        },
      })

      // Fire the Auditor Agent
      const reviewTask = await prisma.agentTask.findFirst({
        where: { milestoneId: matchingTask.milestoneId, type: 'review', status: 'done' },
        orderBy: { createdAt: 'desc' },
      })

      const reviewResult: ReviewResult = reviewTask?.result
        ? JSON.parse(reviewTask.result)
        : { milestoneId: matchingTask.milestoneId, approved: true, score: 100, reasoning: '', summary: '' }

      const auditInput: AuditInput = {
        milestoneId: matchingTask.milestoneId,
        distributionResult,
        reviewResult,
      }

      const auditReport = await runAuditorAgent(auditInput)

      await prisma.agentTask.create({
        data: {
          type: 'audit',
          milestoneId: matchingTask.milestoneId,
          status: 'done',
          result: JSON.stringify(auditReport),
        },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[oneshot webhook]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}