-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "calendarEventId" TEXT,
ADD COLUMN     "meetingDurationSeconds" INTEGER,
ADD COLUMN     "meetingEndAt" TIMESTAMP(3),
ADD COLUMN     "meetingId" TEXT,
ADD COLUMN     "meetingMeta" JSONB,
ADD COLUMN     "meetingProvider" TEXT,
ADD COLUMN     "meetingStartAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "googleEmail" TEXT,
ADD COLUMN     "googleOAuthAccessToken" TEXT,
ADD COLUMN     "googleOAuthExpiry" TIMESTAMP(3),
ADD COLUMN     "googleOAuthRefreshToken" TEXT;
