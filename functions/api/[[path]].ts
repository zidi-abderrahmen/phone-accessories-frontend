import type { EventContext } from "@cloudflare/workers-types";

export async function onRequest(context: EventContext<{ API_URL: string }, any, any>) {
  const { request, env } = context;
  const url = new URL(request.url);
  const backendUrl = env.API_URL + url.pathname + url.search;

  const proxyRequest = new Request(backendUrl, {
    method: request.method,
    headers: request.headers,
    body: ["GET", "HEAD"].includes(request.method)
      ? undefined
      : await request.arrayBuffer(),
    redirect: "manual",
  });

  console.log(`Proxying request to: ${backendUrl}`);

  return fetch(proxyRequest);
}