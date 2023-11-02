const networkConfig = {
    11155111: {
        name: "sepolia",
        maxSupply: "10000000000000000000000", // 10 000
        maxMintAmount: "10000000000000000000", // 10
        mintPriceInWei: "50000000000000000", // 0.05
        refundTimeInSeconds: "604800", // 7 days
    },
    31337: {
        name: "hardhat",
        maxSupply: "100000000000000000000", // 100
        maxMintAmount: "10000000000000000000", // 10
        mintPriceInWei: "50000000000000000", // 0.05
        refundTimeInSeconds: "604800", // 7 days
    },
}

const developmentChains = ["hardhat", "localhost"]

module.exports = { networkConfig, developmentChains }
