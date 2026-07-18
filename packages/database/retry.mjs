import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const campaigns = await p.campaign.findMany({ where: { organizationId: 'cmrp11exj0003ue38ni2arnk2' } });
for (const c of campaigns) {
  await p.call.deleteMany({ where: { campaignId: c.id } });
  await p.campaign.update({ where: { id: c.id }, data: { status: 'DRAFT' } });
}
console.log('All campaigns reset to DRAFT');
await p.$disconnect();
