import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export const gitConfig = {
  user: 'Rednegniw',
  repo: 'number-flow-react-native',
  branch: 'main',
};

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'Number Flow React Native',
    },
    links: [
      {
        text: 'npm',
        url: 'https://www.npmjs.com/package/number-flow-react-native',
        external: true,
      },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
