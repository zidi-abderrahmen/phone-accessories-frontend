export async function onRequest(context: any) {
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

  return fetch(proxyRequest);
}