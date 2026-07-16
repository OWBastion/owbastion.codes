export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const submissionId = getRouterParam(event, "submissionId");
  const headers: Record<string, string> = {};
  const cookie = event.node.req.headers.cookie;
  if (cookie) headers.cookie = Array.isArray(cookie) ? cookie[0] : cookie;

  const response = await fetch(new URL(`/v1/me/submissions/${submissionId}/evidence`, config.public.apiBaseUrl), { headers });
  setResponseStatus(event, response.status);
  for (const name of ["content-type", "cache-control"]) {
    const value = response.headers.get(name);
    if (value) setResponseHeader(event, name, value);
  }
  return response.body;
});
