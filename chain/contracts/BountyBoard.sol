// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract BountyBoard {
    struct Repo {
        string repoUrl;
        address owner;
        bool exists;
        uint256 pool;
        uint256[] issueIds;
    }

    struct Bounty {
        uint256 repoId;
        uint256 issueId;
        string issueUrl;
        uint256 amount;
        address creator;
        address recipient;
        bool claimed;
        bool exists;
    }

    mapping(uint256 => Repo) private repos;
    uint256[] private repoIds;
    mapping(bytes32 => Bounty) private bounties;

    event RepoRegistered(uint256 indexed repoId, string repoUrl, address indexed owner);
    event RepoDonation(uint256 indexed repoId, uint256 amount, address indexed donor);
    event BountyCreated(uint256 indexed repoId, uint256 indexed issueId, string issueUrl, uint256 amount, address indexed creator);
    event BountyClaimed(uint256 indexed repoId, uint256 indexed issueId, address indexed recipient, uint256 amount);

    function _key(uint256 repoId, uint256 issueId) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(repoId, issueId));
    }

    function registerRepo(uint256 repoId, string calldata repoUrl) external {
        require(repoId > 0, 'Invalid repoId');
        require(bytes(repoUrl).length > 0, 'repoUrl required');
        require(!repos[repoId].exists, 'Repo already registered');

        Repo storage repo = repos[repoId];
        repo.repoUrl = repoUrl;
        repo.owner = msg.sender;
        repo.exists = true;

        repoIds.push(repoId);

        emit RepoRegistered(repoId, repoUrl, msg.sender);
    }

    function donateToRepo(uint256 repoId) external payable {
        require(repos[repoId].exists, 'Repo not registered');
        require(msg.value > 0, 'Donation amount must be > 0');

        repos[repoId].pool += msg.value;
        emit RepoDonation(repoId, msg.value, msg.sender);
    }

    function createBounty(
        uint256 repoId,
        uint256 issueId,
        string calldata issueUrl
    ) external payable {
        require(repos[repoId].exists, 'Repo not registered');
        require(issueId > 0, 'Invalid issueId');
        require(bytes(issueUrl).length > 0, 'issueUrl required');
        require(msg.value > 0, 'Bounty amount must be > 0');

        bytes32 key = _key(repoId, issueId);
        require(!bounties[key].exists, 'Bounty already exists');

        bounties[key] = Bounty({
            repoId: repoId,
            issueId: issueId,
            issueUrl: issueUrl,
            amount: msg.value,
            creator: msg.sender,
            recipient: address(0),
            claimed: false,
            exists: true
        });

        repos[repoId].issueIds.push(issueId);

        emit BountyCreated(repoId, issueId, issueUrl, msg.value, msg.sender);
    }

    function claimBounty(
        uint256 repoId,
        uint256 issueId,
        address payable recipient
    ) external {
        require(recipient != address(0), 'Invalid recipient');

        bytes32 key = _key(repoId, issueId);
        Bounty storage bounty = bounties[key];
        require(bounty.exists, 'Bounty not found');
        require(!bounty.claimed, 'Bounty already claimed');

        Repo storage repo = repos[repoId];
        require(
            msg.sender == bounty.creator || msg.sender == repo.owner,
            'Only repo owner or bounty creator'
        );

        bounty.claimed = true;
        bounty.recipient = recipient;

        uint256 amount = bounty.amount;
        (bool sent, ) = recipient.call{value: amount}("");
        require(sent, 'Transfer failed');

        emit BountyClaimed(repoId, issueId, recipient, amount);
    }

    function getRepoIds() external view returns (uint256[] memory) {
        return repoIds;
    }

    function getRepo(uint256 repoId)
        external
        view
        returns (
            string memory repoUrl,
            address owner,
            bool exists,
            uint256 pool,
            uint256[] memory issueIds
        )
    {
        Repo storage repo = repos[repoId];
        return (repo.repoUrl, repo.owner, repo.exists, repo.pool, repo.issueIds);
    }

    function getRepoIssueIds(uint256 repoId) external view returns (uint256[] memory) {
        return repos[repoId].issueIds;
    }

    function getBounty(uint256 repoId, uint256 issueId)
        external
        view
        returns (
            bool exists,
            string memory issueUrl,
            uint256 amount,
            address creator,
            address recipient,
            bool claimed
        )
    {
        Bounty storage bounty = bounties[_key(repoId, issueId)];
        return (
            bounty.exists,
            bounty.issueUrl,
            bounty.amount,
            bounty.creator,
            bounty.recipient,
            bounty.claimed
        );
    }
}
