// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title WMON (Wrapped MON)
 * @notice Wraps native MON into an ERC20 token
 * @dev Follows WETH9 standard for compatibility with DEXes
 */
contract WMON is ERC20 {
    event Deposit(address indexed dst, uint256 wad);
    event Withdrawal(address indexed src, uint256 wad);

    constructor() ERC20("Wrapped MON", "WMON") {}

    /**
     * @notice Deposit native MON and receive WMON
     */
    function deposit() public payable {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @notice Withdraw WMON and receive native MON
     */
    function withdraw(uint256 wad) public {
        require(balanceOf(msg.sender) >= wad, "Insufficient balance");
        _burn(msg.sender, wad);
        (bool success, ) = msg.sender.call{value: wad}("");
        require(success, "Transfer failed");
        emit Withdrawal(msg.sender, wad);
    }

    /**
     * @notice Allow contract to receive native MON
     */
    receive() external payable {
        deposit();
    }

    /**
     * @notice Fallback function
     */
    fallback() external payable {
        deposit();
    }
}
