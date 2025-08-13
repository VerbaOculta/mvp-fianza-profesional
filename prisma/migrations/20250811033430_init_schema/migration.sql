-- AlterTable
ALTER TABLE "public"."Applicant" ALTER COLUMN "requestNo" SET DEFAULT nextval('public.request_no_seq'::regclass),
ALTER COLUMN "requestNo" DROP DEFAULT;
DROP SEQUENCE "request_no_seq";
