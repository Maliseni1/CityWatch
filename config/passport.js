const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User'); 

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback" // Relative path works if proxy/host is set correctly
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // 1. Check if user already exists with this Google ID
      let user = await User.findOne({ googleId: profile.id });
      
      if (user) {
        return done(null, user);
      }
      
      // 2. Check if user exists with the same EMAIL (Link accounts)
      user = await User.findOne({ email: profile.emails[0].value });
      if (user) {
        user.googleId = profile.id;
        await user.save();
        return done(null, user);
      }

      // 3. Create new user
      user = await User.create({
        username: profile.displayName,
        email: profile.emails[0].value,
        googleId: profile.id,
        password: '', // No password required for Google auth
        role: 'user'
      });
      
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

module.exports = passport;