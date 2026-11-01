import { WebView } from 'react-native-webview';

import { youTubeEmbedUrl } from '../../lib/media';

/** YouTube refuses embeds with no referrer, so the player sits in a small page with a real base URL. */
const page = (id: string) => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#000"><iframe src="${youTubeEmbedUrl(id)}" title="Exercise form video" allow="autoplay; encrypted-media" referrerpolicy="strict-origin-when-cross-origin" style="position:fixed;top:0;left:0;width:100%;height:100%;border:0"></iframe></body></html>`;

export function YouTubeEmbed({ id }: { id: string }) {
  return (
    <WebView
      accessibilityLabel="Exercise form video"
      source={{ html: page(id), baseUrl: 'https://vaishakskumar.github.io' }}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      scrollEnabled={false}
      style={{ flex: 1, backgroundColor: '#000' }}
    />
  );
}
