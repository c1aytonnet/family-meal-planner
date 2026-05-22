import dns from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "host.docker.internal",
  "metadata.google.internal",
]);

function normalizeHostname(hostname: string) {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

function ipv4ToInt(ip: string) {
  return ip
    .split(".")
    .map((part) => Number(part))
    .reduce((acc, part) => (acc << 8) + part, 0);
}

function isPrivateIpv4(ip: string) {
  const value = ipv4ToInt(ip);

  const ranges = [
    ["0.0.0.0", "0.255.255.255"],
    ["10.0.0.0", "10.255.255.255"],
    ["100.64.0.0", "100.127.255.255"],
    ["127.0.0.0", "127.255.255.255"],
    ["169.254.0.0", "169.254.255.255"],
    ["172.16.0.0", "172.31.255.255"],
    ["192.168.0.0", "192.168.255.255"],
  ] as const;

  return ranges.some(([start, end]) => value >= ipv4ToInt(start) && value <= ipv4ToInt(end));
}

function isPrivateIpv6(ip: string) {
  const normalized = ip.toLowerCase();

  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  );
}

function isPrivateIpAddress(ip: string) {
  const normalized = ip.trim().toLowerCase();
  const mappedIpv4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mappedIpv4) {
    return isPrivateIpv4(mappedIpv4[1]);
  }

  const version = net.isIP(normalized);
  if (version === 4) {
    return isPrivateIpv4(normalized);
  }

  if (version === 6) {
    return isPrivateIpv6(normalized);
  }

  return false;
}

export function normalizeExternalHttpUrl(input: string | null | undefined) {
  const value = String(input ?? "").trim();
  if (!value) {
    return undefined;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return undefined;
  }

  if (url.username || url.password) {
    return undefined;
  }

  const hostname = normalizeHostname(url.hostname);
  if (!hostname) {
    return undefined;
  }

  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".localhost")
  ) {
    return undefined;
  }

  if (isPrivateIpAddress(hostname)) {
    return undefined;
  }

  return url.toString();
}

async function assertPublicTarget(url: URL) {
  const hostname = normalizeHostname(url.hostname);
  if (!hostname) {
    throw new Error("Recipe URL must include a hostname.");
  }

  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".localhost")
  ) {
    throw new Error("Recipe URL points to a blocked internal hostname.");
  }

  if (isPrivateIpAddress(hostname)) {
    throw new Error("Recipe URL points to a blocked private IP address.");
  }

  const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length) {
    throw new Error("Recipe URL hostname could not be resolved.");
  }

  if (addresses.some((entry) => isPrivateIpAddress(entry.address))) {
    throw new Error("Recipe URL resolves to a blocked private address.");
  }
}

export async function validateFetchableRecipeUrl(input: string) {
  const normalized = normalizeExternalHttpUrl(input);
  if (!normalized) {
    throw new Error("Recipe URL must be a valid external http or https URL.");
  }

  const url = new URL(normalized);
  await assertPublicTarget(url);
  return url;
}

export async function fetchSafeRecipeSource(input: string) {
  let currentUrl = await validateFetchableRecipeUrl(input);

  for (let redirectCount = 0; redirectCount < 5; redirectCount += 1) {
    const response = await fetch(currentUrl.toString(), {
      headers: {
        "User-Agent": "FamilyMealPlanner/1.0 (+recipe import)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
      redirect: "manual",
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error("Recipe source redirected without a location header.");
      }

      currentUrl = await validateFetchableRecipeUrl(new URL(location, currentUrl).toString());
      continue;
    }

    if (!response.ok) {
      throw new Error(`Recipe source fetch failed with ${response.status}.`);
    }

    return {
      sourceName: currentUrl.hostname.replace(/^www\./, ""),
      sourceUrl: currentUrl.toString(),
      html: await response.text(),
    };
  }

  throw new Error("Recipe source redirected too many times.");
}
