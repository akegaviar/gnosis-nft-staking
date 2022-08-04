const Energy = artifacts.require("Energy");
const Fuel = artifacts.require("Fuel");
const Generator = artifacts.require("Generator");

module.exports = async function (deployer) {
  await deployer.deploy(Energy);
  await deployer.deploy(Fuel);
  await deployer.deploy(Generator, Fuel.address, Energy.address);
};
