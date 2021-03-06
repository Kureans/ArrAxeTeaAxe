const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');

function initialize(passport, getUserbyEmail, getUserById) {
    const authenticateUser = async (email, password, done) => {
        const user = await getUserbyEmail(email);
        console.log(user);
        if (user == null) {
            return done(null, false, { message: 'No Such User'});
        }

        try {
            if (await bcrypt.compare(password, user.password)) {
                return done(null, user);
            } else {
                return done(null, false, { message: 'Incorrect Password'});
            }
        } catch (e) {
            return done(e)
        }

    }
    passport.use(new LocalStrategy({ usernameField: 'email' }, 
    authenticateUser))
    passport.serializeUser((user,done) => done(null,user.id));
    passport.deserializeUser((id,done) => done(null, getUserById(id)));
}

module.exports = initialize;