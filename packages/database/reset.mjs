import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
await p.campaign.update({ where: { id: 'cmrpbm4sa0001ueawfm60kvwl' }, data: { status: 'DRAFT', completedCalls: 0, failedCalls: 0, inProgressCalls: 0 } });
await p.call.deleteMany({ where: { campaignId: 'cmrpbm4sa0001ueawfm60kvwl' } });
console.log('Campaign reset to DRAFT, old calls cleared');
await p.$disconnect();
