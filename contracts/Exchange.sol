//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Token.sol";

contract Exchange {
	
    address public feeAccount;
    uint256 public feePercent;
    mapping(address => mapping(address => uint256)) public tokens;

    event Deposit(address _token, address _user, uint256 _amount, uint256 _balance);
    event Withdraw(address _token, address _user, uint256 _amount, uint256 _balance);

    constructor(address _feeAccount, uint256 _feePercent) {
    	feeAccount = _feeAccount;
    	feePercent = _feePercent;
    }

    // --------------------------
    // DEPOSIT AND WITHDRAW TOKEN

    function depositToken(address _token, uint256 _amount) public {

        require(Token(_token).transferFrom(msg.sender, address(this), _amount));

    	tokens[_token][msg.sender] = tokens[_token][msg.sender] + _amount;

        emit Deposit(_token, msg.sender, _amount, tokens[_token][msg.sender]);

    }

    function withdrawToken(address _token, uint256 _amount) public {

        require(tokens[_token][msg.sender] >= _amount);
        
        Token(_token).transfer(msg.sender, _amount);

        tokens[_token][msg.sender] = tokens[_token][msg.sender] - _amount;

        emit Withdraw(_token, msg.sender, _amount, tokens[_token][msg.sender ]);
    }

    function balanceOf(address _token, address _user) public view returns (uint256) {

        return tokens[_token][_user];
    }


}