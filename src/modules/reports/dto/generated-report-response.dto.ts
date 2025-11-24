export class GeneratedReportResponseDto {
  id: number;
  meetingId: number;
  templateId: number;
  reportName: string;
  reportUrl: string;
  reportFormat: string;
  generatedBy: number;
  createdAt: Date;

  meeting?: {
    id: number;
    meetingCode: string;
    meetingName: string;
  };

  template?: {
    id: number;
    templateName: string;
    templateType: string;
  };

  generatedByUser?: {
    id: number;
    name: string;
    email: string;
  };

  constructor(report: any) {
    this.id = report.id;
    this.meetingId = report.meetingId;
    this.templateId = report.templateId;
    this.reportName = report.reportName;
    this.reportUrl = report.reportUrl;
    this.reportFormat = report.reportFormat;
    this.generatedBy = report.generatedBy;
    this.createdAt = report.createdAt;

    if (report.meeting) {
      this.meeting = {
        id: report.meeting.id,
        meetingCode: report.meeting.meetingCode,
        meetingName: report.meeting.meetingName
      };
    }

    if (report.template) {
      this.template = {
        id: report.template.id,
        templateName: report.template.templateName,
        templateType: report.template.templateType
      };
    }

    if (report.generatedByUser) {
      this.generatedByUser = {
        id: report.generatedByUser.id,
        name: report.generatedByUser.name,
        email: report.generatedByUser.email
      };
    }
  }
}