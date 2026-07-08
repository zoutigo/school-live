import { Type } from "class-transformer";
import { IsEnum, IsIn, IsInt, IsOptional, Max, Min } from "class-validator";
import { ResourceApprovalStatus, ResourceKind } from "@prisma/client";

export class ListAdminResourcesQueryDto {
  @IsOptional()
  @IsEnum(ResourceKind)
  kind?: ResourceKind;

  @IsOptional()
  @IsIn(["statement", "correction"])
  part?: "statement" | "correction";

  @IsOptional()
  @IsEnum(ResourceApprovalStatus)
  status?: ResourceApprovalStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
