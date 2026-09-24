import { cache } from "react";
import { GITHUB_URL } from "@/lib/config";

/**
 * The repository's star count, read once per build so visitors make no
 * request for it. Any failure (offline build, rate limit) returns null and the
 * header shows the plain icon link instead of failing the build.
 */
export const githubStars = cache(async (): Promise<number | null> => {
  const repo = new URL(GITHUB_URL).pathname.replace(/^\//, "");
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: { accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const { stargazers_count } = (await response.json()) as { stargazers_count?: unknown };
    return typeof stargazers_count === "number" ? stargazers_count : null;
  } catch {
    return null;
  }
});

/** 1234 → "1.2k", as GitHub abbreviates it. */
export const formatStars = (n: number) =>
  n < 1000 ? String(n) : `${(n / 1000).toFixed(n < 10000 ? 1 : 0).replace(/\.0$/, "")}k`;
