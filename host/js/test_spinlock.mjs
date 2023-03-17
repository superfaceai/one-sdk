import { Worker, parentPort, isMainThread, receiveMessageOnPort } from 'node:worker_threads';

/*
T: transmit
R: receive
s: spin - actively wait, eating up CPU

main:  ----RT----
          /  \   
         /    \  
child: -TssssssR-

child always spins between sending a message and waiting for the result, eating up CPU. This is the worst feasible option.
*/

function main() {
	if (isMainThread) {
		const worker = new Worker(new URL(import.meta.url));
		worker.on('message', (msg) => {
			console.log('parent:', msg);
			worker.postMessage(`response(${msg})`);
		});
	} else {
		for (let i = 0; i < 100; i += 1) {
			parentPort.postMessage(`hello ${i}`);
			let wait = 0;
			while (true) {
				const response = receiveMessageOnPort(parentPort);
				if (response !== undefined) {
					console.log(`child (wait=${wait}):`, response);
					break;
				}

				wait += 1;
			}
		}
	}
}
main()
