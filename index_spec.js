'use strict'
/* eslint-env mocha */
/* eslint-disable no-unused-expressions */

// TODO test for options: though these tests yield 100% coverage, they do not cover all the options inputs

// const sinon = require('sinon')
// const express = require('express')
// const request = require('supertest')

const expect = require('chai').expect
const makeParamParser = require('./index').makeMiddleware
const joi = require('joi')
const qs = require('querystring')


const _makeTest = (parser, query, validate) => (done) => {
    const req = {
        query: qs.parse(query),
    }
    const res = null

    let _called = false
    const next = (err) => {
        expect(_called).to.be.equal(false)
        _called = true
        validate(req, res, err)
        done()
    }

    parser(req, res, next)
}

const _expectSuccess = (parser, query, result) => _makeTest(parser, query, (req, res, err) => {
    expect(err).to.not.be.ok
    expect(req.parsedQuery).to.be.eql(result)
})

const _expectValidationError = (parser, query, validationErrors) => _makeTest(parser, query, (req, res, err) => {
    expect(req.parsedQueryParams).to.not.be.ok
    expect(err).to.be.instanceOf(Error)
    expect(err.message).to.be.equal('The request contained invalid query params.')
    expect(err.status).to.be.equal(400)
    expect(err.jsonDetail).to.be.eql({ validationErrors })
})


describe('joiful-query-params', () => {
    it('should call next with validation errors if there are any', _expectValidationError(
        makeParamParser(joi.object().keys({
            username: joi.string().required(),
        })),
        {},
        [
            {
                context: { key: 'username' },
                message: '"username" is required',
                path: 'username',
                type: 'any.required',
            },
        ]
    ))
    it('should parse query and put in req.parsedQuery by default', _expectSuccess(
        makeParamParser(joi.object().keys({
            page: joi.number(),
        })),
        'page=5',
        { page: 5 }
    ))
})
