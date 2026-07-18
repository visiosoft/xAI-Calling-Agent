import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, getUser } from '../lib/auth.js';
import {
  createContactListSchema,
  createContactSchema,
} from '@xai-calling/shared';
import { parse } from 'csv-parse';

export function registerContactRoutes(server: FastifyInstance) {
  server.addHook('preHandler', authMiddleware);

  // --- Contact Lists ---

  server.get('/api/contact-lists', async (request) => {
    const { organizationId } = getUser(request);

    const lists = await prisma.contactList.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return { lists };
  });

  server.post('/api/contact-lists', async (request, reply) => {
    const { organizationId } = getUser(request);
    const parsed = createContactListSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const list = await prisma.contactList.create({
      data: { ...parsed.data, organizationId },
    });

    return reply.status(201).send({ list });
  });

  server.get('/api/contact-lists/:id', async (request, reply) => {
    const { organizationId } = getUser(request);
    const { id } = request.params as { id: string };

    const list = await prisma.contactList.findFirst({
      where: { id, organizationId },
    });

    if (!list) {
      return reply.status(404).send({ error: 'Contact list not found' });
    }

    return list;
  });

  server.patch('/api/contact-lists/:id', async (request, reply) => {
    const { organizationId } = getUser(request);
    const { id } = request.params as { id: string };

    const list = await prisma.contactList.findFirst({
      where: { id, organizationId },
    });

    if (!list) {
      return reply.status(404).send({ error: 'Contact list not found' });
    }

    const { name, description } = request.body as { name?: string; description?: string };
    const updated = await prisma.contactList.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
      },
    });

    return { list: updated };
  });

  server.delete('/api/contact-lists/:id', async (request, reply) => {
    const { organizationId } = getUser(request);
    const { id } = request.params as { id: string };

    const list = await prisma.contactList.findFirst({
      where: { id, organizationId },
    });

    if (!list) {
      return reply.status(404).send({ error: 'Contact list not found' });
    }

    await prisma.contact.deleteMany({ where: { contactListId: id } });
    await prisma.contactList.delete({ where: { id } });

    return { success: true };
  });

  // --- CSV Import ---

  server.post('/api/contact-lists/:id/import', async (request, reply) => {
    const { organizationId } = getUser(request);
    const { id } = request.params as { id: string };

    const list = await prisma.contactList.findFirst({
      where: { id, organizationId },
    });

    if (!list) {
      return reply.status(404).send({ error: 'Contact list not found' });
    }

    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ error: 'No file uploaded' });
    }

    const csvContent = await file.toBuffer();

    const records: Record<string, string>[] = await new Promise((resolve, reject) => {
      const rows: Record<string, string>[] = [];
      const parser = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
      parser.on('readable', () => {
        let record: Record<string, string>;
        while ((record = parser.read()) !== null) {
          rows.push(record);
        }
      });
      parser.on('end', () => resolve(rows));
      parser.on('error', reject);
    });

    const knownFields = new Set([
      'phoneNumber',
      'phone_number',
      'phone',
      'firstName',
      'first_name',
      'lastName',
      'last_name',
      'email',
    ]);

    const contacts = records.map((row) => {
      const customFields: Record<string, string> = {};
      for (const [key, value] of Object.entries(row)) {
        if (!knownFields.has(key) && value) {
          customFields[key] = value;
        }
      }

      return {
        contactListId: id,
        phoneNumber: row.phoneNumber || row.phone_number || row.phone || '',
        firstName: row.firstName || row.first_name || undefined,
        lastName: row.lastName || row.last_name || undefined,
        email: row.email || undefined,
        customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
      };
    });

    const validContacts = contacts.filter((c) => c.phoneNumber);

    if (validContacts.length > 0) {
      await prisma.contact.createMany({ data: validContacts });
    }

    await prisma.contactList.update({
      where: { id },
      data: {
        contactCount: {
          increment: validContacts.length,
        },
      },
    });

    return reply.status(201).send({
      imported: validContacts.length,
      skipped: contacts.length - validContacts.length,
      total: records.length,
    });
  });

  // --- Contacts within a list ---

  server.get('/api/contact-lists/:id/contacts', async (request, reply) => {
    const { organizationId } = getUser(request);
    const { id } = request.params as { id: string };
    const { page = '1', limit = '50' } = request.query as {
      page?: string;
      limit?: string;
    };

    const list = await prisma.contactList.findFirst({
      where: { id, organizationId },
    });

    if (!list) {
      return reply.status(404).send({ error: 'Contact list not found' });
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where: { contactListId: id },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.contact.count({ where: { contactListId: id } }),
    ]);

    return {
      contacts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  });

  server.post('/api/contact-lists/:id/contacts', async (request, reply) => {
    const { organizationId } = getUser(request);
    const { id } = request.params as { id: string };

    const list = await prisma.contactList.findFirst({
      where: { id, organizationId },
    });

    if (!list) {
      return reply.status(404).send({ error: 'Contact list not found' });
    }

    const parsed = createContactSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const contact = await prisma.contact.create({
      data: { ...parsed.data, contactListId: id },
    });

    await prisma.contactList.update({
      where: { id },
      data: { contactCount: { increment: 1 } },
    });

    return reply.status(201).send({ contact });
  });

  // --- Individual contact operations ---

  server.patch('/api/contacts/:id', async (request, reply) => {
    const { organizationId } = getUser(request);
    const { id } = request.params as { id: string };

    const contact = await prisma.contact.findFirst({
      where: {
        id,
        contactList: { organizationId },
      },
      include: { contactList: true },
    });

    if (!contact) {
      return reply.status(404).send({ error: 'Contact not found' });
    }

    const parsed = createContactSchema.partial().safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const updated = await prisma.contact.update({
      where: { id },
      data: parsed.data,
    });

    return { contact: updated };
  });

  server.delete('/api/contacts/:id', async (request, reply) => {
    const { organizationId } = getUser(request);
    const { id } = request.params as { id: string };

    const contact = await prisma.contact.findFirst({
      where: {
        id,
        contactList: { organizationId },
      },
    });

    if (!contact) {
      return reply.status(404).send({ error: 'Contact not found' });
    }

    await prisma.contact.delete({ where: { id } });

    await prisma.contactList.update({
      where: { id: contact.contactListId },
      data: { contactCount: { decrement: 1 } },
    });

    return { success: true };
  });
}
