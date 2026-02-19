import { visit } from "unist-util-visit";
import type { Code } from "mdast";
import type { Node } from "unist";

function parseParams(paramString = ""): Record<string, string> {
  const normalized = paramString.replace(/ /g, "&");
  return Object.fromEntries(new URLSearchParams(normalized).entries());
}

function transformNode(node: Code) {
  const params = parseParams(node.meta ?? undefined);

  if (params.codeOnly === "true") {
    node.lang = "tsx";
    node.meta = null;
    return;
  }

  const jsxNode = {
    type: "mdxJsxFlowElement",
    name: "LiveExample",
    attributes: [
      {
        type: "mdxJsxAttribute",
        name: "code",
        value: encodeURIComponent(node.value),
      },
    ],
    children: [],
  };

  Object.assign(node, jsxNode as unknown as Node);
}

export default function remarkLiveExample() {
  return (tree: Node) => {
    visit(tree, "code", (node: Node) => {
      if (
        "lang" in node &&
        (node.lang === "LiveExample" || node.lang === "SnackPlayer")
      ) {
        transformNode(node as unknown as Code);
      }
    });
  };
}
