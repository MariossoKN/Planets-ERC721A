const { assert, expect } = require("chai")
const { getNamedAccounts, ethers, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper.hardhat.config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Planets unit test", async function () {
          let deployer, planets, chainId, minter, minter2, mintPrice, accounts
          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["planets"])
              planets = await ethers.getContract("Planets", deployer)
              chainId = network.config.chainId
              accounts = await ethers.getSigners()
              owner = accounts[0]
              minter = accounts[1]
              minter2 = accounts[2]
              mintPrice = await planets.getMintPriceInWei()
              notEnoughMintPrice = BigInt(mintPrice) - 1n
          })
          describe("constructor", function () {
              it("Should initialize the constructor parameters correctly", async function () {
                  // check max supply
                  const maxSupply = await planets.getMaxSupply()
                  assert.equal(maxSupply, networkConfig[chainId]["maxSupply"])
                  // check max mint amount
                  const maxMintAmount = await planets.getMaxMintAmount()
                  assert.equal(maxMintAmount, networkConfig[chainId]["maxMintAmount"])
                  // check mint price
                  const mintPrice = await planets.getMintPriceInWei()
                  assert.equal(mintPrice, networkConfig[chainId]["mintPriceInWei"])
                  // check the initial owner
                  const initialOwner = await planets.owner()
                  assert.equal(initialOwner, deployer)
                  // check refund time
                  const refundTime = await planets.getRefundTimeInSeconds()
                  assert.equal(refundTime, networkConfig[chainId]["refundTimeInSeconds"])
              })
              it("Should start with mint disabled", async function () {
                  assert.equal(await planets.getMintStatus(), false)
              })
          })
          describe("mint", function () {
              it("Should revert if mint amount is more than the max mint amount #1 mint at once", async function () {
                  // enable mint as owner
                  await planets.connect(owner).resumeMint()
                  // mint 11 nfts
                  // await planets.connect(minter).mint("11", { value: BigInt(mintPrice) * 11n })
                  await expect(
                      planets.connect(minter).mint("11", { value: BigInt(mintPrice) * 11n }),
                  ).to.be.reverted
              })
              it("Should revert if mint amount is more than the max mint amount #2 mint gradually", async function () {
                  // enable mint as owner
                  await planets.connect(owner).resumeMint()
                  // mint 5 nfts
                  await planets.connect(minter).mint("5", { value: BigInt(mintPrice) * 5n })
                  // mint 5 nfts
                  await planets.connect(minter).mint("5", { value: BigInt(mintPrice) * 5n })
                  // mint 1 nfts
                  // await planets.connect(minter).mint("1", { value: mintPrice })
                  await expect(planets.connect(minter).mint("1", { value: mintPrice })).to.be
                      .reverted
              })
              it("Should revert if mint amount is 0", async function () {
                  // enable mint as owner
                  await planets.connect(owner).resumeMint()
                  await expect(planets.connect(minter).mint("0", { value: BigInt(mintPrice) })).to
                      .be.reverted
              })
              it("Should revert if sent value is 0", async function () {
                  // enable mint as owner
                  await planets.connect(owner).resumeMint()
                  //   await planets.connect(minter).mint("1")
                  await expect(planets.connect(minter).mint("1")).to.be.reverted
              })
              it("Should revert if sent value is less than it should be #1 with minting one NFT", async function () {
                  // enable mint as owner
                  await planets.connect(owner).resumeMint()
                  //   await planets.connect(minter).mint("1", { value: BigInt(notEnoughMintPrice) })
                  await expect(
                      planets.connect(minter).mint("1", { value: BigInt(notEnoughMintPrice) }),
                  ).to.be.reverted
              })
              it("Should revert if sent value is less than it should be #2 with minting multiple NFTs", async function () {
                  // enable mint as owner
                  await planets.connect(owner).resumeMint()
                  //   await planets
                  //       .connect(minter)
                  //       .mint("3", { value: BigInt(notEnoughMintPrice) * 3n })
                  await expect(
                      planets.connect(minter).mint("3", { value: BigInt(notEnoughMintPrice) * 3n }),
                  ).to.be.reverted
              })
              it("Should revert if max supply is reached", async function () {
                  // enable mint as owner
                  await planets.connect(owner).resumeMint()
                  // mint 100 nfts (which is max supply)
                  for (let i = 1; i < 11n; i++) {
                      //   await planets.connect(accounts[i])
                      await planets
                          .connect(accounts[i])
                          .mint("10", { value: BigInt(mintPrice) * 10n })
                  }
                  // try to mint 1 nft
                  // await planets.connect(owner).mint("1", { value: mintPrice })
                  await expect(planets.connect(owner).mint("1", { value: mintPrice })).to.be
                      .reverted
              })
              it("Should revert if mint is paused", async function () {
                  // check the minst status
                  assert.equal(await planets.getMintStatus(), false)
                  //   await planets.connect(minter).mint("1", { value: BigInt(mintPrice) })
                  await expect(planets.connect(minter).mint("1", { value: BigInt(mintPrice) })).to
                      .be.reverted
              })
              it("Should set the refund status to false and the correct time stamp", async function () {
                  // enable mint as owner
                  await planets.connect(owner).resumeMint()
                  await planets.connect(minter).mint("5", { value: BigInt(mintPrice * 5n) })
                  // check if the refund time stamp is correct and refund status is false
                  const refundTimeStamp = await planets.getRefundTimeInSeconds()
                  for (let i = 1; i < 6n; i++) {
                      const block = await ethers.provider.getBlock("latest")
                      const blockTimestamp = block.timestamp
                      assert.equal(await planets.getRefundStatus(i), false)
                      assert.equal(
                          await planets.getTokenRefundTimeStamp(i),
                          BigInt(refundTimeStamp) + BigInt(blockTimestamp),
                      )
                  }
              })
              it("Should mint amount of NFTs to minter", async function () {
                  // enable mint as owner
                  await planets.connect(owner).resumeMint()
                  // check the balance before mint
                  assert.equal(await planets.balanceOf(minter), "0")
                  // mint NFTs
                  await planets.connect(minter).mint("5", { value: BigInt(mintPrice * 5n) })
                  // check if the minter has the NFTs
                  assert.equal(await planets.balanceOf(minter), "5")
                  for (let i = 1; i < 6n; i++) {
                      assert.equal(await planets.ownerOf(i), minter.address)
                  }
              })
          })
          describe("setUri", function () {
              it("Should set new URI", async function () {
                  // set and return the new URI #1
                  await planets.connect(owner).setUri("https://ipfs")
                  assert.equal(await planets.getUri(), "https://ipfs")
                  // set and return the new URI #2
                  await planets.connect(owner).setUri("https://ipfs.new")
                  assert.equal(await planets.getUri(), "https://ipfs.new")
              })
          })
          describe("pauseMint", function () {
              it("Should pause the mint", async function () {
                  // resume mint
                  await planets.connect(owner).resumeMint()
                  await planets.connect(minter).mint("5", { value: BigInt(mintPrice * 5n) })
                  // pause mint
                  await planets.connect(owner).pauseMint()
                  assert.equal(await planets.getMintStatus(), false)
                  // should revert
                  await expect(planets.connect(minter).mint("5", { value: BigInt(mintPrice * 5n) }))
                      .to.be.reverted
              })
          })
          describe("resumeMint", function () {
              it("Should resume the mint", async function () {
                  // should revert
                  await expect(planets.connect(minter).mint("5", { value: BigInt(mintPrice * 5n) }))
                      .to.be.reverted
                  // resume mint
                  await planets.connect(owner).resumeMint()
                  await planets.connect(minter).mint("5", { value: BigInt(mintPrice * 5n) })
                  assert.equal(await planets.getMintStatus(), true)
              })
          })
          describe("_startTokenId", function () {
              it("Should start with token id 1", async function () {
                  // resume mint
                  await planets.connect(owner).resumeMint()
                  await expect(planets.ownerOf("1")).to.be.reverted
                  // mint
                  await planets.connect(minter).mint("1", { value: BigInt(mintPrice) })
                  // check the owner of token 1
                  assert.equal(await planets.ownerOf("1"), minter.address)
              })
          })
          describe("refundNft", function () {
              beforeEach(async function () {
                  await planets.connect(owner).resumeMint()
              })
              it("Should revert if caller is not the owner", async function () {
                  // check
                  //   await planets.refundNft("1")
                  await expect(planets.refundNft("1")).to.be.reverted
                  // mint nfts
                  await planets.connect(minter).mint("5", { value: BigInt(mintPrice * 5n) })
                  // check
                  //   await planets.connect(minter2).refundNft("1")
                  await expect(planets.connect(minter2).refundNft("1")).to.be.reverted
              })
              it("Should revert if already refunded", async function () {
                  // mint nfts
                  await planets.connect(minter).mint("5", { value: BigInt(mintPrice * 5n) })
                  // refund
                  await planets.connect(minter).refundNft("1")
                  await expect(planets.connect(minter).refundNft("1")).to.be.reverted
              })
              it("Should revert if refund time already passed", async function () {
                  // mint nfts
                  await planets.connect(minter).mint("5", { value: BigInt(mintPrice * 5n) })
                  // increasing the time
                  const timeIncrease = 604800 + 1
                  await network.provider.send("evm_increaseTime", [timeIncrease])
                  await network.provider.send("evm_mine", [])
                  // try to refund
                  //   await planets.connect(minter).refundNft("1")
                  await expect(planets.connect(minter).refundNft("1")).to.be.reverted
              })
              it("Should change the refund status of the refunded NFT id to true", async function () {
                  // mint nfts
                  await planets.connect(minter).mint("5", { value: BigInt(mintPrice * 5n) })
                  // check status before refund
                  assert.equal(await planets.getRefundStatus("1"), false)
                  // refund
                  await planets.connect(minter).refundNft("1")
                  // check status
                  assert.equal(await planets.getRefundStatus("1"), true)
              })
              it("Should transfer the refunded NFT to the owner of the contract", async function () {
                  // mint nfts
                  await planets.connect(minter).mint("5", { value: BigInt(mintPrice * 5n) })
                  // check the owner before refund
                  assert.equal(await planets.ownerOf("1"), minter.address)
                  // refund
                  await planets.connect(minter).refundNft("1")
                  // check the owner
                  assert.equal(await planets.ownerOf("1"), owner.address)
              })
              it("Should transfer ETH to the refunder", async function () {
                  // mint nfts
                  await planets.connect(minter).mint("5", { value: BigInt(mintPrice * 5n) })
                  // check the balance before refund
                  const refunderBalanceBeforeRefund = await ethers.provider.getBalance(
                      minter.address,
                  )
                  const contractBalanceBeforeRefund = await ethers.provider.getBalance(
                      planets.target,
                  )
                  // refund and calculate gas cost
                  const transactionRespone = await planets.connect(minter).refundNft("1")
                  const transactionReceipt = await transactionRespone.wait(1)
                  const { gasUsed, gasPrice } = transactionReceipt
                  const gasCost = BigInt(gasUsed) * BigInt(gasPrice)
                  // check the balance after refund
                  const refunderBalanceAfterRefund = await ethers.provider.getBalance(
                      minter.address,
                  )
                  const contractBalanceAfterRefund = await ethers.provider.getBalance(
                      planets.target,
                  )
                  assert.equal(
                      BigInt(refunderBalanceBeforeRefund) - gasCost + BigInt(mintPrice),
                      refunderBalanceAfterRefund,
                  )
                  assert.equal(
                      BigInt(contractBalanceBeforeRefund) - BigInt(mintPrice),
                      contractBalanceAfterRefund,
                  )
              })
          })
          describe("refundBatch", function () {
              beforeEach(async function () {
                  await planets.connect(owner).resumeMint()
              })
              it("Should transfer the refunded NFTs to the owner of the contract", async function () {
                  // mint nfts
                  await planets.connect(minter).mint("5", { value: BigInt(mintPrice * 5n) })
                  // check the owner before refund
                  assert.equal(await planets.ownerOf("1"), minter.address)
                  assert.equal(await planets.ownerOf("2"), minter.address)
                  assert.equal(await planets.ownerOf("3"), minter.address)
                  // refund
                  await planets.connect(minter).refundBatch([1, 2, 3])
                  // check the owner
                  assert.equal(await planets.ownerOf("1"), owner.address)
                  assert.equal(await planets.ownerOf("2"), owner.address)
                  assert.equal(await planets.ownerOf("3"), owner.address)
              })
              it("Should transfer ETH to the refunder", async function () {
                  const refundedNftsArray = [1, 2, 3]
                  const refunderNftsArrayLength = refundedNftsArray.length
                  const refundedNftsPrice = BigInt(refunderNftsArrayLength) * BigInt(mintPrice)
                  // mint nfts
                  await planets.connect(minter).mint("5", { value: BigInt(mintPrice * 5n) })
                  // check the balance before refund
                  const refunderBalanceBeforeRefund = await ethers.provider.getBalance(
                      minter.address,
                  )
                  const contractBalanceBeforeRefund = await ethers.provider.getBalance(
                      planets.target,
                  )
                  // refund and calculate gas cost
                  const transactionRespone = await planets
                      .connect(minter)
                      .refundBatch(refundedNftsArray)
                  const transactionReceipt = await transactionRespone.wait(1)
                  const { gasUsed, gasPrice } = transactionReceipt
                  const gasCost = BigInt(gasUsed) * BigInt(gasPrice)
                  // check the balance after refund
                  const refunderBalanceAfterRefund = await ethers.provider.getBalance(
                      minter.address,
                  )
                  const contractBalanceAfterRefund = await ethers.provider.getBalance(
                      planets.target,
                  )
                  assert.equal(
                      BigInt(refunderBalanceBeforeRefund) - gasCost + refundedNftsPrice,
                      refunderBalanceAfterRefund,
                  )
                  assert.equal(
                      BigInt(contractBalanceBeforeRefund) - refundedNftsPrice,
                      contractBalanceAfterRefund,
                  )
              })
          })
          describe("withdraw", function () {
              beforeEach(async function () {
                  await planets.connect(owner).resumeMint()
              })
              it("Should revert if called by non-owner", async function () {
                  // mint nfts
                  await planets.connect(minter).mint("5", { value: BigInt(mintPrice * 5n) })
                  // increase time (probably not needed because the owner is checked first)
                  const timeIncrease = 604800 + 1
                  await network.provider.send("evm_increaseTime", [timeIncrease])
                  await network.provider.send("evm_mine", [])
                  // try to withdraw
                  //   await planets.connect(minter).withdraw()
                  await expect(planets.connect(minter).withdraw()).to.be.reverted
              })
              it("Should revert if refund time for the last minted NFTs not passed", async function () {
                  // mint nfts
                  await planets.connect(minter).mint("5", { value: BigInt(mintPrice * 5n) })
                  // try to withdraw
                  //   await planets.connect(owner).withdraw()
                  await expect(planets.connect(owner).withdraw()).to.be.reverted
                  // increase time by not the full refund time
                  const timeIncrease = 604790
                  await network.provider.send("evm_increaseTime", [timeIncrease])
                  await network.provider.send("evm_mine", [])
                  // try to withdraw
                  //   await planets.connect(owner).withdraw()
                  await expect(planets.connect(owner).withdraw()).to.be.reverted
              })
              it("Should withdraw ETH to the owner", async function () {
                  // mint nfts
                  await planets.connect(minter).mint("5", { value: BigInt(mintPrice * 5n) })
                  // check the balance before withdraw
                  const contractBalanceBeforeWithdraw = await ethers.provider.getBalance(
                      planets.target,
                  )
                  const ownerBalanceBeforeWithdraw = await ethers.provider.getBalance(owner.address)
                  // increase time by refund time + 1
                  const timeIncrease = 604800 + 1
                  await network.provider.send("evm_increaseTime", [timeIncrease])
                  await network.provider.send("evm_mine", [])
                  // withdraw and calculate gas cost
                  const transactionRespone = await planets.connect(owner).withdraw()
                  const transactionReceipt = await transactionRespone.wait(1)
                  const { gasUsed, gasPrice } = transactionReceipt
                  const gasCost = BigInt(gasUsed) * BigInt(gasPrice)
                  // check the balance after withdraw
                  const contractBalanceAfterWithdraw = await ethers.provider.getBalance(
                      planets.target,
                  )
                  const ownerBalanceAfterWithdraw = await ethers.provider.getBalance(owner.address)
                  // asserts
                  assert.equal(
                      BigInt(ownerBalanceBeforeWithdraw) - gasCost + BigInt(mintPrice * 5n),
                      ownerBalanceAfterWithdraw,
                  )
                  assert.equal(contractBalanceAfterWithdraw, "0")
              })
          })
          describe("getTotalMinted", function () {
              it("Should return total minted NFTs", async function () {
                  // resume mint
                  await planets.connect(owner).resumeMint()
                  // check the total minted
                  assert.equal(await planets.getTotalMinted(), "0")
                  // mint nfts
                  await planets.connect(minter).mint("5", { value: BigInt(mintPrice * 5n) })
                  // check the total minted
                  assert.equal(await planets.getTotalMinted(), "5")
                  // mint nfts
                  await planets.connect(minter2).mint("8", { value: BigInt(mintPrice * 8n) })
                  // check the total minted
                  assert.equal(await planets.getTotalMinted(), "13")
              })
          })
          describe("getNumberMinted", function () {
              it("Should return total minted NFTs by address", async function () {
                  // resume mint
                  await planets.connect(owner).resumeMint()
                  // mint nfts
                  await planets.connect(minter).mint("5", { value: BigInt(mintPrice * 5n) })
                  // check the total minted
                  assert.equal(await planets.getNumberMinted(minter), "5")
                  // mint nfts
                  await planets.connect(minter2).mint("8", { value: BigInt(mintPrice * 8n) })
                  // check the total minted
                  assert.equal(await planets.getNumberMinted(minter2), "8")
              })
          })
      })
