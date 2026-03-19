import { SelectControl, Spinner, ToolbarGroup, ToolbarButton, Placeholder, ExternalLink, PanelBody, SearchControl } from '@wordpress/components';
import { getBlockType } from '@wordpress/blocks';
import { useState, useEffect, useRef, useMemo, useCallback } from '@wordpress/element';
import { useBlockProps, BlockControls, InspectorControls } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import debounce from 'lodash/debounce';
import "./editor.scss";

export default function edit( { attributes, setAttributes } ) {
    // State
    const [ results, setResults ] = useState( [] );
    const [ search, setSearch ] = useState( '' );
    const [ postsAvailable, setPostsAvailable ] = useState( false );
    const [ available, setAvailable ] = useState( 0 );
    const [ loaded, setLoaded ] = useState( false );
    const [ selectedChart, setSelectedChart ] = useState( null );
    const [ siteUrl, setSiteUrl ] = useState( null );
    const [ imageSupport, setImageSupport ] = useState( false );
    const [ loadProblem, setLoadProblem ] = useState( false );
    const [ page, setPage ] = useState( 1 );
    const [ loadingMore, setLoadingMore ] = useState( false );
    const resultsRef = useRef( null );

    // URLs
    const newUrl     = `${ siteUrl }/wp-admin/post-new.php?post_type=m-chart`;
    const editUrl    = `${ siteUrl }/wp-admin/post.php?post=${ attributes.chartId }&action=edit`;
    const optionsUrl = `/m-chart/v1/options`;

    // Blockprops
    const blockProps = useBlockProps( { className: 'm-chart-block-chart-selector' } );

    // Set a cache URL parameter based on the current moment in time to prevent cached images from messing up the UI
    const cacheBuster = `?cache=${performance.now()}`;

    // On load we fetch some option settings and run getCharts so we have some intiial reasults loaded into the UI
    useEffect( () => {
        fetchOptions();
        getCharts( search );
    }, [] );

    // Fetch the selected chart individually whenever chartId changes
    // Using attributes.chartId as a dependency handles the case where Gutenberg provides the saved attribute value after the initial render
    useEffect( () => {
        setSelectedChart( null );
        if ( attributes.chartId ) {
            getChart( parseInt( attributes.chartId, 10 ) );
        }
    }, [ attributes.chartId ] );

    // Load more charts when scrolling near the bottom of the results list
    useEffect( () => {
        const el = resultsRef.current;

        if ( ! el ) return;

        const handleScroll = () => {
            if ( loadingMore ) return;
            if ( results.length >= available ) return;
        
            // If we're close enough to the bottom of the list load the next page
            if ( el.scrollTop + el.clientHeight >= el.scrollHeight - 100 ) {
                const nextPage = page + 1;
                setPage( nextPage );
                getCharts( search, nextPage );
            }
        };

        el.addEventListener( 'scroll', handleScroll );
        
        return () => el.removeEventListener( 'scroll', handleScroll );
    }, [ results, available, loadingMore, page, search ] );

    // Build list of charts out of the results object
    const resultsList = results.map( ( x ) => {
        if ( ! imageSupport || ! x.src ) {
            return <li aria-label={"Select Chart: " + x.title} role="button" className="item no-image" key={ x.id } onClick={ () => handleClick( x.id ) } title={ x.title }><div className="type"><span className={ 'icon ' + x.type }></span><h6 className="title">{ x.title }</h6></div></li>;
        } else {
            return <li aria-label={"Select Chart: " + x.title} role="button" className="item image" key={ x.id } onClick={ () => handleClick( x.id ) } title={ x.title }><h6 className="title">{ x.title }</h6><img src={ x.src + cacheBuster } alt={ x.title } /></li>;
        }
    } );

    // Handle clicks to a chart in the results list
    const handleClick = ( id ) => {
        setAttributes( { chartId: id } );
        setSelectedChart( null );
    };

    // Handle user typing into the search field
    const handleSearch = ( value ) => {
        console.log( 'search', value );
        doSearch( value );
    };

    // Actually actually carry out the debounced search
    const doSearch = useCallback(
        debounce( ( value ) => {
            console.log( 'debounce', value );
            setSearch( value );
            setPage( 1 );
            getCharts( value );
        }, 500),
        []
    );

    // Get option settings
    const fetchOptions = () => {
        apiFetch( { path: optionsUrl } ).then( result => {
            setImageSupport( result.image_support );
            setSiteUrl( result.siteurl );
            setPostsAvailable( result.posts_avilable );
        } );
    };

    // Get a single chart
    const getChart = ( id ) => {
        apiFetch( { path: `/m-chart/v1/chart/${ id }` } ).then( result => {
            setSelectedChart( {
                id: result.id,
                title: result.title || '-',
                subtitle: result.subtitle,
                width: result.width,
                height: result.height,
                type: result.type || '',
                src: result.url || ''
            } );
        } ).catch( () => {} );
    };

    const getCharts = ( value, getPage = 1 ) => {
        setLoadProblem( false );

        // If we're getting a subsequent page we're adding to the existing results
        if ( getPage > 1 ) {
            setLoadingMore( true );
        }

        // Build the parameters
        const params = new URLSearchParams();

        if ( value ) {
            params.set( 's', value );
        }

        if ( getPage > 1 ) {
            params.set( 'page', getPage );
        }

        const query = params.toString();

        // Run the query and grab the results
        apiFetch( { path: `/m-chart/v1/charts${ query ? '?' + query : '' }` } )
            .then(
                result => {
                    const newCharts = result.posts.map( x => ( {
                        id: x.id,
                        title: x.title || '-',
                        subtitle: x.subtitle,
                        width: x.width,
                        height: x.height,
                        type: x.type || '',
                        src: x.url || ''
                    } ) );

                    // Update the found value to match the current search
                    setAvailable( result.found_posts );

                    // Either append or replace the existing results
                    if ( getPage === 1 ) {
                        setResults( newCharts );
                    } else {
                        setResults( prev => [ ...prev, ...newCharts ] );
                    }

                    setLoaded( true );
                    setLoadingMore( false );
                } ).catch( ( error ) => {
                    // If there's an error we'll note it
                    if ( error.code === 'rest_no_route' ) {
                        setLoadProblem( true );
                    }

                    setLoadingMore( false );
                } );
    };

    return (
        <div { ...blockProps }>
            { !! attributes.chartId &&
                <InspectorControls>
                    <PanelBody title={ __( 'Display settings', 'm-chart' ) }>
                        <SelectControl
                            label={ __( 'Show', 'm-chart' ) }
                            value={ attributes.show }
                            options={ [
                                { label: __( 'Chart', 'm-chart' ),  value: 'chart' },
                                { label: __( 'Image', 'm-chart' ),  value: 'image' },
                                { label: __( 'Table', 'm-chart' ),  value: 'table' },
                            ] }
                            onChange={ ( value ) => setAttributes( { show: value } ) }
                        />
                    </PanelBody>
                </InspectorControls>
            }
            <BlockControls>
                <ToolbarGroup className="m-chart-block">
                    { ! attributes.chartId &&
                        <ToolbarButton onClick={ () => window.open( newUrl, "_blank" ) } icon="external">{ __( 'New chart', 'm-chart' ) }</ToolbarButton>
                    }
                    { !! attributes.chartId &&
                        <>
                            <ToolbarButton onClick={ () => window.open( editUrl, "_blank" ) } icon="external" >{ __( 'Edit chart', 'm-chart' ) }</ToolbarButton>
                            <ToolbarButton onClick={ () => handleClick( 0 ) } >{ __( 'Replace', 'm-chart' ) }</ToolbarButton>
                        </>
                    } 
                </ToolbarGroup>
            </BlockControls>
            { !! attributes.chartId ? (
                <div className="wp-block m-chart-selector">
                    { ! selectedChart ?
                        <p className="center"><Spinner /></p>
                        :
                        <div className="chart-selected">
                            { ! imageSupport || ! selectedChart.src ?
                                <div className="no-image" style={ { aspectRatio: selectedChart.width / selectedChart.height } }>
                                    <div className="type">
                                        <span className={ 'icon ' + selectedChart.type }></span>
                                        <h5 className="title">{ selectedChart.title }</h5>
                                        { selectedChart.subtitle && (<h6 className="subtitle">{ selectedChart.subtitle }</h6>)}
                                    </div>
                                </div>    
                                :
                                <div className="image">
                                    <img className="preview" src={ selectedChart.src + cacheBuster } />
                                </div>
                            }
                        </div>
                    }
                </div>
            ) : (
                <div className="wp-block m-chart-selector">
                    <Placeholder className="block-editor-m-chart-placeholder" icon={ getBlockType( 'm-chart/chart' ).icon.src } label={ __( 'Chart', 'm-chart' ) }>
                        <div className="viewbox">
                            { loadProblem ?
                                <p>{ __( 'There was a problem loading charts', 'm-chart' ) }</p>
                                :
                                <>
                                    { !loaded ?
                                        <p className="center">
                                            <Spinner />
                                        </p>
                                        :
                                        postsAvailable === false ?
                                            <div>
                                                <p>
                                                    { __( 'No charts found', 'm-chart' ) }<br />
                                                </p>
                                                <p>
                                                    <ExternalLink href={ newUrl }>{ __( 'Create a new chart', 'm-chart' ) }</ExternalLink>
                                                </p>
                                            </div>
                                            :
                                            <div className="no-chart-selected">
                                                <div className="search-box">
                                                    <SearchControl
                                                        value={ search }
                                                        placeholder={ __( 'Search by title', 'm-chart' ) }
                                                        onChange={ ( value ) => handleSearch( value ) }
                                                        autoFocus
                                                    />
                                                    <p className="count">{ available } { 1 === available ? __( 'chart found', 'm-chart' ) : __( 'charts found', 'm-chart' ) }</p>
                                                </div>
                                                { resultsList.length === 0 && search.length > 1 ?
                                                    <p>{ __( 'No charts found', 'm-chart' ) }</p>
                                                    :
                                                    <ul ref={ resultsRef } className={ imageSupport ? 'results image-support' : 'results no-image-support' }>
                                                        { resultsList }
                                                        { loadingMore &&
                                                            <li className="loading-more"><Spinner /></li>
                                                        }
                                                    </ul>
                                                }
                                            </div>
                                    }
                                </>
                            }
                        </div>
                    </Placeholder>
                </div>
            ) }
        </div>
    );
}; 