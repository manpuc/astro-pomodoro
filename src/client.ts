import { registerSW } from 'virtual:pwa-register';

// autoUpdate によってバックグラウンドで最新ファイルが取得されます。
// 取得後、次回の読み込み時に反映されるため、強制リロードによる「UXの破壊」を防止しています。
registerSW({
  onNeedRefresh() {
    // 【本番環境ログ削減】Productionビルド時にはコンソール出力すら行わない完全な静音移行
    if (import.meta.env.DEV) {
      console.debug('New content is available; it will be used on the next reload.');
    }
  },
  onOfflineReady() {
    if (import.meta.env.DEV) {
      console.debug('App is offline-ready');
    }
  },
});
