import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function defaultSchoolYearLabel(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const startYear = month >= 8 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

async function main() {
  const schools = await prisma.school.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      activeSchoolYearId: true,
    },
  });

  const summary = {
    schoolsProcessed: schools.length,
    schoolYearsCreated: 0,
    activeSchoolYearsSet: 0,
    academicLevelsCreated: 0,
    curriculumsCreated: 0,
    classesUpdated: 0,
    curriculumSubjectsUpserted: 0,
  };

  for (const school of schools) {
    let activeSchoolYearId = school.activeSchoolYearId;

    if (!activeSchoolYearId) {
      const label = defaultSchoolYearLabel();
      const schoolYear = await prisma.schoolYear.upsert({
        where: { schoolId_label: { schoolId: school.id, label } },
        create: { schoolId: school.id, label },
        update: {},
        select: { id: true },
      });

      const existing = await prisma.schoolYear.count({
        where: { schoolId: school.id, label },
      });
      if (existing === 1) {
        summary.schoolYearsCreated += 1;
      }

      await prisma.school.update({
        where: { id: school.id },
        data: { activeSchoolYearId: schoolYear.id },
      });

      activeSchoolYearId = schoolYear.id;
      summary.activeSchoolYearsSet += 1;
    }

    const genericLevelCode = "GEN";
    const genericLevel = await prisma.academicLevel.upsert({
      where: { schoolId_code: { schoolId: school.id, code: genericLevelCode } },
      create: {
        schoolId: school.id,
        code: genericLevelCode,
        label: "General",
      },
      update: {},
      select: { id: true },
    });

    const genericLevelCount = await prisma.academicLevel.count({
      where: { schoolId: school.id, code: genericLevelCode },
    });
    if (genericLevelCount === 1) {
      summary.academicLevelsCreated += 1;
    }

    const genericCurriculumName = "Tronc commun";
    const genericCurriculum = await prisma.curriculum.upsert({
      where: {
        schoolId_name: { schoolId: school.id, name: genericCurriculumName },
      },
      create: {
        schoolId: school.id,
        name: genericCurriculumName,
        academicLevelId: genericLevel.id,
      },
      update: {},
      select: { id: true },
    });

    const genericCurriculumCount = await prisma.curriculum.count({
      where: { schoolId: school.id, name: genericCurriculumName },
    });
    if (genericCurriculumCount === 1) {
      summary.curriculumsCreated += 1;
    }

    const classes = await prisma.class.findMany({
      where: { schoolId: school.id },
      select: {
        id: true,
        academicLevelId: true,
        curriculumId: true,
      },
    });

    for (const classroom of classes) {
      const updateData = {};
      if (!classroom.academicLevelId) {
        updateData.academicLevelId = genericLevel.id;
      }
      if (!classroom.curriculumId) {
        updateData.curriculumId = genericCurriculum.id;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.class.update({
          where: { id: classroom.id },
          data: updateData,
        });
        summary.classesUpdated += 1;
      }

      const subjectIds = new Set();

      const assignments = await prisma.teacherClassSubject.findMany({
        where: { classId: classroom.id },
        select: { subjectId: true },
      });

      const grades = await prisma.grade.findMany({
        where: { classId: classroom.id },
        select: { subjectId: true },
      });

      assignments.forEach((assignment) => subjectIds.add(assignment.subjectId));
      grades.forEach((grade) => subjectIds.add(grade.subjectId));

      for (const subjectId of subjectIds) {
        await prisma.curriculumSubject.upsert({
          where: {
            curriculumId_subjectId: {
              curriculumId: classroom.curriculumId ?? genericCurriculum.id,
              subjectId,
            },
          },
          create: {
            schoolId: school.id,
            curriculumId: classroom.curriculumId ?? genericCurriculum.id,
            subjectId,
            isMandatory: true,
          },
          update: {},
        });
        summary.curriculumSubjectsUpserted += 1;
      }
    }

    if (
      activeSchoolYearId &&
      school.activeSchoolYearId !== activeSchoolYearId
    ) {
      await prisma.school.update({
        where: { id: school.id },
        data: { activeSchoolYearId },
      });
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
