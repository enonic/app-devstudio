import * as Q from 'q';
import {ModelTreeGridItem} from '../browse/ModelTreeGridItem';
import {ItemStatisticsPanel} from '@enonic/lib-admin-ui/app/view/ItemStatisticsPanel';
import {SchemaVisualization} from '../visualization/SchemaVisualization';
import {ModelItemsTreeGrid} from '../browse/ModelItemsTreeGrid';
import {getNodeIdDetails, itemToNodeId, nodeIdToItemKey} from '../visualization/helpers';
import {CentralNodeInfo} from '../visualization/interfaces';
import {LoadMask} from '@enonic/lib-admin-ui/ui/mask/LoadMask';

export class ModelItemStatisticsPanel
    extends ItemStatisticsPanel {

    private treeGrid: ModelItemsTreeGrid;
    private schemaVisualization: SchemaVisualization;
    private loadMask: LoadMask;

    constructor() {
        super('model-item-statistics-panel');
        this.loadMask = new LoadMask(this);
        this.setSchemaVisualization();
    }

    doRender(): Q.Promise<boolean> {
        return super.doRender().then((rendered) => {
            this.appendChild(this.schemaVisualization);
            return rendered;
        });
    }

    setItem(item: ModelTreeGridItem): void {
        const currentItem = this.getItem();

        if (!currentItem || !currentItem.equals(item)) {
            super.setItem(item);
        }
    }

    setTreeGrid(treeGrid: ModelItemsTreeGrid): void {
        this.treeGrid = treeGrid;
        this.treeGridNavigationHandler();
    }

    private treeGridNavigationHandler(): void {
        this.treeGrid.onHighlightingChanged(() => {
            const item: ModelTreeGridItem = this.treeGrid.getFirstSelectedOrHighlightedItem();
                const treeGridAppKey = item.getApplication()?.getApplicationKey()?.toString() 
                || item.getComponent()?.getName()?.getApplicationKey()?.toString()
                || item.getSchema()?.getName().getApplicationKey().toString();

            if (!item || !treeGridAppKey) {
                return;
            }

            const schemaVisualizationAppKey = this.schemaVisualization?.appKey || '';
            const nodeId = itemToNodeId(item);        

            if (treeGridAppKey === schemaVisualizationAppKey) {
                this.schemaVisualization.navigateToNode(nodeId, this.getCentralNodeInfo(item));
            } else {
                this.setSchemaVisualizationData(treeGridAppKey, item, nodeId);
                this.schemaVisualization.refresh();
            }
        });
    }

    private setSchemaVisualization(): void {
        this.schemaVisualization = new SchemaVisualization();
        this.schemaVisualizationOnNavigateHandler();
    }

    private setSchemaVisualizationData(appKey: string, item: ModelTreeGridItem, navigateToAppKey?: string): void {
        const onSchemaVisualizationDataLoadStart = () => { 
            this.loadMask.show();
        };

        const onSchemaVisualizationDataLoadEnd = () => {
            this.loadMask.hide();
            this.schemaVisualizationRenderHandler(appKey, item, navigateToAppKey);   
        };

        this.schemaVisualization.setData(appKey, onSchemaVisualizationDataLoadStart, onSchemaVisualizationDataLoadEnd);
    }

    private schemaVisualizationRenderHandler(appKey: string, item: ModelTreeGridItem, navigateToAppKey?: string): void {
        this.treeGrid.expandNodeByDataId(appKey);
        
        if (navigateToAppKey) {
            this.schemaVisualization.navigateToNode(navigateToAppKey, this.getCentralNodeInfo(item));
        } else {
            this.treeGrid.highlightItemById(appKey, false, true);
        }
    }
        
    private schemaVisualizationOnNavigateHandler(): void {
        const executeNavigation = (itemKey: string, prevItemKey?: string): Q.Promise<boolean> => { 
            this.treeGrid.highlightItemById(itemKey, false, true);

            const highlightedItem = this.treeGrid.getHighlightedItem();
            const centralNodeInfo = this.getCentralNodeInfo(highlightedItem);
            this.schemaVisualization.updateCentralNodeInfo(centralNodeInfo);
            
            if (prevItemKey) {
                this.treeGrid.collapseNodeByDataId(prevItemKey);
            }

            if(this.treeGrid.isExpandedAndHasChildren(itemKey) !== undefined) {
                return this.treeGrid.expandNodeByDataId(itemKey);
            }

            return Q(true);            
        };

        this.schemaVisualization.onNavigate((appKey: string, nodeId: string, prevNodeId?: string): void => {
            const itemKey = nodeIdToItemKey(appKey, nodeId);
            const prevItemKey = prevNodeId ? nodeIdToItemKey(appKey, prevNodeId): undefined;

            if(!this.treeGrid.isExpandedAndHasChildren(itemKey)) {
                const nodeIdDetails = getNodeIdDetails(nodeId);
                const typeKey = nodeIdToItemKey(appKey, nodeIdDetails.type);

                executeNavigation(typeKey, prevItemKey).then(() => executeNavigation(itemKey, prevItemKey));
            }

            executeNavigation(itemKey, prevItemKey);
        });
    }

    private getCentralNodeInfo(item: ModelTreeGridItem): CentralNodeInfo{
        return {
            name: item.getDisplayName(),
            subname: item.getId(),
            icon: item.isApplication() ? item.getApplication().getIcon() : item.getIconUrl()
        };
    }
}

