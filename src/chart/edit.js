import { TextControl, Spinner, ToolbarGroup, ToolbarButton, } from '@wordpress/components';
import { useState, useEffect } from '@wordpress/element';
import { useBlockProps, BlockControls } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import "./editor.scss";

export default function edit( { attributes, setAttributes } ) {

    // State.
    const [ options, setOptions ] = useState( [] );
    const [ search, setSearch ] = useState( '' );
    const [ loaded, setLoaded ] = useState( false );
    const [ charts, setCharts ] = useState( [] );
    const [ temp, setTemp ] = useState( null );
    const [ siteUrl, setSiteUrl ] = useState( null );
    const [ imageSupport, setImageSupport ] = useState( true );
    const [ loadProblem, setLoadProblem ] = useState( false );
    // Url constants.
    const newUrl = `${ siteUrl }/wp-admin/post-new.php?post_type=m-chart`;
    const editUrl = `${ siteUrl }/wp-admin/post.php?post=${ attributes.chartId }&action=edit`;
    const imageSupportUrl = `/m-chart/v1/mchart_options`;
    const chartFetchUrl = `/wp/v2/m-chart?all_charts&status=publish&_fields=id,title,subtitle,url`;
    // Blockprops.
    const blockProps = useBlockProps( { className: 'm-chart-block-chart-selector' } );
    // Miscellaneous
    const random = `?random=${ Math.round( Math.random() * 1000000 ) }`;

    // On load we fetch all charts if none available we set a constant to show an error message.
    // We then check if a chart is already chosen. If so we show that one else show all.
    useEffect( () => {
        apiFetch( { path: imageSupportUrl } ).then( result => {
            setImageSupport( result.image_support_active );
            setSiteUrl( result.siteurl );
        } );

        apiFetch( { path: chartFetchUrl } ).then( result => {
            let charts = [];
            result.map( x => charts.push( { id: x.id, title: x.title || '-', subtitle: x.subtitle, src: x.url || '' } ) );
            setCharts( charts );
            setOptions( charts );
            setLoaded( true );
        } ).catch( ( error ) => {
            if ( error.code === 'rest_no_route' ) {
                setLoadProblem( true );
            };
        } );
    }, [] );

    // Compose preview list.
    const optionsList = options.map( ( x ) => {
        if ( imageSupport ) {
            return <li className={ x.src ? 'img' : 'dashicons dashicons-chart-pie' } key={ x.id } onClick={ () => handleClick( x.id ) }>{ x.src ? <img src={ x.src + random } /> : <h6>{ x.title }</h6> }</li>;
        } else {
            return <li key={ x.id } onClick={ () => handleClick( x.id ) }> { x.title }</li>;
        }
    } );

    const selected = charts.filter( x => x.id === attributes.chartId )[ 0 ];

    const handleClick = ( id ) => {
        setAttributes( { chartId: id } );
        setTemp( id );
    };

    const handleFilter = ( value ) => {
        setSearch( value );
        if ( value.length === 0 ) {
            if ( temp ) { setAttributes( { chartId: temp } ); }
            else { setOptions( charts ); }
        } else {
            if ( attributes.chartId ) { setTemp( attributes.chartId ); }
            attributes.chartId = null;
            setOptions( charts.filter( x => x.title.toLowerCase().includes( value.toLowerCase() ) ) );
        }
    };

    return (
        <div { ...blockProps }>
            <BlockControls>
                <ToolbarGroup>
                    <ToolbarButton onClick={ () => window.location.href = newUrl } icon="external">{ __( 'New Chart', 'wt-m-chart-addon' ) }</ToolbarButton>
                    { attributes.chartId &&
                        <>
                            <ToolbarButton onClick={ () => window.location.href = editUrl } icon="external" >{ __( 'Edit Chart', 'wt-m-chart-addon' ) }</ToolbarButton>
                            <ToolbarButton onClick={ () => handleClick( '' ) } >{ __( 'Replace', 'wt-m-chart-addon' ) }</ToolbarButton>
                        </>
                    }
                </ToolbarGroup>
            </BlockControls>

            <div className="wp-block m-chart-selector-container">
                <h6 className="branding"><span className="dashicons dashicons-chart-pie"></span>M Chart</h6>
                <div className="m-chart-viewbox">
                    { loadProblem ?
                        <p>{ __( 'There is a problem fetching charts', 'wt-m-chart-addon' ) }</p>
                        :
                        <>
                            { !loaded ?
                                <p className="center">
                                    <Spinner />
                                </p>
                                :
                                charts.length === 0 ?
                                    <p className="center">{ __( 'no charts found', 'wt-m-chart-addon' ) }
                                        <a href={ newUrl }>{ __( 'create a new chart', 'wt-m-chart-addon' ) }</a>
                                    </p>
                                    :
                                    attributes.chartId ?
                                        <div className="selected-chart">
                                            { imageSupport ?
                                                <>
                                                    { selected?.src === '' ?
                                                        <h4 className="no-title dashicons-before dashicons-chart-pie">{ selected?.title }</h4>
                                                        :
                                                        <img className="preview" src={ selected?.src + random } />
                                                    }
                                                </>
                                                :
                                                <>
                                                    <h4>{ selected?.title }</h4>
                                                    <p>{ selected?.subtitle }</p>
                                                </>
                                            }
                                        </div>
                                        :
                                        <>
                                            <TextControl
                                                value={ search }
                                                placeholder={ __( 'Search by title', 'wt-m-chart-addon' ) }
                                                onChange={ ( value ) => handleFilter( value ) }
                                            />
                                            { optionsList.length === 0 && search.length > 1 ?
                                                <p className="center">{ __( 'no charts found using this search string', 'wt-m-chart-addon' ) }</p>
                                                :
                                                <ul className={ `m-chart-containerlist ${ imageSupport ? 'image-support' : '' }` }>
                                                    { optionsList }
                                                </ul>
                                            }
                                        </>
                            }
                        </>
                    }
                </div>
            </div>
        </div >
    );
}