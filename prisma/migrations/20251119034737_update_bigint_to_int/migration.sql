/*
  Warnings:

  - You are about to alter the column `totalShares` on the `meetings` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `sharesRegistered` on the `registrations` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `voteCount` on the `resolution_candidates` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `totalVotes` on the `resolutions` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `yesVotes` on the `resolutions` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `noVotes` on the `resolutions` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `abstainVotes` on the `resolutions` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `sharesBefore` on the `shareholder_share_histories` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `sharesAfter` on the `shareholder_share_histories` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `changeAmount` on the `shareholder_share_histories` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `totalShares` on the `shareholders` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `sharesUsed` on the `votes` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `sharesUsed` on the `voting_results` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.

*/
-- AlterTable
ALTER TABLE "meetings" ALTER COLUMN "totalShares" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "registrations" ALTER COLUMN "sharesRegistered" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "resolution_candidates" ALTER COLUMN "voteCount" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "resolutions" ALTER COLUMN "totalVotes" SET DATA TYPE INTEGER,
ALTER COLUMN "yesVotes" SET DATA TYPE INTEGER,
ALTER COLUMN "noVotes" SET DATA TYPE INTEGER,
ALTER COLUMN "abstainVotes" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "shareholder_share_histories" ALTER COLUMN "sharesBefore" SET DATA TYPE INTEGER,
ALTER COLUMN "sharesAfter" SET DATA TYPE INTEGER,
ALTER COLUMN "changeAmount" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "shareholders" ALTER COLUMN "totalShares" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "votes" ALTER COLUMN "sharesUsed" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "voting_results" ALTER COLUMN "sharesUsed" SET DATA TYPE INTEGER;
