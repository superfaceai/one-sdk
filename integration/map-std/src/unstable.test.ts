import { Headers } from "./unstable";

describe('unstable', () => {
  test('sanity check', () => {
    expect(true).toBe(true);
  });

  describe('Headers', () => {
    let headers: Headers;

    beforeEach(() => {
      headers = new Headers({ foo: 'bar', 'bar': 'baz' });
      headers.append('bar', 'waz');
    });

    describe('.get', () => {
      it('returns baz,waz', () => {
        expect(headers.get('bar')).toBe('baz,waz');
      });
    });

    describe('.append', () => {
      it('returns baz,waz,xxx', () => {
        headers.append('bar', 'xxx');
        expect(headers.get('bar')).toBe('baz,waz,xxx');
      });
    });

    describe('.forEach', () => {
      it('iterates all headers', () => {
        const keys: string[] = [];
        const values: string[] = []

        headers.forEach((value, key) => {
          keys.push(key);
          values.push(value);
        });

        expect(keys).toEqual(['foo', 'bar']);
        expect(values).toEqual(['bar', 'baz,waz']);
      });
    });

    describe('.keys', () => {
      it('returns all headers keys', () => {
        const keys: string[] = [];
        for (const key of headers.keys()) {
          keys.push(key);
        }

        expect(keys.length).toBe(2);
      });
    });

    describe('.values', () => {
      it('returns all headers values', () => {
        const values: string[] = [];
        for (const value of headers.values()) {
          values.push(value);
        }

        expect(values.length).toBe(2);
      });
    });

    describe('.getSetCookie', () => {
      it('returns array values', () => {
        headers = new Headers();
        headers.append("Set-Cookie", "id=aa; Expires=Wed, 21 Oct 2030 07:28:00 GMT")
        headers.append("Set-Cookie", "id=bb; Expires=Wed, 21 Oct 2030 07:28:00 GMT")

        expect(headers.getSetCookie)
      });
    })

    describe('@@iterator', () => {
      it('iterates all headers', () => {
        const keys: string[] = [];
        const values: string[] = [];

        for (const [key, value] of headers) {
          keys.push(key);
          values.push(value);
        }

        expect(keys).toEqual(['foo', 'bar']);
        expect(values).toEqual(['bar', 'baz,waz']);
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