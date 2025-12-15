// src/modules/print/print.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument = require('pdfkit');
import * as QRCode from 'qrcode';

@Injectable()
export class PrintService {
  private readonly robotoPath: string;
  private readonly robotoItalicPath: string;

  constructor(private prisma: PrismaService) {
    // Đường dẫn gốc dự án – hoạt động cả dev và prod
    const projectRoot = process.cwd();
    const fontsPath = path.join(projectRoot, 'src/assets/fonts');

    this.robotoPath = path.join(fontsPath, 'Roboto-VariableFont_wdth,wght.ttf');
    this.robotoItalicPath = path.join(fontsPath, 'Roboto-Italic-VariableFont_wdth,wght.ttf');

    // Kiểm tra file tồn tại (tránh lỗi khi khởi động)
    if (!fs.existsSync(this.robotoPath)) {
      throw new Error(`Không tìm thấy file font: ${this.robotoPath}`);
    }
    if (!fs.existsSync(this.robotoItalicPath)) {
      throw new Error(`Không tìm thấy file font: ${this.robotoItalicPath}`);
    }
  }

  private getRegistrationTypeText(type: string): string {
    const map: Record<string, string> = {
      IN_PERSON: 'Tham dự trực tiếp',
      ONLINE: 'Tham dự trực tuyến',
      PROXY: 'Ủy quyền',
    };
    return map[type] || type;
  }

  private calculateResolutionHeight(resolution: any): number {
    let height = 60;
    height += resolution.options.length * 25;
    if (resolution.candidates.length > 0) {
      height += 30;
      height += resolution.candidates.length * 35;
    }
    return height;
  }

  // ==================== PHIẾU THAM DỰ (A5 ngang) ====================
async generateAttendanceCard(params: any): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A5',
        margin: 20,
        layout: 'landscape',
      });

      // Đăng ký font Roboto
      doc.registerFont('Roboto', this.robotoPath);
      doc.registerFont('Roboto-Italic', this.robotoItalicPath);

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const meeting = await this.prisma.meeting.findUnique({
        where: { id: params.meetingId },
        select: {
          meetingName: true,
          meetingCode: true,
          meetingDate: true,
          meetingLocation: true,
          meetingAddress: true,
        },
      });

      if (!meeting) throw new Error('Meeting not found');

      // === TIÊU ĐỀ CHÍNH VÀ THÔNG TIN CUỘC HỌP (căn giữa toàn trang) ===
      doc.font('Roboto').fontSize(16)
        .text('PHIẾU THAM DỰ ĐẠI HỘI CỔ ĐÔNG', 0, 30, {
          align: 'center',
        });

      doc.font('Roboto').fontSize(12)
        .text(meeting.meetingName, 0, 55, {
          align: 'center',
        });

      doc.font('Roboto').fontSize(10)
        .text(`Mã cuộc họp: ${meeting.meetingCode}`, 0, 75, { align: 'center' })
        .text(`Ngày: ${new Date(meeting.meetingDate).toLocaleDateString('vi-VN')}`, 0, 90, { align: 'center' })
        .text(`Địa điểm: ${meeting.meetingLocation || meeting.meetingAddress || ''}`, 0, 105, { align: 'center' });

      // === THÔNG TIN CỔ ĐÔNG ===
      const infoY = 135;
      doc.font('Roboto').fontSize(12).text('THÔNG TIN CỔ ĐÔNG', 20, infoY);

      const boxX = 20;
      const boxY = infoY + 15;
      const boxWidth = doc.page.width - 40;
      const boxHeight = 110;
      doc.rect(boxX, boxY, boxWidth, boxHeight).stroke();

      doc.font('Roboto').fontSize(10)
        .text(`Mã cổ đông: ${params.shareholderCode}`, boxX + 20, boxY + 15)
        .text(`Họ tên: ${params.shareholderName}`, boxX + 20, boxY + 30)
        .text(`Mã đăng ký: ${params.registrationCode}`, boxX + 20, boxY + 45)
        .text(`Ngày đăng ký: ${new Date(params.registrationDate).toLocaleDateString('vi-VN')}`, boxX + 20, boxY + 60)
        .text(`Hình thức: ${this.getRegistrationTypeText(params.registrationType)}`, boxX + 20, boxY + 75)

      // === HƯỚNG DẪN SỬ DỤNG ===
      const guideY = boxY + boxHeight + 20;
      doc.font('Roboto').fontSize(10).text('HƯỚNG DẪN SỬ DỤNG:', 20, guideY);

      doc.font('Roboto').fontSize(9)
        .text('1. Mang theo phiếu này và CMND/CCCD gốc khi tham dự', 30, guideY + 15)
        .text('2. Xuất trình phiếu tại bàn đăng ký để check-in', 30, guideY + 30)
        .text('3. Giữ phiếu cẩn thận để tham gia bỏ phiếu', 30, guideY + 45)
        .text('4. Không chuyển nhượng phiếu cho người khác', 30, guideY + 60)
        .text('5. Phiếu có hiệu lực từ khi đăng ký đến hết ngày họp', 30, guideY + 75);

    // CHỮ KÝ
      const footerY = doc.page.height - 60;
      doc.font('Roboto').fontSize(9)
        .text('_________________________', doc.page.width / 2, footerY, { align: 'center' })
        .text('Chữ ký cổ đông', doc.page.width / 2, footerY + 15, { align: 'center' });

      // === THỜI GIAN IN (góc trái dưới) ===
      doc.font('Roboto-Italic').fontSize(8)
        .text(`Phiếu được in vào: ${new Date().toLocaleString('vi-VN')}`, 20, doc.page.height - 25);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

  // ==================== PHIẾU BIỂU QUYẾT ====================
