// resumes mint
// run with "yarn hardhat run scripts/resumeMint.js --network sepolia"

const { ethers } = require("hardhat")

async function resumeMint() {
    const planets = await ethers.getContract("Planets")

    await planets.resumeMint()
    console.log("--------------------------------------")
    console.log(`Mint Resumed.`)
    console.log("--------------------------------------")
}

resumeMint()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
