import { TextControl, Spinner } from '@wordpress/components';
import { useState, useEffect } from '@wordpress/element';
import { useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import defaultImg from '../../assets/icon-256x256.png';
import "./editor.scss";

export default function edit( { attributes, setAttributes } ) {

    const [ options, setOptions ] = useState( [] );
    const [ id, setId ] = useState( '' );
    const [ charts, setCharts ] = useState( [] );
    const [ chartsAvailable, setChartsAvailable ] = useState( true );
    const [ pluginActive, setPluginActive ] = useState( true );
    const blockProps = useBlockProps( { className: 'm-chart-block-chart-selector' } );

    // On load we fetch all charts if none available we set a constant to show an error message.
    // We then check if a chart is already chosen. If so we show that one else show all.

    useEffect( () => {
        apiFetch( { path: '/wp/v2/m-chart?per_page=100&status=publish&_fields=id,title,subtitle,url' } ).then( result => {
            setChartsAvailable( true );
            let charts = [];
            result.map( x => charts.push( { id: x.id, title: x.title || '-', subtitle: x.subtitle, src: x.url || defaultImg } ) );
            setCharts( charts );
            // Any charts?
            if ( charts.length === 0 ) {
                setChartsAvailable( false );
            } else {
                // Store the charts.
                setOptions( charts );
                // Is one chosen?
                if ( attributes.chartId ) {
                    const idAvailable = charts.some( x => x.id === attributes.chartId );
                    if ( idAvailable ) {
                        setId( attributes.chartId );
                    } else {
                        setId( '' );
                        setAttributes( { chartId: '', chartTitle: '', title: '' } );
                    }
                }
            }
        } ).catch( ( error ) => {
            if ( error.code === 'rest_no_route' ) {
                setPluginActive( false );
            };
        } );
    }, [] );

    // Compose preview list.
    const optionsList = options.map( ( x ) => {
        return <li key={ x.id } onClick={ () => handleClick( x.id ) }><img className={ x.src.includes( 'icon-256x256' ) ? 'default-img' : 'preview' } src={ x.src } /></li>;
    } );

    //
    const selected = options.filter( x => x.id === id )[ 0 ];

    const handleClick = ( id ) => {
        setId( id );
        let title = options.filter( x => x.id === id )[ 0 ]?.title;
        setAttributes( { chartId: id, chartTitle: title, title: '' } );
    };

    const handleFilter = ( value ) => {
        setAttributes( { title: value } );
        if ( value?.length > 1 ) {
            setId( null );
            setOptions( options.filter( x => x.title.includes( value ) || x.subtitle.includes( value ) ) );
        }
        if ( value === '' ) {
            setOptions( charts );
        }
    };

    return (
        <div { ...blockProps }>
            <div className="wp-block m-chart-selector-container">
                <TextControl
                    value={ attributes.title }
                    placeholder={ __( 'Search by title or subtitle', 'm-chart' ) }
                    onChange={ ( value ) => handleFilter( value ) }
                />
                { optionsList.length > 0 &&

                    <div className="m-chart-block-instructions">
                        { !id && <span>{ __( 'Click on a chart to select & insert', 'm-chart' ) }</span> }
                        { id && <span>{ __( 'Click on the chart to make a new selection', 'm-chart' ) }</span> }
                    </div>
                }

                { chartsAvailable === true && pluginActive === true && optionsList.length === 0 &&
                    <div className="m-chart-centralizer">
                        <Spinner />
                    </div>
                }

                { ( chartsAvailable === false || pluginActive === false ) &&
                    <div className="m-chart-centralizer">
                        { chartsAvailable === false &&
                            <p>{ __( 'no charts found', 'm-chart' ) }
                                <a href="/wp-admin/admin.php?page=visualizer">{ __( 'create a new chart', 'm-chart' ) }</a></p> }
                        { pluginActive === false &&
                            <p>Chart plugin not available or not active
                                <a href="/wp-admin/plugins.php">{ __( 'to plugins page', 'm-chart' ) }</a></p> }
                    </div>
                }

                { !id &&
                    <ul className="m-chart-containerlist">
                        { optionsList }
                    </ul>
                }

                { id &&
                    <div className="selected-chart" onClick={ () => handleClick( '' ) }>
                        <img className={ selected?.src.includes( 'icon-256x256' ) ? 'default-img' : 'preview' } src={ selected?.src } />
                    </div>
                }
            </div>
        </div>
    );
}