async generateVotingBallot(params: any): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 50
      });

      doc.registerFont('Roboto', this.robotoPath);
      doc.registerFont('Roboto-Italic', this.robotoItalicPath);

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const meeting = await this.prisma.meeting.findUnique({
        where: { id: params.meetingId },
        select: { meetingName: true, meetingCode: true, meetingDate: true },
      });

      // CHỈ LẤY RESOLUTIONS KHÔNG PHẢI BẦU CỬ (KHÔNG CÓ CANDIDATES)
      const resolutions = await this.prisma.resolution.findMany({
        where: { 
          meetingId: params.meetingId, 
          isActive: true,
          candidates: { none: {} } // CHỈ LẤY NHỮNG NGHỊ QUYẾT KHÔNG CÓ ỨNG VIÊN
        },
        include: {
          options: { orderBy: { displayOrder: 'asc' } },
          // KHÔNG include candidates nữa
        },
        orderBy: { displayOrder: 'asc' },
      });

      if (!meeting) throw new Error('Meeting not found');

      // === Định nghĩa các biến căn lề ===
      const leftMargin = 50;
      const rightMargin = 50;
      const contentWidth = doc.page.width - leftMargin - rightMargin;
      const lineHeight = 18;
      const paragraphSpacing = 12;

      // === HEADER - CĂN GIỮA ===
      doc.font('Roboto').fontSize(24).text('PHIẾU BIỂU QUYẾT', { 
        align: 'center' 
      });
      
      doc.moveDown(0.5);
      doc.fontSize(18).text(meeting.meetingName, { 
        align: 'center' 
      });
      
      doc.moveDown(0.5);
      doc.fontSize(14)
        .text(`Mã cuộc họp: ${meeting.meetingCode}`, { align: 'center' })
        .text(`Ngày: ${new Date(meeting.meetingDate).toLocaleDateString('vi-VN')}`, { align: 'center' });

      // === Khoảng cách ===
      doc.moveDown(1.5);

      // === THÔNG TIN CỔ ĐÔNG - CĂN ĐỀU ===
      doc.fontSize(14).text('THÔNG TIN NGƯỜI BIỂU QUYẾT:', { 
        underline: true 
      });
      
      doc.moveDown(0.5);
      
      // Tạo bảng thông tin căn đều
      const infoStartY = doc.y;
      const labelWidth = 150;
      
      doc.fontSize(12)
        .text('Mã cổ đông:', leftMargin, infoStartY)
        .font('Roboto-Italic')
        .text(`_${params.shareholderCode}_`, leftMargin + labelWidth, infoStartY)
        .font('Roboto')
        
        .text('Họ tên:', leftMargin, infoStartY + lineHeight)
        .font('Roboto-Italic')
        .text(`_${params.shareholderName}_`, leftMargin + labelWidth, infoStartY + lineHeight)
        .font('Roboto')
        
        .text('Số cổ phần:', leftMargin, infoStartY + (lineHeight * 2))
        .font('Roboto-Italic')
        .text(`_${params.sharesRegistered?.toLocaleString('vi-VN') || '0'} cổ phần_`, leftMargin + labelWidth, infoStartY + (lineHeight * 2));

      // === DANH SÁCH NGHỊ QUYẾT ===
      doc.y = infoStartY + (lineHeight * 3) + 20;
      
      doc.fontSize(14).text('DANH SÁCH NGHỊ QUYẾT CẦN BIỂU QUYẾT:', { 
        underline: true 
      });

      doc.moveDown(0.5);

      resolutions.forEach((resolution, index) => {
        // Kiểm tra nếu cần sang trang mới
        if (doc.y > doc.page.height - 150) {
          doc.addPage();
          doc.y = 50;
        }

        // Tiêu đề nghị quyết
        doc.font('Roboto').fontSize(12)
          .text(`${index + 1}. ${resolution.title}`, leftMargin, doc.y);
        
        doc.moveDown(0.3);

        // Nội dung nghị quyết (nếu có)
        if (resolution.content) {
          doc.fontSize(10).text(resolution.content, leftMargin + 15, doc.y, { 
            width: contentWidth - 15,
            align: 'justify'
          });
          doc.moveDown(0.5);
        }

        // Các lựa chọn (options) - CHỈ IN PHẦN NÀY
        const optionsStartY = doc.y;
        resolution.options.forEach((option, optIndex) => {
          const optionY = optionsStartY + (optIndex * lineHeight);
          
          // Vẽ checkbox
          doc.rect(leftMargin + 20, optionY + 2, 12, 12)
             .lineWidth(0.8)
             .stroke();
          
          // Text option
          doc.fontSize(11).text(option.optionText, leftMargin + 40, optionY);
        });
        
        // Di chuyển xuống sau các option
        doc.y = optionsStartY + (resolution.options.length * lineHeight) + 15;

        // KHÔNG IN PHẦN CANDIDATES NỮA
        // Vì đã filter chỉ lấy resolutions không có candidates

        // Khoảng cách giữa các nghị quyết
        doc.moveDown(1);
        
        // Đường kẻ phân cách giữa các nghị quyết
        if (index < resolutions.length - 1) {
          doc.moveTo(leftMargin, doc.y)
             .lineTo(doc.page.width - rightMargin, doc.y)
             .lineWidth(0.3)
             .strokeColor('#CCCCCC')
             .stroke();
          doc.strokeColor('#000000');
          doc.moveDown(1);
        }
      });

      // === HƯỚNG DẪN BỎ PHIẾU ===
      // Kiểm tra nếu cần sang trang mới
      if (doc.y > doc.page.height - 200) {
        doc.addPage();
        doc.y = 50;
      }

      doc.moveDown(1);
      doc.fontSize(14).text('HƯỚNG DẪN BỎ PHIẾU:', { 
        underline: true 
      });
      
      doc.moveDown(0.5);
      
      const instructions = [
        '1. Đánh dấu ✓ vào ô lựa chọn tương ứng với mỗi nghị quyết',
        '2. Mỗi cổ đông có số phiếu tương ứng với số cổ phần sở hữu',
        '3. Chỉ được bỏ phiếu một lần cho mỗi nghị quyết',
        '4. Không được sửa chữa, tẩy xóa sau khi đã bỏ phiếu'
      ];

      instructions.forEach((instruction) => {
        doc.fontSize(11).text(instruction, leftMargin + 10);
        doc.moveDown(0.3);
      });

      // === CHỮ KÝ (2 cột) ===
      // Kiểm tra và tạo trang mới nếu không đủ chỗ
      if (doc.y > doc.page.height - 100) {
        doc.addPage();
        doc.y = 200;
      } else {
        doc.y = Math.max(doc.y + 30, doc.page.height - 120);
      }

      const signatureY = doc.y;
      const pageCenter = doc.page.width / 2;
      const signatureSpacing = 100;
      
      // Chữ ký cổ đông (trái) - VẼ GẠCH TRƯỚC, CHỮ SAU
      const leftLineX = pageCenter - signatureSpacing - 50;
      doc.moveTo(leftLineX, signatureY)
         .lineTo(leftLineX + 80, signatureY)
         .lineWidth(0.5)
         .stroke();
      
      doc.fontSize(11).text('Chữ ký cổ đông', leftLineX, signatureY + 5, {
        width: 80,
        align: 'center'
      });
      
      // Ngày bỏ phiếu (phải)
      const rightLineX = pageCenter + signatureSpacing - 50;
      doc.moveTo(rightLineX, signatureY)
         .lineTo(rightLineX + 80, signatureY)
         .lineWidth(0.5)
         .stroke();
      
      doc.fontSize(11).text('Ngày: ... / ... / ....', rightLineX, signatureY + 5, {
        width: 80,
        align: 'center'
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

  // ==================== PHIẾU BẦU CỬ NHÂN SỰ ====================
async generateElectionBallot(params: any): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 40
      });

      doc.registerFont('Roboto', this.robotoPath);
      doc.registerFont('Roboto-Italic', this.robotoItalicPath);

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const meeting = await this.prisma.meeting.findUnique({
        where: { id: params.meetingId },
        select: { meetingName: true, meetingCode: true, meetingDate: true },
      });

      // CHỈ LẤY NHỮNG RESOLUTION CÓ CANDIDATES (CÓ ỨNG VIÊN)
      const electionResolutions = await this.prisma.resolution.findMany({
        where: { 
          meetingId: params.meetingId, 
          isActive: true,
          candidates: { some: {} } // CHỈ LẤY NHỮNG NGHỊ QUYẾT CÓ ÍT NHẤT 1 ỨNG VIÊN
        },
        include: { candidates: { orderBy: { displayOrder: 'asc' } } },
        orderBy: { displayOrder: 'asc' },
      });

      if (!meeting) throw new Error('Meeting not found');

      // Kiểm tra nếu không có resolution bầu cử nào
      if (electionResolutions.length === 0) {
        throw new Error('Không có vị trí bầu cử nào cho cuộc họp này');
      }

      // === HEADER ===
      doc.font('Roboto').fontSize(22).text('PHIẾU BẦU CỬ NHÂN SỰ', { 
        align: 'center' 
      });
      
      doc.moveDown(0.3);
      doc.fontSize(16).text(meeting.meetingName, { 
        align: 'center' 
      });
      
      doc.moveDown(0.3);
      doc.fontSize(12)
        .text(`Mã cuộc họp: ${meeting.meetingCode}`, { align: 'center' })
        .text(`Ngày: ${new Date(meeting.meetingDate).toLocaleDateString('vi-VN')}`, { align: 'center' });

      doc.moveDown(1);

      // === THÔNG TIN CỔ ĐÔNG ===
      doc.fontSize(12).text('THÔNG TIN CỔ ĐÔNG:', { 
        underline: true 
      });
      
      doc.moveDown(0.3);
      
      const infoStartY = doc.y;
      const labelWidth = 120;
      
      doc.fontSize(11)
        .text('Mã cổ đông:', 40, infoStartY)
        .font('Roboto-Italic')
        .text(`_${params.shareholderCode}_`, 40 + labelWidth, infoStartY)
        .font('Roboto')
        
        .text('Họ tên:', 40, infoStartY + 18)
        .font('Roboto-Italic')
        .text(`_${params.shareholderName}_`, 40 + labelWidth, infoStartY + 18)
        .font('Roboto')
        
        .text('Số cổ phần được bầu:', 40, infoStartY + 36)
        .font('Roboto-Italic')
        .text(`_${params.sharesRegistered?.toLocaleString('vi-VN') || '0'}_`, 40 + labelWidth, infoStartY + 36);

      // === HƯỚNG DẪN ===
      doc.y = infoStartY + 60;
      
      doc.fontSize(12).text('HƯỚNG DẪN:', { 
        underline: true 
      });
      
      doc.moveDown(0.3);
      
      const guideText = [
        '1. Mỗi cổ đông có số phiếu bầu bằng số cổ phần đăng ký',
        '2. Đánh dấu ✓ vào ô ứng viên bạn lựa chọn',
        '3. Có thể bầu nhiều ứng viên cho một vị trí (nếu được phép)',
        '4. Chỉ được bầu một lần cho mỗi vị trí',
        '5. Không được sửa chữa, tẩy xóa sau khi bỏ phiếu',
      ];
      
      guideText.forEach((text) => {
        doc.fontSize(10).text(text, 45);
        doc.moveDown(0.2);
      });

      // === DANH SÁCH VỊ TRÍ BẦU CỬ ===
      doc.moveDown(0.5);
      doc.fontSize(13).text('DANH SÁCH VỊ TRÍ BẦU CỬ:', { 
        underline: true 
      });
      
      doc.moveDown(0.5);

      electionResolutions.forEach((resolution, resIndex) => {
        // Kiểm tra không gian cho resolution mới
        if (doc.y > 650) {
          doc.addPage();
          doc.y = 40;
        }

        doc.fontSize(12).text(`${resIndex + 1}. ${resolution.title}`, { 
          underline: true 
        });
        
        if (resolution.content) {
          doc.moveDown(0.2);
          doc.fontSize(10).text(resolution.content, { 
            width: 500,
            align: 'justify' 
          });
        }

        doc.moveDown(0.3);
        doc.fontSize(10).font('Roboto-Italic')
          .text(`Số lượng được bầu: Tối đa ${resolution.maxChoices || 'không giới hạn'} ứng viên`);
        doc.font('Roboto');

        // === LAYOUT ỨNG VIÊN ===
        const candidates = resolution.candidates;
        
        // Nếu không có ứng viên thì bỏ qua (nhưng đã filter ở trên)
      if (candidates.length === 0) {
        doc.moveDown(0.5);
        doc.font('Roboto-Italic').fontSize(10)  // Đặt font italic trước
            .text('(Không có ứng viên)');
        doc.font('Roboto');  // Reset về font thường
        doc.moveDown(0.5);
        return;
        }

        const candidatesPerRow = 2;
        const boxWidth = 250;
        const boxHeight = 85;
        const boxSpacingX = 30;
        const boxSpacingY = 15;

        // Tính toán vị trí bắt đầu
        const startY = doc.y + 10;

        candidates.forEach((candidate, candIndex) => {
          const row = Math.floor(candIndex / candidatesPerRow);
          const col = candIndex % candidatesPerRow;
          const boxX = 40 + col * (boxWidth + boxSpacingX);
          const boxY = startY + row * (boxHeight + boxSpacingY);

          // Kiểm tra nếu cần sang trang mới
          if (boxY + boxHeight > 750) {
            doc.addPage();
            // Vẽ ứng viên này ở đầu trang mới
            const newRow = 0;
            const newCol = col;
            const newBoxX = 40 + newCol * (boxWidth + boxSpacingX);
            const newBoxY = 40 + newRow * (boxHeight + boxSpacingY);
            
            this.drawCandidateBox(doc, candidate, newBoxX, newBoxY, boxWidth, boxHeight);
          } else {
            this.drawCandidateBox(doc, candidate, boxX, boxY, boxWidth, boxHeight);
          }
        });

        // Cập nhật vị trí Y sau khi vẽ tất cả ứng viên
        const totalRows = Math.ceil(candidates.length / candidatesPerRow);
        doc.y = startY + totalRows * (boxHeight + boxSpacingY) + 10;

        // Khoảng cách giữa các nghị quyết
        doc.moveDown(0.5);
      });

      // === CHỮ KÝ - SỬA LỖI GẠCH ĐÈ ===
      // Kiểm tra và tạo trang mới nếu không đủ chỗ cho chữ ký
      if (doc.y > 650) {
        doc.addPage();
        doc.y = 200;
      } else {
        doc.y = Math.max(doc.y + 20, 650);
      }

      // Vẽ chữ ký - VẼ GẠCH TRƯỚC, CHỮ SAU
      const signatureY = doc.y;
      const pageCenter = doc.page.width / 2;
      const signatureWidth = 120;
      
      // CHỮ KÝ CỔ ĐÔNG (trái)
      const leftLineY = signatureY;
      const leftLineX = pageCenter - 140;
      doc.moveTo(leftLineX, leftLineY)
         .lineTo(leftLineX + 80, leftLineY)
         .lineWidth(0.5)
         .stroke();
      
      doc.fontSize(11).text('Chữ ký cổ đông', leftLineX, leftLineY + 5, {
        width: 80,
        align: 'center'
      });
      
      // NGÀY BỎ PHIẾU (phải)
      const rightLineY = signatureY;
      const rightLineX = pageCenter + 60;
      doc.moveTo(rightLineX, rightLineY)
         .lineTo(rightLineX + 80, rightLineY)
         .lineWidth(0.5)
         .stroke();
      
      doc.fontSize(11).text('Ngày: ... / ... / ....', rightLineX, rightLineY + 5, {
        width: 80,
        align: 'center'
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Hàm phụ trợ để vẽ hộp ứng viên
private drawCandidateBox(doc: PDFKit.PDFDocument, candidate: any, x: number, y: number, width: number, height: number): void {
  // Vẽ khung chính
  doc.rect(x, y, width, height)
     .lineWidth(0.5)
     .stroke();
  
  // Checkbox để bầu chọn
  doc.rect(x + 8, y + 8, 10, 10)
     .lineWidth(0.5)
     .stroke();
  
  // Mã ứng viên
  doc.font('Roboto').fontSize(9)
     .text(`Mã: ${candidate.candidateCode}`, x + 25, y + 8);
  
  // Tên ứng viên
  doc.fontSize(10).text(candidate.candidateName, x + 8, y + 25, { 
    width: width - 16 
  });
  
  // Thông tin ứng viên (nếu có)
  if (candidate.candidateInfo) {
    doc.fontSize(8).text(candidate.candidateInfo, x + 8, y + 40, { 
      width: width - 16 
    });
  }
  
  // Dòng chữ ký - VẼ GẠCH TRƯỚC, CHỮ SAU
  const signatureLineY = y + height - 15;
  doc.moveTo(x + 8, signatureLineY)
     .lineTo(x + 48, signatureLineY)
     .lineWidth(0.5)
     .stroke();
  
  // Chữ "Chữ ký" phía dưới gạch
  doc.fontSize(7).text('Chữ ký', x + 8, signatureLineY + 2);
}



  // ==================== BATCH PHIẾU THAM DỰ ====================
  async generateBatchAttendanceCards(registrationIds: number[]): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 20 });

        doc.registerFont('Roboto', this.robotoPath);
        doc.registerFont('Roboto-Italic', this.robotoItalicPath);

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        const registrations = await this.prisma.registration.findMany({
          where: { id: { in: registrationIds } },
          include: {
            shareholder: { select: { shareholderCode: true, fullName: true } },
            meeting: { select: { meetingName: true, meetingCode: true, meetingDate: true } },
          },
          orderBy: { shareholder: { fullName: 'asc' } },
        });

        if (registrations.length === 0) throw new Error('No registrations found');

        const meeting = registrations[0].meeting;

        const header = () => {
          doc.font('Roboto').fontSize(14).text('DANH SÁCH PHIẾU THAM DỰ', { align: 'center' });
          doc.moveDown(0.3);
          doc.fontSize(11).text(meeting.meetingName, { align: 'center' });
          doc.fontSize(9).text(`Mã cuộc họp: ${meeting.meetingCode} | Ngày: ${new Date(meeting.meetingDate).toLocaleDateString('vi-VN')}`, { align: 'center' });
          doc.moveDown(0.5);
          doc.strokeColor('#CCCCCC').lineWidth(1).moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
          doc.moveDown(0.5);
        };

        header();

        const qrPromises = registrations.map(reg => QRCode.toDataURL(JSON.stringify({
          meetingId: reg.meetingId,
          registrationId: reg.id,
          shareholderCode: reg.shareholder.shareholderCode,
        }), { width: 50, margin: 1 }));

        const qrDataURLs = await Promise.all(qrPromises);

        const cardsPerPage = 4;
        const cardWidth = (doc.page.width - 60) / 2;
        const cardHeight = (doc.page.height - 120) / 2;

        registrations.forEach((reg, index) => {
          const cardIndex = index % cardsPerPage;
          if (cardIndex === 0 && index > 0) {
            doc.addPage();
            header();
          }

          const row = Math.floor(cardIndex / 2);
          const col = cardIndex % 2;
          const x = 30 + col * (cardWidth + 10);
          const y = doc.y + row * (cardHeight + 10);

          doc.rect(x, y, cardWidth, cardHeight).stroke();

          doc.font('Roboto').fontSize(10).text('PHIẾU THAM DỰ', x + 10, y + 10);
          doc.fontSize(8)
            .text(`Mã: ${reg.shareholder.shareholderCode}`, x + 10, y + 25)
            .text(`Họ tên: ${reg.shareholder.fullName}`, x + 10, y + 40)
            .text(`Mã đk: ${reg.registrationCode || reg.id}`, x + 10, y + 55)
            .text(`Hình thức: ${this.getRegistrationTypeText(reg.registrationType)}`, x + 10, y + 70)
            .text(`Số CP: ${reg.sharesRegistered?.toLocaleString() || '0'}`, x + 10, y + 85);

          const qrBuffer = Buffer.from(qrDataURLs[index].replace(/^data:image\/png;base64,/, ''), 'base64');
          doc.image(qrBuffer, x + cardWidth - 60, y + 20, { width: 50, height: 50 });

          doc.fontSize(7).text('________________ Chữ ký', x + 20, y + cardHeight - 25);
        });

        doc.addPage();
        doc.font('Roboto').fontSize(12).text('TỔNG KẾT DANH SÁCH PHIẾU THAM DỰ', { align: 'center' });
        doc.moveDown(1);

        const summary = [
          ['Tổng số phiếu', registrations.length.toString()],
          ['Ngày in', new Date().toLocaleDateString('vi-VN')],
          ['Giờ in', new Date().toLocaleTimeString('vi-VN')],
          ['Người in', 'Hệ thống'],
          ['Mã cuộc họp', meeting.meetingCode],
          ['Tên cuộc họp', meeting.meetingName],
        ];

        const tableTop = doc.y;
        summary.forEach(([label, value], i) => {
          const y = tableTop + i * 25;
          doc.fontSize(10).text(label, 50, y);
          doc.text(value, 250, y);
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}