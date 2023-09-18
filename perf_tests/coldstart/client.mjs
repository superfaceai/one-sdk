import { performance } from 'node:perf_hooks'
import v8 from 'v8'

import { OneClient } from '../../packages/nodejs_host/dist/index.js'

async function flushMetrics() {
  let id = ''
  for (const entry of performance.getEntries()) {
    if (entry.entryType === 'mark' && Array.isArray(entry.detail)) {
      id = entry.detail.join('-')
    } else if (entry.entryType === 'measure') {
      console.log(`${entry.startTime},${id},${entry.name},${entry.duration}`)
    }
  }

  performance.clearMarks()
  performance.clearMeasures()

  const heap = v8.getHeapStatistics()
  console.log(`${performance.now()},${id},__heap_size,${heap.total_heap_size}`)
  // process.stderr.write(JSON.stringify(heap, undefined, 2))
}

async function outerIteration(outerIteration, innerIterations) {
  performance.mark('init:start', { detail: [outerIteration] })
  const client = new OneClient({
    assetsPath: '.',
    superfaceApiUrl: false,
    onBeforeExitHook: false
  })
  const profile = await client.getProfile('coldstart')
  performance.measure('init', 'init:start')

  for (let i = 0; i < innerIterations; i += 1) {
    if (i % 100 === 0) {
      // periodically clean up metrics because otherwise we run out of memory
      await client.sendMetricsToSuperface()
    }

    performance.mark('perform:start', { detail: [outerIteration, i] })
    let result = await profile
      .getUseCase('ColdStart')
      .perform(
        { i: i % 256 },
        { provider: 'coldstart' }
      )
    // if (result !== i) {
    //   throw new Error('Assertion failed')
    // }
    performance.measure('perform', 'perform:start')
  }

  performance.mark('destroy:start', { detail: [outerIteration] })
  await client.destroy()
  performance.measure('destroy', 'destroy:start')
}

async function main(outerIterations, innerIterations) {
  console.log('time,id,name,value')
  for (let i = 0; i < outerIterations; i += 1) {
    await outerIteration(i, innerIterations)
    await flushMetrics()

    process.stderr.write(`${i + 1}/${outerIterations}\n`)
  }
}

// v8.setFlagsFromString('--trace-gc')
main(100, 1_000)
