'use strict'

const joi = require('joi')

const DEFAULT_JOI_OPTIONS = {
    abortEarly: true,
    convert: true,
    allowUnknown: false,
    skipFunctions: false,
    stripUnknown: false,
    presence: 'required',
    noDefaults: true,
}

/**
 * Configure and return a query param parser middleware function
 *
 * @param {object} schema joi schema
 * @param {object} [options] joi validation options
 * @param {string} [options.destinationKey] key of destination of param results on request
 * @param {object} [joiOptions] options to be passed through to joi validate options.
 * @return {Function}
 */
module.exports = (schema, options, joiOptions) => {
    const joiOpts = Object.assign({}, DEFAULT_JOI_OPTIONS, joiOptions || {})
    const requestDestinationKey = (options || {}).destinationKey || 'parsedQueryParams'

    return (req, res, next) => {
        joi.validate(req.query, schema, joiOpts, (error, value) => {
            /* istanbul ignore else: joi should never throw an error that is not a validation error, so cant
             * figure out how to directly test the final else path. however, i would like to keep it in for
             * paranoia sake.
             */
            if (!error) {
                req[requestDestinationKey] = value
                next()
            } else if (error.name === 'ValidationError') {
                const queryParamError = new Error('The request contained invalid query params.')
                queryParamError.jsonDetail = {
                    validationErrors: error.details,
                }
                queryParamError.status = 400
                queryParamError.cause = error
                next(queryParamError)
            } else {
                const unknownError = new Error('an unknown error occurred while parsing query params.')
                unknownError.status = 500
                unknownError.cause = error
                next(unknownError)
            }
        })
    }
}
