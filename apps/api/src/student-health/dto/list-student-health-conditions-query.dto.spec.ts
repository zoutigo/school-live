/**
 * Régression : `@Type(() => Boolean)` sur un query param string convertit
 * "false" en `true` (`Boolean("false") === true`) — filtrer les conditions
 * santé par Statut = Résolues (active=false) renvoyait les actives.
 */

import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ListStudentHealthConditionsQueryDto } from "./list-student-health-conditions-query.dto.js";

describe("ListStudentHealthConditionsQueryDto", () => {
  it("convertit active=false (string de query param) en false, pas en true", async () => {
    const dto = plainToInstance(ListStudentHealthConditionsQueryDto, {
      active: "false",
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.active).toBe(false);
  });

  it("convertit active=true en true", async () => {
    const dto = plainToInstance(ListStudentHealthConditionsQueryDto, {
      active: "true",
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.active).toBe(true);
  });

  it("laisse active indéfini quand le paramètre est absent", async () => {
    const dto = plainToInstance(ListStudentHealthConditionsQueryDto, {});
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.active).toBeUndefined();
  });
});
