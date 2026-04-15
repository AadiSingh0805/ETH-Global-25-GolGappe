import {
  formatEth,
  formatTokenAmount,
  getTokenDecimals,
  getBountyBoardContract,
  getLocalSwapContracts,
  getProvider,
  getSigner,
  getSwapTargetForCurrency,
  maybeAutofundSigner,
  isBlockchainEnabled,
  parseEth
} from '../config/blockchain.js';

class BountyService {
  constructor() {
    this.repoMetadataStore = new Map(); // cid -> metadata
    this.registeredRepos = new Map(); // repoId -> repo data (local fallback)
    this.projectPools = new Map(); // repoId -> numeric amount (local fallback)
    this.bountiesByRepo = new Map(); // repoId -> Map(issueId -> bounty) (local fallback)
    this.bountyMetadataStore = new Map(); // metadataId -> bounty metadata snapshot
  }

  generateId(prefix, repoId, issueId = 0) {
    return `local-${prefix}-${repoId}-${issueId}-${Date.now()}`;
  }

  getRepoBountyMap(repoId) {
    if (!this.bountiesByRepo.has(repoId)) {
      this.bountiesByRepo.set(repoId, new Map());
    }
    return this.bountiesByRepo.get(repoId);
  }

  setRepoMetadata(cid, metadata) {
    if (cid) {
      this.repoMetadataStore.set(cid, metadata);
    }
  }

  getRepoMetadataByRepoId(repoId) {
    for (const metadata of this.repoMetadataStore.values()) {
      if (Number(metadata?.repoId) === Number(repoId)) {
        return metadata;
      }
    }
    return null;
  }

  deriveRepoUrlForRegistration(repoId, metadata, issueUrl) {
    if (metadata?.html_url) {
      return metadata.html_url;
    }

    if (metadata?.fullName) {
      return `https://github.com/${metadata.fullName}`;
    }

    if (issueUrl && issueUrl.includes('/issues/')) {
      return issueUrl.split('/issues/')[0];
    }

    return null;
  }

  async ensureBountyBoardDeployed() {
    const address = process.env.BOUNTY_BOARD_ADDRESS;
    if (!address) {
      throw new Error('BOUNTY_BOARD_ADDRESS is not configured');
    }

    const code = await getProvider().getCode(address);
    if (!code || code === '0x') {
      throw new Error(
        'BountyBoard contract is not deployed at BOUNTY_BOARD_ADDRESS. If Hardhat node was restarted, run `cd chain && npm run deploy:local` and update backend/.env with the new address.'
      );
    }
  }

