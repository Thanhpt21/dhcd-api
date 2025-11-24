-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "shareholderId" INTEGER;

-- CreateIndex
CREATE INDEX "notifications_shareholderId_idx" ON "notifications"("shareholderId");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_shareholderId_fkey" FOREIGN KEY ("shareholderId") REFERENCES "shareholders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
