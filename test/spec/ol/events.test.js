import _ol_events_ from '../../../src/ol/events.js';
import EventTarget from '../../../src/ol/events/EventTarget.js';

describe('ol.events', function() {
  let add, remove, target;

  beforeEach(function() {
    add = sinon.spy();
    remove = sinon.spy();
    target = {
      addEventListener: add,
      removeEventListener: remove
    };
  });

  describe('bindListener_()', function() {
    it('binds a listener and returns a bound listener function', function() {
      const listenerObj = {
        listener: sinon.spy(),
        bindTo: {id: 1}
      };
      const boundListener = _ol_events_.bindListener_(listenerObj);
      expect(listenerObj.boundListener).to.equal(boundListener);
      boundListener();
      expect(listenerObj.listener.thisValues[0]).to.equal(listenerObj.bindTo);
    });
    it('binds to the target when bindTo is not provided', function() {
      const listenerObj = {
        listener: sinon.spy(),
        target: {id: 1}
      };
      const boundListener = _ol_events_.bindListener_(listenerObj);
      expect(listenerObj.boundListener).to.equal(boundListener);
      boundListener();
      expect(listenerObj.listener.thisValues[0]).to.equal(listenerObj.target);
    });
    it('binds a self-unregistering listener when callOnce is true', function() {
      const bindTo = {id: 1};
      const listenerObj = {
        type: 'foo',
        target: target,
        bindTo: bindTo,
        callOnce: true
      };
      const unlistenSpy = sinon.spy(_ol_events_, 'unlistenByKey'); // eslint-disable-line openlayers-internal/no-missing-requires
      listenerObj.listener = function() {
        expect(this).to.equal(bindTo);
        expect(unlistenSpy.firstCall.args[0]).to.eql(listenerObj);
      };
      const boundListener = _ol_events_.bindListener_(listenerObj);
      expect(listenerObj.boundListener).to.equal(boundListener);
      boundListener();
      unlistenSpy.restore();
    });
  });

  describe('findListener_()', function() {
    let listener, listenerObj, listeners;

    beforeEach(function() {
      listener = function() {};
      listenerObj = {
        type: 'foo',
        target: target,
        listener: listener
      };
      listeners = [listenerObj];
    });

    it('searches a listener array for a specific listener', function() {
      const bindTo = {id: 1};
      let result = _ol_events_.findListener_(listeners, listener);
      expect(result).to.be(listenerObj);
      result = _ol_events_.findListener_(listeners, listener, bindTo);
      expect(result).to.be(undefined);
      listenerObj.bindTo = bindTo;
      result = _ol_events_.findListener_(listeners, listener);
      expect(result).to.be(undefined);
      result = _ol_events_.findListener_(listeners, listener, bindTo);
      expect(result).to.be(listenerObj);
    });
    it('marks the delete index on a listener object', function() {
      const result = _ol_events_.findListener_(listeners, listener, undefined, true);
      expect(result).to.be(listenerObj);
      expect(listenerObj.deleteIndex).to.be(0);
    });
  });

  describe('getListeners()', function() {
    it('returns listeners for a target and type', function() {
      const foo = _ol_events_.listen(target, 'foo', function() {});
      const bar = _ol_events_.listen(target, 'bar', function() {});
      expect (_ol_events_.getListeners(target, 'foo')).to.eql([foo]);
      expect (_ol_events_.getListeners(target, 'bar')).to.eql([bar]);
    });
    it('returns undefined when no listeners are registered', function() {
      expect (_ol_events_.getListeners(target, 'foo')).to.be(undefined);
    });
  });

  describe('listen()', function() {
    it('calls addEventListener on the target', function() {
      _ol_events_.listen(target, 'foo', function() {});
      expect(add.callCount).to.be(1);
    });
    it('returns a key', function() {
      const key = _ol_events_.listen(target, 'foo', function() {});
      expect(key).to.be.a(Object);
    });
    it('does not add the same listener twice', function() {
      const listener = function() {};
      const key1 = _ol_events_.listen(target, 'foo', listener);
      const key2 = _ol_events_.listen(target, 'foo', listener);
      expect(key1).to.equal(key2);
      expect(add.callCount).to.be(1);
    });
    it('only treats listeners as same when all args are equal', function() {
      const listener = function() {};
      _ol_events_.listen(target, 'foo', listener, {});
      _ol_events_.listen(target, 'foo', listener, {});
      _ol_events_.listen(target, 'foo', listener, undefined);
      expect(add.callCount).to.be(3);
    });
  });

  describe('listenOnce()', function() {
    it('creates a one-off listener', function() {
      const listener = sinon.spy();
      const key = _ol_events_.listenOnce(target, 'foo', listener);
      expect(add.callCount).to.be(1);
      expect(key.callOnce).to.be(true);
      key.boundListener();
      expect(listener.callCount).to.be(1);
      expect(remove.callCount).to.be(1);
    });
    it('does not add the same listener twice', function() {
      const listener = function() {};
      const key1 = _ol_events_.listenOnce(target, 'foo', listener);
      const key2 = _ol_events_.listenOnce(target, 'foo', listener);
      expect(key1).to.equal(key2);
      expect(add.callCount).to.be(1);
      expect(key1.callOnce).to.be(true);
    });
    it('listen() can turn a one-off listener into a permanent one', function() {
      const listener = sinon.spy();
      let key = _ol_events_.listenOnce(target, 'foo', listener);
      expect(key.callOnce).to.be(true);
      key = _ol_events_.listen(target, 'foo', listener);
      expect(add.callCount).to.be(1);
      expect(key.callOnce).to.be(false);
      key.boundListener();
      expect(remove.callCount).to.be(0);
    });
  });

  describe('unlisten()', function() {
    it('unregisters previously registered listeners', function() {
      const listener = function() {};
      _ol_events_.listen(target, 'foo', listener);
      _ol_events_.unlisten(target, 'foo', listener);
      expect(_ol_events_.getListeners(target, 'foo')).to.be(undefined);
    });
    it('works with multiple types', function() {
      const listener = function() {};
      _ol_events_.listen(target, ['foo', 'bar'], listener);
      _ol_events_.unlisten(target, ['bar', 'foo'], listener);
      expect(_ol_events_.getListeners(target, 'foo')).to.be(undefined);
      expect(_ol_events_.getListeners(target, 'bar')).to.be(undefined);
    });
  });

  describe('unlistenByKey()', function() {
    it('unregisters previously registered listeners', function() {
      const key = _ol_events_.listen(target, 'foo', function() {});
      _ol_events_.unlistenByKey(key);
      expect(_ol_events_.getListeners(target, 'foo')).to.be(undefined);
    });
    it('works with multiple types', function() {
      const key = _ol_events_.listen(target, ['foo', 'bar'], function() {});
      _ol_events_.unlistenByKey(key);
      expect(_ol_events_.getListeners(target, 'foo')).to.be(undefined);
      expect(_ol_events_.getListeners(target, 'bar')).to.be(undefined);
    });
  });

  describe('unlistenAll()', function() {
    it('unregisters all listeners registered for a target', function() {
      const keys = [
        _ol_events_.listen(target, 'foo', function() {}),
        _ol_events_.listen(target, 'bar', function() {})
      ];
      _ol_events_.unlistenAll(target);
      expect(_ol_events_.getListeners(target, 'foo')).to.be(undefined);
      expect(_ol_events_.getListeners(target, 'bar')).to.be(undefined);
      expect('ol_lm' in target).to.be(false);
      expect(keys).to.eql([{}, {}]);
    });
  });

  describe('Compatibility with ol.events.EventTarget', function() {
    it('does not register duplicated listeners', function() {
      const target = new EventTarget();
      const listener = function() {};
      const key1 = _ol_events_.listen(target, 'foo', listener);
      expect(target.getListeners('foo')).to.eql([key1.boundListener]);
      const key2 = _ol_events_.listen(target, 'foo', listener);
      expect(key2.boundListener).to.equal(key1.boundListener);
      expect(target.getListeners('foo')).to.eql([key1.boundListener]);
    });
    it('registers multiple listeners if this object is different', function() {
      const target = new EventTarget();
      const listener = function() {};
      const key1 = _ol_events_.listen(target, 'foo', listener, {});
      const key2 = _ol_events_.listen(target, 'foo', listener, {});
      expect(key1.boundListener).to.not.equal(key2.boundListener);
      expect(target.getListeners('foo')).to.eql(
        [key1.boundListener, key2.boundListener]);
    });
  });

});