  async registerRepository(repoData) {
    if (isBlockchainEnabled()) {
      try {
        await this.ensureBountyBoardDeployed();
        const numericRepoId = Number(repoData.repoId);
        if (!numericRepoId || !repoData.cid) {
          throw new Error('Repository ID and metadata ID are required');
        }

        const metadata = this.repoMetadataStore.get(repoData.cid) || null;
        const repoUrl =
          metadata?.html_url ||
          (metadata?.fullName ? `https://github.com/${metadata.fullName}` : null);

        if (!repoUrl) {
          throw new Error('Repository URL missing. List repository metadata must include html_url or fullName');
        }

        const contract = getBountyBoardContract(getSigner());
        const tx = await contract.registerRepo(numericRepoId, repoUrl);
        const receipt = await tx.wait();

        return {
          success: true,
          data: {
            repoId: numericRepoId,
            cid: repoData.cid,
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed?.toString() || null
          },
          message: 'Repository registered on blockchain'
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to register repository on blockchain'
        };
      }
    }

    try {
      if (!repoData.repoId || !repoData.cid) {
        throw new Error('Repository ID and CID are required');
      }

      const existing = this.registeredRepos.get(repoData.repoId) || {};
      const merged = {
        ...existing,
        repoId: Number(repoData.repoId),
        cid: repoData.cid,
        isPublic: repoData.isPublic !== false,
        issueIds: repoData.issueIds || existing.issueIds || [],
        createdAt: existing.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.registeredRepos.set(repoData.repoId, merged);

      return {
        success: true,
        data: {
          repoId: Number(repoData.repoId),
          cid: repoData.cid,
          transactionHash: this.generateId('tx-register', repoData.repoId),
          blockNumber: null,
          gasUsed: null
        },
        message: 'Repository registered successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to register repository'
      };
    }
  }

  async getListedRepositories() {
    if (isBlockchainEnabled()) {
      try {
        await this.ensureBountyBoardDeployed();
        const contract = getBountyBoardContract();
        const chainRepoIds = await contract.getRepoIds();

        const data = [];
        for (const chainRepoId of chainRepoIds) {
          const numericRepoId = Number(chainRepoId);
          const [repoUrl, owner, exists, pool, issueIds] = await contract.getRepo(numericRepoId);
          if (!exists) {
            continue;
          }

          const metadata = this.getRepoMetadataByRepoId(numericRepoId);

          data.push({
            blockchainId: numericRepoId,
            cid: metadata ? `local-repo-${numericRepoId}` : null,
            owner,
            isPublic: true,
            issueIds: issueIds.map((id) => Number(id)),
            metadata,
            githubId: numericRepoId,
            name: metadata?.name || repoUrl,
            fullName: metadata?.fullName || repoUrl,
            repoUrl,
            projectPoolEth: formatEth(pool)
          });
        }

        return {
          success: true,
          data,
          total: data.length
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to fetch listed repositories from blockchain'
        };
      }
    }

    try {
      const data = Array.from(this.registeredRepos.values()).map((repo) => {
        const metadata = this.repoMetadataStore.get(repo.cid) || null;
        const repoBounties = this.getRepoBountyMap(repo.repoId);

        return {
          blockchainId: repo.repoId,
          cid: repo.cid,
          owner: metadata?.owner?.username || metadata?.owner || 'unknown',
          isPublic: repo.isPublic,
          issueIds: Array.from(repoBounties.keys()),
          metadata,
          githubId: metadata?.repoId || repo.repoId,
          name: metadata?.name || null,
          fullName: metadata?.fullName || null
        };
      });

      return {
        success: true,
        data,
        total: data.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to fetch listed repositories'
      };
    }
  }

  async findBlockchainRepoId(githubRepoId) {
    const listed = await this.getListedRepositories();
    if (!listed.success) {
      return { success: false, error: listed.error || 'Failed to fetch repositories' };
    }

    const match = listed.data.find((r) => Number(r.githubId) === Number(githubRepoId));
    if (match) {
      return {
        success: true,
        blockchainRepoId: match.blockchainId,
        repoData: match
      };
    }

    return {
      success: false,
      error: `Repository with GitHub ID ${githubRepoId} not listed`,
      availableRepos: listed.data.map((r) => ({
        blockchainId: r.blockchainId,
        githubId: r.githubId,
        name: r.name
      }))
    };
  }

  async createBounty(bountyData) {
    if (isBlockchainEnabled()) {
      try {
        await this.ensureBountyBoardDeployed();
        if (!bountyData.repoId || !bountyData.issueId || !bountyData.amount) {
          throw new Error('Repository ID, issue ID, and amount are required');
        }

        const repoId = Number(bountyData.repoId);
        const issueId = Number(bountyData.issueId);
        const amount = Number(bountyData.amount);

        if (amount <= 0) {
          throw new Error('Bounty amount must be positive');
        }

        const metadata = this.getRepoMetadataByRepoId(repoId);
        const issueUrl =
          bountyData.issueUrl ||
          (metadata?.html_url ? `${metadata.html_url}/issues/${issueId}` : `repo-${repoId}-issue-${issueId}`);

        const signer = await maybeAutofundSigner(parseEth(amount));
        const contract = getBountyBoardContract(signer);

        const [, , repoExists] = await contract.getRepo(repoId);
        if (!repoExists) {
          const repoUrl = this.deriveRepoUrlForRegistration(repoId, metadata, bountyData.issueUrl);
          if (!repoUrl) {
            throw new Error('Repository is not registered and repo URL could not be determined for auto-registration');
          }

          const registerTx = await contract.registerRepo(repoId, repoUrl);
          await registerTx.wait();
        }

        const tx = await contract.createBounty(repoId, issueId, issueUrl, {
          value: parseEth(amount)
        });
        const receipt = await tx.wait();

        const metadataCID = this.generateId('bounty', repoId, issueId);
        const bounty = {
          repoId,
          issueId,
          amount,
          currency: 'ETH',
          title: bountyData.title || `Issue #${issueId}`,
          issueUrl,
          description: bountyData.description || '',
          status: 'open',
          assignee: null,
          creator: bountyData.creator || null,
          requirements: bountyData.requirements || [],
          deadline: bountyData.deadline || null,
          metadataCID,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          paid: false,
          transactionHash: tx.hash
        };

        this.bountyMetadataStore.set(metadataCID, bounty);

        return {
          success: true,
          data: {
            bounty: {
              ...bounty,
              githubRepoId: repoId,
              blockchainRepoId: repoId,
              paymentMethod: 'onchain'
            },
            metadataCID,
            ipfsUrl: null,
            assignTransactionHash: tx.hash,
            fundTransactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed?.toString() || null
          },
          message: 'Bounty created on blockchain'
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to create bounty on blockchain'
        };
      }
    }

    try {
      if (!bountyData.repoId || !bountyData.issueId || !bountyData.amount) {
        throw new Error('Repository ID, issue ID, and amount are required');
      }

      const repoId = Number(bountyData.repoId);
      const issueId = Number(bountyData.issueId);
      const amount = Number(bountyData.amount);

      if (amount <= 0) {
        throw new Error('Bounty amount must be positive');
      }

      const repoMap = this.getRepoBountyMap(repoId);
      const metadataCID = this.generateId('bounty', repoId, issueId);

      const bounty = {
        repoId,
        issueId,
        amount,
        currency: 'USD',
        title: bountyData.title || `Issue #${issueId}`,
        description: bountyData.description || '',
        status: 'open',
        assignee: null,
        creator: bountyData.creator || null,
        requirements: bountyData.requirements || [],
        deadline: bountyData.deadline || null,
        metadataCID,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        paid: false
      };

      repoMap.set(issueId, bounty);
      this.bountyMetadataStore.set(metadataCID, bounty);

      // Auto-register repo if it wasn't listed yet.
      if (!this.registeredRepos.has(repoId)) {
        this.registeredRepos.set(repoId, {
          repoId,
          cid: this.generateId('repo', repoId),
          isPublic: true,
          issueIds: [issueId],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      const registered = this.registeredRepos.get(repoId);
      const issueIds = new Set([...(registered.issueIds || []), issueId]);
      registered.issueIds = Array.from(issueIds);
      registered.updatedAt = new Date().toISOString();
      this.registeredRepos.set(repoId, registered);

      return {
        success: true,
        data: {
          bounty: {
            ...bounty,
            githubRepoId: repoId,
            blockchainRepoId: repoId,
            paymentMethod: 'manual'
          },
          metadataCID,
          ipfsUrl: null,
          assignTransactionHash: this.generateId('tx-assign', repoId, issueId),
          fundTransactionHash: null,
          blockNumber: null,
          gasUsed: null,
          paymentNote: 'Stored in local backend store'
        },
        message: 'Bounty created successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to create bounty'
      };
    }
  }

  async getRepositoryBounties(repoId) {
    if (isBlockchainEnabled()) {
      try {
        await this.ensureBountyBoardDeployed();
        const numericRepoId = Number(repoId);
        const contract = getBountyBoardContract();

        const [, , exists, pool, issueIds] = await contract.getRepo(numericRepoId);
        if (!exists) {
          return {
            success: true,
            data: {
              repoId: numericRepoId,
              projectPool: {
                balance: '0',
                balanceWei: '0',
                balanceFIL: '0',
                currency: 'ETH'
              },
              bounties: []
            },
            bounties: [],
            message: 'Repository not registered on blockchain'
          };
        }

        const metadata = this.getRepoMetadataByRepoId(numericRepoId);
        const bounties = [];

        for (const rawIssueId of issueIds) {
          const issueId = Number(rawIssueId);
          const [bExists, issueUrl, amountWei, creator, recipient, claimed] = await contract.getBounty(numericRepoId, issueId);
          if (!bExists) {
            continue;
          }

          bounties.push({
            repoId: numericRepoId,
            issueId,
            issueUrl,
            amount: Number(formatEth(amountWei)),
            amountWei: amountWei.toString(),
            currency: 'ETH',
            creator,
            assignee: recipient !== '0x0000000000000000000000000000000000000000' ? recipient : null,
            status: claimed ? 'completed' : 'open',
            paid: claimed,
            title: `Issue #${issueId}`,
            description: metadata?.description || ''
          });
        }

        const poolEth = formatEth(pool);
        return {
          success: true,
          data: {
            repoId: numericRepoId,
            projectPool: {
              balance: poolEth,
              balanceWei: pool.toString(),
              balanceFIL: poolEth,
              currency: 'ETH'
            },
            bounties
          },
          bounties,
          message: 'Repository bounties retrieved from blockchain'
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to retrieve repository bounties from blockchain'
        };
      }
    }

    try {
      const numericRepoId = Number(repoId);
      const repoMap = this.getRepoBountyMap(numericRepoId);
      const bounties = Array.from(repoMap.values());
      const pool = this.projectPools.get(numericRepoId) || 0;

      return {
        success: true,
        data: {
          repoId: numericRepoId,
          projectPool: {
            balance: pool.toString(),
            balanceWei: null,
            balanceFIL: pool.toString(),
            currency: 'USD'
          },
          bounties
        },
        bounties,
        message: 'Repository bounties retrieved'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve repository bounties'
      };
    }
  }

  async getBounty(repoId, issueId) {
    if (isBlockchainEnabled()) {
      try {
        await this.ensureBountyBoardDeployed();
        const contract = getBountyBoardContract();
        const [exists, , amountWei, , , claimed] = await contract.getBounty(Number(repoId), Number(issueId));
        if (!exists) {
          throw new Error('Bounty not found');
        }

        return {
          success: true,
          data: {
            repoId: Number(repoId),
            issueId: Number(issueId),
            amount: formatEth(amountWei),
            amountWei: amountWei.toString(),
            isPaid: claimed
          },
          message: 'Bounty information retrieved'
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to retrieve bounty information'
        };
      }
    }

    try {
      const repoMap = this.getRepoBountyMap(Number(repoId));
      const bounty = repoMap.get(Number(issueId));
      if (!bounty) {
        throw new Error('Bounty not found');
      }

      return {
        success: true,
        data: {
          repoId: Number(repoId),
          issueId: Number(issueId),
          amount: bounty.amount.toString(),
          amountWei: null,
          isPaid: bounty.paid
        },
        message: 'Bounty information retrieved'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve bounty information'
      };
    }
  }

  async completeBounty(repoId, issueId, contributorAddress, payoutCurrency = 'ETH') {
    if (isBlockchainEnabled()) {
      try {
        await this.ensureBountyBoardDeployed();
        if (!contributorAddress) {
          throw new Error('Contributor address is required');
        }

        const normalizedPayoutCurrency = String(payoutCurrency || 'ETH').trim().toUpperCase();
        const signer = await maybeAutofundSigner(0n);
        const signerAddress = await signer.getAddress();
        const contract = getBountyBoardContract(signer);

        const [exists, , amountWei, , , claimed] = await contract.getBounty(Number(repoId), Number(issueId));
        if (!exists) {
          throw new Error('Bounty not found on-chain');
        }
        if (claimed) {
          throw new Error('Bounty already claimed');
        }

        if (normalizedPayoutCurrency === 'ETH') {
          const tx = await contract.claimBounty(Number(repoId), Number(issueId), contributorAddress);
          const receipt = await tx.wait();

          return {
            success: true,
            data: {
              bounty: {
                repoId: Number(repoId),
                issueId: Number(issueId),
                assignee: contributorAddress,
                status: 'completed',
                paid: true,
                payoutCurrency: 'ETH'
              },
              metadataCID: null,
              ipfsUrl: null,
              transactionHash: tx.hash,
              blockNumber: receipt.blockNumber,
              gasUsed: receipt.gasUsed?.toString() || null
            },
            message: 'Bounty claimed and transferred on-chain'
          };
        }

        // For token payout: claim ETH to signer first, then swap ETH->token and transfer token.
        const claimTx = await contract.claimBounty(Number(repoId), Number(issueId), signerAddress);
        const claimReceipt = await claimTx.wait();

        const swapContracts = getLocalSwapContracts(signer);
        const swapTarget = getSwapTargetForCurrency(normalizedPayoutCurrency);
        if (!swapTarget.tokenKey || !swapTarget.poolKey) {
          throw new Error(`Unsupported payout currency: ${normalizedPayoutCurrency}`);
        }

        const payoutToken = swapContracts[swapTarget.tokenKey];
        const pool = swapContracts[swapTarget.poolKey];
        if (!payoutToken || !pool) {
          throw new Error(`Swap contracts unavailable for ${swapTarget.symbol}. Re-run local deployment.`);
        }

        const wethAddress = await swapContracts.weth.getAddress();
        const tokenAddress = await payoutToken.getAddress();
        const token0 = await pool.token0();
        const token1 = await pool.token1();

        let token0ToToken1;
        if (token0.toLowerCase() === wethAddress.toLowerCase() && token1.toLowerCase() === tokenAddress.toLowerCase()) {
          token0ToToken1 = true;
        } else if (token1.toLowerCase() === wethAddress.toLowerCase() && token0.toLowerCase() === tokenAddress.toLowerCase()) {
          token0ToToken1 = false;
        } else {
          throw new Error(`Selected pool does not match WETH/${swapTarget.symbol}`);
        }

        const tokenBalanceBefore = await payoutToken.balanceOf(signerAddress);

        await (await swapContracts.weth.deposit({ value: amountWei })).wait();
        await (await swapContracts.weth.approve(await pool.getAddress(), amountWei)).wait();

        const quotedOut = await pool.getAmountOut(amountWei, token0ToToken1);
        const minAmountOut = (quotedOut * 99n) / 100n;

        if (token0ToToken1) {
          await (await pool.swapToken0ForToken1(amountWei, minAmountOut)).wait();
        } else {
          await (await pool.swapToken1ForToken0(amountWei, minAmountOut)).wait();
        }

        const tokenBalanceAfter = await payoutToken.balanceOf(signerAddress);
        const tokenOutAmount = tokenBalanceAfter - tokenBalanceBefore;
        if (tokenOutAmount <= 0n) {
          throw new Error(`Swap output is zero for ${swapTarget.symbol}`);
        }

        const payoutTokenDecimals = await getTokenDecimals(payoutToken);

        await (await payoutToken.transfer(contributorAddress, tokenOutAmount)).wait();

        return {
          success: true,
          data: {
            bounty: {
              repoId: Number(repoId),
              issueId: Number(issueId),
              assignee: contributorAddress,
              status: 'completed',
              paid: true,
              payoutCurrency: swapTarget.symbol,
              payoutTokenAmount: tokenOutAmount.toString(),
              payoutTokenAmountDisplay: formatTokenAmount(tokenOutAmount, payoutTokenDecimals)
            },
            metadataCID: null,
            ipfsUrl: null,
            transactionHash: claimTx.hash,
            blockNumber: claimReceipt.blockNumber,
            gasUsed: claimReceipt.gasUsed?.toString() || null
          },
          message: `Bounty claimed, swapped to ${swapTarget.symbol}, and transferred on-chain`
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to claim bounty on-chain'
        };
      }
    }

    try {
      const repoMap = this.getRepoBountyMap(Number(repoId));
      const bounty = repoMap.get(Number(issueId));
      if (!bounty) {
        throw new Error('Bounty not found');
      }

      bounty.status = 'completed';
      bounty.paid = true;
      bounty.assignee = contributorAddress || bounty.assignee;
      bounty.completedAt = new Date().toISOString();
      bounty.updatedAt = new Date().toISOString();

      repoMap.set(Number(issueId), bounty);
      this.bountyMetadataStore.set(bounty.metadataCID, bounty);

      return {
        success: true,
        data: {
          bounty,
          metadataCID: bounty.metadataCID,
          ipfsUrl: null,
          transactionHash: this.generateId('tx-complete', repoId, issueId),
          blockNumber: null,
          gasUsed: null
        },
        message: 'Bounty completed successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to complete bounty and release payment'
      };
    }
  }

  async estimateBountyPayout(repoId, issueId, payoutCurrency = 'ETH') {
    if (isBlockchainEnabled()) {
      try {
        await this.ensureBountyBoardDeployed();

        const normalizedPayoutCurrency = String(payoutCurrency || 'ETH').trim().toUpperCase();
        const contract = getBountyBoardContract(getProvider());
        const [exists, , amountWei, , , claimed] = await contract.getBounty(Number(repoId), Number(issueId));

        if (!exists) {
          throw new Error('Bounty not found on-chain');
        }

        const estimate = {
          repoId: Number(repoId),
          issueId: Number(issueId),
          payoutCurrency: normalizedPayoutCurrency,
          bountyEth: amountWei.toString(),
          bountyEthDisplay: formatEth(amountWei),
          estimatedOutput: amountWei.toString(),
          estimatedOutputDisplay: formatEth(amountWei),
          isPaid: claimed
        };

        if (normalizedPayoutCurrency === 'ETH') {
          return {
            success: true,
            data: estimate,
            message: 'ETH payout estimate retrieved'
          };
        }

        const swapContracts = getLocalSwapContracts(getProvider());
        const swapTarget = getSwapTargetForCurrency(normalizedPayoutCurrency);

        if (!swapTarget.tokenKey || !swapTarget.poolKey) {
          throw new Error(`Unsupported payout currency: ${normalizedPayoutCurrency}`);
        }

        const payoutToken = swapContracts[swapTarget.tokenKey];
        const pool = swapContracts[swapTarget.poolKey];
        if (!payoutToken || !pool) {
          throw new Error(`Swap contracts unavailable for ${swapTarget.symbol}. Re-run local deployment.`);
        }

        const payoutTokenDecimals = await getTokenDecimals(payoutToken);

        const wethAddress = await swapContracts.weth.getAddress();
        const tokenAddress = await payoutToken.getAddress();
        const token0 = await pool.token0();
        const token1 = await pool.token1();

        let token0ToToken1;
        if (token0.toLowerCase() === wethAddress.toLowerCase() && token1.toLowerCase() === tokenAddress.toLowerCase()) {
          token0ToToken1 = true;
        } else if (token1.toLowerCase() === wethAddress.toLowerCase() && token0.toLowerCase() === tokenAddress.toLowerCase()) {
          token0ToToken1 = false;
        } else {
          throw new Error(`Selected pool does not match WETH/${swapTarget.symbol}`);
        }

        const quotedOut = await pool.getAmountOut(amountWei, token0ToToken1);

        estimate.estimatedOutput = quotedOut.toString();
        estimate.estimatedOutputDisplay = formatTokenAmount(quotedOut, payoutTokenDecimals);

        return {
          success: true,
          data: estimate,
          message: `${swapTarget.symbol} payout estimate retrieved`
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to estimate bounty payout'
        };
      }
    }

    try {
      const repoMap = this.getRepoBountyMap(Number(repoId));
      const bounty = repoMap.get(Number(issueId));
      if (!bounty) {
        throw new Error('Bounty not found');
      }

      return {
        success: true,
        data: {
          repoId: Number(repoId),
          issueId: Number(issueId),
          payoutCurrency: String(payoutCurrency || 'ETH').toUpperCase(),
          bountyEth: bounty.amount.toString(),
          bountyEthDisplay: String(bounty.amount),
          estimatedOutput: bounty.amount.toString(),
          estimatedOutputDisplay: String(bounty.amount),
          isPaid: bounty.paid
        },
        message: 'Bounty payout estimate retrieved'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to estimate bounty payout'
      };
    }
  }

  async getBountyByCID(cid) {
    try {
      const bounty = this.bountyMetadataStore.get(cid);
      if (!bounty) {
        return {
          success: false,
          error: `Bounty metadata ${cid} not found`,
          message: 'Failed to retrieve bounty details'
        };
      }

      return {
        success: true,
        data: {
          bounty,
          cid,
          ipfsUrl: null
        },
        message: 'Bounty details retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve bounty details'
      };
    }
  }

  async assignBounty(repoId, issueId, assigneeData, metadataCID) {
    try {
      const repoMap = this.getRepoBountyMap(Number(repoId));
      const bounty = repoMap.get(Number(issueId));
      if (!bounty) {
        throw new Error('Bounty not found');
      }

      bounty.assignee = assigneeData;
      bounty.status = 'assigned';
      bounty.assignedAt = new Date().toISOString();
      bounty.updatedAt = new Date().toISOString();

      const newCID = this.generateId('assignment', repoId, issueId);
      this.bountyMetadataStore.set(newCID, bounty);
      if (metadataCID) {
        this.bountyMetadataStore.delete(metadataCID);
      }

      repoMap.set(Number(issueId), bounty);

      return {
        success: true,
        data: {
          bounty,
          newCID,
          ipfsUrl: null
        },
        message: 'Bounty assigned successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to assign bounty'
      };
    }
  }

  async donateToProject(repoId, amount) {
    if (isBlockchainEnabled()) {
      try {
        await this.ensureBountyBoardDeployed();
        const numericRepoId = Number(repoId);
        const signer = await maybeAutofundSigner(parseEth(amount || 0));
        const contract = getBountyBoardContract(signer);
        const tx = await contract.donateToRepo(numericRepoId, {
          value: parseEth(amount || 0)
        });
        const receipt = await tx.wait();

        return {
          success: true,
          data: {
            repoId: numericRepoId,
            amount: String(amount || 0),
            transactionHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed?.toString() || null
          },
          message: 'Project donation recorded on-chain'
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to donate to project'
        };
      }
    }

    try {
      const numericRepoId = Number(repoId);
      const current = this.projectPools.get(numericRepoId) || 0;
      const next = current + Number(amount || 0);
      this.projectPools.set(numericRepoId, next);

      return {
        success: true,
        data: {
          repoId: numericRepoId,
          amount: Number(amount || 0).toString(),
          transactionHash: this.generateId('tx-donate', repoId),
          blockNumber: null,
          gasUsed: null
        },
        message: 'Project donation recorded'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to donate to project'
      };
    }
  }

  async getProjectPool(repoId) {
    if (isBlockchainEnabled()) {
      try {
        await this.ensureBountyBoardDeployed();
        const numericRepoId = Number(repoId);
        const contract = getBountyBoardContract();
        const [, , exists, pool] = await contract.getRepo(numericRepoId);
        if (!exists) {
          return {
            success: true,
            data: {
              repoId: numericRepoId,
              balance: '0',
              balanceWei: '0'
            },
            message: 'Project pool balance retrieved'
          };
        }

        return {
          success: true,
          data: {
            repoId: numericRepoId,
            balance: formatEth(pool),
            balanceWei: pool.toString()
          },
          message: 'Project pool balance retrieved'
        };
      } catch (error) {
        return {
          success: false,
          error: error.message,
          message: 'Failed to retrieve project pool balance'
        };
      }
    }

    try {
      const numericRepoId = Number(repoId);
      const balance = this.projectPools.get(numericRepoId) || 0;
      return {
        success: true,
        data: {
          repoId: numericRepoId,
          balance: balance.toString(),
          balanceWei: null
        },
        message: 'Project pool balance retrieved'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to retrieve project pool balance'
      };
    }
  }

  async isRepositoryListed(githubRepoId) {
    if (isBlockchainEnabled()) {
      const listed = await this.getListedRepositories();
      if (!listed.success) {
        return {
          success: false,
          isListed: false,
          message: listed.message || 'Failed to query blockchain listings',
          error: listed.error
        };
      }

      const exists = listed.data.some((repo) => Number(repo.githubId) === Number(githubRepoId));
      return {
        success: true,
        isListed: exists,
        message: exists ? 'Repository is already listed' : 'Repository is not listed'
      };
    }

    const listed = this.registeredRepos.has(Number(githubRepoId));
    return {
      success: true,
      isListed: listed,
      message: listed ? 'Repository is already listed' : 'Repository is not listed'
    };
  }
}

export default new BountyService();
