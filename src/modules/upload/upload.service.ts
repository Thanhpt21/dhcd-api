// upload.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

  // Thêm interface và type definitions
interface UploadFileResult {
  success: boolean;
  url?: string;
  error?: string;
  filePath?: string;
}

interface FileUploadOptions {
  folderPath?: string;
  fileName?: string;
  bucketName?: string;
  contentType?: string;
  isBase64?: boolean;
}


@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private supabase;
  private readonly tempDir = './temp';
  private readonly maxFileSize = 500 * 1024 * 1024; // 500MB
  private readonly minFileSize = 10 * 1024; // 10KB

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL or Key is missing in environment variables');
    }
    this.supabase = createClient(supabaseUrl, supabaseKey);
     this.ensureTempDirectory();
  }

  private get imageBucketName(): string {
    return this.configService.get<string>('SUPABASE_BUCKET_NAME', 'images');
  }

  private get videoBucketName(): string {
    return this.configService.get<string>('SUPABASE_VIDEO_BUCKET_NAME', 'videos');
  }

   /**
   * Đảm bảo thư mục temp tồn tại
   */
  ensureTempDirectory(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
      this.logger.log(`✅ Đã tạo thư mục temp: ${this.tempDir}`);
    }
  }





    /**
   * Upload video từ URL Heygen lên Supabase - PHIÊN BẢN ĐÃ SỬA
   */
