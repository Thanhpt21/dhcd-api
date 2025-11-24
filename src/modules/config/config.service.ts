import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { CreateConfigDto } from './dto/create-config.dto';
import { UpdateConfigDto } from './dto/update-config.dto';
import { ConfigResponseDto } from './dto/config-response.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  async create(
    dto: CreateConfigDto,
    logoFile?: Express.Multer.File,
    bannerFiles?: Express.Multer.File[],
  ) {
    // Kiểm tra đã tồn tại config chưa (chỉ cho phép 1 config toàn hệ thống)
    const existing = await this.prisma.config.findFirst();
    if (existing) {
      return {
        success: false,
        message: 'Config đã tồn tại. Chỉ được tạo 1 config duy nhất.',
      };
    }

    // Upload logo + banner
    let logoUrl: string | null = null;
    let bannerUrls: string[] = [];

    try {
      if (logoFile) {
        logoUrl = await this.uploadService.uploadLocalImage(logoFile);
      }

      if (bannerFiles?.length) {
        bannerUrls = await Promise.all(
          bannerFiles.map((file) => this.uploadService.uploadLocalImage(file))
        );
      }
    } catch (error) {
      return {
        success: false,
        message: 'Upload hình ảnh thất bại',
        error: error.message,
      };
    }

    const parseBool = (value: any, defaultValue: boolean): boolean => {
      if (value === 'true' || value === true) return true;
      if (value === 'false' || value === false) return false;
      return defaultValue;
    };

    const config = await this.prisma.config.create({
      data: {
        logo: logoUrl,
        banner: bannerUrls.length ? bannerUrls : Prisma.JsonNull,

        name: dto.name,
        email: dto.email,
        mobile: dto.mobile,
        address: dto.address,
        googlemap: dto.googlemap,
        facebook: dto.facebook,
        zalo: dto.zalo,
        instagram: dto.instagram,
        tiktok: dto.tiktok,
        youtube: dto.youtube,
        x: dto.x,
        linkedin: dto.linkedin,

        VNP_TMN_CODE: dto.VNP_TMN_CODE,
        VNP_SECRET: dto.VNP_SECRET,
        VNP_API_URL: dto.VNP_API_URL,

        EMAIL_USER: dto.EMAIL_USER,
        EMAIL_PASS: dto.EMAIL_PASS,
        EMAIL_FROM: dto.EMAIL_FROM,

        showEmail: parseBool(dto.showEmail, true),
        showMobile: parseBool(dto.showMobile, true),
        showAddress: parseBool(dto.showAddress, true),
        showGooglemap: parseBool(dto.showGooglemap, false),
        showFacebook: parseBool(dto.showFacebook, true),
        showZalo: parseBool(dto.showZalo, false),
        showInstagram: parseBool(dto.showInstagram, false),
        showTiktok: parseBool(dto.showTiktok, false),
        showYoutube: parseBool(dto.showYoutube, false),
        showX: parseBool(dto.showX, false),
        showLinkedin: parseBool(dto.showLinkedin, false),
      },
    });

    return {
      success: true,
      message: 'Tạo config thành công',
      data: new ConfigResponseDto(config),
    };
  }

  async getConfigs(page = 1, limit = 10, search = '') {
    const skip = (page - 1) * limit;

    const where: Prisma.ConfigWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    const [configs, total] = await this.prisma.$transaction([
      this.prisma.config.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.config.count({ where }),
    ]);

    return {
      success: true,
      message: 'Lấy danh sách config thành công',
      data: {
        data: configs.map((c) => new ConfigResponseDto(c)),
        total,
        page,
        pageCount: Math.ceil(total / limit),
      },
    };
  }

  async getAll(search = '') {
    const where: Prisma.ConfigWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ];
    }

    const configs = await this.prisma.config.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      message: 'Lấy danh sách config thành công',
      data: configs.map((c) => new ConfigResponseDto(c)),
    };
  }

  async getById(id: number) {
    const config = await this.prisma.config.findUnique({ where: { id } });
    if (!config) return { success: false, message: 'Config không tồn tại' };

    return {
      success: true,
      message: 'Lấy config thành công',
      data: new ConfigResponseDto(config),
    };
  }

  async update(
    id: number,
    dto: UpdateConfigDto,
    logoFile?: Express.Multer.File,
    bannerFiles?: Express.Multer.File[],
  ) {
    const config = await this.prisma.config.findUnique({ where: { id } });
    if (!config) {
      return { success: false, message: 'Config không tồn tại' };
    }

    let logoUrl = config.logo;
    let bannerUrls: string[] = Array.isArray(config.banner) ? (config.banner as string[]) : [];

    try {
      if (logoFile) {
        if (config.logo) {
          await this.uploadService.deleteLocalImage(config.logo);
        }
        logoUrl = await this.uploadService.uploadLocalImage(logoFile);
      }

      if (bannerFiles?.length) {
        const uploadedBannerUrls = await Promise.all(
          bannerFiles.map((file) => this.uploadService.uploadLocalImage(file))
        );
        bannerUrls = [...bannerUrls, ...uploadedBannerUrls];
      }
    } catch (error) {
      return {
        success: false,
        message: 'Upload hình ảnh thất bại',
        error: error.message,
      };
    }

    const parseBool = (value: any, defaultValue?: boolean): boolean | undefined => {
      if (value === 'true' || value === true) return true;
      if (value === 'false' || value === false) return false;
      return defaultValue ?? undefined;
    };

    const updated = await this.prisma.config.update({
      where: { id },
      data: {
        name: dto.name ?? config.name,
        email: dto.email ?? config.email,
        mobile: dto.mobile ?? config.mobile,
        address: dto.address ?? config.address,
        googlemap: dto.googlemap ?? config.googlemap,
        facebook: dto.facebook ?? config.facebook,
        zalo: dto.zalo ?? config.zalo,
        instagram: dto.instagram ?? config.instagram,
        tiktok: dto.tiktok ?? config.tiktok,
        youtube: dto.youtube ?? config.youtube,
        x: dto.x ?? config.x,
        linkedin: dto.linkedin ?? config.linkedin,
        logo: logoUrl,
        banner: bannerUrls.length ? bannerUrls : Prisma.JsonNull,

        VNP_TMN_CODE: dto.VNP_TMN_CODE ?? config.VNP_TMN_CODE,
        VNP_SECRET: dto.VNP_SECRET ?? config.VNP_SECRET,
        VNP_API_URL: dto.VNP_API_URL ?? config.VNP_API_URL,

        EMAIL_USER: dto.EMAIL_USER ?? config.EMAIL_USER,
        EMAIL_PASS: dto.EMAIL_PASS ?? config.EMAIL_PASS,
        EMAIL_FROM: dto.EMAIL_FROM ?? config.EMAIL_FROM,

        showEmail: dto.showEmail !== undefined ? parseBool(dto.showEmail) : config.showEmail,
        showMobile: dto.showMobile !== undefined ? parseBool(dto.showMobile) : config.showMobile,
        showAddress: dto.showAddress !== undefined ? parseBool(dto.showAddress) : config.showAddress,
        showGooglemap: dto.showGooglemap !== undefined ? parseBool(dto.showGooglemap) : config.showGooglemap,
        showFacebook: dto.showFacebook !== undefined ? parseBool(dto.showFacebook) : config.showFacebook,
        showZalo: dto.showZalo !== undefined ? parseBool(dto.showZalo) : config.showZalo,
        showInstagram: dto.showInstagram !== undefined ? parseBool(dto.showInstagram) : config.showInstagram,
        showTiktok: dto.showTiktok !== undefined ? parseBool(dto.showTiktok) : config.showTiktok,
        showYoutube: dto.showYoutube !== undefined ? parseBool(dto.showYoutube) : config.showYoutube,
        showX: dto.showX !== undefined ? parseBool(dto.showX) : config.showX,
        showLinkedin: dto.showLinkedin !== undefined ? parseBool(dto.showLinkedin) : config.showLinkedin,
      },
    });

    return {
      success: true,
      message: 'Cập nhật config thành công',
      data: new ConfigResponseDto(updated),
    };
  }

  async delete(id: number) {
    const config = await this.prisma.config.findUnique({ where: { id } });
    if (!config) return { success: false, message: 'Config không tồn tại' };

    // Xóa logo
    if (config.logo) {
      await this.uploadService.deleteLocalImage(config.logo);
    }

    // Xóa tất cả banner
    if (Array.isArray(config.banner)) {
      for (const url of config.banner as string[]) {
        await this.uploadService.deleteLocalImage(url);
      }
    }

    await this.prisma.config.delete({ where: { id } });

    return { success: true, message: 'Xóa config thành công' };
  }
}