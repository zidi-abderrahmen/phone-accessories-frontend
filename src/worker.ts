export interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
  API_URL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      const backendUrl = env.API_URL + url.pathname + url.search;

      const headers = new Headers(request.headers);
      headers.delete("host");

      const connectingIp = request.headers.get("CF-Connecting-IP");
      headers.delete("X-Forwarded-For");
      headers.delete("X-Real-IP");
      if (connectingIp) {
        headers.set("X-Forwarded-For", connectingIp);
        headers.set("X-Real-IP", connectingIp);
      }

      const proxyRequest = new Request(backendUrl, {
        method: request.method,
        headers,
        body: ["GET", "HEAD"].includes(request.method)
          ? undefined
          : await request.arrayBuffer(),
        redirect: "manual",
      });

      const backendResponse = await fetch(proxyRequest);

      const responseHeaders = new Headers(backendResponse.headers);
      responseHeaders.delete("content-encoding");
      responseHeaders.delete("content-length");
      responseHeaders.delete("transfer-encoding");

      return new Response(backendResponse.body, {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        headers: responseHeaders,
      });
    }

    return env.ASSETS.fetch(request);
  },
};