async uploadVideoFromUrl(
  videoUrl: string, 
  fileName: string, 
  folderPath: string = 'heygen-videos'
): Promise<{ success: boolean; url?: string; error?: string }> {
  console.log(`🚀 [uploadVideoFromUrl] BẮT ĐẦU`);
  console.log(`📥 Thông tin upload:`, {
    videoUrl: videoUrl,
    urlLength: videoUrl.length,
    fileName: fileName,
    folderPath: folderPath
  });
  
  const maxRetries = 3;
  const tempDir = './temp';
  let tempFilePath: string | null = null;

  // Tạo thư mục temp nếu chưa có
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  try {
    // 1. VALIDATE URL ĐẦY ĐỦ
    console.log(`🔍 [1/9] Validating URL...`);
    if (!videoUrl) {
      throw new Error('Video URL is empty');
    }

    if (!videoUrl.startsWith('http')) {
      throw new Error(`Invalid video URL format: Must start with http, got: ${videoUrl.substring(0, 50)}`);
    }

    if (videoUrl.length < 50) {
      throw new Error(`Invalid video URL format: URL too short (${videoUrl.length} chars)`);
    }

    if (!this.isValidVideoUrl(videoUrl)) {
      throw new Error(`Invalid video URL format: ${videoUrl.substring(0, 100)}`);
    }

    console.log(`✅ [1/9] URL hợp lệ`);

    // 2. TẠO TÊN FILE UNIQUE
    console.log(`🔍 [2/9] Creating unique filename...`);
    const uniqueFileName = `${this.sanitizeFileName(fileName)}_${Date.now()}.mp4`;
    const supabaseFilePath = `${folderPath}/${uniqueFileName}`;

    console.log(`📁 [2/9] Supabase path: ${supabaseFilePath}`);

    // 3. KIỂM TRA VIDEO ĐÃ TỒN TẠI CHƯA
    console.log(`🔍 [3/9] Checking if video already exists on Supabase...`);
    const existingUrl = await this.checkVideoExistsOnSupabase(supabaseFilePath);
    if (existingUrl) {
      console.log(`✅ [3/9] Video đã tồn tại: ${existingUrl}`);
      return {
        success: true,
        url: existingUrl
      };
    }
    console.log(`✅ [3/9] Video chưa tồn tại, tiếp tục upload...`);

    // 4. DOWNLOAD VIDEO VỀ TEMP FILE
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`🔄 [4/9 - Attempt ${attempt}/${maxRetries}] Downloading video...`);
      
      try {
        tempFilePath = await this.downloadVideoToFile(videoUrl, uniqueFileName);
        
        if (!tempFilePath || !fs.existsSync(tempFilePath)) {
          throw new Error('Failed to download video to temporary file');
        }

        // 5. VALIDATE FILE ĐÃ TẢI
        console.log(`🔍 [5/9] Validating downloaded file...`);
        const fileStats = fs.statSync(tempFilePath);
        const fileSizeMB = (fileStats.size / 1024 / 1024).toFixed(2);
        const fileSizeBytes = fileStats.size;
        
        console.log(`📊 [5/9] File info:`, {
          size: `${fileSizeMB} MB (${fileSizeBytes} bytes)`,
          path: tempFilePath
        });

        // Kiểm tra kích thước file
        const minFileSize = 10 * 1024; // 10KB
        const maxFileSize = 500 * 1024 * 1024; // 500MB

        if (fileSizeBytes < minFileSize) {
          throw new Error(`File quá nhỏ (${fileSizeBytes} bytes < ${minFileSize} bytes), có thể là error page`);
        }

        if (fileSizeBytes > maxFileSize) {
          throw new Error(`File quá lớn (${fileSizeMB} MB > ${maxFileSize / 1024 / 1024} MB)`);
        }

        console.log(`✅ [5/9] File size hợp lệ`);

        // 6. TÍNH CHECKSUM (optional)
        console.log(`🔍 [6/9] Calculating checksum...`);
        const checksum = this.calculateChecksum(tempFilePath);
        console.log(`🔐 [6/9] Checksum: ${checksum.substring(0, 16)}...`);

        // 7. UPLOAD LÊN SUPABASE
        console.log(`📤 [7/9] Uploading to Supabase...`);
        
        const fileBuffer = fs.readFileSync(tempFilePath);
        
        console.log(`🔍 [7.1/9] File buffer size: ${fileBuffer.length} bytes`);
        
        const { data, error } = await this.supabase.storage
          .from(this.videoBucketName)
          .upload(supabaseFilePath, fileBuffer, {
            contentType: 'video/mp4',
            upsert: false,
            cacheControl: '3600',
            duplex: 'half'
          });

        if (error) {
          // Xử lý trường hợp file đã tồn tại
          if (error.message?.includes('already exists')) {
            console.log(`ℹ️ [7/9] File đã tồn tại, lấy URL hiện có`);
            const { data: existingUrlData } = this.supabase.storage
              .from(this.videoBucketName)
              .getPublicUrl(supabaseFilePath);
            
            return {
              success: true,
              url: existingUrlData.publicUrl
            };
          }
          throw new Error(`Supabase upload error: ${error.message}`);
        }

        console.log(`✅ [7/9] Upload thành công!`);

        // 8. LẤY PUBLIC URL
        console.log(`🔗 [8/9] Getting public URL...`);
        const { data: publicUrlData } = this.supabase.storage
          .from(this.videoBucketName)
          .getPublicUrl(supabaseFilePath);

        if (!publicUrlData?.publicUrl) {
          throw new Error('Could not get public URL from Supabase');
        }

        console.log(`✅ [8/9] Public URL: ${publicUrlData.publicUrl}`);

        // 9. VERIFY VIDEO SAU KHI UPLOAD
        console.log(`🔍 [9/9] Verifying uploaded video...`);
        const verifyResult = await this.verifySupabaseVideo(publicUrlData.publicUrl);
        
        if (!verifyResult.accessible) {
          throw new Error(`Video không thể truy cập sau khi upload: ${verifyResult.error}`);
        }

        console.log(`🎉 [9/9] Video verification successful!`);
        console.log(`🎉 [uploadVideoFromUrl] HOÀN THÀNH!`);
        
        return {
          success: true,
          url: publicUrlData.publicUrl
        };

      } catch (attemptError) {
        console.log(`💥 [Attempt ${attempt}] LỖI: ${attemptError.message}`);
        
        // Dọn dẹp temp file nếu có lỗi
        if (tempFilePath && fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath);
            console.log(`🧹 Đã xóa temp file sau lỗi`);
            tempFilePath = null;
          } catch (cleanupError) {
            console.error(`⚠️ Không thể xóa temp file:`, cleanupError.message);
          }
        }

        if (attempt < maxRetries) {
          const delay = attempt * 2000;
          console.log(`⏳ Đợi ${delay/1000}s trước khi thử lại...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw attemptError;
        }
      }
    }

    throw new Error('All upload attempts failed');

  } catch (error) {
    console.error(`❌ [uploadVideoFromUrl] LỖI NGHIÊM TRỌNG:`, error.message);
    return {
      success: false,
      error: error.message
    };
  } finally {
    // CLEANUP: Luôn xóa temp file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`🧹 Đã xóa temp file trong finally`);
      } catch (cleanupError) {
        console.error(`⚠️ Không thể xóa temp file:`, cleanupError.message);
      }
    }
  }
}

// CÁC HELPER METHODS CẦN THIẾT:

private isValidVideoUrl(url: string): boolean {
  if (!url) return false;
  
  const isValid = url.includes('.mp4') && 
                 (url.includes('heygen.ai') || url.includes('heygen.com')) &&
                 url.startsWith('http');
  
  console.log(`🔍 [isValidVideoUrl] "${url.substring(0, 100)}..." -> ${isValid}`);
  return isValid;
}


private async checkVideoExistsOnSupabase(filePath: string): Promise<string | null> {
  try {
    const { data } = this.supabase.storage
      .from(this.videoBucketName)
      .getPublicUrl(filePath);
    
    // Kiểm tra xem URL có thể truy cập được không
    const response = await fetch(data.publicUrl, { method: 'HEAD' });
    if (response.ok) {
      return data.publicUrl;
    }
    return null;
  } catch (error) {
    return null;
  }
}

private calculateChecksum(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return require('crypto').createHash('md5').update(fileBuffer).digest('hex');
}

private async verifySupabaseVideo(videoUrl: string): Promise<{ accessible: boolean; error?: string }> {
  try {
    const response = await fetch(videoUrl, { method: 'HEAD' });
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      
      console.log(`🔍 [verifySupabaseVideo] Video info:`, {
        contentType: contentType,
        contentLength: contentLength ? `${(parseInt(contentLength) / 1024 / 1024).toFixed(2)} MB` : 'unknown'
      });
      
      return { accessible: true };
    } else {
      return { 
        accessible: false, 
        error: `HTTP ${response.status}: ${response.statusText}` 
      };
    }
  } catch (error) {
    return { 
      accessible: false, 
      error: error.message 
    };
  }
}

 /**
   * Download video về temp file
   */
  private async downloadVideoToFile(videoUrl: string, fileName: string): Promise<string> {
    const tempFilePath = path.join(this.tempDir, `${this.sanitizeFileName(fileName)}`);
    
    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
        'Referer': 'https://app.heygen.com/',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const sizeMB = (parseInt(contentLength) / 1024 / 1024).toFixed(2);
      console.log(`📥 Downloading ${sizeMB} MB...`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    fs.writeFileSync(tempFilePath, buffer);
    return tempFilePath;
  }



  /**
   * Tự động upload video Heygen
   */
async autoUploadHeygenVideo(
  heygenVideoUrl: string, 
  videoId: string, 
  lessonId?: number | null
): Promise<string> {
  console.log(`🚀 [autoUploadHeygenVideo] Bắt đầu upload:`, {
    videoId: videoId,
    lessonId: lessonId,
    urlLength: heygenVideoUrl?.length,
    urlPreview: heygenVideoUrl?.substring(0, 100)
  });

  if (!heygenVideoUrl) {
    throw new Error('HeyGen video URL is empty');
  }

  const folderPath = lessonId ? `lessons/${lessonId}` : 'videos';
  const fileName = `heygen_${videoId}`;
  
  console.log(`📁 [autoUploadHeygenVideo] Upload đến: ${folderPath}/${fileName}`);
  
  const result = await this.uploadVideoFromUrl(heygenVideoUrl, fileName, folderPath);
  
  if (!result.success) {
    throw new Error(result.error || 'Upload failed');
  }
  
  if (!result.url) {
    throw new Error('No URL returned from upload');
  }
  
  return result.url;
}

  /**
   * Cleanup old temp files
   */
  async cleanupOldTempFiles(maxAgeHours: number = 24): Promise<number> {
    try {
      if (!fs.existsSync(this.tempDir)) {
        return 0;
      }

      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const stats = fs.statSync(filePath);
        const ageMs = now - stats.mtimeMs;

        if (ageMs > maxAgeMs) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        this.logger.log(`🧹 Đã xóa ${deletedCount} temp files cũ`);
      }

      return deletedCount;
    } catch (error) {
      this.logger.error(`❌ Lỗi cleanup temp files:`, error);
      return 0;
    }
  }

  

    // ========== VIDEO UPLOAD METHODS ========== //

// Thêm hàm kiểm tra video có play được không
async checkVideoPlayable(videoUrl: string): Promise<{ playable: boolean; error?: string; size?: number }> {
  try {
    console.log(`🔍 Kiểm tra video: ${videoUrl}`);
    
    const response = await fetch(videoUrl, { method: 'HEAD' });
    if (!response.ok) {
      return { playable: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const contentLength = response.headers.get('content-length');
    const contentType = response.headers.get('content-type');
    const contentRange = response.headers.get('content-range');
    
    const size = contentLength ? parseInt(contentLength) : 0;
    const sizeMB = (size / 1024 / 1024).toFixed(2);
    
    console.log(`🔍 Video info:`, {
      contentLength: `${sizeMB} MB`,
      contentType: contentType || 'unknown',
      contentRange: contentRange || 'none'
    });

    // KIỂM TRA KÍCH THƯỚC TỐI THIỂU
    if (size < 100 * 1024) { // 100KB
      return { playable: false, error: `Video too small: ${size} bytes`, size: size };
    }

    if (!contentType?.includes('video/mp4')) {
      return { playable: false, error: `Not video/mp4: ${contentType}`, size: size };
    }

    return { playable: true, size: size };
  } catch (error) {
    return { playable: false, error: error.message };
  }
}

  /**
   * Upload video từ file buffer (cho video local)
   */
  async uploadVideoFile(
    file: Express.Multer.File, 
    folderPath: string = 'local-videos'
  ): Promise<string> {
    try {
      const fileName = `${uuidv4()}-${file.originalname.replace(/[^a-zA-Z0-9-_.]/g, '_')}`;
      const filePath = `${folderPath}/${fileName}`;

      console.log(`📤 Đang upload video file: ${filePath}`);

      const { data, error } = await this.supabase.storage
        .from(this.videoBucketName)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      const { data: publicUrlData } = this.supabase.storage
        .from(this.videoBucketName)
        .getPublicUrl(filePath);

      console.log(`✅ Upload video file thành công: ${publicUrlData.publicUrl}`);
      return publicUrlData.publicUrl;

    } catch (error) {
      console.error('❌ Lỗi upload video file:', error);
      throw new BadRequestException(`Không thể upload video file: ${error.message}`);
    }
  }


async getVideoMetadata(videoUrl: string): Promise<any> {
  try {
    console.log(`🔍 Kiểm tra metadata video: ${videoUrl}`);
    
    const response = await fetch(videoUrl);
    if (!response.ok) {
      return { error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const buffer = await response.arrayBuffer();
    
    return {
      size: buffer.byteLength,
      sizeMB: (buffer.byteLength / 1024 / 1024).toFixed(2),
      url: videoUrl,
      status: 'available'
    };
  } catch (error) {
    return { 
      error: error.message,
      status: 'unavailable'
    };
  }
}

/**
   * Xóa video từ Supabase
   */
  async deleteVideo(videoUrl: string): Promise<boolean> {
    if (!videoUrl) return false;

    try {
      const bucketPath = `/storage/v1/object/public/${this.videoBucketName}/`;
      
      if (!videoUrl.includes(bucketPath)) {
        this.logger.warn('⚠️ URL không phải từ Supabase bucket');
        return false;
      }

      const parts = videoUrl.split(bucketPath);
      if (parts.length < 2 || !parts[1]) {
        this.logger.warn('⚠️ Không thể parse URL');
        return false;
      }
      
      const filePath = parts[1];
      
      const { error } = await this.supabase.storage
        .from(this.videoBucketName)
        .remove([filePath]);

      if (error) {
        this.logger.error('❌ Lỗi xóa video:', error.message);
        return false;
      }

      this.logger.log('✅ Xóa video thành công:', filePath);
      return true;
    } catch (error) {
      this.logger.error('❌ Lỗi khi xóa video:', error);
      return false;
    }
  }
  /**
   * Kiểm tra xem video có tồn tại trong bucket không
   */
  async checkVideoExists(filePath: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.videoBucketName)
        .list('', {
          search: filePath,
        });

      if (error) {
        console.error('❌ Lỗi kiểm tra video:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('❌ Lỗi khi kiểm tra video:', error);
      return false;
    }
  }

  /**
   * Lấy danh sách video trong folder
   */
  async listVideos(folderPath: string = ''): Promise<any[]> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.videoBucketName)
        .list(folderPath);

      if (error) {
        throw new Error(`List failed: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('❌ Lỗi khi lấy danh sách video:', error);
      return [];
    }
  }

  


  // ========== IMAGE UPLOAD METHODS ========== //

  async uploadLocalImage(file: Express.Multer.File): Promise<string> {
    const fileName = `${uuidv4()}-${file.originalname}`;
    const filePath = `uploads/${fileName}`;

    const { data, error } = await this.supabase.storage
      .from(this.imageBucketName)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      throw new BadRequestException('Không thể tải lên ảnh: ' + error.message);
    }

    const { data: publicUrlData } = this.supabase.storage
      .from(this.imageBucketName)
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  }

  async deleteLocalImage(imageUrl: string): Promise<void> {
    if (!imageUrl) {
      return;
    }

    try {
      let filePath: string;

      if (imageUrl.startsWith('http')) {
        const bucketPath = `/storage/v1/object/public/${this.imageBucketName}/`;
        
        if (!imageUrl.includes(bucketPath)) {
          console.log('⚠️ URL không phải từ Supabase bucket, bỏ qua xóa:', imageUrl);
          return;
        }

        const parts = imageUrl.split(bucketPath);
        if (parts.length < 2 || !parts[1]) {
          console.log('⚠️ Không thể parse URL, bỏ qua xóa:', imageUrl);
          return;
        }
        
        filePath = parts[1];
      } else {
        filePath = imageUrl.replace(/^\/+/, '');
      }

      console.log('🗑️ Đang xóa ảnh:', filePath);

      const { error } = await this.supabase.storage
        .from(this.imageBucketName)
        .remove([filePath]);

      if (error) {
        console.error('❌ Lỗi xóa ảnh:', error.message);
      } else {
        console.log('✅ Xóa ảnh thành công:', filePath);
      }
    } catch (error) {
      console.error('❌ Lỗi khi xóa ảnh:', error);
    }
  }


