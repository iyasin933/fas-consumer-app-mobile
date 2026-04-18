module.exports = function (api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
          },
        },
      ],
      // Must be listed LAST per the react-native-reanimated docs.
      'react-native-reanimated/plugin',
    ],
  };
};
