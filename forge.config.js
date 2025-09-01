module.exports = {
  packagerConfig: {
    asar: true,
    name: "PDF Renamer & Splitter",
    executableName: "PDF Renamer & Splitter",
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'win32'],
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
  ],
};
