#!/usr/bin/env python3

import sys
import math

import numpy
import pandas
import matplotlib.pyplot as plt

def _map_id_major(id):
	return int(id.split("-")[0])

FMT_SI_POS = ["", "k", "M", "G"]
FMT_SI_NEG = ["", "m", "u", "n"]
FMT_SI_BASE = 1000
def _fmt_si(unit, value):
	if value <= 0:
		return value

	index = math.floor(
		math.log(value, FMT_SI_BASE)
	)
	if index >= 0:
		prefix = FMT_SI_POS[min(index, 3)]
	else:
		prefix = FMT_SI_NEG[min(-index, 3)]

	value = round(value / (FMT_SI_BASE**index), 2)
	return f"{value}{prefix}{unit}"

FMT_BYTES_POS = ["", "ki", "Mi", "Gi"]
FMT_BYTES_BASE = 1024
def _fmt_bytes(value):
	if value <= 0:
		return value

	index = math.trunc(
		math.log(value, FMT_BYTES_BASE)
	)
	if index >= 0:
		prefix = FMT_BYTES_POS[min(index, 3)]
	else:
		prefix = ""

	value = round(value / (FMT_BYTES_BASE**index), 2)
	return f"{value}{prefix}B"

FMT_TIME_POS = ["s", "min", "h"]
def _fmt_time(value):
	if value <= 0:
		return f"{value}s"

	if value < 1:
		return _fmt_si("s", value)
	
	index = 0
	if value > 60:
		value = value / 60
		index += 1
	elif value > 60:
		value = value / 60
		index += 1
	
	value = round(value, 3)
	return f"{value}{FMT_BYTES_POS[index]}"

def _plot_inits(ax, data):
	data = data[data["name"] == "init"]
	ys = data["value"]
	xs = list(range(len(ys)))

	ax.plot(xs, ys, "o-")
	ax.set_title("Inits")
	ax.yaxis.set_major_formatter(lambda x, _: _fmt_time(x / 1000))

def _plot_destroys(ax, data):
	data = data[data["name"] == "destroy"]
	xs = numpy.arange(len(data))
	ys = data["value"]

	ax.plot(xs, ys, "o-")
	ax.set_title("Destroys")
	ax.yaxis.set_major_formatter(lambda x, _: _fmt_time(x / 1000))

def _plot_performs(ax, data):
	data = data[data["name"] == "perform"]
	for i, group in data.groupby("id_major"):
		ys = group["value"]
		xs = numpy.arange(len(ys))
		ax.plot(xs, ys, "-", label = f"Run {i}")

	ax.set_title("Performs")
	ax.yaxis.set_major_formatter(lambda x, _: _fmt_time(x / 1000))
	# ax.legend()

def _plot_heap_sizes(ax, data):
	title = "Heap size"
	mask = data["name"] == "__heap_size"
	if not any(mask):
		mask = data["name"] == "__rss"
		title = "Resident set size"

	data = data[mask]
	xs = numpy.arange(len(data))
	ys = data["value"]

	ax.plot(xs, ys, "o-")
	ax.set_title(title)
	ax.yaxis.set_major_formatter(lambda x, _: _fmt_bytes(x))

data = pandas.read_csv(sys.argv[1])
data["id_major"] = data["id"].apply(_map_id_major)
rows = data["id_major"].max() + 1

fig, axs = plt.subplots(4, 1)
_plot_inits(axs[0], data)
_plot_performs(axs[1], data)
_plot_destroys(axs[2], data)
_plot_heap_sizes(axs[3], data)
plt.show()
