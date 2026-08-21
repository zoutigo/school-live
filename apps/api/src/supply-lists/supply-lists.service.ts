import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { EnrollmentsService } from "../enrollments/enrollments.service.js";
import type { UpsertSupplyListDto } from "./dto/upsert-supply-list.dto.js";
import type { ListSupplyListsQueryDto } from "./dto/list-supply-lists-query.dto.js";

@Injectable()
export class SupplyListsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  async listSupplyLists(schoolId: string, query: ListSupplyListsQueryDto) {
    return this.prisma.supplyList.findMany({
      where: {
        schoolId,
        schoolYearId: query.schoolYearId,
        academicLevelId: query.academicLevelId,
      },
      include: {
        academicLevel: { select: { id: true, label: true, code: true } },
        track: { select: { id: true, label: true, code: true } },
        schoolYear: { select: { id: true, label: true } },
        items: { orderBy: { rank: "asc" } },
      },
      orderBy: [{ academicLevelId: "asc" }, { trackId: "asc" }],
    });
  }

  async upsertSupplyList(schoolId: string, payload: UpsertSupplyListDto) {
    const ranks = payload.items.map((item) => item.rank);
    if (new Set(ranks).size !== ranks.length) {
      throw new BadRequestException("Les rangs d'article doivent etre uniques");
    }
    if (payload.items.length === 0) {
      throw new BadRequestException("Au moins un article est requis");
    }

    const schoolYear = await this.prisma.schoolYear.findFirst({
      where: { id: payload.schoolYearId, schoolId },
      select: { id: true },
    });
    if (!schoolYear) {
      throw new NotFoundException(
        "Annee scolaire introuvable pour cette ecole",
      );
    }

    const academicLevel = await this.prisma.academicLevel.findFirst({
      where: {
        id: payload.academicLevelId,
        OR: [{ schoolId }, { schoolId: null }],
      },
      select: { id: true },
    });
    if (!academicLevel) {
      throw new NotFoundException(
        "Niveau academique introuvable pour cette ecole",
      );
    }

    const existing = await this.prisma.supplyList.findFirst({
      where: {
        schoolId,
        schoolYearId: payload.schoolYearId,
        academicLevelId: payload.academicLevelId,
        trackId: payload.trackId ?? null,
      },
      select: { id: true },
    });

    return this.prisma.$transaction(async (tx) => {
      const supplyList = existing
        ? existing
        : await tx.supplyList.create({
            data: {
              schoolId,
              schoolYearId: payload.schoolYearId,
              academicLevelId: payload.academicLevelId,
              trackId: payload.trackId ?? null,
            },
          });

      await tx.supplyItem.deleteMany({
        where: { supplyListId: supplyList.id },
      });
      await tx.supplyItem.createMany({
        data: payload.items.map((item) => ({
          schoolId,
          supplyListId: supplyList.id,
          rank: item.rank,
          label: item.label,
          quantity: item.quantity,
          note: item.note,
        })),
      });

      return tx.supplyList.findUniqueOrThrow({
        where: { id: supplyList.id },
        include: { items: { orderBy: { rank: "asc" } } },
      });
    });
  }

  async deleteSupplyList(schoolId: string, supplyListId: string) {
    const supplyList = await this.prisma.supplyList.findFirst({
      where: { id: supplyListId, schoolId },
      select: { id: true },
    });
    if (!supplyList) {
      throw new NotFoundException("Liste de fournitures introuvable");
    }
    await this.prisma.supplyList.delete({ where: { id: supplyList.id } });
    return { success: true };
  }

  /**
   * Meme convention que FinanceService.resolveLikelyNextSchoolYear : l'annee
   * cible de reinscription est la plus recemment creee qui n'est pas
   * l'annee active.
   */
  private async resolveLikelyNextSchoolYear(
    schoolId: string,
    activeSchoolYearId: string,
  ) {
    return this.prisma.schoolYear.findFirst({
      where: { schoolId, id: { not: activeSchoolYearId } },
      orderBy: { createdAt: "desc" },
      select: { id: true, label: true },
    });
  }

  /**
   * Liste de fournitures pour l'enfant d'un parent, scopee au niveau/filiere
   * cible decide par le conseil de classe (l'annee que l'enfant s'apprete a
   * integrer), pas son niveau actuel.
   */
  async getMyChildSupplyList(
    schoolId: string,
    parentUserId: string,
    studentId: string,
  ) {
    const link = await this.prisma.parentStudent.findFirst({
      where: { schoolId, parentUserId, studentId },
      select: { id: true },
    });
    if (!link) {
      throw new BadRequestException("Cet eleve n'est pas rattache a ce parent");
    }

    const decision = await this.enrollmentsService.getConfirmedDecisionOrThrow(
      schoolId,
      studentId,
    );

    const nextYear = await this.resolveLikelyNextSchoolYear(
      schoolId,
      decision.sourceSchoolYearId,
    );
    if (!nextYear) {
      return { targetSchoolYearId: null, items: [] };
    }

    const supplyList = await this.prisma.supplyList.findFirst({
      where: {
        schoolId,
        schoolYearId: nextYear.id,
        academicLevelId: decision.nextAcademicLevelId,
        trackId: decision.nextTrackId,
      },
      include: { items: { orderBy: { rank: "asc" } } },
    });

    return {
      targetSchoolYearId: nextYear.id,
      targetSchoolYearLabel: nextYear.label,
      items: supplyList?.items ?? [],
    };
  }
}
