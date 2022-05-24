import * as Q from 'q';
import {ModelTreeGridItem} from './browse/ModelTreeGridItem';
import {ModelWizardPanel} from './wizard/ModelWizardPanel';
import {SchemaWizardPanel} from './wizard/SchemaWizardPanel';
import {NewModelEvent} from './browse/event/NewModelEvent';
import {EditModelEvent} from './browse/event/EditModelEvent';
import {ModelBrowsePanel} from './browse/ModelBrowsePanel';
import {SchemaWizardPanelParams} from './wizard/SchemaWizardPanelParams';
import {ComponentWizardPanelParams} from './wizard/ComponentWizardPanelParams';
import {NavigatedAppPanel} from 'lib-admin-ui/app/NavigatedAppPanel';
import {AppBarTabMenuItem, AppBarTabMenuItemBuilder} from 'lib-admin-ui/app/bar/AppBarTabMenuItem';
import {AppBarTabId} from 'lib-admin-ui/app/bar/AppBarTabId';
import {UserItem} from 'lib-admin-ui/security/UserItem';
import {LoadMask} from 'lib-admin-ui/ui/mask/LoadMask';
import {TabbedAppBar} from 'lib-admin-ui/app/bar/TabbedAppBar';
import {Path} from 'lib-admin-ui/rest/Path';
import {ShowBrowsePanelEvent} from 'lib-admin-ui/app/ShowBrowsePanelEvent';
import {PropertyChangedEvent} from 'lib-admin-ui/PropertyChangedEvent';
import {ValidityChangedEvent} from 'lib-admin-ui/ValidityChangedEvent';
import {i18n} from 'lib-admin-ui/util/Messages';
import {NamePrettyfier} from 'lib-admin-ui/NamePrettyfier';
import {Schema} from './schema/Schema';
import {SchemaType} from './schema/SchemaType';
import {ModelWizardData} from './ModelWizardData';
import {SchemaWizardData} from './SchemaWizardData';
import {ComponentWizardData} from './ComponentWizardData';
import {ComponentWizardPanel} from './wizard/ComponentWizardPanel';
import {ComponentType} from './schema/ComponentType';
import {ApplicationKey} from 'lib-admin-ui/application/ApplicationKey';
import {Component} from './schema/Component';
import {NewApplicationEvent} from './browse/event/NewApplicationEvent';
import {ApplicationWizardPanelParams} from './wizard/ApplicationWizardPanelParams';
import {ApplicationWizardPanel} from './wizard/ApplicationWizardPanel';
import {RenderableApplication} from './application/RenderableApplication';


