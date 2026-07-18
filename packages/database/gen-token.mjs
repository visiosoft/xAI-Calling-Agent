import jwt from '../../apps/server/node_modules/jsonwebtoken/index.js';

const token = jwt.sign({
  userId: 'cmrp11fbk0005ue385e7gs5op',
  organizationId: 'cmrp11exj0003ue38ni2arnk2',
  email: 'dev.xulfiqar@gmail.com',
  role: 'OWNER'
}, 'dev-secret-change-in-production', { expiresIn: '1h' });

console.log(token);
