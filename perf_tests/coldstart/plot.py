#!/usr/bin/env python3

import sys
import math

import numpy
import pandas

import matplotlib.pyplot as plt
from matplotlib.gridspec import GridSpec

## UTIL

def _map_id_major(id):
	return int(id.split("-")[0])

def _map_id_minor(id):
	try:
		return int(id.split("-")[1])
	except:
		return None

## FMT

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

def _fmt_time_ms(value):
	return _fmt_time(value / 1000)

## PLOT 

def _plot_flat(ax, data, title, fmt):
	xs = numpy.arange(len(data))
	ys = data["value"]

	ax.plot(xs, ys, "o-")
	ax.set_title(title)
	ax.yaxis.set_major_formatter(lambda x, _: fmt(x))

def _plot_by_runs(ax, data, title, fmt, group_column = "id_major"):
	for i, group in data.groupby(group_column):
		ys = group["value"]
		xs = numpy.arange(len(ys))
		ax.plot(xs, ys, ":", lw = 1, label = f"Run {i}")
	
	ax.set_title(title)
	ax.yaxis.set_major_formatter(lambda x, _: fmt(x))

def _plot_mean_std(ax, xs, mean, std, fmt):
	ax.plot(xs, [mean] * len(xs), "-", lw = 2, color = "red")
	ax.fill_between(
		xs, mean - std * 3, mean + std * 3,
		color = "red", alpha = 0.5
	)
	ax.text(xs[0], mean + std * 4, "μ={} σ={}".format(fmt(mean), fmt(std)), verticalalignment = "bottom")

## ANALYZE

def _analyze_mean_std_per_run(data, group_column = "id_major"):
	means = []
	shifted_data = []
	for i, group in data.groupby(group_column):
		ys = group["value"]
		mean = numpy.mean(ys)
		shifted_ys = ys - mean
		means.append(mean)
		shifted_data = numpy.concatenate((shifted_data, shifted_ys))
	
	# TODO: assumes all runs have the same amount of elements
	mean = numpy.mean(means)
	# we compute std from data with mean at 0, this helps us correct for constant errors in each run
	std = numpy.std(shifted_data)

	return mean, std

## MAIN

def plot_inits(ax, data):
	_plot_flat(ax, data[data["name"] == "init"], "Inits", _fmt_time_ms)

def plot_destroys(ax, data):
	_plot_flat(ax, data[data["name"] == "destroy"], "Destroys", _fmt_time_ms)

def plot_heap_sizes(ax, data):
	title = "Heap size"
	mask = data["name"] == "__heap_size"
	if not any(mask):
		mask = data["name"] == "__rss"
		title = "Resident set size"

	_plot_flat(ax, data[mask], title, _fmt_bytes)

def plot_performs(ax_cold, ax_warm, data):
	warmup_count = 5

	data = data[data["name"] == "perform"]
	data_cold = data[data["id_minor"] < warmup_count]
	data_warm = data[data["id_minor"] >= warmup_count]

	_plot_by_runs(ax_cold, data_cold, "Performs cold", _fmt_time_ms)
	_plot_by_runs(ax_warm, data_warm, "Performs warm", _fmt_time_ms)
	mean, std = _analyze_mean_std_per_run(data_warm)
	_plot_mean_std(ax_warm, numpy.arange(data_warm["id_minor"].max()), mean, std, _fmt_time_ms)

if __name__ == "__main__":
	data = pandas.read_csv(sys.argv[1])
	data["id_major"] = data["id"].apply(_map_id_major)
	data["id_minor"] = data["id"].apply(_map_id_minor)
	rows = data["id_major"].max() + 1

	fig = plt.figure(figsize = (6.4 * 2, 4.8 * 2), layout = "constrained")
	grid = GridSpec(4, 4, figure = fig)
	
	plot_inits(fig.add_subplot(grid[0, :]), data)
	plot_performs(
		fig.add_subplot(grid[1, 0]),
		fig.add_subplot(grid[1, 1:]),
		data
	)
	plot_destroys(fig.add_subplot(grid[2, :]), data)
	plot_heap_sizes(fig.add_subplot(grid[3, :]), data)
	
	if len(sys.argv) >= 3:
		fig.savefig(sys.argv[2])
	else:
		plt.show()
