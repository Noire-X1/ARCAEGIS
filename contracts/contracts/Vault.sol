// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract Vault {
    enum State { ACTIVE, RESTRICTED, FROZEN }
    State public state;
    address public policyEngine;
    IERC20 public goldToken;
    mapping(address => uint256) public balances;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event Restricted();
    event Frozen();
    event Recovered();

    modifier onlyPolicyEngine() {
        require(msg.sender == policyEngine, "Not authorized");
        _;
    }

    constructor(address _goldToken) {
        policyEngine = msg.sender;
        state = State.ACTIVE;
        goldToken = IERC20(_goldToken);
    }

    // was payable/no-args before — now pulls ERC20 gold tokens via
    // transferFrom, which requires the user to have called
    // goldToken.approve(vaultAddress, amount) first
    function deposit(uint256 amount) external {
        require(state != State.FROZEN, "Vault is frozen");
        require(goldToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        balances[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external {
        require(state == State.ACTIVE, "Withdrawals not allowed in current state");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        require(goldToken.transfer(msg.sender, amount), "Transfer failed");
        emit Withdrawn(msg.sender, amount);
    }

    // unchanged from before — this is the logic already proven onchain
    function restrict() external onlyPolicyEngine {
        state = State.RESTRICTED;
        emit Restricted();
    }

    function freeze() external onlyPolicyEngine {
        state = State.FROZEN;
        emit Frozen();
    }

    function recover() external onlyPolicyEngine {
        state = State.ACTIVE;
        emit Recovered();
    }
}