export class ModelAppPanel
    extends NavigatedAppPanel {

    private mask: LoadMask;

    constructor(appBar: TabbedAppBar, path?: Path) {

        super(appBar);

        this.mask = new LoadMask(this);

        this.route(path);
    }

    private route(path?: Path) { // To implement
        const action = path ? path.getElement(0) : null;

        switch (action) {
        case 'edit':
            break;
        case 'view':
            break;
        default:
            new ShowBrowsePanelEvent().fire();
            break;
        }
    }

    addWizardPanel(tabMenuItem: AppBarTabMenuItem, wizardPanel: ModelWizardPanel<any>): void {
        super.addWizardPanel(tabMenuItem, wizardPanel);

        wizardPanel.onRendered(() => {
            tabMenuItem.setLabel(this.getWizardPanelItemDisplayName(wizardPanel));

            wizardPanel.getWizardHeader().onPropertyChanged((event: PropertyChangedEvent) => {
                if (event.getPropertyName() === 'displayName') {
                    let name = <string>event.getNewValue() || this.getPrettyNameForWizardPanel(wizardPanel);
                    tabMenuItem.setLabel(name, !<string>event.getNewValue());
                }
            });
        });

        wizardPanel.onValidityChanged((event: ValidityChangedEvent) => {
            tabMenuItem.markInvalid(!wizardPanel.isValid());
        });

        wizardPanel.onLockChanged(value => {
            value ? tabMenuItem.lock() : tabMenuItem.unlock();
        });
    }

    protected handleGlobalEvents(): void {
        super.handleGlobalEvents();

        NewModelEvent.on((event) => {
            this.handleNewModel(event);
        });

        EditModelEvent.on((event) => {
            this.handleEditModel(event);
        });

        NewApplicationEvent.on(() => {
            this.handleNewApplication();
        });

    }

    handleBrowse(): void {
        super.handleBrowse();

        this.getAppBarTabMenu().deselectNavigationItem();
    }

    protected createBrowsePanel(): ModelBrowsePanel {
        return new ModelBrowsePanel();
    }

    private handleWizardCreated(wizard: ModelWizardPanel<any>, tabName: string) {

        const tabMenuItem = new AppBarTabMenuItemBuilder()
            .setLabel(NamePrettyfier.prettifyUnnamed(tabName))
            .setTabId(wizard.getTabId())
            .setCloseAction(wizard.getCloseAction())
            .build();

        this.addWizardPanel(tabMenuItem, wizard);

    }

    private getWizardPanelItemDisplayName(wizardPanel: ModelWizardPanel<any>): string {
        if (wizardPanel.getPersistedItem()) {
            return wizardPanel.getPersistedItem().getDisplayName();
        }

        return this.getPrettyNameForWizardPanel(wizardPanel);
    }

    private getPrettyNameForWizardPanel(wizard: ModelWizardPanel<UserItem>): string {
        return NamePrettyfier.prettifyUnnamed((wizard).getType());
    }

    private handleWizardUpdated(wizard: ModelWizardPanel<any>, tabMenuItem: AppBarTabMenuItem) {

        if (tabMenuItem != null) {
            this.getAppBarTabMenu().deselectNavigationItem();
            this.getAppBarTabMenu().removeNavigationItem(tabMenuItem);
            this.removePanelByIndex(tabMenuItem.getIndex());
        }
        tabMenuItem =
            new AppBarTabMenuItemBuilder().setTabId(wizard.getTabId()).setEditing(true).setCloseAction(wizard.getCloseAction()).setLabel(
                wizard.getPersistedDisplayName()).build();
        this.addWizardPanel(tabMenuItem, wizard);

        // TODO: what is this view that we try to remove?
        /*var viewTabId = AppBarTabId.forView(id);
         var viewTabMenuItem = this.getAppBarTabMenu().getNavigationItemById(viewTabId);
         if (viewTabMenuItem != null) {
         this.removePanelByIndex(viewTabMenuItem.getIndex());
         }*/
    }

    private handleNewApplication() {
        let tabId = AppBarTabId.forNew('new-application');
        let tabMenuItem = this.getAppBarTabMenu().getNavigationItemById(tabId);

        let tabName = i18n('field.application');

        if (tabMenuItem != null) {
            this.selectPanel(tabMenuItem);
        } else {

            this.createWizardForNewApplication(tabId, tabName);
        }
    }

    private handleNewModel(event: NewModelEvent) {
        let modelItem = event.getPrincipals()[0];
        const application = modelItem.getApplication();

        let tabId = AppBarTabId.forNew(application.getApplicationKey().toString());
        let tabMenuItem = this.getAppBarTabMenu().getNavigationItemById(tabId);

        let tabName = i18n('field.xdata');

        if (tabMenuItem != null) {
            this.selectPanel(tabMenuItem);
        } else {

            let data: ModelWizardData<any>;
            const key: ApplicationKey = modelItem.getApplication().getApplicationKey();

            if (modelItem.isContentType() || modelItem.isContentTypes()) {
                data = new SchemaWizardData(SchemaType.CONTENT_TYPE, key);
            } else if (modelItem.isMixin() || modelItem.isMixins()) {
                data = new SchemaWizardData(SchemaType.MIXIN, key);
            } else if (modelItem.isXData() || modelItem.isXDatas()) {
                data = new SchemaWizardData(SchemaType.XDATA, key);
            }

            if (modelItem.isPart() || modelItem.isParts()) {
                data = new ComponentWizardData(ComponentType.PART, key);
            } else if (modelItem.isLayout() || modelItem.isLayouts()) {
                data = new ComponentWizardData(ComponentType.LAYOUT, key);
            } else if (modelItem.isPage() || modelItem.isPages()) {
                data = new ComponentWizardData(ComponentType.PAGE, key);
            }

            this.createWizardForNewModel(tabId, tabName, data);
        }

    }

    private createWizardForNewApplication(tabId: AppBarTabId, tabName: string) {
        const wizardParams = new ApplicationWizardPanelParams()
            .setTabId(tabId);

        this.handleWizardCreated(new ApplicationWizardPanel(wizardParams), tabName);
    }

    private createWizardForNewModel(tabId: AppBarTabId, tabName: string, modelData: ModelWizardData<any>) {
        let wizardParams;

        if(modelData instanceof SchemaWizardData) {
            wizardParams = new SchemaWizardPanelParams()
                .setType(<SchemaType>modelData.getType())
                .setApplicationKey(modelData.getApplicationKey())
                .setPersistedPath(modelData.getApplicationKey().toString())
                .setTabId(tabId);

            this.handleWizardCreated(new SchemaWizardPanel(wizardParams), tabName);
        }

        if(modelData instanceof ComponentWizardData) {
            wizardParams = new ComponentWizardPanelParams()
                .setType(<ComponentType>modelData.getType())
                .setApplicationKey(modelData.getApplicationKey())
                .setPersistedPath(modelData.getApplicationKey().toString())
                .setTabId(tabId);

            this.handleWizardCreated(new ComponentWizardPanel(wizardParams), tabName);
        }
    }

    private handleEditModel(event: EditModelEvent) {
        let userItems: ModelTreeGridItem[] = event.getPrincipals();

        userItems.forEach((userItem: ModelTreeGridItem) => {
            if (!userItem) {
                return;
            }

            let tabMenuItem = this.resolveTabMenuItem(userItem);

            if (tabMenuItem != null) {
                this.selectPanel(tabMenuItem);
            } else {
                let tabId = this.getTabIdForModelItem(userItem);
                if (userItem.isComponent()) {
                    this.handleComponentEdit(userItem.getComponent(), tabId, tabMenuItem);
                } else if (userItem.isSchema()) {
                    this.handleSchemaEdit(userItem.getSchema(), tabId, tabMenuItem);
                } else if (userItem.isApplication()) {
                    this.handleApplicationEdit(userItem.getApplication(), tabId, tabMenuItem);
                }
            }
        });
    }

    private handleApplicationEdit(application: RenderableApplication, tabId: AppBarTabId, tabMenuItem: AppBarTabMenuItem) {

        const wizardParams: ApplicationWizardPanelParams = new ApplicationWizardPanelParams()
            .setApplicationKey(application.getApplicationKey())
            .setPersistedItem(application.getApplication())
            .setTabId(tabId)
            .setPersistedPath(application.getApplicationKey().toString())
            .setPersistedDisplayName(application.getDisplayName()) as ApplicationWizardPanelParams;

        let wizard = new ApplicationWizardPanel(wizardParams);

        this.handleWizardUpdated(wizard, tabMenuItem);
    }

    private handleSchemaEdit(schema: Schema, tabId: AppBarTabId, tabMenuItem: AppBarTabMenuItem) {

        const wizardParams: SchemaWizardPanelParams = new SchemaWizardPanelParams()
            .setType(schema.getType())
            .setApplicationKey(schema.getName().getApplicationKey())
            .setPersistedItem(schema)
            .setTabId(tabId)
            .setPersistedPath(schema.getName().getApplicationKey().toString())
            .setPersistedDisplayName(schema.getDisplayName()) as SchemaWizardPanelParams;

        let wizard = new SchemaWizardPanel(wizardParams);

        this.handleWizardUpdated(wizard, tabMenuItem);
    }

    private handleComponentEdit(component: Component, tabId: AppBarTabId, tabMenuItem: AppBarTabMenuItem) {

        const wizardParams: ComponentWizardPanelParams = new ComponentWizardPanelParams()
            .setType(component.getType())
            .setApplicationKey(component.getName().getApplicationKey())
            .setPersistedItem(component)
            .setTabId(tabId)
            .setPersistedPath(component.getName().getApplicationKey().toString())
            .setPersistedDisplayName(component.getDisplayName()) as ComponentWizardPanelParams;

        let wizard = new ComponentWizardPanel(wizardParams);

        this.handleWizardUpdated(wizard, tabMenuItem);
    }

    private resolveTabMenuItem(userItem: ModelTreeGridItem): AppBarTabMenuItem {
        if (!!userItem) {
            return this.getAppBarTabMenu().getNavigationItemById(this.getTabIdForModelItem(userItem));
        }
        return null;
    }

    private getTabIdForModelItem(userItem: ModelTreeGridItem): AppBarTabId {
        let appBarTabId: AppBarTabId;
        //TODO: check on unique
        if (userItem.isComponent()) {
            appBarTabId = AppBarTabId.forEdit(userItem.getComponent().getName().toString());
        } else if (userItem.isSchema()) {
            appBarTabId = AppBarTabId.forEdit(userItem.getSchema().getName().toString());
        } else if (userItem.isApplication()) {
            appBarTabId = AppBarTabId.forEdit(userItem.getApplication().getApplicationKey().toString());
        }

        return appBarTabId;
    }
}
