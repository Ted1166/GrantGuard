import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { keccak256, encodePacked } from 'viem'

export async function GET() {
  const grants = await prisma.grant.findMany({
    include: { milestones: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(grants)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, committee, totalBudget } = body

    if (!title || !committee || !totalBudget) {
      return NextResponse.json(
        { error: 'title, committee, totalBudget required' },
        { status: 400 }
      )
    }

    const grantId = keccak256(
      encodePacked(
        ['string', 'address', 'uint256'],
        [title, committee as `0x${string}`, BigInt(Date.now())]
      )
    )

    const grant = await prisma.grant.create({
      data: {
        id: grantId,
        title,
        committee,
        totalBudget: totalBudget.toString(),
        active: true,
      },
    })

    return NextResponse.json(grant, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
