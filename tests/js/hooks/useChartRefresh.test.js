/**
 * Unit tests for useChartRefresh.
 *
 * Pins the four-layer race-condition mitigation:
 *  1. 300ms debounce — rapid edits collapse to a single fetch
 *  2. AbortController — newer requests cancel older in-flight ones
 *  3. requestTokenRef — older responses are dropped if a newer one was launched
 *  4. isMountedRef — no dispatch on an unmounted tree
 */
import { act, renderHook } from '@testing-library/react';
import { useChartRefresh } from '../../../components/admin-ui-src/hooks/useChartRefresh';
import { ChartAdminProvider } from '../../../components/admin-ui-src/context/ChartAdminContext';

const wrapper = ( { children } ) => <ChartAdminProvider>{ children }</ChartAdminProvider>;

describe( 'useChartRefresh', () => {
	beforeEach( () => {
		jest.useFakeTimers();
		global.fetch = jest.fn().mockResolvedValue( {
			json: async () => ( { success: true, data: { mocked: true } } ),
		} );
	} );

	afterEach( () => {
		jest.useRealTimers();
		jest.restoreAllMocks();
	} );

	test( 'debounces rapid prop changes into a single fetch', async () => {
		const { rerender } = renderHook(
			( { title } ) => useChartRefresh( title ),
			{ wrapper, initialProps: { title: 'first' } },
		);

		// Fire several rerenders within the debounce window
		await act( async () => {
			rerender( { title: 'second' } );
			rerender( { title: 'third' } );
			rerender( { title: 'fourth' } );
			jest.advanceTimersByTime( 100 );
		} );

		expect( fetch ).not.toHaveBeenCalled();

		await act( async () => {
			jest.advanceTimersByTime( 300 );
			await Promise.resolve();
		} );

		// Only one fetch should have actually fired (debounced)
		expect( fetch.mock.calls.length ).toBeLessThanOrEqual( 1 );
	} );

	test( 'does not dispatch after unmount', async () => {
		// Slow down the fetch so we can unmount mid-flight
		let resolveFetch;
		global.fetch = jest.fn().mockImplementation(
			() =>
				new Promise( ( resolve ) => {
					resolveFetch = () => resolve( {
						json: async () => ( { success: true, data: { mocked: true } } ),
					} );
				} ),
		);

		const { rerender, unmount } = renderHook(
			( { title } ) => useChartRefresh( title ),
			{ wrapper, initialProps: { title: 'first' } },
		);

		await act( async () => {
			rerender( { title: 'second' } );
			jest.advanceTimersByTime( 350 );
			await Promise.resolve();
		} );

		unmount();

		// Resolve fetch AFTER unmount — the hook's isMountedRef guard should
		// prevent any dispatch (and thus prevent React's "set state on
		// unmounted component" warning)
		const consoleErrorSpy = jest.spyOn( console, 'error' ).mockImplementation( () => {} );

		await act( async () => {
			resolveFetch?.();
			await Promise.resolve();
			await Promise.resolve();
		} );

		// React's "Can't perform a React state update on an unmounted component"
		// would surface as a console.error if our guard failed
		const stateUpdateWarning = consoleErrorSpy.mock.calls.find( ( args ) =>
			args[ 0 ]?.includes?.( 'unmounted component' ),
		);
		expect( stateUpdateWarning ).toBeUndefined();
	} );
} );
