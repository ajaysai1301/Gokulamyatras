import { prismaDb } from '@/lib/db/prisma';
import { defaultHomepageContent, normalizeHomepageContent, HomepageContent } from '@/lib/site/homepage-content';

export type HomepageRecord = { draft: HomepageContent; published: HomepageContent; version: number; publishedAt: string | null; updatedAt: string };

export async function getHomepageContent(): Promise<HomepageRecord> {
  const row = await prismaDb().homepageContent.findUnique({ where: { id: 'homepage' } });
  if (!row) {
    const created = await prismaDb().homepageContent.create({ data: { id: 'homepage', draft: defaultHomepageContent as any, published: defaultHomepageContent as any } });
    return { draft: normalizeHomepageContent(created.draft), published: normalizeHomepageContent(created.published), version: created.version, publishedAt: null, updatedAt: created.updatedAt.toISOString() };
  }
  return { draft: normalizeHomepageContent(row.draft), published: normalizeHomepageContent(row.published), version: row.version, publishedAt: row.publishedAt?.toISOString() ?? null, updatedAt: row.updatedAt.toISOString() };
}

export async function saveHomepageDraft(content: unknown, updatedBy: string): Promise<HomepageRecord> {
  const normalized = normalizeHomepageContent(content);
  const row = await prismaDb().homepageContent.upsert({ where: { id: 'homepage' }, create: { id: 'homepage', draft: normalized as any, published: defaultHomepageContent as any, updatedBy }, update: { draft: normalized as any, updatedBy } });
  return { draft: normalizeHomepageContent(row.draft), published: normalizeHomepageContent(row.published), version: row.version, publishedAt: row.publishedAt?.toISOString() ?? null, updatedAt: row.updatedAt.toISOString() };
}

export async function publishHomepage(updatedBy: string): Promise<HomepageRecord> {
  const current = await getHomepageContent();
  const row = await prismaDb().homepageContent.update({ where: { id: 'homepage' }, data: { published: current.draft as any, version: { increment: 1 }, publishedAt: new Date(), updatedBy } });
  return { draft: normalizeHomepageContent(row.draft), published: normalizeHomepageContent(row.published), version: row.version, publishedAt: row.publishedAt?.toISOString() ?? null, updatedAt: row.updatedAt.toISOString() };
}
