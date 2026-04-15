import crypto from 'crypto';

const userStore = new Map();

const defaultUser = () => ({
  email: null,
  username: null,
  displayName: null,
  avatar: '',
  bio: '',
  github: {
    id: null,
    username: null,
    email: null,
    avatar: null,
    profileUrl: null,
    accessToken: null
  },
  wallet: {
    address: null,
    ensName: null,
    isVerified: false,
    lastSignInMessage: null,
    nonce: null
  },
  preferences: {
    notifications: {
      email: true,
      push: true
    },
    privacy: {
      showEmail: false,
      showWallet: false
    },
    theme: 'auto'
  },
  role: 'contributor',
  stats: {
    projectsCreated: 0,
    contributionsCount: 0,
    reputation: 0
  },
  isActive: true,
  isVerified: false,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date()
});

const mergeDefaults = (data = {}) => {
  const base = defaultUser();
  return {
    ...base,
    ...data,
    email: data.email ? String(data.email).toLowerCase().trim() : base.email,
    username: data.username ? String(data.username).trim() : base.username,
    github: {
      ...base.github,
      ...(data.github || {})
    },
    wallet: {
      ...base.wallet,
      ...(data.wallet || {}),
      address: data.wallet?.address ? String(data.wallet.address).toLowerCase() : base.wallet.address
    },
    preferences: {
      ...base.preferences,
      ...(data.preferences || {}),
      notifications: {
        ...base.preferences.notifications,
        ...(data.preferences?.notifications || {})
      },
      privacy: {
        ...base.preferences.privacy,
        ...(data.preferences?.privacy || {})
      }
    },
    stats: {
      ...base.stats,
      ...(data.stats || {})
    }
  };
};

const getByPath = (obj, path) => path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);

const matchField = (user, key, expected) => {
  const actual = getByPath(user, key);
  if (actual == null && expected == null) {
    return true;
  }

  // Keep ID comparisons lenient for string/number mismatches.
  if (key === 'github.id') {
    return String(actual) === String(expected);
  }

  return actual === expected;
};

const matchesQuery = (user, query = {}) => {
  if (!query || Object.keys(query).length === 0) {
    return true;
  }

  if (Array.isArray(query.$or)) {
    return query.$or.some((q) => matchesQuery(user, q));
  }

  return Object.entries(query).every(([key, value]) => {
    if (key === '$or') {
      return true;
    }
    return matchField(user, key, value);
  });
};

class User {
  constructor(data = {}) {
    const merged = mergeDefaults(data);
    this._id = data._id ? String(data._id) : crypto.randomUUID();
    Object.assign(this, merged);
  }

  get fullProfile() {
    return {
      id: this._id,
      username: this.username,
      displayName: this.displayName,
      avatar: this.avatar || this.github?.avatar || '',
      bio: this.bio,
      role: this.role,
      stats: this.stats,
      isVerified: this.isVerified,
      hasGithub: !!this.github?.id,
      hasWallet: !!this.wallet?.address,
      walletAddress: this.wallet?.address || null,
      preferences: this.preferences
    };
  }

  toJSON() {
    return {
      _id: this._id,
      email: this.email,
      username: this.username,
      displayName: this.displayName,
      avatar: this.avatar,
      bio: this.bio,
      github: {
        id: this.github?.id || null,
        username: this.github?.username || null,
        email: this.github?.email || null,
        avatar: this.github?.avatar || null,
        profileUrl: this.github?.profileUrl || null
      },
      wallet: {
        address: this.wallet?.address || null,
        ensName: this.wallet?.ensName || null,
        isVerified: !!this.wallet?.isVerified
      },
      preferences: this.preferences,
      role: this.role,
      stats: this.stats,
      isActive: this.isActive,
      isVerified: this.isVerified,
      lastLoginAt: this.lastLoginAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  async save() {
    if (!this.username || String(this.username).trim().length < 3) {
      throw new Error('Username is required and must be at least 3 characters');
    }

    const thisId = String(this._id);
    const email = this.email ? String(this.email).toLowerCase().trim() : null;
    const githubId = this.github?.id ? String(this.github.id) : null;
    const walletAddress = this.wallet?.address ? String(this.wallet.address).toLowerCase() : null;

    for (const existing of userStore.values()) {
      if (String(existing._id) === thisId) {
        continue;
      }

      if (existing.username === this.username) {
        const err = new Error('Duplicate username');
        err.code = 11000;
        err.keyValue = { username: this.username };
        throw err;
      }

      if (email && existing.email === email) {
        const err = new Error('Duplicate email');
        err.code = 11000;
        err.keyValue = { email };
        throw err;
      }

      if (githubId && String(existing.github?.id) === githubId) {
        const err = new Error('Duplicate GitHub ID');
        err.code = 11000;
        err.keyValue = { 'github.id': githubId };
        throw err;
      }

      if (walletAddress && String(existing.wallet?.address || '').toLowerCase() === walletAddress) {
        const err = new Error('Duplicate wallet address');
        err.code = 11000;
        err.keyValue = { 'wallet.address': walletAddress };
        throw err;
      }
    }

    this.email = email;
    this.wallet = {
      ...(this.wallet || {}),
      address: walletAddress
    };
    this.updatedAt = new Date();

    userStore.set(thisId, this);
    return this;
  }

  async updateLastLogin() {
    this.lastLoginAt = new Date();
    return this.save();
  }

  async incrementContributions(count = 1) {
    this.stats.contributionsCount += count;
    this.updatedAt = new Date();
    return this.save();
  }

  async incrementReputation(points = 1) {
    this.stats.reputation += points;
    this.updatedAt = new Date();
    return this.save();
  }

  static async findOne(query = {}) {
    for (const user of userStore.values()) {
      if (matchesQuery(user, query)) {
        return user;
      }
    }
    return null;
  }

  static async findById(id) {
    if (!id) {
      return null;
    }
    return userStore.get(String(id)) || null;
  }

  static async findByAnyIdentifier(identifier) {
    return this.findOne({
      $or: [
        { username: identifier },
        { email: String(identifier).toLowerCase() },
        { 'github.username': identifier },
        { 'wallet.address': String(identifier).toLowerCase() }
      ]
    });
  }
}

export default User;