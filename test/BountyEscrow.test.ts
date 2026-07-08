import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("BountyEscrow", function () {
  const PLATFORM_FEE_BPS = 300;
  const DISPUTE_WINDOW = 48 * 60 * 60;
  const REWARD = ethers.parseUnits("100", 6);

  async function deployFixture() {
    const [creator, hunter, platform, backer] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    const FeeCollector = await ethers.getContractFactory("FeeCollector");
    const feeCollector = await FeeCollector.deploy(platform.address);
    await feeCollector.waitForDeployment();

    const BountyFactory = await ethers.getContractFactory("BountyFactory");
    const factory = await BountyFactory.deploy(
      await usdc.getAddress(),
      await feeCollector.getAddress(),
      PLATFORM_FEE_BPS,
      DISPUTE_WINDOW
    );
    await factory.waitForDeployment();

    await usdc.mint(creator.address, REWARD);
    await usdc.connect(creator).approve(await factory.getAddress(), REWARD);

    const deadline = (await time.latest()) + 7 * 24 * 60 * 60;
    await factory.connect(creator).createBounty("test-bounty-1", REWARD, deadline);

    const escrowAddress = await factory.escrowByBountyId("test-bounty-1");

    return {
      creator,
      hunter,
      backer,
      platform,
      usdc,
      feeCollector,
      factory,
      escrowAddress,
      REWARD,
      deadline,
    };
  }

  it("should lock USDC in escrow on create", async function () {
    const { creator, usdc, escrowAddress, REWARD } = await deployFixture();
    const balance = await usdc.balanceOf(escrowAddress);
    expect(balance).to.equal(REWARD);
    expect(await usdc.balanceOf(creator.address)).to.equal(0n);
  });

  it("should pay hunter 97% and collect 3% fee on approve", async function () {
    const { creator, hunter, usdc, feeCollector, escrowAddress, REWARD } =
      await deployFixture();

    const BountyEscrow = await ethers.getContractFactory("BountyEscrow");
    const escrow = BountyEscrow.attach(escrowAddress);

    await escrow.connect(creator).approveAndPay(hunter.address);

    const expectedFee = (REWARD * BigInt(PLATFORM_FEE_BPS)) / 10000n;
    const expectedPayout = REWARD - expectedFee;

    expect(await usdc.balanceOf(hunter.address)).to.equal(expectedPayout);
    expect(await usdc.balanceOf(await feeCollector.getAddress())).to.equal(expectedFee);
  });

  it("should create rally with creator seed and accept contributions", async function () {
    const { creator, backer, usdc, factory, REWARD, deadline } = await deployFixture();

    const target = REWARD;
    const seed = ethers.parseUnits("20", 6);
    const contribution = ethers.parseUnits("30", 6);

    await usdc.mint(creator.address, seed);
    await usdc.connect(creator).approve(await factory.getAddress(), seed);
    await factory.connect(creator).createRally("rally-1", target, seed, deadline);

    const escrowAddress = await factory.escrowByBountyId("rally-1");
    const BountyEscrow = await ethers.getContractFactory("BountyEscrow");
    const escrow = BountyEscrow.attach(escrowAddress);

    expect(await escrow.fundedAmount()).to.equal(seed);
    expect(await escrow.isRally()).to.equal(true);

    await usdc.mint(backer.address, contribution);
    await usdc.connect(backer).approve(await factory.getAddress(), contribution);
    await factory.connect(backer).contributeToRally("rally-1", contribution);

    expect(await escrow.fundedAmount()).to.equal(seed + contribution);
    expect(await usdc.balanceOf(escrowAddress)).to.equal(seed + contribution);
  });

  it("should pay hunter from fully funded rally", async function () {
    const { creator, hunter, backer, usdc, factory, feeCollector, REWARD, deadline } =
      await deployFixture();

    const seed = ethers.parseUnits("20", 6);
    const contribution = ethers.parseUnits("80", 6);

    await usdc.mint(creator.address, seed);
    await usdc.connect(creator).approve(await factory.getAddress(), seed);
    await factory.connect(creator).createRally("rally-2", REWARD, seed, deadline);

    const escrowAddress = await factory.escrowByBountyId("rally-2");
    const BountyEscrow = await ethers.getContractFactory("BountyEscrow");
    const escrow = BountyEscrow.attach(escrowAddress);

    await usdc.mint(backer.address, contribution);
    await usdc.connect(backer).approve(await factory.getAddress(), contribution);
    await factory.connect(backer).contributeToRally("rally-2", contribution);

    await escrow.connect(creator).approveAndPay(hunter.address);

    const expectedFee = (REWARD * BigInt(PLATFORM_FEE_BPS)) / 10000n;
    const expectedPayout = REWARD - expectedFee;
    expect(await usdc.balanceOf(hunter.address)).to.equal(expectedPayout);
    expect(await usdc.balanceOf(await feeCollector.getAddress())).to.equal(expectedFee);
  });
});
