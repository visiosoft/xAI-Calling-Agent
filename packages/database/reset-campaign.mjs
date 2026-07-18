import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// Reset "Summer Outreach 2026" which has the correct caller ID format
await p.campaign.update({
  where: { id: 'cmrpbm4sa0001ueawfm60kvwl' },
  data: { status: 'DRAFT' },
});

await p.call.updateMany({
  where: { campaignId: 'cmrpbm4sa0001ueawfm60kvwl' },
  data: { status: 'FAILED', endedAt: new Date() },
});

console.log('Reset "Summer Outreach 2026" to DRAFT');

await p.$disconnect();
