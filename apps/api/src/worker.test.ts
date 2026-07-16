import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlatformServices } from "@owbastion/domain";
import worker from "./worker";

const createPlatformServices = vi.hoisted(() => vi.fn());

vi.mock("@owbastion/database", () => ({ createPlatformServices }));

const queueMessage = (attempts: number) => ({
  body: { version: 1, submissionId: "submission-1", objectKey: "uploads/submission-1/evidence.upload" },
  attempts,
  ack: vi.fn(),
  retry: vi.fn(),
});

describe("OCR Queue consumer", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    [1, 5],
    [2, 10],
  ])("retries Queue delivery attempt %s", async (attempt, delaySeconds) => {
    const processOcrJob = vi.fn<PlatformServices["processOcrJob"]>().mockRejectedValue(new Error("OCR_RETRYABLE"));
    createPlatformServices.mockReturnValue({ processOcrJob, markOcrJobFailed: vi.fn() });
    const message = queueMessage(attempt);

    await worker.queue({ messages: [message] } as never, { OCRKIT_EVIDENCE_BUCKET: "owbastion-codes-evidence" } as never);

    expect(createPlatformServices).toHaveBeenCalledWith(undefined, undefined, undefined, undefined, undefined, "owbastion-codes-evidence", undefined);
    expect(processOcrJob).toHaveBeenCalledWith({
      version: 1,
      submissionId: "submission-1",
      objectKey: "uploads/submission-1/evidence.upload",
      attempt,
    });
    expect(message.retry).toHaveBeenCalledWith({ delaySeconds });
    expect(message.ack).not.toHaveBeenCalled();
  });

  it("records the final failure before acknowledging the third delivery", async () => {
    const processOcrJob = vi.fn<PlatformServices["processOcrJob"]>().mockRejectedValue(new Error("OCR_NETWORK"));
    const markOcrJobFailed = vi.fn<PlatformServices["markOcrJobFailed"]>().mockResolvedValue();
    createPlatformServices.mockReturnValue({ processOcrJob, markOcrJobFailed });
    const message = queueMessage(3);

    await worker.queue({ messages: [message] } as never, { OCRKIT_EVIDENCE_BUCKET: "owbastion-codes-evidence" } as never);

    expect(markOcrJobFailed).toHaveBeenCalledWith({ submissionId: "submission-1", attempt: 3, errorCode: "OCR_NETWORK" });
    expect(message.ack).toHaveBeenCalledOnce();
    expect(message.retry).not.toHaveBeenCalled();
  });

  it("does not acknowledge the final delivery when recording its failure fails", async () => {
    const processOcrJob = vi.fn<PlatformServices["processOcrJob"]>().mockRejectedValue(new Error("OCR_NETWORK"));
    const markOcrJobFailed = vi.fn<PlatformServices["markOcrJobFailed"]>().mockRejectedValue(new Error("D1 unavailable"));
    createPlatformServices.mockReturnValue({ processOcrJob, markOcrJobFailed });
    const message = queueMessage(3);

    await worker.queue({ messages: [message] } as never, { OCRKIT_EVIDENCE_BUCKET: "owbastion-codes-evidence" } as never);

    expect(message.ack).not.toHaveBeenCalled();
    expect(message.retry).toHaveBeenCalledWith({ delaySeconds: 60 });
  });
});
