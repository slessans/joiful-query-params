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

const DEFAULT_OPTIONS = {
    destinationKey: 'parsedQuery',
}

class QueryParamParser {

    /**
     * Construct a QueryParamParser
     *
     * @param {object} schema joi schema
     * @param {object} [options] joi validation options
     * @param {string} [options.destinationKey] key of destination of param results on request
     * @param {object} [options.joiOptions] options to be passed through to joi validate options.
     * @returns {QueryParamParser} new parser
     */
    constructor(schema, options) {
        this._schema = schema
        this._options = Object.assign({}, DEFAULT_OPTIONS, options || {})
        this._options.joiOptions = Object.assign({}, DEFAULT_JOI_OPTIONS, this._options.joiOptions || {})
    }

    run(req, res, next) {
        joi.validate(req.query, this._schema, this._options.joiOptions, (error, value) => {
            /* istanbul ignore else: joi should never throw an error that is not a validation error, so cant
             * figure out how to directly test the final else path. however, i would like to keep it in for
             * paranoia sake.
             */
            if (!error) {
                this.didParseQueryParams(req, res, value)
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

    didParseQueryParams(req, res, validatedParams) {
        req[this._options.destinationKey] = validatedParams
    }

    asMiddleware() {
        const self = this
        return function () {
            self.run.apply(self, arguments)
        }
    }
}

/**
 * See constructor of QueryParamParser for param info
 *
 * @returns {function (req, res, next)} query parsing middleware
 */
const makeMiddleware = (schema, options) => new QueryParamParser(schema, options).asMiddleware()

module.exports = {
    QueryParamParser,
    makeMiddleware,
}
