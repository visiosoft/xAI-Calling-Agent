import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
await p.call.deleteMany({ where: { campaignId: 'cmrpbm4sa0001ueawfm60kvwl' } });
console.log('Old calls cleared');
await p.$disconnect();
