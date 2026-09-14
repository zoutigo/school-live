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
   * Verifie que l'utilisateur courant (parent OU l'eleve lui-meme) peut
   * consulter la liste de fournitures de studentId, et renvoie l'id parent
   * a utiliser pour le suivi "vu" (SupplyListView), null pour un eleve en
   * consultation de sa propre fiche (le badge ne concerne que les parents).
   */
  private async assertAccessAndResolveParentUserId(
    schoolId: string,
    requesterUserId: string,
    requesterRole: string | null | undefined,
    studentId: string,
  ): Promise<string | null> {
    if (requesterRole === "STUDENT") {
      const student = await this.prisma.student.findFirst({
        where: { id: studentId, schoolId, userId: requesterUserId },
        select: { id: true },
      });
      if (!student) {
        throw new BadRequestException(
          "Cet eleve n'est pas rattache a cet utilisateur",
        );
      }
      return null;
    }

    const link = await this.prisma.parentStudent.findFirst({
      where: { schoolId, parentUserId: requesterUserId, studentId },
      select: { id: true },
    });
    if (!link) {
      throw new BadRequestException("Cet eleve n'est pas rattache a ce parent");
    }
    return requesterUserId;
  }

  /**
   * Liste de fournitures pour l'enfant d'un parent (ou pour l'eleve
   * lui-meme), scopee au niveau/filiere cible decide par le conseil de
   * classe (l'annee que l'enfant s'apprete a integrer), pas son niveau
   * actuel. Le badge "vu" ne s'applique qu'a la consultation parent.
   */
  async getMyChildSupplyList(
    schoolId: string,
    requesterUserId: string,
    requesterRole: string | null | undefined,
    studentId: string,
  ) {
    const parentUserId = await this.assertAccessAndResolveParentUserId(
      schoolId,
      requesterUserId,
      requesterRole,
      studentId,
    );

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

    const [supplyList, view] = await Promise.all([
      this.prisma.supplyList.findFirst({
        where: {
          schoolId,
          schoolYearId: nextYear.id,
          academicLevelId: decision.nextAcademicLevelId,
          trackId: decision.nextTrackId,
        },
        include: { items: { orderBy: { rank: "asc" } } },
      }),
      parentUserId
        ? this.prisma.supplyListView.findUnique({
            where: {
              parentUserId_studentId_schoolYearId: {
                parentUserId,
                studentId,
                schoolYearId: nextYear.id,
              },
            },
            select: { seenAt: true },
          })
        : null,
    ]);

    return {
      targetSchoolYearId: nextYear.id,
      targetSchoolYearLabel: nextYear.label,
      items: supplyList?.items ?? [],
      seen: parentUserId ? view !== null : true,
    };
  }

  /**
   * Marque comme vue, pour ce parent, la liste de fournitures ciblee par
   * getMyChildSupplyList (annee "suivante" resolue depuis la decision du
   * conseil de classe). Sert uniquement a eteindre le badge de menu. Sans
   * effet pour une consultation "eleve" (pas de badge cote eleve).
   */
  async markMyChildSupplyListSeen(
    schoolId: string,
    requesterUserId: string,
    requesterRole: string | null | undefined,
    studentId: string,
  ) {
    const parentUserId = await this.assertAccessAndResolveParentUserId(
      schoolId,
      requesterUserId,
      requesterRole,
      studentId,
    );
    if (!parentUserId) {
      return { targetSchoolYearId: null };
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
      return { targetSchoolYearId: null };
    }

    await this.prisma.supplyListView.upsert({
      where: {
        parentUserId_studentId_schoolYearId: {
          parentUserId,
          studentId,
          schoolYearId: nextYear.id,
        },
      },
      create: {
        schoolId,
        parentUserId,
        studentId,
        schoolYearId: nextYear.id,
      },
      update: { seenAt: new Date() },
    });

    return { targetSchoolYearId: nextYear.id };
  }

  /**
   * Badge de menu (sidebar parent) : 1 si une liste de fournitures non vide
   * existe pour l'annee cible et n'a pas encore ete consultee par ce parent,
   * 0 sinon (y compris si aucune decision de conseil n'existe encore, cas le
   * plus frequent en cours d'annee). Ne s'applique qu'a un vrai lien parent
   * verifie par l'appelant.
   */
  async getSupplyListBadgeCount(
    schoolId: string,
    parentUserId: string,
    studentId: string,
  ): Promise<number> {
    try {
      const decision =
        await this.enrollmentsService.getConfirmedDecisionOrThrow(
          schoolId,
          studentId,
        );
      const nextYear = await this.resolveLikelyNextSchoolYear(
        schoolId,
        decision.sourceSchoolYearId,
      );
      if (!nextYear) return 0;

      const [supplyList, view] = await Promise.all([
        this.prisma.supplyList.findFirst({
          where: {
            schoolId,
            schoolYearId: nextYear.id,
            academicLevelId: decision.nextAcademicLevelId,
            trackId: decision.nextTrackId,
          },
          select: { items: { select: { id: true }, take: 1 } },
        }),
        this.prisma.supplyListView.findUnique({
          where: {
            parentUserId_studentId_schoolYearId: {
              parentUserId,
              studentId,
              schoolYearId: nextYear.id,
            },
          },
          select: { seenAt: true },
        }),
      ]);

      const hasItems = (supplyList?.items.length ?? 0) > 0;
      return hasItems && view === null ? 1 : 0;
    } catch {
      return 0;
    }
  }
}
