import { gitConfig } from "@/lib/layout.shared";

export async function GET() {
  const res = await fetch(`https://api.github.com/repos/${gitConfig.user}/${gitConfig.repo}`, {
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    return Response.json({ stars: null }, { status: 502 });
  }

  const data = await res.json();
  const stars = data.stargazers_count;

  return Response.json(
    { stars },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
