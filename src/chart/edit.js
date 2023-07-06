import { TextControl, Spinner } from '@wordpress/components';
import { useState, useEffect } from '@wordpress/element';
import { useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import defaultImg from '../../assets/icon-256x256.png';
import "./editor.scss";

export default function edit( { attributes, setAttributes } ) {

    const [ options, setOptions ] = useState( [] );
    const [ search, setSearch ] = useState( '' );
    const [ loaded, setLoaded ] = useState( false );
    const [ charts, setCharts ] = useState( [] );
    const [ pluginActive, setPluginActive ] = useState( true );
    const blockProps = useBlockProps( { className: 'm-chart-block-chart-selector' } );

    // On load we fetch all charts if none available we set a constant to show an error message.
    // We then check if a chart is already chosen. If so we show that one else show all.

    useEffect( () => {
        apiFetch( { path: '/wp/v2/m-chart?all_charts&status=publish&_fields=id,title,subtitle,url' } ).then( result => {

            let charts = [];
            result.map( x => charts.push( { id: x.id, title: x.title || '-', subtitle: x.subtitle, src: x.url || defaultImg } ) );
            setCharts( charts );
            setOptions( charts );
            setLoaded( true );
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
    const selected = charts.filter( x => x.id === attributes.chartId )[ 0 ];

    const handleClick = ( id ) => {
        setAttributes( { chartId: id } );
    };

    const handleFilter = ( value ) => {

        setSearch( value );
        if ( value?.length > 1 ) {
            attributes.chartId = null;
            setOptions( charts.filter( x => x.title.includes( value ) || x.subtitle.includes( value ) ) );
        }
        if ( value === '' ) {
            setOptions( charts );
        }
    };

    return (
        <div { ...blockProps }>
            <div className="wp-block m-chart-selector-container">
                <TextControl
                    value={ search }
                    placeholder={ __( 'Search by title or subtitle', 'm-chart' ) }
                    onChange={ ( value ) => handleFilter( value ) }
                />

                { optionsList.length > 0 &&
                    <div className="m-chart-block-instructions">
                        { !attributes.chartId && <span>{ __( 'Click on a chart to select & insert', 'm-chart' ) }</span> }
                        { attributes.chartId && <span>{ __( 'Click on the chart to make a new selection', 'm-chart' ) }</span> }
                    </div>
                }

                { pluginActive === false &&
                    <div className="m-chart-centralizer">
                        <p>{ __( 'Chart plugin not available or not active', 'm-chart' ) }
                            <a href="/wp-admin/plugins.php">{ __( 'to plugins page', 'm-chart' ) }</a>
                        </p>
                    </div>
                }

                { pluginActive === true &&
                    <div className="m-chart-centralizer">
                        { !loaded &&
                            <Spinner />
                        }
                        { loaded && charts.length === 0 &&
                            <p>{ __( 'no charts found', 'm-chart' ) }
                                <a href="/wp-admin/post-new.php?post_type=m-chart">{ __( 'create a new chart', 'm-chart' ) }</a>
                            </p>
                        }
                        {
                            loaded && charts.length > 0 && optionsList.length === 0 && search.length > 1 &&
                            <p>{ __( 'no charts found using this search string', 'm-chart' ) }</p>
                        }
                    </div>
                }


                { !attributes.chartId &&
                    <ul className="m-chart-containerlist">
                        { optionsList }
                    </ul>
                }

                { attributes.chartId &&
                    <div className="selected-chart" onClick={ () => handleClick( '' ) }>
                        <img className={ selected?.src.includes( 'icon-256x256' ) ? 'default-img' : 'preview' } src={ selected?.src } />
                    </div>
                }
            </div>
        </div>
    );
}