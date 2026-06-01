import { NextRequest, NextResponse } from 'next/server'
import { runDistributorAgent } from '@/lib/agents/distributor'
import { buildDelegationChain } from '@/lib/metamask/redelegation'
import { prisma } from '@/lib/db'
import type { DistributionInput, ReviewResult } from '@/types/agent'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { milestoneId, permissionsContext } = body

    if (!milestoneId) {
      return NextResponse.json({ error: 'milestoneId required' }, { status: 400 })
    }

    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
    })

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    if (milestone.status !== 3) {
      return NextResponse.json(
        { error: 'Milestone must be APPROVED before distribution' },
        { status: 400 }
      )
    }

    const committeeKey = process.env.DEPLOYER_KEY as `0x${string}`
    if (!committeeKey) {
      return NextResponse.json({ error: 'DEPLOYER_KEY not configured' }, { status: 500 })
    }

    const milestoneAmount = BigInt(milestone.amount)
    const milestoneIdBytes = milestoneId as `0x${string}`

    let signedDelegations: unknown[]

    if (!permissionsContext || permissionsContext?.fallback) {
      const chain = await buildDelegationChain(
        committeeKey,
        milestoneIdBytes,
        milestoneAmount
      )
      signedDelegations = chain.delegationChain
    } else {
      signedDelegations = permissionsContext?.delegations ?? []
    }

    const reviewTask = await prisma.agentTask.findFirst({
      where: { milestoneId, type: 'review', status: 'done' },
      orderBy: { createdAt: 'desc' },
    })

    const reviewResult: ReviewResult = reviewTask?.result
      ? JSON.parse(reviewTask.result)
      : { milestoneId, approved: true, score: 100, reasoning: '', summary: '' }

    const task = await prisma.agentTask.create({
      data: { type: 'distribute', milestoneId, status: 'running' },
    })

    const webhookUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/oneshot`
      : undefined

    const input: DistributionInput = {
      milestoneId,
      grantId: milestone.grantId,
      builder: milestone.builder,
      amount: milestoneAmount,
      reviewResult,
    }

    const result = await runDistributorAgent(input, signedDelegations, webhookUrl)

    await prisma.agentTask.update({
      where: { id: task.id },
      data: {
        status: result.status === 'failed' ? 'failed' : 'done',
        result: JSON.stringify(result),
      },
    })

    if (result.txHash) {
      await prisma.milestone.update({
        where: { id: milestoneId },
        data: { txHash: result.txHash },
      })
    }

    return NextResponse.json({ taskId: task.id, result })
  } catch (err) {
    console.error('[distribute agent]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}