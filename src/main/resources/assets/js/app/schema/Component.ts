import {Cloneable} from 'lib-admin-ui/Cloneable';
import {Equitable} from 'lib-admin-ui/Equitable';
import {Form} from 'lib-admin-ui/form/Form';
import {ObjectHelper} from 'lib-admin-ui/ObjectHelper';
import {ComponentType} from './ComponentType';
import {ComponentJson} from './ComponentJson';
import {ModelName} from './ModelName';

export class Component
    implements Cloneable, Equitable {

    private readonly name: ModelName;

    private readonly displayName: string;

    private readonly description: string;

    private readonly resource: string;

    private readonly type: ComponentType;

    private readonly icon: string;

    private iconCls: string;

    // private readonly config: Form;

    // private readonly regions: RegionDescriptor[];

    constructor(builder: ComponentBuilder) {
        this.name = builder.name;
        this.displayName = builder.displayName;
        this.description = builder.description;
        this.type = builder.type;
        this.resource = builder.resource;
        // this.config = builder.config;
        this.icon = builder.icon;
        // this.regions = builder.regions;
    }

    static fromJson(json: ComponentJson): Component {
        return ComponentBuilder.fromJson(json).build();
    }

    getName(): ModelName {
        return this.name;
    }

    getDisplayName(): string {
        return this.displayName;
    }

    getDescription(): string {
        return this.description;
    }

    getType(): ComponentType {
        return this.type;
    }

    getResource(): string {
        return this.resource;
    }

    // getConfig(): Form {
    //     return this.config;
    // }

    setIconCls(iconCls: string) {
        this.iconCls = iconCls;
        return this;
    }

    // getIconCls(): string {
    //     return this.componentType.getIconCls();
    // }

    getIcon(): string {
        return this.icon;
    }

    // getRegions(): RegionDescriptor[] {
    //     return this.regions;
    // }

    clone(): Component {
        return new ComponentBuilder(this).build();
    }

    equals(o: Equitable): boolean {
        if (!ObjectHelper.iFrameSafeInstanceOf(o, Component)) {
            return false;
        }

        let other = <Component>o;

        return ObjectHelper.objectEquals(this.name,other.getName()) &&
                this.displayName === other.getDisplayName() &&
                this.description === other.getDescription() &&
                this.type === other.getType() &&
                this.icon === other.getIcon() &&
                this.resource === other.getResource();
                // && this.config.equals(other.getConfig()) &&
                // ObjectHelper.arrayEquals(this.regions, other.getRegions());
    }
}

export class ComponentBuilder {

    // key: string;

    name: ModelName;

    displayName: string;

    description: string;

    type: ComponentType;

    resource: string;

    // config: Form;

    icon: string;

    // regions: RegionDescriptor[] = [];

    constructor(source?: Component) {
        if (source) {
            this.name = source.getName();
            this.displayName = source.getDisplayName();
            this.description = source.getDescription();
            this.type = source.getType();
            this.resource = source.getResource();
            // this.config = source.getConfig();
            this.icon = source.getIcon();
            // this.regions = source.getRegions();
        }
    }

    static fromJson(json: ComponentJson): ComponentBuilder {
        // const descriptorKey: DescriptorKey = DescriptorKey.fromString(json.key);
        return new ComponentBuilder()
            .setName(ModelName.fromString(json.name))
            .setDisplayName(json.displayName)
            .setDescription(json.description)
            .setType(ComponentType[json.type.toUpperCase()])
            .setResource(json.resource)
            // .setConfig(json.config != null ? Form.fromJson(json.config, descriptorKey.getApplicationKey()) : null)
            .setIcon(json.icon);
            // .setKey(descriptorKey)
            // .setRegions(json.regions?.map(regionJson => RegionDescriptor.fromJson(regionJson)));
    }

    public setName(value: ModelName): ComponentBuilder {
        this.name = value;
        return this;
    }

    public setDisplayName(value: string): ComponentBuilder {
        this.displayName = value;
        return this;
    }

    public setDescription(value: string): ComponentBuilder {
        this.description = value;
        return this;
    }

    public setType(value: ComponentType): ComponentBuilder {
        this.type = value;
        return this;
    }

    public setResource(value: string): ComponentBuilder {
        this.resource = value;
        return this;
    }

    // public setConfig(value: Form): ComponentBuilder {
    //     this.config = value;
    //     return this;
    // }

    public setIcon(value: string): ComponentBuilder {
        this.icon = value;
        return this;
    }

    // public setRegions(value: RegionDescriptor[]): ComponentBuilder {
    //     this.regions = value;
    //     return this;
    // }

    public build(): Component {
        return new Component(this);
    }
}
