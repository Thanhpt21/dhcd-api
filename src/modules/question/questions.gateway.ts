// src/questions/questions.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
@WebSocketGateway(4001, { // Specify port 4001
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
  namespace: '/questions',
})
export class QuestionsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(QuestionsGateway.name);

  @WebSocketServer()
  server: Server;

  private connectedClients: Map<string, { meetingId: number }> = new Map();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const clientData = this.connectedClients.get(client.id);
    if (clientData) {
      client.leave(`meeting-${clientData.meetingId}`);
      this.connectedClients.delete(client.id);
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-meeting-questions')
  handleJoinMeetingQuestions(client: Socket, meetingId: number) {
    try {
      // Rời tất cả rooms trước đó
      const rooms = Array.from(client.rooms);
      rooms.forEach(room => {
        if (room !== client.id) {
          client.leave(room);
        }
      });

      // Join room mới
      client.join(`meeting-${meetingId}`);
      this.connectedClients.set(client.id, { meetingId });
      
      this.logger.log(`Client ${client.id} joined meeting-${meetingId}`);
      client.emit('joined-meeting', { meetingId, success: true });
    } catch (error) {
      this.logger.error(`Error joining meeting: ${error.message}`);
      client.emit('join-error', { error: 'Failed to join meeting' });
    }
  }

  @SubscribeMessage('leave-meeting-questions')
  handleLeaveMeetingQuestions(client: Socket, meetingId: number) {
    client.leave(`meeting-${meetingId}`);
    this.connectedClients.delete(client.id);
    this.logger.log(`Client ${client.id} left meeting-${meetingId}`);
  }

  // Phát sự kiện khi câu hỏi được cập nhật
  notifyQuestionUpdated(meetingId: number, question: any) {
    this.server.to(`meeting-${meetingId}`).emit('question-updated', {
      type: 'QUESTION_UPDATED',
      question,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Question updated emitted to meeting-${meetingId}`);
  }

  // Phát sự kiện khi có câu hỏi mới
  notifyNewQuestion(meetingId: number, question: any) {
    this.server.to(`meeting-${meetingId}`).emit('new-question', {
      type: 'NEW_QUESTION',
      question,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`New question emitted to meeting-${meetingId}`);
  }

  // Phát sự kiện khi câu hỏi được upvote
  notifyQuestionUpvoted(meetingId: number, questionId: number, upvoteCount: number) {
    this.server.to(`meeting-${meetingId}`).emit('question-upvoted', {
      type: 'QUESTION_UPVOTED',
      questionId,
      upvoteCount,
      timestamp: new Date().toISOString(),
    });
  }

  // Phát sự kiện khi câu hỏi bị xóa
  notifyQuestionDeleted(meetingId: number, questionId: number) {
    this.server.to(`meeting-${meetingId}`).emit('question-deleted', {
      type: 'QUESTION_DELETED',
      questionId,
      timestamp: new Date().toISOString(),
    });
  }
}