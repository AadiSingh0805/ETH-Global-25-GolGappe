import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  // Basic user information
  email: {
    type: String,
    sparse: true,
    lowercase: true,
    trim: true
  },
  
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },

  displayName: {
    type: String,
    trim: true,
    maxlength: 50
  },

  avatar: {
    type: String,
    default: ''
  },

  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },

  // GitHub authentication
  github: {
    id: {
      type: String,
      sparse: true,
      unique: true
    },
    username: String,
    email: String,
    avatar: String,
    profileUrl: String,
    accessToken: String
  },

  // MetaMask/Ethereum authentication
  wallet: {
    address: {
      type: String,
      sparse: true,
      unique: true,
      lowercase: true
    },
    ensName: String,
    isVerified: {
      type: Boolean,
      default: false
    },
    lastSignInMessage: String,
    nonce: String
  },

  // User preferences and settings
  preferences: {
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      }
    },
    privacy: {
      showEmail: {
        type: Boolean,
        default: false
      },
      showWallet: {
        type: Boolean,
        default: false
      }
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    }
  },

  // User role and permissions
  role: {
    type: String,
    enum: ['creator', 'contributor', 'admin'],
    default: 'contributor'
  },

  // User stats
  stats: {
    projectsCreated: {
      type: Number,
      default: 0
    },
    contributionsCount: {
      type: Number,
      default: 0
    },
    reputation: {
      type: Number,
      default: 0
    }
  },

  // Account status
  isActive: {
    type: Boolean,
    default: true
  },

  isVerified: {
    type: Boolean,
    default: false
  },

  lastLoginAt: Date,

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
userSchema.index({ 'github.id': 1 });
userSchema.index({ 'wallet.address': 1 });
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for full name
userSchema.virtual('fullProfile').get(function() {
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
});

// Method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLoginAt = new Date();
  return this.save();
};

// Method to increment contribution count
userSchema.methods.incrementContributions = function(count = 1) {
  this.stats.contributionsCount += count;
  this.updatedAt = new Date();
  return this.save();
};

// Method to increment reputation
userSchema.methods.incrementReputation = function(points = 1) {
  this.stats.reputation += points;
  this.updatedAt = new Date();
  return this.save();
};

// Static method to find user by any identifier
userSchema.statics.findByAnyIdentifier = function(identifier) {
  return this.findOne({
    $or: [
      { username: identifier },
      { email: identifier },
      { 'github.username': identifier },
      { 'wallet.address': identifier.toLowerCase() }
    ]
  });
};

// Middleware to update the updatedAt field
userSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

// Transform JSON output
userSchema.set('toJSON', {
  transform: function(doc, ret) {
    delete ret.__v;
    delete ret.github?.accessToken;
    delete ret.wallet?.nonce;
    delete ret.wallet?.lastSignInMessage;
    return ret;
  }
});

export default mongoose.model('User', userSchema);