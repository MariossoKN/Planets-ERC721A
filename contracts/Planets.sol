// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC721A} from "erc721a/contracts/ERC721A.sol";

contract Planets is ERC721A, Ownable {
    /////////
    // Errors
    /////////
    error Planets__InvalidMintPrice();
    error Planets__MaxMintAmountExceeded();
    error Planets__SoldOut();
    error Planets__WithdrawFailed();
    error Planets__MintIsCurrentlyDisabled();
    error Planets__TooLateForRefund();
    error Planets__AlreadyRefunded();
    error Planets__EthRefundFailed();
    error Planets__CantWithdrawUntilTheRefundPeriodIsActive();
    error Planets__YouAreNotTheOwnerOfThisToken();

    //////////////////
    // State variables
    //////////////////
    uint256 private immutable i_maxSupply;
    uint64 private immutable i_maxMintAmount;
    uint256 private immutable i_mintPriceInWei;
    string private s_uri;

    bool private s_mintStatus = false;

    // Refund variables
    uint256 private immutable i_refundTimeInSeconds;
    mapping(uint256 tokenId => bool refunded) private s_tokenIdToRefunded;
    mapping(uint256 tokenId => uint256 refundTimeStamp) private s_tokenIdToRefundTimeStamp;

    /////////
    // Events
    /////////
    event Mint(address indexed minter, uint256 indexed amount);
    event URIUpdated(string indexed uri);
    event NftRefunded(address indexed owner, uint256 indexed tokenId);

    constructor(
        uint256 _maxSupply,
        uint64 _maxMintAmount,
        uint256 _mintPrice,
        uint256 _refundTimeInSeconds
    ) ERC721A("Planets", "PLANETS") Ownable(msg.sender) {
        i_maxSupply = _maxSupply;
        i_maxMintAmount = _maxMintAmount;
        i_mintPriceInWei = _mintPrice;
        i_refundTimeInSeconds = _refundTimeInSeconds;
    }

    // mints _amount of tokens
    function mint(uint256 _amount) external payable {
        if ((_numberMinted(msg.sender) + _amount) * 1000000000000000000 > i_maxMintAmount) {
            revert Planets__MaxMintAmountExceeded();
        }
        if (msg.value < i_mintPriceInWei * _amount) {
            revert Planets__InvalidMintPrice();
        }
        if ((_totalMinted() + _amount) * 1000000000000000000 > i_maxSupply) {
            revert Planets__SoldOut();
        }
        if (s_mintStatus == false) {
            revert Planets__MintIsCurrentlyDisabled();
        }
        for (uint256 i = 0; i < _amount; i++) {
            s_tokenIdToRefunded[_nextTokenId() + i] = false;
            s_tokenIdToRefundTimeStamp[_nextTokenId() + i] =
                block.timestamp +
                i_refundTimeInSeconds;
        }
        _mint(msg.sender, _amount);
        emit Mint(msg.sender, _amount);
    }

    function setUri(string memory _uri) external onlyOwner {
        s_uri = _uri;
        emit URIUpdated(_uri);
    }

    function _baseURI() internal view override returns (string memory) {
        return s_uri;
    }

    function pauseMint() external onlyOwner {
        s_mintStatus = false;
    }

    function resumeMint() external onlyOwner {
        s_mintStatus = true;
    }

    function _startTokenId() internal pure override returns (uint256) {
        return 1;
    }

    function refundNft(uint256 _tokenId) public payable {
        if (ownerOf(_tokenId) != msg.sender) {
            revert Planets__YouAreNotTheOwnerOfThisToken();
        }
        if (s_tokenIdToRefunded[_tokenId] == true) {
            revert Planets__AlreadyRefunded();
        }
        if (block.timestamp > s_tokenIdToRefundTimeStamp[_tokenId]) {
            revert Planets__TooLateForRefund();
        }
        s_tokenIdToRefunded[_tokenId] = true;

        safeTransferFrom(msg.sender, owner(), _tokenId, "");

        (bool success, ) = payable(msg.sender).call{value: i_mintPriceInWei}("");
        if (!success) {
            revert Planets__EthRefundFailed();
        }
        emit NftRefunded(msg.sender, _tokenId);
    }

    function refundBatch(uint256[] calldata _tokenIds) public payable {
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            refundNft(_tokenIds[i]);
        }
    }

    // lets the owner of the contract to withdraw the funds from the contract
    function withdraw() public onlyOwner {
        if (block.timestamp < s_tokenIdToRefundTimeStamp[_nextTokenId() - 1]) {
            revert Planets__CantWithdrawUntilTheRefundPeriodIsActive();
        }
        uint256 amount = address(this).balance;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) {
            revert Planets__WithdrawFailed();
        }
    }

    function getMaxSupply() public view returns (uint256) {
        return i_maxSupply;
    }

    function getMaxMintAmount() public view returns (uint256) {
        return i_maxMintAmount;
    }

    function getMintPriceInWei() public view returns (uint256) {
        return i_mintPriceInWei;
    }

    function getRefundTimeInSeconds() public view returns (uint256) {
        return i_refundTimeInSeconds;
    }

    function getMintStatus() public view returns (bool) {
        return s_mintStatus;
    }

    function getNumberMinted(address _address) public view returns (uint256) {
        return _numberMinted(_address);
    }

    function getTotalMinted() public view returns (uint256) {
        return _totalMinted();
    }

    function getRefundStatus(uint256 _tokenId) public view returns (bool) {
        return s_tokenIdToRefunded[_tokenId];
    }

    function getTokenRefundTimeStamp(uint256 _tokenId) public view returns (uint256) {
        return s_tokenIdToRefundTimeStamp[_tokenId];
    }

    function getUri() public view returns (string memory) {
        return s_uri;
    }
}
