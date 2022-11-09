const Energy = artifacts.require("Energy");
const Fuel = artifacts.require("Fuel");
const Generator = artifacts.require("Generator");

const { assert } = require("chai");
const chai = require("chai");
const BN = web3.utils.BN;

const chaiBN = require("chai-bn")(BN);
chai.use(chaiBN);

const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

const expect = chai.expect;

contract("Loader test", (accounts) => {
  const [deployer, loader] = accounts;

  it("should mint 100 energy tokens to deployer", async () => {
    let energy = await Energy.deployed();
    const tokens = web3.utils.toWei("100", "ether");

    expect(energy.balanceOf(deployer)).to.eventually.be.a.bignumber.equal(
      new BN(tokens)
    );
  });

  it("should mint a new fuel nft to loader account", async () => {
    let fuel = await Fuel.deployed();

    const balanceOf = await fuel.balanceOf(loader);

    await fuel.safeMint(loader);

    expect(fuel.balanceOf(loader)).to.eventually.be.a.bignumber.equal(
      balanceOf + 1
    );
  });

  it("should stake fuel into generator contract", async () => {
    // init contract instances
    let fuel = await Fuel.deployed();
    let generator = await Generator.deployed();

    // get balance before staking
    let balanceOf = await fuel.balanceOf(loader);

    // approve generator contract to transfer nft from loader
    await fuel.setApprovalForAll(generator.address, true, { from: loader });

    // stake fuel minted on previous test
    await generator.stake(0, { from: loader });

    // Check that the nft was transfered to staking contract
    expect(fuel.balanceOf(loader)).to.eventually.be.a.bignumber.equal(
      new BN(balanceOf - 1)
    );

    // Check that loader has at least one fuel staked
    expect(
      generator.totalFuelLoadedBy(loader)
    ).to.eventually.be.a.bignumber.equal(new BN(1));

    // Check that loader of token 0 is loader account
    expect(generator._loaderOf(0)).to.eventually.be.equal(loader);

    // check that owner of fuelId is staking contract
    expect(fuel.ownerOf(0)).to.eventually.be.equal(generator.address);

    // check owner 2
    expect(generator.ownedByThis(0)).to.eventually.be.equal(true);
  });

  it("should unstake fuel from generator contract", async () => {
    // init contract instances
    let energy = await Energy.deployed();
    let fuel = await Fuel.deployed();
    let generator = await Generator.deployed();

    // set staking contract as minter
    await energy.addMinter(generator.address, { from: deployer });

    // get balance before unstaking
    let balanceOf = await fuel.balanceOf(loader);

    // lets unstake
    await generator.unstake(0, { from: loader });

    expect(fuel.ownerOf(0)).to.eventually.be.equal(loader);

    expect(generator.ownedByThis(0)).to.eventually.be.false;

    // Check that the nft was transfered back from staking contract
    expect(fuel.balanceOf(loader)).to.eventually.be.a.bignumber.equal(
      new BN(balanceOf + 1)
    );

    // Check that loader has no fuel staked
    expect(
      generator.totalFuelLoadedBy(loader)
    ).to.eventually.be.a.bignumber.equal(new BN(0));

    // Check that loader of token 0 is not loader account
    expect(generator._loaderOf(0)).to.eventually.be.not.equal(loader);

    // check that owner of fuelId is loader
    expect(fuel.ownerOf(0)).to.eventually.be.equal(loader);

    // check if pending rewards from token are now zero
    expect(
      generator.getPendingRewards(loader, 0)
    ).to.eventually.be.a.bignumber.equal(new BN(0));
  });

  it("should return pending rewards from staked fuel", async () => {
    let generator = await Generator.deployed();
    let fuel = await Fuel.deployed();

    // stake fuel minted on previous tests
    await generator.stake(0, { from: loader });

    // lets forward 2 blocks by mining 2 transactions (rewards should be 5*3 blocks = 10)
    await fuel.safeMint(loader, { from: deployer });
    await fuel.safeMint(loader, { from: deployer });

    expect(
      generator.getPendingRewards(loader, 0)
    ).to.eventually.be.a.bignumber.equal(new BN(10));
  });

  it("should claim all pending rewards", async () => {
    let energy = await Energy.deployed();
    let generator = await Generator.deployed();

    // lets claim rewards
    await generator.claimAll({ from: loader });

    // check that rewards were minted properly
    const expectedBalance = web3.utils.toWei("25", "ether");
    expect(energy.balanceOf(loader)).to.eventually.be.a.bignumber.equal(
      new BN(expectedBalance)
    );

    // check that pending rewards are now 5 * 1 (block elapsed) = 5
    expect(
      generator.getAllPendingRewards(loader)
    ).to.eventually.be.a.bignumber.equal(new BN(5));
  });
});
