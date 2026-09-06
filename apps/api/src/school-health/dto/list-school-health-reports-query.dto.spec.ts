/**
 * Régression : `@Type(() => Boolean)` sur un query param string convertit
 * "false" en `true` (`Boolean("false") === true`) — filtrer les signalements
 * par Statut = En attente (acknowledged=false) renvoyait les acquittés.
 */

import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ListSchoolHealthReportsQueryDto } from "./list-school-health-reports-query.dto.js";

describe("ListSchoolHealthReportsQueryDto", () => {
  it("convertit acknowledged=false (string de query param) en false, pas en true", async () => {
    const dto = plainToInstance(ListSchoolHealthReportsQueryDto, {
      acknowledged: "false",
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.acknowledged).toBe(false);
  });

  it("convertit acknowledged=true en true", async () => {
    const dto = plainToInstance(ListSchoolHealthReportsQueryDto, {
      acknowledged: "true",
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.acknowledged).toBe(true);
  });

  it("laisse acknowledged indéfini quand le paramètre est absent", async () => {
    const dto = plainToInstance(ListSchoolHealthReportsQueryDto, {});
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.acknowledged).toBeUndefined();
  });
});
