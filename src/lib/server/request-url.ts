import { getDeploymentUrl } from "./config";

function requestBaseUrl(req: Request) {
  const fallback = new URL(req.url);
  const protocol = req.headers.get("x-forwarded-proto") ?? fallback.protocol;
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    fallback.host;

  return `${protocol.replace(/:$/, "")}://${host}`;
}

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export function localUrl(path: string, req: Request) {
  return new URL(path, requestBaseUrl(req));
}

export function publicUrl(path: string, req?: Request) {
  const deploymentUrl = getDeploymentUrl();
  if (deploymentUrl) return joinUrl(deploymentUrl, path);
  if (req) return localUrl(path, req).toString();
  return path.startsWith("/") ? path : `/${path}`;
}

export function candidateInterviewUrl(token: string, req?: Request) {
  return publicUrl(`/i/${token}`, req);
}
