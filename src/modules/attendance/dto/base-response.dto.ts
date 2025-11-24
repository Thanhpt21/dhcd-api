// src/modules/attendance/dto/base-response.dto.ts
export class BaseResponseDto<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;

  constructor(success: boolean, message: string, data?: T, error?: string) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.error = error;
  }

  static success<T>(message: string, data?: T): BaseResponseDto<T> {
    return new BaseResponseDto(true, message, data);
  }

  // FIX: Sử dụng type parameter với default value và ép kiểu an toàn
  static error<T = never>(message: string, error?: string): BaseResponseDto<T> {
    return new BaseResponseDto(false, message, undefined as unknown as T, error);
  }

  // Method tiện ích cho trường hợp không có data
  static simpleError(message: string, error?: string): BaseResponseDto {
    return new BaseResponseDto(false, message, undefined, error);
  }
}