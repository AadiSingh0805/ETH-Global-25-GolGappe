class BountyService {
  constructor() {
    this.repoMetadataStore = new Map(); // cid -> metadata
    this.registeredRepos = new Map(); // repoId -> repo data
    this.projectPools = new Map(); // repoId -> numeric amount
    this.bountiesByRepo = new Map(); // repoId -> Map(issueId -> bounty)
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

  async registerRepository(repoData) {
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

  async completeBounty(repoId, issueId, contributorAddress) {
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
    const listed = this.registeredRepos.has(Number(githubRepoId));
    return {
      success: true,
      isListed: listed,
      message: listed ? 'Repository is already listed' : 'Repository is not listed'
    };
  }
}

export default new BountyService();
