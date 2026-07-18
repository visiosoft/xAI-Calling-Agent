import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
await p.campaign.update({
  where: { id: 'cmrpbm4sa0001ueawfm60kvwl' },
  data: { callerIdNumber: '+13193814189', status: 'DRAFT' },
});
console.log('Campaign updated with caller ID +13193814189 and reset to DRAFT');
await p.$disconnect();
