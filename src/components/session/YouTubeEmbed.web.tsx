import { createElement } from 'react';

import { youTubeEmbedUrl } from '../../lib/media';

export function YouTubeEmbed({ id }: { id: string }) {
  return createElement('iframe', {
    src: youTubeEmbedUrl(id),
    title: 'Exercise form video',
    allow: 'autoplay; encrypted-media',
    style: { width: '100%', height: '100%', border: 0 },
  });
}
