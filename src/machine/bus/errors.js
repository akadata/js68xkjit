function BusError(message) {
    Error.call(this, message);
    this.name = 'BusError';
    this.message = message;
}
BusError.prototype = Object.create(Error.prototype);
BusError.prototype.constructor = BusError;

function AlignmentError(address, size) {
    BusError.call(this, 'unaligned ' + size + '-byte bus access at $' + (address >>> 0).toString(16));
    this.name = 'AlignmentError';
    this.address = address >>> 0;
    this.size = size | 0;
}
AlignmentError.prototype = Object.create(BusError.prototype);
AlignmentError.prototype.constructor = AlignmentError;

function UnmappedAccessError(address, size) {
    BusError.call(this, 'unmapped bus access at $' + (address >>> 0).toString(16) + ' (' + size + '-byte)');
    this.name = 'UnmappedAccessError';
    this.address = address >>> 0;
    this.size = size | 0;
}
UnmappedAccessError.prototype = Object.create(BusError.prototype);
UnmappedAccessError.prototype.constructor = UnmappedAccessError;

function ReadOnlyError(name, address) {
    BusError.call(this, name + ' is read-only at $' + (address >>> 0).toString(16));
    this.name = 'ReadOnlyError';
    this.address = address >>> 0;
    this.regionName = name;
}
ReadOnlyError.prototype = Object.create(BusError.prototype);
ReadOnlyError.prototype.constructor = ReadOnlyError;

module.exports = {
    BusError: BusError,
    AlignmentError: AlignmentError,
    UnmappedAccessError: UnmappedAccessError,
    ReadOnlyError: ReadOnlyError
};
