import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ grantId: string }> }
) {
  const { grantId } = await params
  const grant = await prisma.grant.findUnique({
    where: { id: grantId },
    include: { milestones: { orderBy: { amount: 'desc' } } },
  })

  if (!grant) {
    return NextResponse.json({ error: 'Grant not found' }, { status: 404 })
  }

  return NextResponse.json(grant)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ grantId: string }> }
) {
  try {
    const { grantId } = await params
    const body = await req.json()
    const { status, startDate, endDate } = body

    const data: Record<string, unknown> = {}
    if (status) data.status    = status
    if (startDate) data.startDate = new Date(startDate)
    if (endDate) data.endDate   = new Date(endDate)
    
    const grant = await prisma.grant.update({
      where: { id: grantId },
      data,
    })
    return NextResponse.json(grant)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 }
    )
  }
}