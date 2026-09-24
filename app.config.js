const { expo } = require('./app.json');

module.exports = () => {
  const giphyApiKey = process.env.EXPO_PUBLIC_GIPHY_API_KEY || expo.extra?.giphyApiKey || '';
  const webPushVapidPublicKey =
    process.env.EXPO_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY || expo.extra?.webPushVapidPublicKey || '';

  return {
    ...expo,
    extra: {
      ...expo.extra,
      giphyApiKey,
      webPushVapidPublicKey,
    },
  };
};
