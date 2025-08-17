-- CreateEnum
CREATE TYPE "public"."DocType" AS ENUM ('CC', 'CE', 'PA');

-- CreateEnum
CREATE TYPE "public"."Rol" AS ENUM ('Inquilino', 'DeudorSolidario');

-- CreateEnum
CREATE TYPE "public"."DocumentType" AS ENUM ('CEDULA_FRENTE', 'CEDULA_REVERSO', 'CONTRATO', 'RECIBO', 'OTRO');

-- CreateEnum
CREATE TYPE "public"."EvalStatus" AS ENUM ('processing', 'done', 'failed');

-- CreateEnum
CREATE TYPE "public"."Origin" AS ENUM ('wsp', 'web', 'backoffice');

-- CreateTable
CREATE TABLE "public"."Applicant" (
    "id" TEXT NOT NULL,
    "requestNo" INTEGER NOT NULL,
    "requestCode" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "docType" "public"."DocType",
    "docNumber" TEXT,
    "lastEvaluationId" TEXT,
    "lastScore" INTEGER,
    "lastEvaluatedAt" TIMESTAMP(3),
    "rol" "public"."Rol" NOT NULL,

    CONSTRAINT "Applicant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "type" "public"."DocumentType" NOT NULL,
    "url" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Conversation" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "meta" JSONB,
    "remoteJid" TEXT NOT NULL,
    "channel" TEXT,
    "state" TEXT NOT NULL DEFAULT 'awaiting_opt_in',
    "lastMessageId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MessageSeen" (
    "messageId" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageSeen_pkey" PRIMARY KEY ("messageId")
);

-- CreateTable
CREATE TABLE "public"."PrecalifBuffer" (
    "remoteJid" TEXT NOT NULL,
    "slots" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrecalifBuffer_pkey" PRIMARY KEY ("remoteJid")
);

-- CreateTable
CREATE TABLE "public"."ApplicantIdentity" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicantIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Evaluation" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "origin" "public"."Origin" NOT NULL,
    "vendor" TEXT,
    "vendorRequestId" TEXT,
    "remoteJid" TEXT,
    "sessionId" TEXT,
    "score" INTEGER,
    "decision" TEXT,
    "status" "public"."EvalStatus" NOT NULL DEFAULT 'processing',
    "slots" JSONB NOT NULL,
    "error" TEXT,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EvaluationRaw" (
    "evaluationId" TEXT NOT NULL,
    "bureauResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationRaw_pkey" PRIMARY KEY ("evaluationId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Applicant_requestNo_key" ON "public"."Applicant"("requestNo");

-- CreateIndex
CREATE UNIQUE INDEX "Applicant_requestCode_key" ON "public"."Applicant"("requestCode");

-- CreateIndex
CREATE UNIQUE INDEX "Applicant_phoneE164_key" ON "public"."Applicant"("phoneE164");

-- CreateIndex
CREATE UNIQUE INDEX "Applicant_lastEvaluationId_key" ON "public"."Applicant"("lastEvaluationId");

-- CreateIndex
CREATE INDEX "Applicant_docNumber_idx" ON "public"."Applicant"("docNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Applicant_doc_unique" ON "public"."Applicant"("docType", "docNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_remoteJid_key" ON "public"."Conversation"("remoteJid");

-- CreateIndex
CREATE INDEX "Conversation_applicantId_idx" ON "public"."Conversation"("applicantId");

-- CreateIndex
CREATE INDEX "ApplicantIdentity_applicantId_idx" ON "public"."ApplicantIdentity"("applicantId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicantIdentity_type_value_key" ON "public"."ApplicantIdentity"("type", "value");

-- CreateIndex
CREATE UNIQUE INDEX "Evaluation_idempotencyKey_key" ON "public"."Evaluation"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Evaluation_applicantId_createdAt_idx" ON "public"."Evaluation"("applicantId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."Applicant" ADD CONSTRAINT "Applicant_lastEvaluationId_fkey" FOREIGN KEY ("lastEvaluationId") REFERENCES "public"."Evaluation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "public"."Applicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Conversation" ADD CONSTRAINT "Conversation_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "public"."Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApplicantIdentity" ADD CONSTRAINT "ApplicantIdentity_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "public"."Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Evaluation" ADD CONSTRAINT "Evaluation_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "public"."Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EvaluationRaw" ADD CONSTRAINT "EvaluationRaw_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "public"."Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
