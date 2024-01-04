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
    const optionsUrl = `/m-chart/v1/options`;
    const chartFetchUrl = `/wp/v2/m-chart?all_charts&status=publish&_fields=id,title,subtitle,url,type,width,height`;
    // Blockprops.
    const blockProps = useBlockProps( { className: 'm-chart-block-chart-selector' } );
    // Miscellaneous
    const random = `?random=${ Math.round( Math.random() * 1000000 ) }`;

    // On load we fetch all charts if none available we set a constant to show an error message.
    // We then check if a chart is already chosen. If so we show that one else show all.
    useEffect( () => {
        apiFetch( { path: optionsUrl } ).then( result => {
            setImageSupport( result.image_support_active );
            setSiteUrl( result.siteurl );
        } );
        apiFetch( { path: chartFetchUrl } ).then( result => {
            let charts = [];
            result.map( x => charts.push( {
                id: x.id,
                title: x.title || '-',
                subtitle: x.subtitle,
                width: x.width,
                height: x.height,
                type: x.type || '',
                src: x.url || ''
            } ) );
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
            return <li className={ x.type } key={ x.id } onClick={ () => handleClick( x.id ) }> { x.title }</li>;
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
                <ToolbarGroup className="m-chart-block">
                    <ToolbarButton onClick={ () => window.location.href = newUrl } icon="external">{ __( 'New Chart', 'm-chart' ) }</ToolbarButton>
                    { attributes.chartId &&
                        <>
                            <ToolbarButton onClick={ () => window.location.href = editUrl } icon="external" >{ __( 'Edit Chart', 'm-chart' ) }</ToolbarButton>
                            <ToolbarButton onClick={ () => handleClick( '' ) } >{ __( 'Replace', 'm-chart' ) }</ToolbarButton>
                        </>
                    }
                </ToolbarGroup>
            </BlockControls>

            <div className="wp-block m-chart-selector">
					<div className="components-placeholder block-editor-m-chart-placeholder is-large">
		                <div className="components-placeholder__label"><span className="dashicons dashicons-chart-pie"></span> Chart</div>
		                <div className="viewbox">
		                    { loadProblem ?
		                        <p>{ __( 'There is a problem fetching charts', 'm-chart' ) }</p>
		                        :
		                        <>
		                            { !loaded ?
		                                <p className="center">
		                                    <Spinner />
		                                </p>
		                                :
		                                charts.length === 0 ?
		                                    <p className="center">{ __( 'No Charts found', 'm-chart' ) }
		                                        <a href={ newUrl }>{ __( 'Create a new chart', 'm-chart' ) }</a>
		                                    </p>
		                                    :
		                                    attributes.chartId ?
		                                        <div className="chart-selected">
		                                            { imageSupport ?
		                                                <div className="image-support">
		                                                    { selected?.src === '' ?
		                                                        <h4 className="no-title dashicons-before dashicons-chart-pie">{ selected?.title }</h4>
		                                                        :
		                                                        <img className="preview" src={ selected?.src + random } />
		                                                    }
		                                                </div>
		                                                :
		                                                <div className="no-image-support" style={ { aspectRatio: selected.width / selected.height } }>
		                                                    <span className={ 'type ' + selected.type }></span>
		                                                    <h4>{ selected?.title }</h4>
		                                                    <p>{ selected?.subtitle }</p>
		                                                </div>
		                                            }
		                                        </div>
		                                        :
		                                        <div className="no-chart-selected">
		                                            <TextControl
		                                                value={ search }
		                                                placeholder={ __( 'Search by title', 'm-chart' ) }
		                                                onChange={ ( value ) => handleFilter( value ) }
		                                            />
		                                            { optionsList.length === 0 && search.length > 1 ?
		                                                <p>{ __( 'No Charts found using this search string', 'm-chart' ) }</p>
		                                                :
		                                                <ul className={ imageSupport ? 'image-support' : 'no-image-support' }>
		                                                    { optionsList.slice( 0, 24 ) }
		                                                </ul>
		                                            }
		                                        </div>
		                            }
		                        </>
		                    }
		                </div>
		            </div>
				</div>
        </div >
    );
}