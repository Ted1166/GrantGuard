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
