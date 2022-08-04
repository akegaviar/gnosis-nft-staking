const HDWalletProvider = require("@truffle/hdwallet-provider");

const PRIVATE_KEY = "";
module.exports = {
  networks: {
    xdai: {
      provider: () =>
        new HDWalletProvider(PRIVATE_KEY, "https://rpc.gnosischain.com"),
      network_id: 100,
    },
  },

  compilers: {
    solc: {
      version: "0.8.13",
      settings: {
        optimizer: {
          enabled: true,
          runs: 50,
        },
      },
    },
  },

  db: {
    enabled: false,
  },
};
