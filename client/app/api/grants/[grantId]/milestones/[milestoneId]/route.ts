import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ grantId: string; milestoneId: string }> }
) {
  const { milestoneId } = await params
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: { agentTasks: { orderBy: { createdAt: 'desc' } } },
  })
  if (!milestone) {
    return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
  }
  return NextResponse.json(milestone)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ grantId: string; milestoneId: string }> }
) {
  try {
    const { milestoneId } = await params
    const body = await req.json()
    const { evidenceCid, githubRepo, status, reviewNotes, txHash } = body
    const data: Record<string, unknown> = {}
    if (evidenceCid !== undefined) data.evidenceCid = evidenceCid
    if (githubRepo !== undefined)  data.githubRepo = githubRepo
    if (status !== undefined)      data.status = status
    if (reviewNotes !== undefined) data.reviewNotes = reviewNotes
    if (txHash !== undefined)      data.txHash = txHash
    const milestone = await prisma.milestone.update({
      where: { id: milestoneId },
      data,
    })
    return NextResponse.json(milestone)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 }
    )
  }
}
