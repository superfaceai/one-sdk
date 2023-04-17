const { SuperfaceClient } = require('./js/dist/index_node.js');

async function main() {
  const superface = new SuperfaceClient({ superfacePath: process.argv[2] });
  const result = await superface.perform(
    process.argv[3],
    JSON.parse(process.argv[4]),
    {
      vars: JSON.parse(process.argv[5]),
      secrets: JSON.parse(process.argv[6])
    }); // FIXME: shouldn't panic if input isn't passed
  console.log("RESULT:", result);

  await new Promise(resolve => setTimeout(() => {
    console.log('all job done, exiting...');
    resolve();
  }, 2000));
}

void main();