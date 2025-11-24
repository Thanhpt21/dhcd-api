export class EmailTemplateResponseDto {
  id: number;
  name: string;
  subject: string;
  content: string;
  variables?: Record<string, any>;
  description?: string;
  category: string;
  isActive: boolean;
  language: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(template: any) {
    this.id = template.id;
    this.name = template.name;
    this.subject = template.subject;
    this.content = template.content;
    this.variables = template.variables ?? undefined;
    this.description = template.description ?? undefined;
    this.category = template.category;
    this.isActive = template.isActive;
    this.language = template.language;
    this.createdAt = template.createdAt;
    this.updatedAt = template.updatedAt;
  }
}