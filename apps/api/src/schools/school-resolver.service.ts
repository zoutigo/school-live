import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SchoolResolverService {
  private readonly slugToIdCache = new Map<string, string>();

  constructor(private readonly prisma: PrismaService) {}

  async resolveSchoolIdBySlug(schoolSlug: string): Promise<string> {
    const cached = this.slugToIdCache.get(schoolSlug);

    if (cached) {
      return cached;
    }

    const school = await this.prisma.school.findUnique({
      where: { slug: schoolSlug },
      select: { id: true }
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    this.slugToIdCache.set(schoolSlug, school.id);
    return school.id;
  }

  async getSchoolBranding(schoolSlug: string) {
    const school = await this.prisma.school.findUnique({
      where: { slug: schoolSlug },
      select: {
        id: true,
        slug: true,
        name: true,
        logoUrl: true,
        primaryColor: true
      }
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    this.slugToIdCache.set(schoolSlug, school.id);
    return school;
  }
}
