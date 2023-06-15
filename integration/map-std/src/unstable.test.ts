import { Headers } from "./unstable";

describe('unstable', () => {
  test('sanity check', () => {
    expect(true).toBe(true);
  });

  describe('Headers', () => {
    let headers: Headers;

    beforeEach(() => {
      headers = new Headers({ foo: 'bar', 'FOO': 'baz' });
    });

    describe('.get', () => {
      it('returns bar,baz', () => {
        expect(headers.get('foo')).toBe('bar, baz');
      });
    });

    describe('.append', () => {
      it('returns bar,baz,waf', () => {
        headers.append('FoO', 'waf');
        expect(headers.get('foo')).toBe('bar, baz, waf');
      });
    });

    describe('.delete', () => {
      it('deletes all entries case insensitive', () => {
        headers.delete('foo');
        expect(Array.from(headers.keys()).length).toBe(0);
      });
    });

    describe('.forEach', () => {
      it('iterates all headers', () => {
        headers.set('bar', 'waf');

        const keys: string[] = [];
        const values: string[] = []
        headers.forEach((value, key) => {
          keys.push(key);
          values.push(value);
        });

        expect(keys).toEqual(['foo', 'bar']);
        expect(values).toEqual(['bar, baz', 'waf']);
      });
    });

    describe('.keys', () => {
      it('returns all headers keys', () => {
        headers.set('bar', 'waf');

        const keys: string[] = [];
        for (const key of headers.keys()) {
          keys.push(key);
        }

        expect(keys).toEqual(['foo', 'bar']);
      });
    });

    describe('.values', () => {
      it('returns all headers values', () => {
        headers.set('bar', 'waf');

        const values: string[] = [];
        for (const value of headers.values()) {
          values.push(value);
        }

        expect(values).toEqual(['bar, baz', 'waf']);
      });
    });

    describe('.getSetCookie', () => {
      it('returns array values', () => {
        headers = new Headers();
        headers.append("Set-Cookie", "id=aa; Expires=Wed, 21 Oct 2030 07:28:00 GMT")
        headers.append("Set-Cookie", "id=bb; Expires=Wed, 21 Oct 2030 07:28:00 GMT")

        expect(headers.getSetCookie().length).toBe(2);
      });
    });

    describe('.raw', () => {
      it('returns unmodified headers', () => {
        expect(Array.from(headers.raw())).toEqual([['foo', 'bar'], ['FOO', 'baz']]);
      });
    });

    describe('@@iterator', () => {
      it('iterates all headers', () => {
        headers.set('bar', 'waf');

        const keys: string[] = [];
        const values: string[] = []
        for (const [key, value] of headers) {
          keys.push(key);
          values.push(value);
        }

        expect(keys).toEqual(['foo', 'bar']);
        expect(values).toEqual(['bar, baz', 'waf']);
      });
    });
  });

  describe('URL', () => {

  });

  describe('URLSearchParams', () => {

  });

  describe('fetch', () => {

  });
});