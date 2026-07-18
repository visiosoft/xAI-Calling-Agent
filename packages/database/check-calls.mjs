import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const calls = await p.call.findMany({
  orderBy: { createdAt: 'desc' },
  take: 5,
  include: { campaign: { select: { name: true } } },
});

for (const c of calls) {
  console.log(`Call: ${c.id}`);
  console.log(`  Campaign: ${c.campaign?.name}`);
  console.log(`  Status: ${c.status}`);
  console.log(`  Outcome: ${c.outcome}`);
  console.log(`  TwilioSid: ${c.twilioCallSid}`);
  console.log(`  StreamSid: ${c.twilioStreamSid}`);
  console.log(`  Duration: ${c.duration}s`);
  console.log(`  Error: ${c.errorMessage}`);
  console.log(`  Created: ${c.createdAt}`);
  console.log(`  Answered: ${c.answeredAt}`);
  console.log(`  Ended: ${c.endedAt}`);
  console.log(`  Transcript: ${JSON.stringify(c.transcript)}`);
  console.log('---');
}

await p.$disconnect();
