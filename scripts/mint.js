// mint an amount of NFTs
// amount needs to be specified in the "amount" variable. Keep in mind that the mint is not free (see mintPrice)
// run with "yarn hardhat run scripts/mint.js --network sepolia"

const { ethers } = require("hardhat")

async function mint() {
    const planets = await ethers.getContract("Planets")
    const amount = "2"
    const mintPrice = await planets.getMintPriceInWei()

    await planets.mint(amount, { value: BigInt(mintPrice) * BigInt(amount) })
    console.log("--------------------------------------")
    console.log(`Minted ${amount} NFTs.`)
    console.log("--------------------------------------")
}

mint()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
