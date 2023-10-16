import gc
import sys
import time
from abc import ABC, abstractmethod

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

class TestBase(ABC):
	def __init__(self, out_file):
		self.performance = Performance()
		self.current_process = psutil.Process()
		self.out_file = out_file
	
	def flush_metrics(self):
		resident_set_size = self.current_process.memory_info().rss
		resident_set_now = Performance.now()

		current_id = ""
		for entry in self.performance.get_entries():
			if entry.entry_type == "mark" and isinstance(entry.detail, list):
				current_id = "-".join(map(str, entry.detail))
			elif entry.entry_type == "measure":
				print(f"{entry.start_time},{current_id},{entry.name},{entry.duration}", file = self.out_file)
		self.performance.clear()

		print(f"{resident_set_now},{current_id},__rss,{resident_set_size}", file = self.out_file)
	
	@abstractmethod
	def _outer_iteration_before(self, outer_iteration):
		raise NotImplementedError()
	
	@abstractmethod
	def _outer_iteration_after(self, outer_iteration):
		raise NotImplementedError()

	@abstractmethod
	def _inner_iteration(self, outer_iteration, inner_iteration):
		raise NotImplementedError()

	def run(self, outer_iterations, inner_iterations):
		print("time,id,name,value", file = self.out_file)
		for oi in range(outer_iterations):
			self._outer_iteration_before(oi)
			for ii in range(inner_iterations):
				self._inner_iteration(oi, ii)
			self._outer_iteration_after(oi)
			self.flush_metrics()
			gc.collect()

			print(f"{oi + 1}/{outer_iterations}", file = sys.stderr)

class Coldstart(TestBase):
	def __init__(self, out_file, map_runs):
		super().__init__(out_file)
		self.client = None
		self.profile = None
		self.map_runs = map_runs
	
	def _outer_iteration_before(self, oi):
		self.performance.mark("init:start", detail = [oi])
		self.client = OneClient(
			assets_path = ".",
			superface_api_url = False
		)
		self.profile = self.client.get_profile("coldstart")
		self.performance.measure("init", "init:start")

	def _outer_iteration_after(self, oi):
		self.performance.mark("destroy:start", detail = [oi])
		self.profile = None
		self.client.destroy()
		self.client = None
		self.performance.measure("destroy", "destroy:start")
	
	def _inner_iteration(self, oi, ii):
		if ii % 100 == 0:
			# clean up metrics because otherwise they pile up in the memory
			self.client.send_metrics_to_superface()
		
		self.performance.mark("perform:start", detail = [oi, ii])
		result = self.profile.get_usecase("ColdStart").perform(
			{ "i": ii % 256, "runs": self.map_runs },
			provider = "coldstart"
		)
		self.performance.measure("perform", "perform:start")

# gc.set_debug(gc.DEBUG_STATS | gc.DEBUG_COLLECTABLE | gc.DEBUG_UNCOLLECTABLE)

test = Coldstart(sys.stdout, int(sys.argv[1]))
test.run(100, 1_000)
