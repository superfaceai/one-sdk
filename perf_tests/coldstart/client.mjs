import { performance } from 'node:perf_hooks'
import v8 from 'v8'

import { OneClient } from '../../packages/nodejs_host/dist/index.js'

class TestBase {
  constructor(outCallback) {
    this.v8 = v8
    this.performance = performance
    this.outCallback = outCallback
  }

  async flushMetrics() {
    const heap = this.v8.getHeapStatistics()
    const heap_now = this.performance.now()

    let id = ''
    for (const entry of performance.getEntries()) {
      if (entry.entryType === 'mark' && Array.isArray(entry.detail)) {
        id = entry.detail.join('-')
      } else if (entry.entryType === 'measure') {
        this.outCallback(`${entry.startTime},${id},${entry.name},${entry.duration}`)
      }
    }

    this.performance.clearMarks()
    this.performance.clearMeasures()

    this.outCallback(`${heap_now},${id},__heap_size,${heap.total_heap_size}`)
  }

  /** @abstract */
  async outerIterationBefore(outerIteration) {
    throw new Error('not implemented')
  }

  /** @abstract */
  async outerIterationAfter(outerIteration) {
    throw new Error('not implemented')
  }

  /** @abstract */
  async innerIteration(outerIteration, innerIteration) {
    throw new Error('not implemented')
  }

  async run(outerIterations, innerIterations) {
    this.outCallback('time,id,name,value')
    for (let oi = 0; oi < outerIterations; oi += 1) {
      await this.outerIterationBefore(oi)
      for (let ii = 0; ii < innerIterations; ii += 1) {
        await this.innerIteration(oi, ii)
      }
      await this.outerIterationAfter(oi)
      await this.flushMetrics()

      process.stderr.write(`${oi + 1}/${outerIterations}\n`)
    }
  }
}

class Coldstart extends TestBase {
  constructor(outCallback, mapRuns) {
    super(outCallback)
    this.mapRuns = mapRuns
    this.client = undefined
    this.profile = undefined
  }

  async outerIterationBefore(oi) {
    this.performance.mark('init:start', { detail: [oi] })
    this.client = new OneClient({
      assetsPath: '.',
      superfaceApiUrl: false,
      onBeforeExitHook: false
    })
    this.profile = await this.client.getProfile('coldstart')
    this.performance.measure('init', 'init:start')
  }

  async outerIterationAfter(oi) {
    this.performance.mark('destroy:start', { detail: [oi] })
    this.profile = undefined
    await this.client.destroy()
    this.client = undefined
    this.performance.measure('destroy', 'destroy:start')
  }

  async innerIteration(oi, ii) {
    if (ii % 100 === 0) {
      // periodically clean up metrics because otherwise we run out of memory
      await this.client.sendMetricsToSuperface()
    }

    this.performance.mark('perform:start', { detail: [oi, ii] })
    let result = await this.profile
      .getUseCase('ColdStart')
      .perform(
        { i: ii % 256, runs: this.mapRuns },
        { provider: 'coldstart' }
      )
    this.performance.measure('perform', 'perform:start')
  }
}

// v8.setFlagsFromString('--trace-gc')
const test = new Coldstart(
  m => console.log(m),
  parseInt(process.argv[1])
)
test.run(100, 1_000)
