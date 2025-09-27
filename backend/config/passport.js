import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.GITHUB_CALLBACK_URL || "http://localhost:5000/api/auth/github/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('GitHub OAuth callback received:', profile.id);
    
    // Check if user already exists with this GitHub ID
    let user = await User.findOne({ 'github.id': profile.id });
    
    if (user) {
      // Update existing user
      user.github = {
        id: profile.id,
        username: profile.username,
        email: profile.emails?.[0]?.value || null,
        avatar: profile.photos?.[0]?.value || null,
        profileUrl: profile.profileUrl,
        accessToken: accessToken
      };
      user.lastLoginAt = new Date();
      await user.save();
      
      console.log('Existing user updated:', user.username);
      return done(null, user);
    }
    
    // Check if user exists with the same email
    if (profile.emails?.[0]?.value) {
      user = await User.findOne({ email: profile.emails[0].value });
      if (user) {
        // Link GitHub account to existing user
        user.github = {
          id: profile.id,
          username: profile.username,
          email: profile.emails[0].value,
          avatar: profile.photos?.[0]?.value || null,
          profileUrl: profile.profileUrl,
          accessToken: accessToken
        };
        user.lastLoginAt = new Date();
        await user.save();
        
        console.log('GitHub linked to existing user:', user.username);
        return done(null, user);
      }
    }
    
    // Create new user
    const newUser = new User({
      username: profile.username,
      displayName: profile.displayName || profile.username,
      email: profile.emails?.[0]?.value || null,
      avatar: profile.photos?.[0]?.value || null,
      github: {
        id: profile.id,
        username: profile.username,
        email: profile.emails?.[0]?.value || null,
        avatar: profile.photos?.[0]?.value || null,
        profileUrl: profile.profileUrl,
        accessToken: accessToken
      },
      lastLoginAt: new Date(),
      isVerified: true
    });
    
    await newUser.save();
    console.log('New user created:', newUser.username);
    
    return done(null, newUser);
    
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    return done(error, null);
  }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;