import hardhatIgnition from "@nomicfoundation/hardhat-ignition";
import "dotenv/config";
import { defineConfig } from "hardhat/config";

export default defineConfig({
   plugins: [hardhatIgnition],
  solidity: {
    version: "0.8.28",
  },
  networks: { xlayerTestnet: { type: "http", url: "https://testrpc.xlayer.tech/terigon", chainId: 1952, accounts: [process.env.PRIVATE_KEY as string], }, }, });