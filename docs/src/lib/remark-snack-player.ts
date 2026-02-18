import { visit } from 'unist-util-visit';
import type { Code } from 'mdast';
import type { Node } from 'unist';

function parseParams(paramString = ''): Record<string, string> {
  // Meta strings use spaces between key=value pairs, not &
  // Values with spaces are URL-encoded (%20), so splitting on literal spaces is safe
  const normalized = paramString.replace(/ /g, '&');
  return Object.fromEntries(new URLSearchParams(normalized).entries());
}

function attr(name: string, value: string) {
  return {
    type: 'mdxJsxAttribute',
    name,
    value,
  };
}

function toJsxNode(node: Code) {
  const params = parseParams(node.meta ?? undefined);

  const name = params.name ? decodeURIComponent(params.name) : 'Example';
  const description = params.description
    ? decodeURIComponent(params.description)
    : 'Example usage';

  const ext = params.ext ? decodeURIComponent(params.ext) : 'tsx';
  const filename = `App.${ext}`;
  const files = encodeURIComponent(
    JSON.stringify({
      [filename]: {
        type: 'CODE',
        contents: node.value,
      },
    }),
  );

  const dependencies = params.dependencies ?? '';
  const sdkVersion = params.sdkVersion ?? '54.0.0';
  const platform = params.platform ?? 'mydevice';
  const supportedPlatforms = params.supportedPlatforms ?? 'mydevice,ios,android';
  const theme = params.theme ?? 'dark';
  const preview = params.preview ?? 'true';
  const loading = params.loading ?? 'lazy';

  const jsxNode = {
    type: 'mdxJsxFlowElement',
    name: 'div',
    attributes: [
      attr('className', 'snack-player'),
      attr('data-snack-name', name),
      attr('data-snack-description', description),
      attr('data-snack-files', files),
      attr('data-snack-dependencies', dependencies),
      attr('data-snack-sdkversion', sdkVersion),
      attr('data-snack-platform', platform),
      attr('data-snack-supported-platforms', supportedPlatforms),
      attr('data-snack-theme', theme),
      attr('data-snack-preview', preview),
      attr('data-snack-loading', loading),
      attr('data-snack-device-frame', 'false'),
    ],
    children: [],
  };

  Object.assign(node, jsxNode as unknown as Node);
}

export default function remarkSnackPlayer() {
  return (tree: Node) => {
    visit(tree, 'code', (node: Node) => {
      if ('lang' in node && node.lang === 'SnackPlayer') {
        toJsxNode(node as unknown as Code);
      }
    });
  };
}
