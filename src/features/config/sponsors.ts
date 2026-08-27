/** Frontend-only sponsor links shown below the network proxy URL label. */
import bestproxyLogo from '@/assets/icons/bestproxy.png';

export type Sponsor = {
  /** Display name shown without translation. */
  name: string;
  /** External destination URL. */
  url: string;
  /** Optional logo displayed next to the name. */
  logo?: string;
};

export const SPONSORS: readonly Sponsor[] = [
  {
    name: 'BestProxy.com',
    url: 'https://bestproxy.com/?keyword=ayh7otlb',
    logo: bestproxyLogo,
  },
];
