// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Energy.sol";
import "./Fuel.sol";

struct Loader {
    uint256[] fuelIds;
    mapping(uint256 => uint256) loadBlock;
}

contract Generator is Ownable, ReentrancyGuard, IERC721Receiver {
    Fuel fuel;
    Energy energy;

    uint256 rewardsPerBlock = 5;

    mapping(address => Loader) loaders;

    // Enumeration of fuelIds staked indexes of a loader
    mapping(address => mapping(uint256 => uint256)) public fuelIdIndex;

    // tracks owner of a fuelId
    mapping(uint256 => address) public loaderOf;

    constructor(address _fuel, address _energy) {
        fuel = Fuel(_fuel);
        energy = Energy(_energy);
    }

    function stake(uint256 fuelId) public nonReentrant {
        // safe checks
        require(
            fuel.ownerOf(fuelId) == msg.sender,
            "You're not the owner of this NFT"
        );

        // push new token to staking collection
        loaders[msg.sender].fuelIds.push(fuelId);

        // updates index reference of fuelId
        uint256 totalFuel = loaders[msg.sender].fuelIds.length;
        fuelIdIndex[msg.sender][fuelId] = totalFuel - 1;

        // inits staking block
        loaders[msg.sender].loadBlock[fuelId] = block.number;

        // add it to reference
        loaderOf[fuelId] = msg.sender;

        fuel.safeTransferFrom(address(msg.sender), address(this), fuelId);
    }

    function unstake(uint256 fuelId) public nonReentrant {
        // safe checks
        require(ownedByThis(fuelId), "This fuel is not being loaded here!");

        require(
            _loaderOf(fuelId) == address(msg.sender),
            "You haven't loaded this fuel here!"
        );

        uint256 lastFuelIndex = loaders[msg.sender].fuelIds.length - 1;
        uint256 fuelIndex = fuelIdIndex[msg.sender][fuelId];

        // swap current fuelId to last position
        if (lastFuelIndex != fuelIndex) {
            uint256 lastFuelId = loaders[msg.sender].fuelIds[lastFuelIndex];

            loaders[msg.sender].fuelIds[fuelIndex] = lastFuelIndex; // Move the last token to the slot of the to-delete token
            fuelIdIndex[msg.sender][lastFuelId] = fuelIndex; // Update the moved token's index
        }

        // remove the last element from mapping and array
        delete fuelIdIndex[msg.sender][fuelId];
        delete loaders[msg.sender].fuelIds[lastFuelIndex];

        delete loaders[msg.sender].loadBlock[fuelId];
        delete loaderOf[fuelId];

        // Transfer back to the owner
        fuel.safeTransferFrom(address(this), address(msg.sender), fuelId);
        claim(fuelId);
    }

    function claim(uint256 fuelId) public {
        // safe checks
        require(ownedByThis(fuelId), "This fuel is not being loaded here!");

        require(
            _loaderOf(fuelId) == address(msg.sender),
            "You haven't loaded this fuel here!"
        );

        uint256 rewardsToClaim = getPendingRewards(msg.sender, fuelId);
        energy.mintRewards(msg.sender, rewardsToClaim);

        loaders[msg.sender].loadBlock[fuelId] = block.number;
    }

    function claimAll() public nonReentrant {
        // safe checks
        require(
            loaders[msg.sender].fuelIds.length > 0,
            "You have no fuel loaded here!"
        );

        uint256 totalFuelLoaded = totalFuelLoadedBy(msg.sender);

        for (uint256 i = 0; i < totalFuelLoaded; i++) {
            uint256 fuelId = loaders[msg.sender].fuelIds[i];
            claim(fuelId);
        }
    }

    function getPendingRewards(address account, uint256 fuelId)
        public
        view
        returns (uint256)
    {
        uint256 loadBlock = loaders[account].loadBlock[fuelId];
        uint256 blocksElapsed = block.number - loadBlock;

        return blocksElapsed * rewardsPerBlock;
    }

    function getAllPendingRewards() public view returns (uint256) {
        uint256 totalFuelLoaded = totalFuelLoadedBy(msg.sender);

        uint256 totalRewards = 0;
        for (uint256 i = 0; i < totalFuelLoaded; i++) {
            uint256 fuelId = loaders[msg.sender].fuelIds[i];
            totalRewards += getPendingRewards(msg.sender, fuelId);
        }

        return totalRewards;
    }

    function _loaderOf(uint256 fuelId) public view returns (address) {
        return loaderOf[fuelId];
    }

    function totalFuelLoadedBy(address account) public view returns (uint256) {
        return loaders[account].fuelIds.length;
    }

    function generatorAddress() public view returns (address) {
        return address(this);
    }

    function ownedByThis(uint256 fuelId) public view returns (bool) {
        return address(fuel.ownerOf(fuelId)) == generatorAddress();
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 fuelId,
        bytes calldata data
    ) external override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
