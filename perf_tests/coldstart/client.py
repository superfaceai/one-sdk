import sys
import time

import psutil

from one_sdk import OneClient, PerformError, UnexpectedError, ValidationError

class PerformanceEntry:
	def __init__(self, entry_type, name, start_time, duration, detail = None):
		self.entry_type = entry_type
		self.name = name
		self.start_time = start_time
		self.duration = duration
		self.detail = detail
class Performance:
	@staticmethod
	def now():
		return time.perf_counter_ns() / 1_000_000

	def __init__(self):
		# indices into self._entries for mark names
		self._marks = {}
		self._entries = []

	def mark(self, name, detail = None):
		now = Performance.now()
		self._marks[name] = len(self._entries)
		self._entries.append(PerformanceEntry(
			"mark",
			name,
			start_time = now,
			duration = 0,
			detail = detail
		))

	def measure(self, name, since_name):
		now = Performance.now()
		start = self._entries[self._marks[since_name]].start_time
		self._entries.append(PerformanceEntry(
			"measure",
			name,
			start_time = start,
			duration = now - start
		))

	def get_entries(self):
		return self._entries

	def clear(self):
		self._marks = {}
		self._entries = []

performance = Performance()
current_process = psutil.Process()

def flush_metrics():
	current_id = ""
	for entry in performance.get_entries():
		if entry.entry_type == "mark" and isinstance(entry.detail, list):
			current_id = "-".join(map(str, entry.detail))
		elif entry.entry_type == "measure":
			print(f"{entry.start_time},{current_id},{entry.name},{entry.duration}")

	performance.clear()

	resident_set_size = current_process.memory_info().rss
	print(f"{Performance.now()},{current_id},__rss,{resident_set_size}")

def outer_iteration(outer_iteration, inner_iterations):
	performance.mark("init:start", detail = [outer_iteration])
	client = OneClient(
		assets_path = ".",
		superface_api_url = False
	)
	profile = client.get_profile("coldstart")
	performance.measure("init", "init:start")
	
	for i in range(inner_iterations):
		if i % 100 == 0:
			# clean up metrics because otherwise they pile up in the memory
			client.send_metrics_to_superface()

		performance.mark("perform:start", detail = [outer_iteration, i])
		result = profile.get_usecase("ColdStart").perform(
			{ i: i % 256 },
			provider = "coldstart"
		)
		performance.measure("perform", "perform:start")
	
	performance.mark("destroy:start", detail = [outer_iteration])
	client.destroy()
	performance.measure("destroy", "destroy:start")

def main(outer_iterations, inner_iterations):
	print("time,id,name,value")
	for i in range(outer_iterations):
		outer_iteration(i, inner_iterations)
		flush_metrics()

		print(f"{i + 1}/{outer_iterations}", file = sys.stderr)

main(100, 1_000)
