// src/resolution-options/dto/option-response.dto.ts
export class OptionResponseDto {
  id: number;
  resolutionId: number;
  optionCode: string;
  optionText: string;
  optionValue: string;
  description?: string;
  displayOrder: number;
  voteCount: number;
  createdAt: Date;

  constructor(option: any) {
    this.id = option.id;
    this.resolutionId = option.resolutionId;
    this.optionCode = option.optionCode;
    this.optionText = option.optionText;
    this.optionValue = option.optionValue;
    this.description = option.description ?? undefined;
    this.displayOrder = option.displayOrder;
    this.voteCount = option.voteCount;
    this.createdAt = option.createdAt;
  }
}