/**
 * Upload file lên Supabase (tổng quát cho mọi loại file)
 */
async uploadFile(
  file: Express.Multer.File | Buffer | string,
  options: FileUploadOptions = {}
): Promise<UploadFileResult> {
  try {
    const {
      folderPath = 'documents',
      fileName,
      bucketName = this.imageBucketName,
      contentType,
      isBase64 = false
    } = options;

    console.log(`📤 [uploadFile] Bắt đầu upload file:`, {
      folderPath,
      fileName,
      bucketName,
      contentType,
      isBase64
    });

    // 1. XỬ LÝ FILE INPUT VỚI TYPE CHECKING
    let fileBuffer: Buffer;
    let finalFileName: string;
    let finalContentType: string;

    if (typeof file === 'string') {
      // Base64 string hoặc URL
      if (isBase64) {
        // Xử lý base64 string (remove data URL prefix nếu có)
        const base64Data = file.replace(/^data:([A-Za-z-+/]+);base64,/, '');
        fileBuffer = Buffer.from(base64Data, 'base64');
      } else {
        // URL - download trước
        const response = await fetch(file);
        if (!response.ok) {
          throw new Error(`Download failed: HTTP ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
      }
      finalFileName = fileName || `${uuidv4()}_downloaded_file`;
      finalContentType = contentType || 'application/octet-stream';
    } else if (Buffer.isBuffer(file)) {
      // Buffer
      fileBuffer = file;
      finalFileName = fileName || `${uuidv4()}_buffer_file`;
      finalContentType = contentType || 'application/octet-stream';
    } else {
      // Express.Multer.File - SỬA LỖI TYPE CHECKING Ở ĐÂY
      const multerFile = file as Express.Multer.File;
      fileBuffer = multerFile.buffer;
      finalFileName = fileName || `${uuidv4()}-${this.sanitizeFileName(multerFile.originalname)}`;
      finalContentType = contentType || multerFile.mimetype;
    }

    // 2. VALIDATE FILE
    console.log(`🔍 [uploadFile] Validating file...`);
    const fileSize = fileBuffer.length;
    const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);

    console.log(`📊 [uploadFile] File info:`, {
      size: `${fileSizeMB} MB (${fileSize} bytes)`,
      contentType: finalContentType,
      fileName: finalFileName
    });

    // Kiểm tra kích thước file
    if (fileSize < this.minFileSize) {
      throw new Error(`File quá nhỏ (${fileSize} bytes < ${this.minFileSize} bytes)`);
    }

    if (fileSize > this.maxFileSize) {
      throw new Error(`File quá lớn (${fileSizeMB} MB > ${this.maxFileSize / 1024 / 1024} MB)`);
    }

    // 3. TẠO FILE PATH
    const filePath = `${folderPath}/${finalFileName}`;
    
    // 4. KIỂM TRA FILE ĐÃ TỒN TẠI
    console.log(`🔍 [uploadFile] Checking if file exists...`);
    const existingUrl = await this.checkFileExists(bucketName, filePath);
    if (existingUrl) {
      console.log(`✅ [uploadFile] File đã tồn tại: ${existingUrl}`);
      return {
        success: true,
        url: existingUrl,
        filePath
      };
    }

    // 5. UPLOAD LÊN SUPABASE
    console.log(`📤 [uploadFile] Uploading to Supabase...`);
    
    const { data, error } = await this.supabase.storage
      .from(bucketName)
      .upload(filePath, fileBuffer, {
        contentType: finalContentType,
        upsert: false,
        cacheControl: '3600',
        duplex: 'half'
      });

    if (error) {
      // Xử lý trường hợp file đã tồn tại
      if (error.message?.includes('already exists')) {
        console.log(`ℹ️ [uploadFile] File đã tồn tại, lấy URL hiện có`);
        const { data: existingUrlData } = this.supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);
        
        return {
          success: true,
          url: existingUrlData.publicUrl,
          filePath
        };
      }
      throw new Error(`Supabase upload error: ${error.message}`);
    }

    console.log(`✅ [uploadFile] Upload thành công!`);

    // 6. LẤY PUBLIC URL
    console.log(`🔗 [uploadFile] Getting public URL...`);
    const { data: publicUrlData } = this.supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
      throw new Error('Could not get public URL from Supabase');
    }

    console.log(`✅ [uploadFile] Public URL: ${publicUrlData.publicUrl}`);

    // 7. VERIFY FILE SAU KHI UPLOAD
    console.log(`🔍 [uploadFile] Verifying uploaded file...`);
    const verifyResult = await this.verifySupabaseFile(publicUrlData.publicUrl);
    
    if (!verifyResult.accessible) {
      throw new Error(`File không thể truy cập sau khi upload: ${verifyResult.error}`);
    }

    console.log(`🎉 [uploadFile] File upload hoàn tất!`);

    return {
      success: true,
      url: publicUrlData.publicUrl,
      filePath
    };

  } catch (error) {
    console.error(`❌ [uploadFile] Lỗi:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Upload document file (chuyên cho documents - PDF, Word, Excel, etc.)
 */
async uploadDocument(
  file: Express.Multer.File,
  folderPath: string = 'documents',
  fileName?: string
): Promise<UploadFileResult> {
  console.log(`📄 [uploadDocument] Uploading document...`);

  // Validate document type
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif'
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return {
      success: false,
      error: `Loại file không được hỗ trợ: ${file.mimetype}. Chỉ chấp nhận: PDF, Word, Excel, text, images`
    };
  }

  const result = await this.uploadFile(file, {
    folderPath,
    fileName,
    bucketName: this.imageBucketName,
    contentType: file.mimetype
  });

  return result;
}

/**
 * Helper: Sanitize filename
 */
private sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9-_.]/g, '_');
}

/**
 * Helper: Kiểm tra file có tồn tại trên Supabase không
 */
private async checkFileExists(bucketName: string, filePath: string): Promise<string | null> {
  try {
    const { data } = this.supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    // Kiểm tra xem URL có thể truy cập được không
    const response = await fetch(data.publicUrl, { method: 'HEAD' });
    if (response.ok) {
      return data.publicUrl;
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Helper: Verify file có thể truy cập
 */
private async verifySupabaseFile(fileUrl: string): Promise<{ accessible: boolean; error?: string }> {
  try {
    const response = await fetch(fileUrl, { method: 'HEAD' });
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      
      console.log(`🔍 [verifySupabaseFile] File info:`, {
        contentType: contentType,
        contentLength: contentLength ? `${(parseInt(contentLength) / 1024 / 1024).toFixed(2)} MB` : 'unknown'
      });
      
      return { accessible: true };
    } else {
      return { 
        accessible: false, 
        error: `HTTP ${response.status}: ${response.statusText}` 
      };
    }
  } catch (error) {
    return { 
      accessible: false, 
      error: error.message 
    };
  }
}

/**
 * Xóa file từ Supabase (tổng quát cho mọi bucket)
 */
async deleteFile(
  fileUrl: string, 
  bucketName?: string
): Promise<{ success: boolean; error?: string }> {
  if (!fileUrl) {
    return { success: false, error: 'File URL is empty' };
  }

  try {
    console.log(`🗑️ [deleteFile] Bắt đầu xóa file:`, { fileUrl });

    // Xác định bucket name
    const targetBucketName = bucketName || this.detectBucketFromUrl(fileUrl);
    
    if (!targetBucketName) {
      return { 
        success: false, 
        error: 'Không thể xác định bucket từ URL' 
      };
    }

    // Extract file path từ URL
    const filePath = this.extractFilePathFromUrl(fileUrl, targetBucketName);
    
    if (!filePath) {
      return { 
        success: false, 
        error: 'Không thể extract file path từ URL' 
      };
    }

    console.log(`🔍 [deleteFile] File info:`, {
      bucket: targetBucketName,
      filePath: filePath
    });

    // Xóa file từ Supabase
    const { error } = await this.supabase.storage
      .from(targetBucketName)
      .remove([filePath]);

    if (error) {
      console.error(`❌ [deleteFile] Lỗi xóa file:`, error.message);
      
      // Nếu file không tồn tại, coi như thành công
      if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
        console.log(`ℹ️ [deleteFile] File không tồn tại, coi như đã xóa`);
        return { success: true };
      }
      
      return { 
        success: false, 
        error: `Supabase delete error: ${error.message}` 
      };
    }

    console.log(`✅ [deleteFile] Xóa file thành công: ${filePath}`);
    return { success: true };

  } catch (error) {
    console.error(`❌ [deleteFile] Lỗi nghiêm trọng:`, error.message);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Helper: Detect bucket từ URL
 */
private detectBucketFromUrl(fileUrl: string): string | null {
  if (!fileUrl) return null;

  // Kiểm tra các bucket patterns
  const bucketPatterns = [
    { bucket: this.videoBucketName, pattern: `/storage/v1/object/public/${this.videoBucketName}/` },
    { bucket: this.imageBucketName, pattern: `/storage/v1/object/public/${this.imageBucketName}/` }
  ];

  for (const { bucket, pattern } of bucketPatterns) {
    if (fileUrl.includes(pattern)) {
      return bucket;
    }
  }

  // Fallback: dùng image bucket làm mặc định
  console.log(`ℹ️ [detectBucketFromUrl] Không detect được bucket, dùng mặc định: ${this.imageBucketName}`);
  return this.imageBucketName;
}

/**
 * Helper: Extract file path từ URL
 */
private extractFilePathFromUrl(fileUrl: string, bucketName: string): string | null {
  if (!fileUrl || !bucketName) return null;

  const bucketPath = `/storage/v1/object/public/${bucketName}/`;
  
  if (!fileUrl.includes(bucketPath)) {
    console.log(`⚠️ [extractFilePathFromUrl] URL không chứa bucket path: ${bucketPath}`);
    return null;
  }

  const parts = fileUrl.split(bucketPath);
  if (parts.length < 2 || !parts[1]) {
    console.log(`⚠️ [extractFilePathFromUrl] Không thể parse URL: ${fileUrl}`);
    return null;
  }
  
  // Lấy path và decode (trong case có ký tự đặc biệt)
  const filePath = decodeURIComponent(parts[1].split('?')[0]); // Remove query params
  
  console.log(`🔍 [extractFilePathFromUrl] Extracted path: ${filePath}`);
  return filePath;
}

/**
 * Xóa nhiều files cùng lúc
 */
async deleteMultipleFiles(
  fileUrls: string[], 
  bucketName?: string
): Promise<{ success: boolean; deletedCount: number; errors: string[] }> {
  const results = {
    success: true,
    deletedCount: 0,
    errors: [] as string[]
  };

  if (!fileUrls || fileUrls.length === 0) {
    return results;
  }

  console.log(`🗑️ [deleteMultipleFiles] Bắt đầu xóa ${fileUrls.length} files`);

  for (const fileUrl of fileUrls) {
    const result = await this.deleteFile(fileUrl, bucketName);
    
    if (result.success) {
      results.deletedCount++;
    } else {
      results.success = false;
      results.errors.push(`${fileUrl}: ${result.error}`);
    }
  }

  console.log(`✅ [deleteMultipleFiles] Đã xóa ${results.deletedCount}/${fileUrls.length} files`);
  
  if (results.errors.length > 0) {
    console.error(`❌ [deleteMultipleFiles] Lỗi:`, results.errors);
  }

  return results;
}

/**
 * Kiểm tra file có tồn tại không
 */
async fileExists(fileUrl: string, bucketName?: string): Promise<boolean> {
  try {
    const targetBucketName = bucketName || this.detectBucketFromUrl(fileUrl);
    
    if (!targetBucketName) {
      return false;
    }

    const filePath = this.extractFilePathFromUrl(fileUrl, targetBucketName);
    
    if (!filePath) {
      return false;
    }

    const { data, error } = await this.supabase.storage
      .from(targetBucketName)
      .list('', {
        search: filePath,
      });

    if (error) {
      console.error('❌ [fileExists] Lỗi kiểm tra file:', error);
      return false;
    }

    const exists = data && data.length > 0;
    console.log(`🔍 [fileExists] File ${filePath}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
    
    return exists;
  } catch (error) {
    console.error('❌ [fileExists] Lỗi khi kiểm tra file:', error);
    return false;
  }
}


}