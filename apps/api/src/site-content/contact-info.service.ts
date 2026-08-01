import { ForbiddenException, Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { UpdateContactInfoDto } from "./dto/update-contact-info.dto.js";
import { isSuperAdmin } from "./site-content-access.js";

const CONTACT_SETTING_KEY = "contact";

export type ContactInfo = {
  email: string;
  phone: string;
  address: string;
};

// Filet de sécurité SEO : seule valeur "en dur" du dispositif, utilisée
// uniquement si aucune ligne SiteSetting n'existe encore en base.
const CONTACT_INFO_FALLBACK: ContactInfo = {
  email: "contact@scolive.cm",
  phone: "+237 6XX XXX XXX",
  address: "Cameroun",
};

function isContactInfo(value: unknown): value is ContactInfo {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.email === "string" &&
    typeof record.phone === "string" &&
    typeof record.address === "string"
  );
}

@Injectable()
export class ContactInfoService {
  constructor(private readonly prisma: PrismaService) {}

  assertCanManage(user: AuthenticatedUser) {
    if (!isSuperAdmin(user)) {
      throw new ForbiddenException("Réservé aux administrateurs plateforme");
    }
  }

  async getContactInfo(): Promise<ContactInfo> {
    const setting = await this.prisma.siteSetting.findUnique({
      where: { key: CONTACT_SETTING_KEY },
    });

    if (setting && isContactInfo(setting.value)) {
      return setting.value;
    }

    return CONTACT_INFO_FALLBACK;
  }

  async updateContactInfo(
    user: AuthenticatedUser,
    dto: UpdateContactInfoDto,
  ): Promise<ContactInfo> {
    this.assertCanManage(user);

    const value: ContactInfo = {
      email: dto.email.trim(),
      phone: dto.phone.trim(),
      address: dto.address.trim(),
    };

    await this.prisma.siteSetting.upsert({
      where: { key: CONTACT_SETTING_KEY },
      create: { key: CONTACT_SETTING_KEY, value, updatedById: user.id },
      update: { value, updatedById: user.id },
    });

    return value;
  }
}
