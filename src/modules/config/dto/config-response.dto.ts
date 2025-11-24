// src/config/dto/config-response.dto.ts
export class ConfigResponseDto {
  id: number;

  name?: string | null;
  email?: string | null;
  mobile?: string | null;
  address?: string | null;
  googlemap?: string | null;
  facebook?: string | null;
  zalo?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  x?: string | null;
  linkedin?: string | null;
  logo?: string | null;
  banner?: any | null; // JSON field (mảng ảnh banner)

  // Hiển thị thông tin
  showEmail?: boolean;
  showMobile?: boolean;
  showAddress?: boolean;
  showGooglemap?: boolean;
  showFacebook?: boolean;
  showZalo?: boolean;
  showInstagram?: boolean;
  showTiktok?: boolean;
  showYoutube?: boolean;
  showX?: boolean;
  showLinkedin?: boolean;

  // Cấu hình VNPAY
  VNP_TMN_CODE?: string | null;
  VNP_SECRET?: string | null;
  VNP_API_URL?: string | null;

  // Cấu hình Email
  EMAIL_USER?: string | null;
  EMAIL_PASS?: string | null;
  EMAIL_FROM?: string | null;

  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<ConfigResponseDto>) {
    Object.assign(this, partial);
  }
}
