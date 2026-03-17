import { TextControl, SelectControl, Spinner, ToolbarGroup, ToolbarButton, Placeholder, ExternalLink, PanelBody } from '@wordpress/components';
import { getBlockType } from '@wordpress/blocks';
import { useState, useEffect, useRef, useMemo } from '@wordpress/element';
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
    const [ charts, setCharts ] = useState( [] );
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

    // On load we fetch some option settings and run fetchCharts so we have some intiial reasults loaded into the UI
    useEffect( () => {
        fetchOptions();
        fetchCharts( search );
    }, [] );

    // Fetch the selected chart individually whenever chartId changes
    // Using attributes.chartId as a dependency handles the case where Gutenberg provides the saved attribute value after the initial render
    useEffect( () => {
        setSelectedChart( null );
        if ( attributes.chartId ) {
            fetchChart( parseInt( attributes.chartId, 10 ) );
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
                fetchCharts( search, nextPage );
            }
        };

        el.addEventListener( 'scroll', handleScroll );
        
        return () => el.removeEventListener( 'scroll', handleScroll );
    }, [ results, available, loadingMore, page, search ] );

    // Build list of charts
    const resultsList = results.map( ( x ) => {
        if ( imageSupport ) {
			return <li className={ x.src ? 'item img' : 'item no-image' } key={ x.id } onClick={ () => handleClick( x.id ) } title={ x.title }>{ x.src ? <><h6 className="title">{ x.title }</h6><img src={ x.src + cacheBuster } alt={ x.title } /></> : <div className="type"><span className={ 'icon ' + x.type }><h6 className="title">{ x.title }</h6></span></div> }</li>;
        } else {
            return <li className="no-image" key={ x.id } onClick={ () => handleClick( x.id ) } title={ x.title }><div className="type"><span className={ 'icon ' + x.type }></span><h6 className="title">{ x.title }</h6></div></li>;
        }
    } );

    const selected = charts.filter( x => x.id === parseInt( attributes.chartId, 10 ) )[ 0 ] || selectedChart;

    // Handle clicks to a chart in the results list
    const handleClick = ( id ) => {
        setAttributes( { chartId: id } );
        setSelectedChart( null );
    };

    // Handle user typing into the search field
    const handleSearch = ( value ) => {
        setSearch( value );
        setPage( 1 );
        doDebounce( value );
    };

    // Get option settings
    const fetchOptions = () => {
        apiFetch( { path: optionsUrl } ).then( result => {
            setImageSupport( result.image_support );
            setSiteUrl( result.siteurl );
            setPostsAvailable( result.posts_avilable );
        } );
    };

    const fetchChart = ( id ) => {
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

    const fetchCharts = ( value, fetchPage = 1 ) => {
        setLoadProblem( false );

        if ( fetchPage > 1 ) {
            setLoadingMore( true );
        }

        const params = new URLSearchParams();
        if ( value ) {
            params.set( 's', value );
        }
        if ( fetchPage > 1 ) {
            params.set( 'page', fetchPage );
        }
        const query = params.toString();

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

                    setAvailable( result.found_posts );

                    if ( fetchPage === 1 ) {
                        setCharts( newCharts );
                        setResults( newCharts );
                    } else {
                        setCharts( prev => [ ...prev, ...newCharts ] );
                        setResults( prev => [ ...prev, ...newCharts ] );
                    }

                    setLoaded( true );
                    setLoadingMore( false );
                } ).catch( ( error ) => {
                    if ( error.code === 'rest_no_route' ) {
                        setLoadProblem( true );
                    }
                    setLoadingMore( false );
                } );
    };

    // We don't want to run the search until the user is done typeing so we'll setup a debounce to handle that here
    const fetchChartsRef = useRef( fetchCharts );
    fetchChartsRef.current = fetchCharts;

    const doDebounce = useMemo( () => debounce( ( ...args ) => fetchChartsRef.current( ...args ), 500 ), [] );

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
                        <ToolbarButton onClick={ () => window.location.href = newUrl } icon="external">{ __( 'New chart', 'm-chart' ) }</ToolbarButton>
                    }
                    { !! attributes.chartId &&
                        <>
                            <ToolbarButton onClick={ () => window.location.href = editUrl } icon="external" >{ __( 'Edit chart', 'm-chart' ) }</ToolbarButton>
                            <ToolbarButton onClick={ () => handleClick( 0 ) } >{ __( 'Replace', 'm-chart' ) }</ToolbarButton>
                        </>
                    } 
                </ToolbarGroup>
            </BlockControls>
            { !! attributes.chartId ? (
                <div className="wp-block m-chart-selector">
                    { ! selected ?
                        <p className="center"><Spinner /></p>
                        :
                        <div className="chart-selected">
                            { imageSupport ?
                                <div className="image-support">
                                    { selected?.src === '' ?
                                        <div className="type">
                                            <span className={ 'icon ' + selected.type }></span>
                                            <h4 className="title">{ selected.title }</h4>
                                        </div>
                                        :
                                        <img className="preview" src={ selected?.src + cacheBuster } />
                                    }
                                </div>
                                :
                                <div className="no-image-support" style={ { aspectRatio: selected.width / selected.height } }>
                                    <span className={ 'type ' + selected.type }></span>
                                    <h4 className="title">{ selected?.title }</h4>
                                    <p>{ selected?.subtitle }</p>
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
                                            <p className="center">{ __( 'No charts found', 'm-chart' ) }
                                                <ExternalLink href={ newUrl }>{ __( 'Create a new chart', 'm-chart' ) }</ExternalLink>
                                            </p>
                                            :
                                            <div className="no-chart-selected">
                                                <div className="search-box">
                                                    <TextControl
                                                        value={ search }
                                                        placeholder={ __( 'Search by title', 'm-chart' ) }
                                                        onChange={ ( value ) => handleSearch( value ) }
                                                        autoFocus
                                                    />
                                                    <p className="count">{ available } charts found</p>
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