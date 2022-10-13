import * as Q from 'q';
import {select, schemeCategory10} from 'd3';
import {DivEl} from '@enonic/lib-admin-ui/dom/DivEl';
import {CentralNodeInfo, D3SVG, FnSchemaNavigationListener, Relation, RenderConfig} from './interfaces';
import SchemaData from './SchemaData';
import SchemaRender from './SchemaRender';
import {InputEl} from '@enonic/lib-admin-ui/dom/InputEl';
import {LabelEl} from '@enonic/lib-admin-ui/dom/LabelEl';
import {PEl} from '@enonic/lib-admin-ui/dom/PEl';
import {ReferencesRequest} from './ReferencesRequest';
import {getOuterCircleRadius, getOuterTextSize} from './helpers';
import {ButtonEl} from '@enonic/lib-admin-ui/dom/ButtonEl';
import {SpanEl} from '@enonic/lib-admin-ui/dom/SpanEl';

export class SchemaVisualization extends DivEl{
    public appKey: string;
    private onNavigationListeners: FnSchemaNavigationListener[] = [];
    private svgContainerId: string = 'SvgContainer';
    private schemaRender: SchemaRender;
    private searchInput: DivEl;
    private referencesCheckbox: DivEl;
    private breadcrumbs: DivEl;
    private onLoadStart: () => void;
    private onLoadEnd: () => void;

    private static readonly referencesOpacity = 0.1;
    private static readonly markerSize = 5;
    private static readonly lightGrayColor = '#d3d3d3';
    private static readonly blackColor = '#3e3e3e';
    private static readonly grayColor = '#808080';
    private static readonly inputID = 'search-input';
    private static readonly checkboxID = 'references-checkbox';
    private static readonly breadcrumbsID = 'breadcrumbs';
    
    constructor(className?: string) {
        super('schema-visualization' + (className ? ' ' + className : ''));

        this.referencesCheckbox = createCheckboxInput(SchemaVisualization.checkboxID, 'References');
        this.searchInput = createTextInput(SchemaVisualization.inputID, '', 'Filter');
        this.breadcrumbs = this.createBreadcrumbs();
    }

    setData(appKey?: string,  onLoadStart: () => void = () => {}, onLoadEnd: () => void = () => {}) {
        this.appKey = appKey;
        this.onLoadStart = onLoadStart;
        this.onLoadEnd = onLoadEnd;
    }

    private createBreadcrumbs() {
        return new DivEl().appendChild(new PEl().setId(SchemaVisualization.breadcrumbsID));
    }

    private getHeader(): DivEl {
        const header = new DivEl('header');
        header.appendChild(this.searchInput);
        header.appendChild(this.breadcrumbs);
        header.appendChild(this.referencesCheckbox);
        return header;
    }

    private createSVGContainer(): DivEl {
        return new DivEl().setId(this.svgContainerId);
    }

    private createSVG(width: number, height: number): D3SVG {
        const svgViewBox = [-width/2, -height/2, width, height];
        return select(`#${this.svgContainerId}`).append('svg').attr('viewBox', svgViewBox);
    }

    private loadReferences(appKey: string): Q.Promise<{ references: Relation[] }> {
        return new ReferencesRequest<{references: Relation[]}>(appKey).sendAndParse();
    }

    private setSchemaRender(schemaData: SchemaData) {        
        this.schemaRender = new SchemaRender(
            schemaData.getRelations(), 
            schemaData.getNodes(), 
            schemaData.getFirstNode(), 
            this.getRenderConfig(schemaData)
        );

        this.onNavigationListeners.forEach(fn => this.schemaRender.addOnNavigationListener(fn));
    }

    private execute(): Q.Promise<void> {
        return this.loadReferences(this.appKey)
            .then(data => new SchemaData(data.references))
            .then(schemaData => this.setSchemaRender(schemaData))
            .then(() => {
                this.appendChild(this.getHeader());
                this.appendChild(this.createSVGContainer());
                this.schemaRender.execute(this.createSVG(700, 600));
            });
    }

    private getRenderConfig(schemaData: SchemaData) {
        const config: RenderConfig = {
            ids: {
                search: SchemaVisualization.inputID,
                checkbox: SchemaVisualization.checkboxID,
                breadcrumbs: SchemaVisualization.breadcrumbsID,
            },
            circle: {
                radius: getOuterCircleRadius(schemaData.getNodes()),
            },
            text: {
                size: getOuterTextSize(schemaData.getNodes()),
            },
            references: {
                opacity: SchemaVisualization.referencesOpacity,
            },
            marker: {
                size: SchemaVisualization.markerSize,
            },
            children: {
                many: 10,
            },
            colors: {
                primary: SchemaVisualization.blackColor,
                secondary: SchemaVisualization.grayColor,
                fallback: SchemaVisualization.lightGrayColor,
                range: [
                    '#d3d3d3',
                    '#ff7f0e', // Content Type
                    '#2ca02c', // Mixins
                    '#e91e63', // XDatas
                    '#2fb6a3', // Pages
                    '#000000', // Layouts
                    '#1f77b4', // Parts
                ]
            }
        };
        
        return config;
    }

    refresh(): void {
        this.removeChildren();
        this.doRender();
    }

    doRender(): Q.Promise<boolean> {
        return super.doRender().then(() => {

            if (!this.appKey) {
                return true;
            }

            this.onLoadStart();
            this.execute().then(this.onLoadEnd);
            
            return true;
        });
    }

    navigateToNode(nodeId: string, centralNodeInfo: CentralNodeInfo): void {
        this.schemaRender.updateCentralNodeInfo(centralNodeInfo);
        this.schemaRender.navigateToNode(nodeId);
    }

    onNavigate(fn: FnSchemaNavigationListener): void {
        this.onNavigationListeners.push(fn);
    }

    updateCentralNodeInfo(centralNodeInfo: CentralNodeInfo): void {
        this.schemaRender.updateCentralNodeInfo(centralNodeInfo);
    }

}

function createTextInput(id: string, label: string = '', placeholder: string = ''): DivEl {
    const divEL = new DivEl();
    
    const inputEL = new InputEl('', 'text');
    inputEL.setPlaceholder(placeholder);
    inputEL.setId(id);

    const labelEL = label ? new LabelEl(label) : null;

    const buttonEL = new ButtonEl();
    const spanEL = new SpanEl('icon-close');
    buttonEL.appendChild(spanEL);
    buttonEL.onClicked(() => {
        const inputDOM = document.getElementById(inputEL.getId()) as HTMLInputElement;
        inputDOM.value = ''; // TODO: Why reset, resetBaseValues and setValue were not able to clear it?
        inputDOM.dispatchEvent(new KeyboardEvent('keyup', {'key': 'enter'})); // Necessary to trigger keyup handler.
    });

    if(labelEL) {
        labelEL.getHTMLElement().setAttribute('for', id);
        divEL.appendChild(labelEL);
    }

    divEL.appendChild(inputEL);
    divEL.appendChild(buttonEL);

    return divEL;
}

function createCheckboxInput(id: string, label: string): DivEl {
    const divEL = new DivEl('checkbox form-input right');
    
    const inputEl = new InputEl('form-input', 'checkbox');
    inputEl.setId(id);
    
    const labelEL = label ? new LabelEl(label) : null;
    labelEL.getHTMLElement().setAttribute('for', id);

    divEL.appendChild(inputEl);
    divEL.appendChild(labelEL);
    
    return  divEL;
}
