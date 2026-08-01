import { ForbiddenException, Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { UpdateContactInfoDto } from "./dto/update-contact-info.dto.js";
import { isPlatformAdmin } from "./site-content-access.js";

const CONTACT_SETTING_KEY = "contact";

export type ContactInfo = {
  email: string;
  phone: string;
  address: string;
  legalRepresentativeFirstName: string;
  legalRepresentativeLastName: string;
};

// Filet de sécurité SEO : seule valeur "en dur" du dispositif, utilisée
// uniquement si aucune ligne SiteSetting n'existe encore en base.
const CONTACT_INFO_FALLBACK: ContactInfo = {
  email: "contact@scolive.cm",
  phone: "+237 6XX XXX XXX",
  address: "Cameroun",
  legalRepresentativeFirstName: "",
  legalRepresentativeLastName: "",
};

// Les champs "responsable légal" ont été ajoutés après la mise en prod :
// une ligne SiteSetting existante peut donc ne contenir que email/phone/
// address. On ne les exige pas dans le type guard pour rester compatible
// avec ces lignes, et on les complète à "" à la lecture (voir getContactInfo).
function isContactInfo(
  value: unknown,
): value is Pick<ContactInfo, "email" | "phone" | "address"> &
  Partial<ContactInfo> {
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
    if (!isPlatformAdmin(user)) {
      throw new ForbiddenException("Réservé aux administrateurs plateforme");
    }
  }

  async getContactInfo(): Promise<ContactInfo> {
    const setting = await this.prisma.siteSetting.findUnique({
      where: { key: CONTACT_SETTING_KEY },
    });

    if (setting && isContactInfo(setting.value)) {
      const stored = setting.value;
      return {
        email: stored.email,
        phone: stored.phone,
        address: stored.address,
        legalRepresentativeFirstName: stored.legalRepresentativeFirstName ?? "",
        legalRepresentativeLastName: stored.legalRepresentativeLastName ?? "",
      };
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
      legalRepresentativeFirstName:
        dto.legalRepresentativeFirstName?.trim() ?? "",
      legalRepresentativeLastName:
        dto.legalRepresentativeLastName?.trim() ?? "",
    };

    await this.prisma.siteSetting.upsert({
      where: { key: CONTACT_SETTING_KEY },
      create: { key: CONTACT_SETTING_KEY, value, updatedById: user.id },
      update: { value, updatedById: user.id },
    });

    return value;
  }
}
