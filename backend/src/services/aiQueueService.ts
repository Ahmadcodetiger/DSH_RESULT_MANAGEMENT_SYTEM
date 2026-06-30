import crypto from 'crypto';
import AIJob, { IAIJob } from '../models/AIJob';
import AICache from '../models/AICache';
import { Types } from 'mongoose';

// Concurrency tracker
let activeJobsCount = 0;
const MAX_CONCURRENT_JOBS = 5;
const jobQueue: Array<{ job: IAIJob; worker: () => Promise<any> }> = [];

/**
 * Computes SHA-256 hash of a prompt string to serve as a cache key.
 */
export function getPromptHash(prompt: string): string {
  return crypto.createHash('sha256').update(prompt.trim()).digest('hex');
}

/**
 * Checks AICache for an existing unexpired response.
 */
export async function getCachedResponse(tenantId: string, prompt: string): Promise<string | null> {
  try {
    const hash = getPromptHash(prompt);
    const cached = await AICache.findOne({
      tenantId: new Types.ObjectId(tenantId),
      promptHash: hash,
      expiresAt: { $gt: new Date() }
    });
    return cached ? cached.responseText : null;
  } catch (err) {
    console.error('AICache lookup error:', err);
    return null;
  }
}

/**
 * Saves a prompt response to AICache, setting an expiration (TTL) of 7 days by default.
 */
export async function setCachedResponse(tenantId: string, prompt: string, responseText: string, ttlHours = 24 * 7): Promise<void> {
  try {
    const hash = getPromptHash(prompt);
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    
    await AICache.findOneAndUpdate(
      { tenantId: new Types.ObjectId(tenantId), promptHash: hash },
      {
        promptText: prompt,
        responseText,
        expiresAt
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error('Failed to write to AICache:', err);
  }
}

/**
 * Processes the next job in the queue if concurrency limits allow.
 */
async function processNextJob() {
  if (activeJobsCount >= MAX_CONCURRENT_JOBS || jobQueue.length === 0) {
    return;
  }

  const { job, worker } = jobQueue.shift()!;
  activeJobsCount++;

  try {
    // Update job status to processing
    job.status = 'processing';
    await job.save();

    // Execute the actual LLM workload
    const result = await worker();

    // Complete job
    job.status = 'completed';
    job.result = result;
    await job.save();
  } catch (err: any) {
    console.error(`AI job ${job._id} failed:`, err.message);
    job.status = 'failed';
    job.error = err.message || 'Unknown processing error';
    await job.save();
  } finally {
    activeJobsCount--;
    // Trigger next job in queue
    processNextJob();
  }
}

/**
 * Enqueues a background AI task and immediately returns the job object.
 * 
 * @param tenantId The current school tenant ID
 * @param userId User requesting the generation
 * @param taskType Categorization of the AI task
 * @param payload Arbitrary request options
 * @param prompt The LLM prompt (used for cache lookup/save)
 * @param llmCall A function that calls the LLM (OpenRouter/Gemini) and returns the string response
 */
export async function enqueueAIJob(
  tenantId: string,
  userId: string | null,
  taskType: IAIJob['taskType'],
  payload: any,
  prompt: string,
  llmCall: () => Promise<string>
): Promise<IAIJob> {
  
  // 1. Check if we already have a cached response for this exact prompt
  const cachedText = await getCachedResponse(tenantId, prompt);
  if (cachedText) {
    // Instantly return a pre-completed job! No waiting, no API costs.
    const job = new AIJob({
      tenantId: new Types.ObjectId(tenantId),
      userId: userId ? new Types.ObjectId(userId) : null,
      status: 'completed',
      taskType,
      payload,
      result: cachedText,
      error: null
    });
    return await job.save();
  }

  // 2. Create the pending job in DB
  const job = new AIJob({
    tenantId: new Types.ObjectId(tenantId),
    userId: userId ? new Types.ObjectId(userId) : null,
    status: 'pending',
    taskType,
    payload,
    result: null,
    error: null
  });
  const savedJob = await job.save();

  // 3. Define the async worker wrapper
  const workerWrapper = async () => {
    const text = await llmCall();
    // Cache the response text for future queries
    await setCachedResponse(tenantId, prompt, text);
    return text;
  };

  // 4. Push to background queue and trigger processing loop
  jobQueue.push({ job: savedJob, worker: workerWrapper });
  // Defer execution using setImmediate to avoid blocking the Express request-response thread
  setImmediate(() => {
    processNextJob();
  });

  return savedJob;
}
