// src/modules/checkout/checkout.module.ts
import { Module } from '@nestjs/common';
import { AutoCheckoutController } from './autoCheckout.controller';
import { AutoCheckoutService } from './autoCheckout.service';
import { AutoCheckoutJob } from './autoCheckout.job';

@Module({
  controllers: [AutoCheckoutController],
  providers: [AutoCheckoutService, AutoCheckoutJob],
  exports: [AutoCheckoutService],
})
export class CheckoutModule {}