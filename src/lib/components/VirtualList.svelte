<script lang="ts" generics="T">
	import { onDestroy } from 'svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		items: T[];
		getHeight: (item: T) => number;
		overscan?: number;
		children: Snippet<[T]>;
	}

	let { items, getHeight, overscan = 5, children }: Props = $props();

	let el = $state<HTMLElement | null>(null);
	let scrollY = $state(0);
	let winH = $state(800);

	// Measured heights override estimates; keyed by item index.
	let measuredHeights = $state(new Map<number, number>());

	// Generation counter — incremented on each scrollToIndex call and on items change,
	// so stale callbacks from a previous scroll don't fire.
	let scrollGen = 0;

	// Pending measurements are batched via queueMicrotask to avoid one Map copy per item.
	let pendingMeasures: Map<number, number> | null = null;
	let destroyed = false;
	onDestroy(() => { destroyed = true; });

	function flushMeasures() {
		if (!pendingMeasures || destroyed) return;
		measuredHeights = new Map([...measuredHeights, ...pendingMeasures]);
		pendingMeasures = null;
	}

	// Reset measurements when the item list changes (filter/search change).
	$effect(() => {
		void items;
		measuredHeights = new Map();
		scrollGen++;
	});

	function heightOf(i: number): number {
		return measuredHeights.get(i) ?? getHeight(items[i]);
	}

	// Pre-compute cumulative top offsets and total height.
	const positions = $derived.by(() => {
		void measuredHeights; // re-run when any measurement updates
		const tops: number[] = [];
		let acc = 0;
		for (let i = 0; i < items.length; i++) {
			tops.push(acc);
			acc += heightOf(i);
		}
		return { tops, total: acc };
	});

	// Determine which slice of items falls within the viewport.
	const range = $derived.by(() => {
		const { tops } = positions;
		if (tops.length === 0) return { start: 0, end: -1 };

		const containerTop = el?.offsetTop ?? 0;
		const viewStart = Math.max(0, scrollY - containerTop);
		const viewEnd = viewStart + winH;

		// Binary search: first item whose bottom edge > viewStart
		let lo = 0, hi = tops.length;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (tops[mid] + heightOf(mid) <= viewStart) lo = mid + 1;
			else hi = mid;
		}
		const start = Math.max(0, lo - overscan);

		let end = lo;
		while (end < tops.length && tops[end] < viewEnd) end++;
		end = Math.min(tops.length - 1, end + overscan);

		return { start, end };
	});

	const visible = $derived(
		items.slice(range.start, range.end + 1).map((item, i) => ({
			item,
			top: positions.tops[range.start + i],
			key: range.start + i
		}))
	);

	// Three-pass scroll:
	//  1. Instant jump to estimated position (brings target items into the render window)
	//  2. Instant correction after 2 frames (ResizeObserver has now measured nearby items)
	//  3. Smooth final correction after 200ms (positions have fully settled)
	export function scrollToIndex(targetIndex: number, headerOffset = 0) {
		if (!el || targetIndex < 0 || targetIndex >= items.length) return;

		const gen = ++scrollGen;
		const top = () => Math.max(0, el!.offsetTop + (positions.tops[targetIndex] ?? 0) - headerOffset);

		window.scrollTo({ top: top(), behavior: 'instant' });

		requestAnimationFrame(() => requestAnimationFrame(() => {
			if (scrollGen !== gen) return;
			window.scrollTo({ top: top(), behavior: 'instant' });

			setTimeout(() => {
				if (scrollGen !== gen) return;
				window.scrollTo({ top: top(), behavior: 'smooth' });
			}, 200);
		}));
	}

	// Svelte action: observe actual rendered height and feed it back.
	function observeHeight(node: HTMLElement, index: number) {
		let idx = index;
		const ro = new ResizeObserver(() => {
			const h = node.offsetHeight;
			if (h > 0 && measuredHeights.get(idx) !== h) {
				if (!pendingMeasures) {
					pendingMeasures = new Map();
					queueMicrotask(flushMeasures);
				}
				pendingMeasures.set(idx, h);
			}
		});
		ro.observe(node);
		return {
			update(newIndex: number) { idx = newIndex; },
			destroy() { ro.disconnect(); }
		};
	}
</script>

<svelte:window bind:scrollY bind:innerHeight={winH} />

<div bind:this={el} style="position: relative; height: {positions.total}px;">
	{#each visible as { item, top, key } (key)}
		<div style="position: absolute; top: {top}px; left: 0; right: 0;" use:observeHeight={key}>
			{@render children(item)}
		</div>
	{/each}
</div>
