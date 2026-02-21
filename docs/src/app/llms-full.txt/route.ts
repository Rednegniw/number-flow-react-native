import { getLLMText, source } from "@/lib/source";
import { preamble } from "../llms.txt/route";

export const revalidate = false;

export async function GET() {
  const scan = source.getPages().map(getLLMText);
  const scanned = await Promise.all(scan);

  return new Response([preamble, ...scanned].join("\n\n"));
}
