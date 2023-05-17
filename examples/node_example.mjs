import { Client } from '../host/js/node/index.js';

async function main() {
  const client = new Client({ assetsPath: process.argv[2] });

  for (let i = 0; i < 3; i += 1) {
    const profile = await client.getProfile(process.argv[3]);
    const result = await profile
      .getUseCase(process.argv[4])
      .perform(
        JSON.parse(process.argv[5]),
        {
          provider: process.argv[6],
          parameters: JSON.parse(process.argv[7]),
          security: JSON.parse(process.argv[8])
        }
      );

    console.log("RESULT:", result);
  }

  await new Promise(resolve => setTimeout(() => {
    console.log('all job done, exiting...');
    resolve();
  }, 2000));
}

void main();
