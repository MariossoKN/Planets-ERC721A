// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 * @author Mariosso
 * @title Planets (ERC721A)
 * @notice This contract allows users to mint Planets NFTs. The contract uses ERC721A for gas efficient batch mint.
 * The contract also has these features:
 *      NFT refund: which allows minters to refund their NFTs in specified refund time period. After calling this
 *      function the caller recieves back their ETH and the NFTs are transfered to the contract owner;
 *      PAUSE/RESUME of the mint process - only allowed by the contract owner;
 *      SET URI - allows contract owner to set and change the URI.
 *      WITHDRAW ETH - allows contract owner to withdraw ETH from the contract, but only if the refund time
 *      period for the last minted NFT is passed.
 * The max supply, max mint amount per user, mint price and refund time period are set by the deployer
 * inside constructor.
 *
 * Ownable: allows the owner to set some functions to be callable by only owner. Also allows the owner to
 * transfer ownership of the contract.
 *
 */

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
    uint256 private immutable i_mintPriceInWei;
    uint64 private immutable i_maxMintAmount;
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

    /**
     * @dev Mints given amount of tokens. Requires msg.value to be equal to _amount * i_mintPriceInWei
     * Emits Mint event
     * @param _amount number of tokens to mint
     */
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

    /**
     * @dev Allows contract owner to pause minting. Only owner function.
     */
    function pauseMint() external onlyOwner {
        s_mintStatus = false;
    }

    /**
     * @dev Allows contract owner to resume minting. Only owner function.
     */
    function resumeMint() external onlyOwner {
        s_mintStatus = true;
    }

    /**
     * @dev Allows the owner of the contract to withdraw the funds from the contract. Only possible after
     * the refund time period for the last minted NFT is passed. Only owner function.
     */
    function withdraw() external onlyOwner {
        if (block.timestamp < s_tokenIdToRefundTimeStamp[_nextTokenId() - 1]) {
            revert Planets__CantWithdrawUntilTheRefundPeriodIsActive();
        }
        uint256 amount = address(this).balance;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) {
            revert Planets__WithdrawFailed();
        }
    }

    /**
     * @dev Allows contract owner to set and change the URI. Only owner function. Emits URIUpdated event.
     * @param _uri URI of the Planet NFTs
     */
    function setUri(string memory _uri) external onlyOwner {
        s_uri = _uri;
        emit URIUpdated(_uri);
    }

    /**
     * @dev Returns the base URI of the contract.
     */
    function _baseURI() internal view override returns (string memory) {
        return s_uri;
    }

    /**
     * @dev Returns the starting token id.
     */
    function _startTokenId() internal pure override returns (uint256) {
        return 1;
    }

    /**
     * @dev Allows the caller to refund one specific NFT which is than sent to contract owner. The caller
     * recieves back the mint amount in ETH. Emits NftRefunded event.
     * @param _tokenId ID of the refunded NFT.
     */
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

    /**
     * @dev Allows the caller to refund multiple NFTs which are than sent to contract owner. The caller
     * recieves back the mint amount in ETH.
     * @param _tokenIds An array of IDs of the refunded NFTs.
     */
    function refundBatch(uint256[] calldata _tokenIds) public payable {
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            refundNft(_tokenIds[i]);
        }
    }

    ///////////////////
    // Getter functions
    ///////////////////
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
