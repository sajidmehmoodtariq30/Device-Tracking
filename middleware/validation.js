import Joi from 'joi';

export const validateRegistration = (req, res, next) => {
    const schema = Joi.object({
        username: Joi.string().alphanum().min(3).max(30).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        confirmPassword: Joi.string().valid(Joi.ref('password')).required()
    });

    const { error } = schema.validate(req.body);
    if (error) {
        req.flash = req.flash || {};
        req.flash.error = error.details[0].message;
        return res.redirect('/register');
    }
    next();
};

export const validateLogin = (req, res, next) => {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    });

    const { error } = schema.validate(req.body);
    if (error) {
        req.flash = req.flash || {};
        req.flash.error = error.details[0].message;
        return res.redirect('/login');
    }
    next();
};
