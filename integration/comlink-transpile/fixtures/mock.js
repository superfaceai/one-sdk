globalThis.std = {
  ffi: {
    unstable: {
      printDebug(...data) {
        console.debug(...data);
      }
    }
  },
  unstable: {
    takeInput() {
      return {
        input: { characterName: 'bananaman' },
        parameters: {},
        security: {}
      };
    },
    setOutputSuccess(data) {
      console.log('Success:', data);
    },
    setOutputFailure(error) {
      console.error('Error:', error);
    },
    fetch(url, requestOptions) {
      return {
        response() {
          return {
            status: 200,
            headers: {
              'content-type': ['application/json']
            },
            bodyAuto() {
              return {
                count: 1,
                results: [{
                  name: 'bananaman',
                  height: 1,
                  mass: 2,
                  birth_year: '3'
                }]
              }
            }
          }
        }
      }
    },
    MapError: class MapError {
      constructor(output) {
        this.output = output;
      }
    }
  }
};
_start('RetrieveCharacterInformation');
