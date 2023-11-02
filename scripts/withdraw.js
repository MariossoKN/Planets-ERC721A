// withdraws all ETH from the contract
// run with "yarn hardhat run scripts/withdraw.js --network sepolia"

const { ethers } = require("hardhat")

async function withdraw() {
    const planets = await ethers.getContract("Planets")

    await planets.withdraw()
    console.log("--------------------------------------")
    console.log(`Withdrawed.`)
    console.log("--------------------------------------")
}

withdraw()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
