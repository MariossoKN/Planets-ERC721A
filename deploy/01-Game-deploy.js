const { network, ethers } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper.hardhat.config")
const { verify } = require("../utils/verify")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    const args = [
        networkConfig[chainId]["maxSupply"],
        networkConfig[chainId]["maxMintAmount"],
        networkConfig[chainId]["mintPriceInWei"],
        networkConfig[chainId]["refundTimeInSeconds"],
    ]
    const blockConfirmations = network.config.blockConfirmations
    const planets = await deploy("Planets", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: blockConfirmations,
    })

    // Contract verification
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...")
        await verify(planets.address, args)
    }
    console.log("**********************************************************************")
    console.log(`Contract address: ${planets.address}`)
    console.log("**********************************************************************")
}
module.exports.tags = ["all", "planets"]
