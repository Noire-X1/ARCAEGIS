// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract MockOracle {
    address public owner;
    uint256 public price;

    event PriceUpdated(uint256 newPrice);

    constructor(uint256 initialPrice) {
        owner = msg.sender;
        price = initialPrice;
    }

    function setPrice(uint256 newPrice) external {
        require(msg.sender == owner, "Not authorized");
        price = newPrice;
        emit PriceUpdated(newPrice);
    }
}
