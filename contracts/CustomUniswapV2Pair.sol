// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CustomUniswapV2Pair
 * @notice Custom AMM pair with configurable fees for Scream.fun
 * @dev Post-migration fees: 0.3% total (0.15% dev, 0.10% RAGE, 0.05% buyback/burn)
 */
contract CustomUniswapV2Pair is ERC20, ReentrancyGuard {
    uint256 public constant MINIMUM_LIQUIDITY = 10**3;
    uint256 public constant TOTAL_FEE_BPS = 30; // 0.3%
    uint256 public constant DEV_FEE_BPS = 15; // 0.15% (50% of total)
    uint256 public constant RAGE_FEE_BPS = 10; // 0.10% (33% of total)
    uint256 public constant BUYBACK_FEE_BPS = 5; // 0.05% (17% of total)

    address public factory;
    address public token0;
    address public token1;

    uint112 private reserve0;
    uint112 private reserve1;
    uint32 private blockTimestampLast;

    address public feeTo; // Dev wallet
    address public communityFeeTo; // RAGE fund

    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );
    event Sync(uint112 reserve0, uint112 reserve1);
    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);

    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory");
        _;
    }

    constructor() ERC20("Scream LP", "SCREAM-LP") {
        factory = msg.sender;
    }

    function initialize(address _token0, address _token1) external onlyFactory {
        token0 = _token0;
        token1 = _token1;
    }

    function setFeeTo(address _feeTo) external onlyFactory {
        feeTo = _feeTo;
    }

    function setCommunityFeeTo(address _communityFeeTo) external onlyFactory {
        communityFeeTo = _communityFeeTo;
    }

    function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }

    function _update(uint256 balance0, uint256 balance1) private {
        require(balance0 <= type(uint112).max && balance1 <= type(uint112).max, "OVERFLOW");
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = uint32(block.timestamp % 2**32);
        emit Sync(reserve0, reserve1);
    }

    function mint(address to) external nonReentrant returns (uint256 liquidity) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 amount0 = balance0 - _reserve0;
        uint256 amount1 = balance1 - _reserve1;

        uint256 _totalSupply = totalSupply();
        if (_totalSupply == 0) {
            liquidity = sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            _mint(address(0), MINIMUM_LIQUIDITY); // permanently lock the first MINIMUM_LIQUIDITY tokens
        } else {
            liquidity = min((amount0 * _totalSupply) / _reserve0, (amount1 * _totalSupply) / _reserve1);
        }

        require(liquidity > 0, "INSUFFICIENT_LIQUIDITY_MINTED");
        _mint(to, liquidity);

        _update(balance0, balance1);
        emit Mint(msg.sender, amount0, amount1);
    }

    function burn(address to) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        address _token0 = token0;
        address _token1 = token1;
        uint256 balance0 = IERC20(_token0).balanceOf(address(this));
        uint256 balance1 = IERC20(_token1).balanceOf(address(this));
        uint256 liquidity = balanceOf(address(this));

        uint256 _totalSupply = totalSupply();
        amount0 = (liquidity * balance0) / _totalSupply;
        amount1 = (liquidity * balance1) / _totalSupply;

        require(amount0 > 0 && amount1 > 0, "INSUFFICIENT_LIQUIDITY_BURNED");
        _burn(address(this), liquidity);

        IERC20(_token0).transfer(to, amount0);
        IERC20(_token1).transfer(to, amount1);

        balance0 = IERC20(_token0).balanceOf(address(this));
        balance1 = IERC20(_token1).balanceOf(address(this));

        _update(balance0, balance1);
        emit Burn(msg.sender, amount0, amount1, to);
    }

    function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data) external nonReentrant {
        require(amount0Out > 0 || amount1Out > 0, "INSUFFICIENT_OUTPUT_AMOUNT");
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        require(amount0Out < _reserve0 && amount1Out < _reserve1, "INSUFFICIENT_LIQUIDITY");

        uint256 balance0;
        uint256 balance1;
        {
            address _token0 = token0;
            address _token1 = token1;
            require(to != _token0 && to != _token1, "INVALID_TO");

            if (amount0Out > 0) IERC20(_token0).transfer(to, amount0Out);
            if (amount1Out > 0) IERC20(_token1).transfer(to, amount1Out);

            balance0 = IERC20(_token0).balanceOf(address(this));
            balance1 = IERC20(_token1).balanceOf(address(this));
        }

        uint256 amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
        uint256 amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
        require(amount0In > 0 || amount1In > 0, "INSUFFICIENT_INPUT_AMOUNT");

        {
            // Calculate fees: 0.3% total split into dev (0.15%), RAGE (0.10%), buyback (0.05%)
            uint256 totalFee0 = (amount0In * TOTAL_FEE_BPS) / 10000;
            uint256 totalFee1 = (amount1In * TOTAL_FEE_BPS) / 10000;

            // Dev fees (0.15%)
            uint256 devFee0 = (totalFee0 * DEV_FEE_BPS) / TOTAL_FEE_BPS;
            uint256 devFee1 = (totalFee1 * DEV_FEE_BPS) / TOTAL_FEE_BPS;

            // RAGE fees (0.10%)
            uint256 rageFee0 = (totalFee0 * RAGE_FEE_BPS) / TOTAL_FEE_BPS;
            uint256 rageFee1 = (totalFee1 * RAGE_FEE_BPS) / TOTAL_FEE_BPS;

            // Send fees if addresses are set
            if (feeTo != address(0)) {
                if (devFee0 > 0) IERC20(token0).transfer(feeTo, devFee0);
                if (devFee1 > 0) IERC20(token1).transfer(feeTo, devFee1);
            }

            if (communityFeeTo != address(0)) {
                if (rageFee0 > 0) IERC20(token0).transfer(communityFeeTo, rageFee0);
                if (rageFee1 > 0) IERC20(token1).transfer(communityFeeTo, rageFee1);
            }

            // Buyback fees remain in pair for now (could add auto-buyback logic)

            // Adjust balances after fee collection
            balance0 = IERC20(token0).balanceOf(address(this));
            balance1 = IERC20(token1).balanceOf(address(this));

            // Verify constant product formula (with 0.3% fee)
            uint256 balance0Adjusted = (balance0 * 10000) - (amount0In * TOTAL_FEE_BPS);
            uint256 balance1Adjusted = (balance1 * 10000) - (amount1In * TOTAL_FEE_BPS);
            require(
                balance0Adjusted * balance1Adjusted >= uint256(_reserve0) * uint256(_reserve1) * (10000**2),
                "K"
            );
        }

        _update(balance0, balance1);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    function skim(address to) external nonReentrant {
        address _token0 = token0;
        address _token1 = token1;
        IERC20(_token0).transfer(to, IERC20(_token0).balanceOf(address(this)) - reserve0);
        IERC20(_token1).transfer(to, IERC20(_token1).balanceOf(address(this)) - reserve1);
    }

    function sync() external nonReentrant {
        _update(IERC20(token0).balanceOf(address(this)), IERC20(token1).balanceOf(address(this)));
    }

    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function min(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = x < y ? x : y;
    }
}
