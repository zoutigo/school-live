import { BadRequestException } from "@nestjs/common";
import type { PrismaService } from "../prisma/prisma.service.js";

export async function ensureClassHasCapacity(
  prisma: PrismaService,
  classId: string,
  schoolYearId: string,
  incomingCount = 1,
) {
  const classEntity = await prisma.class.findUnique({
    where: { id: classId },
    select: { name: true, capacity: true },
  });

  if (!classEntity || classEntity.capacity == null) return;

  const activeCount = await prisma.enrollment.count({
    where: { classId, schoolYearId, status: "ACTIVE" },
  });

  if (activeCount + incomingCount > classEntity.capacity) {
    throw new BadRequestException(
      `La classe ${classEntity.name} a atteint sa capacite maximale (${classEntity.capacity} eleves).`,
    );
  }
}
