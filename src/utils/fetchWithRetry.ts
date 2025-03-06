const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export async function fetchWithRetry(url: string, options: RequestInit, retries: number = MAX_RETRIES): Promise<Response> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      console.warn(`API Error: ${response.status} ${response.statusText}`);
      if (response.status === 429) {
        // Handle rate limiting
        const retryAfter = response.headers.get('Retry-After');
        const retryAfterMs = retryAfter ? parseInt(retryAfter) * 1000 : RETRY_DELAY_MS * 2 ** (MAX_RETRIES - retries);
        console.warn(`API Rate Limit Exceeded. Waiting for ${retryAfterMs}ms.`);
        await new Promise(resolve => setTimeout(resolve, retryAfterMs));
        console.log(`Retrying after rate limit... (Attempt ${MAX_RETRIES - retries + 1})`);
        return fetchWithRetry(url, options, retries - 1);
      }

      if (retries > 0) {
        console.log(`Retrying in ${RETRY_DELAY_MS}ms... (Attempt ${MAX_RETRIES - retries + 1})`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        return fetchWithRetry(url, options, retries - 1);
      }

      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response;
  } catch (error) {
    console.error('Fetch error:', error);
    if (retries > 0) {
      console.log(`Retrying after error in ${RETRY_DELAY_MS}ms... (Attempt ${MAX_RETRIES - retries + 1})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}