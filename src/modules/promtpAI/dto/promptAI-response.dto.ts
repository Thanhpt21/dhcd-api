import { PromptAI } from '@prisma/client';

export class PromptAIResponseDto {
  id: number;
  name: string;
  text: string;
  status: string;
  position: number;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(promptAI: PromptAI) {
    this.id = promptAI.id;
    this.name = promptAI.name;
    this.text = promptAI.text;
    this.status = promptAI.status;
    this.position = promptAI.position;
    this.startDate = promptAI.startDate;
    this.endDate = promptAI.endDate;
    this.createdAt = promptAI.createdAt;
    this.updatedAt = promptAI.updatedAt;
  }
}
