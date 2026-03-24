var errors = require('./errors');

function normalizeAddress(address, mask) {
    return ((address >>> 0) & (mask >>> 0)) >>> 0;
}

function assertAligned(address, size, strictAlignment) {
    if (!strictAlignment || size === 1) {
        return;
    }
    if (((address >>> 0) & 1) !== 0) {
        throw new errors.AlignmentError(address, size);
    }
}

module.exports = {
    normalizeAddress: normalizeAddress,
    assertAligned: assertAligned
};
