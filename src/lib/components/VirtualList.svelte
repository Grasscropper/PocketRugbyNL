<script lang="ts" generics="T">
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

	// Pre-compute cumulative top offsets and total height
	const positions = $derived.by(() => {
		const tops: number[] = [];
		let acc = 0;
		for (const item of items) {
			tops.push(acc);
			acc += getHeight(item);
		}
		return { tops, total: acc };
	});

	// Determine which slice of items falls within the viewport
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
			if (tops[mid] + getHeight(items[mid]) <= viewStart) lo = mid + 1;
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
</script>

<svelte:window bind:scrollY bind:innerHeight={winH} />

<div bind:this={el} style="position: relative; height: {positions.total}px;">
	{#each visible as { item, top, key } (key)}
		<div style="position: absolute; top: {top}px; left: 0; right: 0;">
			{@render children(item)}
		</div>
	{/each}
</div>
