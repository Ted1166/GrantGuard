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
    const { id, title, committee, totalBudget } = body

    if (!title || !committee || !totalBudget) {
      return NextResponse.json(
        { error: 'title, committee, totalBudget required' },
        { status: 400 }
      )
    }

    const grantId = (id as `0x${string}`) ?? keccak256(
      encodePacked(
        ['string', 'address'],
        [title, committee as `0x${string}`]
      )
    )

    const grant = await prisma.grant.upsert({
      where: { id: grantId },
      update: { title, totalBudget: totalBudget.toString() },
      create: {
        id: grantId,
        title,
        committee,
        totalBudget: totalBudget.toString(),
        active: true,
        status: 'draft',
        termsAgreed: Boolean(body.termsSignature),
        TermsSignedAt: body.termsSignature ? new Date() : null,
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