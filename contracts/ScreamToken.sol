// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ScreamToken
 * @notice ERC20 token for meme coins created on Scream.fun
 * @dev Minted tokens are locked in bonding curve until migration
 */
contract ScreamToken is ERC20, Ownable {
    address public bondingCurve;
    bool public tradingEnabled;

    modifier onlyBondingCurve() {
        require(msg.sender == bondingCurve, "Only bonding curve");
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address creator
    ) ERC20(name, symbol) Ownable(creator) {
        bondingCurve = msg.sender;
        _mint(msg.sender, initialSupply);
    }

    function enableTrading() external onlyOwner {
        tradingEnabled = true;
    }

    function _update(address from, address to, uint256 value) internal virtual override {
        if (!tradingEnabled && from != bondingCurve && to != bondingCurve) {
            revert("Trading not enabled");
        }
        super._update(from, to, value);
    }
}
