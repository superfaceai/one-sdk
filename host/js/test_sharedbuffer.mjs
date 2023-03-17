import { Worker, parentPort, isMainThread, receiveMessageOnPort } from 'node:worker_threads';

/*
T: transmit
R: receive
s: spin - actively wait, eating up CPU
w: wait - block and wait, not eating up CPU
N: notify - update sync buffer and notify waiting threads

main:  -----RTN---
           /  \\   
          /    \\  
child: --TwwwwwwwR-

child uses Atomics and a SharedArrayBuffer to synchronize with the main thread. The assumption is that the update + notify will
act as a Release memory operation on the message queue and so the child should not spin at all. However, if the notify reaches the child
before the message does the child will spin, which ensures correctness.
*/

function now() {
	return Date.now();
}

function childMain(syncBuffer) {
	for (let i = 0; i < 100; i += 1) {
		// store "not ready" and post message
		Atomics.store(syncBuffer, 0, 0);
		parentPort.postMessage(`hello ${i}`);
		
		let wait = 0;
		while (true) {
			// wait until syncBuffer[0] changes and this thread gets notified
			Atomics.wait(syncBuffer, 0, 0);

			// in case we still didn't receive the message, spin
			const response = receiveMessageOnPort(parentPort);
			if (response !== undefined) {
				console.log(`child(wait=${wait}, time=${now()}):`, response);
				break;
			}

			wait += 1;
		}
	}
}
function main() {
	if (!isMainThread) {
		parentPort.once('message', syncBuffer => {
			console.log(typeof SharedArrayBuffer, syncBuffer.toString());

			childMain(syncBuffer);
		});
		return;
	}

	const syncBuffer = new Int32Array(new SharedArrayBuffer(4));
	const worker = new Worker(new URL(import.meta.url));
	worker.postMessage(syncBuffer);
	worker.on('message', (msg) => {
		console.log(`parent(time=${now()}):`, msg);

		Atomics.store(syncBuffer, 0, 1);
		worker.postMessage(`response(${msg}, ${now()})`);
		Atomics.notify(syncBuffer, 0, 1);
	});
}
main()
