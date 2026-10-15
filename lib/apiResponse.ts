export async function readApiResponse(response: Response): Promise<unknown> {
  let body: string;
  try {
    body = await response.text();
  } catch {
    throw new Error("Could not read the server response. Please try again.");
  }

  if (!body.trim()) {
    throw new Error(
      response.ok
        ? "The server returned an empty response. Please try again."
        : `The server could not complete the request (HTTP ${response.status}). Please try again.`,
    );
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new Error(
      response.ok
        ? "The server returned an invalid response. Please try again."
        : `The server could not complete the request (HTTP ${response.status}). Please try again.`,
    );
  }
}
