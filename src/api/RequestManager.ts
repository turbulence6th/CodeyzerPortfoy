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
  private activeRequests = 0;
  private concurrencyLimit: number;
  private onProgress: ProgressCallback<T>;

  /**
   * @param {number} concurrencyLimit The maximum number of requests to run in parallel.
   * @param {ProgressCallback<T>} onProgress A callback function that is called each time a request successfully completes.
   */
  constructor(concurrencyLimit: number, onProgress: ProgressCallback<T>) {
    this.concurrencyLimit = concurrencyLimit;
    this.onProgress = onProgress;
  }

  /**
   * Adds a request function to the queue.
   * The function will be executed when a slot is available.
   * @param {RequestFunction<T>} fn The function that returns a promise for the request.
   * @param {string} id A unique identifier for the request to avoid duplicates.
   */
  public add(fn: RequestFunction<T>, id: string): void {
    if (this.queue.some(req => req.id === id)) {
      // Avoid adding duplicate requests
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
        while (this.activeRequests < this.concurrencyLimit && this.queue.length > 0) {
          this.activeRequests++;
          const request = this.queue.shift();
          if (request) {
            request.fn()
              .then(result => {
                // Only call progress callback if the result is not null/undefined
                if (result) {
                  this.onProgress(result);
                }
              })
              .catch(error => {
                console.warn(`Request failed for ID ${request.id}:`, error);
              })
              .finally(() => {
                this.activeRequests--;
                // Check if queue is done
                if (this.queue.length === 0 && this.activeRequests === 0) {
                  resolve();
                } else {
                  // Run next request
                  run();
                }
              });
          }
        }
      };
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
