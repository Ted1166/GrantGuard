import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { keccak256, encodePacked } from 'viem'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ grantId: string }> }
) {
  const { grantId } = await params
  const milestones = await prisma.milestone.findMany({
    where: { grantId },
    orderBy: { amount: 'desc' },
    include: { agentTasks: { orderBy: { createdAt: 'desc' }, take: 3 } },
  })
  return NextResponse.json(milestones)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ grantId: string }> }
) {
  try {
    const { grantId } = await params
    const body = await req.json()
    const { builder, amount, title } = body

    if (!builder || !amount) {
      return NextResponse.json(
        { error: 'builder and amount required' },
        { status: 400 }
      )
    }

    const grant = await prisma.grant.findUnique({ where: { id: grantId } })
    if (!grant) {
      return NextResponse.json({ error: 'Grant not found' }, { status: 404 })
    }

    const milestoneId = keccak256(
      encodePacked(
        ['bytes32', 'address', 'uint256', 'uint256'],
        [
          grantId as `0x${string}`,
          builder as `0x${string}`,
          BigInt(amount),
          BigInt(Date.now()),
        ]
      )
    )

    const milestone = await prisma.milestone.create({
      data: {
        id: milestoneId,
        grantId,
        builder,
        amount: amount.toString(),
        status: 1,
      },
    })

    return NextResponse.json(milestone, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}