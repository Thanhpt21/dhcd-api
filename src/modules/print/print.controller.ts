// src/print/print.controller.ts
import { Controller, Post, Body, Res, Get, Param, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { PrintService } from './print.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('print')
@UseGuards(JwtAuthGuard)
export class PrintController {
  constructor(private readonly printService: PrintService) {}

  @Post('voting-ballot')
  async generateVotingBallot(
    @Body() params: {
      meetingId: number;
      registrationId: number;
      shareholderCode: string;
      shareholderName: string;
      sharesRegistered: number;
    },
    @Res() res: Response
  ) {
    try {
      console.log('Generating voting ballot for:', params);
      const pdfBuffer = await this.printService.generateVotingBallot(params);
      
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="phieu-bieu-quyet-${params.shareholderCode}.pdf"`,
      });
      
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating voting ballot:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi tạo phiếu biểu quyết'
      });
    }
  }

  @Post('attendance-card')
  async generateAttendanceCard(
    @Body() params: {
      meetingId: number;
      registrationId: number;
      shareholderCode: string;
      shareholderName: string;
      registrationCode: string;
      registrationDate: string;
      registrationType: string;
    },
    @Res() res: Response
  ) {
    try {
      console.log('Generating attendance card for:', params);
      const pdfBuffer = await this.printService.generateAttendanceCard(params);
      
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="phieu-tham-du-${params.shareholderCode}.pdf"`,
      });
      
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating attendance card:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi tạo phiếu tham dự'
      });
    }
  }

  @Post('election-ballot')
  async generateElectionBallot(
    @Body() params: {
      meetingId: number;
      registrationId: number;
      shareholderCode: string;
      shareholderName: string;
      sharesRegistered: number;
    },
    @Res() res: Response
  ) {
    try {
      console.log('Generating election ballot for:', params);
      const pdfBuffer = await this.printService.generateElectionBallot(params);
      
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="phieu-bau-cu-${params.shareholderCode}.pdf"`,
      });
      
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating election ballot:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi tạo phiếu bầu cử'
      });
    }
  }

  @Post('batch-attendance-cards')
  async generateBatchAttendanceCards(
    @Body() body: { registrationIds: number[] },
    @Res() res: Response
  ) {
    try {
      console.log('Generating batch attendance cards for:', body.registrationIds);
      const pdfBuffer = await this.printService.generateBatchAttendanceCards(body.registrationIds);
      
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="phieu-tham-du-loat.pdf"`,
      });
      
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating batch attendance cards:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi tạo phiếu tham dự hàng loạt'
      });
    }
  }

}