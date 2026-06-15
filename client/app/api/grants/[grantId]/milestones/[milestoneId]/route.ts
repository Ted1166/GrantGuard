import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ milestoneId: string }> }
) {
  const { milestoneId } = await params
  const milestone = await prisma.milestone.findUnique({ where: { id: milestoneId } })
  if (!milestone) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(milestone)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ milestoneId: string }> }
) {
  try {
    const { milestoneId } = await params
    const body = await req.json()
    const { evidenceCid, submittedAt, status, reviewNotes, txHash } = body

    const milestone = await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        ...(evidenceCid !== undefined && { evidenceCid }),
        ...(submittedAt !== undefined && { submittedAt: new Date(submittedAt) }),
        ...(status !== undefined && { status }),
        ...(reviewNotes !== undefined && { reviewNotes }),
        ...(txHash !== undefined && { txHash }),
      },
    })
    return NextResponse.json(milestone)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
