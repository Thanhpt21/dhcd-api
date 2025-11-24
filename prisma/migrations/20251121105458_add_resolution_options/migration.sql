-- CreateTable
CREATE TABLE "resolution_options" (
    "id" SERIAL NOT NULL,
    "resolutionId" INTEGER NOT NULL,
    "optionCode" TEXT NOT NULL,
    "optionText" TEXT NOT NULL,
    "optionValue" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resolution_options_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "resolution_options" ADD CONSTRAINT "resolution_options_resolutionId_fkey" FOREIGN KEY ("resolutionId") REFERENCES "resolutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
