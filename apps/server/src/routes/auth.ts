import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import {
  hashPassword,
  comparePassword,
  signToken,
  authMiddleware,
  getUser,
} from '../lib/auth.js';

export function registerAuthRoutes(server: FastifyInstance) {
  server.post('/api/auth/signup', async (request, reply) => {
    const { email, password, name, orgName } = request.body as {
      email: string;
      password: string;
      name: string;
      orgName: string;
    };

    if (!email || !password || !name || !orgName) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ error: 'Email already in use' });
    }

    const passwordHash = await hashPassword(password);
    const slug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const existingOrg = await prisma.organization.findUnique({ where: { slug } });
    if (existingOrg) {
      return reply.status(409).send({ error: 'Organization slug already taken' });
    }

    const organization = await prisma.organization.create({
      data: { name: orgName, slug },
    });

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: 'OWNER',
        organizationId: organization.id,
      },
    });

    const token = signToken({
      userId: user.id,
      organizationId: organization.id,
      email: user.email,
      role: user.role,
    });

    return reply.status(201).send({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      organization: { id: organization.id, name: organization.name, slug: organization.slug },
    });
  });

  server.post('/api/auth/login', async (request, reply) => {
    const { email, password } = request.body as {
      email: string;
      password: string;
    };

    if (!email || !password) {
      return reply.status(400).send({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    if (!user || !user.passwordHash) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const token = signToken({
      userId: user.id,
      organizationId: user.organizationId!,
      email: user.email,
      role: user.role,
    });

    return reply.send({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      organization: user.organization
        ? { id: user.organization.id, name: user.organization.name, slug: user.organization.slug }
        : null,
    });
  });

  server.get(
    '/api/auth/me',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { userId } = getUser(request);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { organization: true },
      });

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return reply.send({
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        organization: user.organization
          ? { id: user.organization.id, name: user.organization.name, slug: user.organization.slug, plan: user.organization.plan }
          : null,
      });
    }
  );
}
