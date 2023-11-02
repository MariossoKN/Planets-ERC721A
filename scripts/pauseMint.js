// pause mint
// run with "yarn hardhat run scripts/pauseMint.js --network sepolia"

const { ethers } = require("hardhat")

async function pauseMint() {
    const planets = await ethers.getContract("Planets")

    await planets.pauseMint()
    console.log("--------------------------------------")
    console.log(`Mint Paused.`)
    console.log("--------------------------------------")
}

pauseMint()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
