-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('LIKE');

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Discussion" ADD COLUMN     "contentLabel" "ContentLabel" NOT NULL DEFAULT 'USER_THEORY',
ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CommentReaction" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL DEFAULT 'LIKE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowedDiscussion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "discussionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowedDiscussion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommentReaction_userId_idx" ON "CommentReaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CommentReaction_commentId_userId_type_key" ON "CommentReaction"("commentId", "userId", "type");

-- CreateIndex
CREATE INDEX "FollowedDiscussion_discussionId_idx" ON "FollowedDiscussion"("discussionId");

-- CreateIndex
CREATE UNIQUE INDEX "FollowedDiscussion_userId_discussionId_key" ON "FollowedDiscussion"("userId", "discussionId");

-- CreateIndex
CREATE INDEX "Comment_parentId_idx" ON "Comment"("parentId");

-- CreateIndex
CREATE INDEX "Discussion_status_deletedAt_idx" ON "Discussion"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- AddForeignKey
ALTER TABLE "CommentReaction" ADD CONSTRAINT "CommentReaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentReaction" ADD CONSTRAINT "CommentReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowedDiscussion" ADD CONSTRAINT "FollowedDiscussion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowedDiscussion" ADD CONSTRAINT "FollowedDiscussion_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "Discussion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
