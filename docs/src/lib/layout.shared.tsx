import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Logo } from '@/components/logo';

export const gitConfig = {
  user: 'Rednegniw',
  repo: 'number-flow-react-native',
  branch: 'main',
};

const npmIcon = (
  <svg role="img" aria-label="npm" viewBox="0 0 24 24" fill="currentColor">
    <path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z" />
  </svg>
);

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <Logo className="size-6 shrink-0 text-fd-primary" />
          Number Flow React Native
        </>
      ),
    },
    themeSwitch: { enabled: false },
    links: [
      {
        type: 'icon',
        text: 'npm',
        label: 'npm',
        url: 'https://www.npmjs.com/package/number-flow-react-native',
        icon: npmIcon,
        external: true,
      },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
