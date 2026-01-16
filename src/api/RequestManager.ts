// src/api/RequestManager.ts

/**
 * @callback RequestFunction
 * @returns {Promise<T>} A promise that resolves with the result of the request.
 * @template T
 */
type RequestFunction<T> = () => Promise<T>;

/**
 * @callback ProgressCallback
 * @param {T} result The result of the completed request.
 * @template T
 */
type ProgressCallback<T> = (result: T) => void;

interface Request<T> {
  fn: RequestFunction<T>;
  id: string;
}

/**
 * Manages concurrent network requests with a queue and a concurrency limit.
 * This prevents overwhelming the browser or hitting API rate limits.
 */
export class RequestManager<T> {
  private queue: Request<T>[] = [];
  private activeRequests: Set<string> = new Set(); // Aktif istekleri ID ile takip et
  private concurrencyLimit: number;
  private onProgress: ProgressCallback<T>;
  private delayBetweenRequests: number;

  /**
   * @param {number} concurrencyLimit The maximum number of requests to run in parallel.
   * @param {ProgressCallback<T>} onProgress A callback function that is called each time a request successfully completes.
   * @param {number} delayBetweenRequests Optional delay in milliseconds between requests (default: 0).
   */
  constructor(concurrencyLimit: number, onProgress: ProgressCallback<T>, delayBetweenRequests: number = 0) {
    this.concurrencyLimit = concurrencyLimit;
    this.onProgress = onProgress;
    this.delayBetweenRequests = delayBetweenRequests;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Adds a request function to the queue.
   * The function will be executed when a slot is available.
   * @param {RequestFunction<T>} fn The function that returns a promise for the request.
   * @param {string} id A unique identifier for the request to avoid duplicates.
   */
  public add(fn: RequestFunction<T>, id: string): void {
    // İstek zaten aktifse veya kuyruktaysa ekleme
    if (this.activeRequests.has(id) || this.queue.some(req => req.id === id)) {
      return;
    }
    this.queue.push({ fn, id });
  }

  /**
   * Starts processing the queue.
   * @returns {Promise<void>} A promise that resolves when the entire queue is empty.
   */
  public async start(): Promise<void> {
    return new Promise(resolve => {
      const run = () => {
        while (this.activeRequests.size < this.concurrencyLimit && this.queue.length > 0) {
          const request = this.queue.shift();
          if (request) {
            this.activeRequests.add(request.id); // İsteği aktif olarak işaretle
            request.fn()
              .then(result => {
                if (result) {
                  this.onProgress(result);
                }
              })
              .catch(error => {
                console.warn(`Request failed for ID ${request.id}:`, error);
              })
              .finally(async () => {
                this.activeRequests.delete(request.id); // İsteği aktif listesinden çıkar

                if (this.queue.length === 0 && this.activeRequests.size === 0) {
                  resolve();
                } else {
                  // İstekler arasında gecikme uygula (iOS için önemli)
                  if (this.delayBetweenRequests > 0) {
                    await this.delay(this.delayBetweenRequests);
                  }
                  run();
                }
              });
          }
        }
      };

      // Kuyruk boşsa ve aktif istek yoksa hemen çöz
      if (this.queue.length === 0 && this.activeRequests.size === 0) {
        resolve();
        return;
      }

      run();
    });
  }

  /**
   * Clears the request queue.
   */
  public clear(): void {
    this.queue = [];
  }
}
