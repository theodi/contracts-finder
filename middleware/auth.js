const ensureAuthenticated = (req, res, next) => {
    //console.log('Auth check - isAuthenticated:', req.isAuthenticated());
    //console.log('Auth check - session:', req.session ? 'exists' : 'missing');
    //console.log('Auth check - user:', req.user ? 'exists' : 'missing');
    
    if (req.isAuthenticated()) {
        return next();
    } else {
        console.log('Auth check - redirecting to Google auth');
        res.redirect('/auth/google');
    }
};

export { ensureAuthenticated };