const manifest = {
  profile: 'coldstart@0.1',
  provider: 'coldstart'
};

function ColdStart({ input, parameters, services }) {
  let x = input.i
  for (let i = 0; i < input.runs; i += 1) {
    x = x + i * x
  }
  return x
}
