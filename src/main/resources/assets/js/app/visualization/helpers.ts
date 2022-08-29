import * as d3 from 'd3';
import {CONFIG} from '@enonic/lib-admin-ui/util/Config';
import {Relation, Node, Icons} from './interfaces';

export function getDepth(relations: Relation[], nodeId: string, acc: number = 1): number {  
    const targets = getRelationsFromTarget(relations, nodeId);
  
    if (targets.length) {
        return Math.min(...targets.map(({source}) => getDepth(relations, source, acc + 1)));
    }

    return acc;
}

export function getRelationsFromTarget(relations: Relation[], nodeId: string): Relation[] {
    return relations.filter(node => node.target === nodeId);
}

export function getRelationsFromSource(relations: Relation[], nodeId: string): Relation[] {
    return relations.filter(node => node.source === nodeId);
}

export function getRelationsByNodeDepth(relations: Relation[], nodes: Node[], desiredDepth: number): Relation[] {
    const fnFilter = ({source, target}) => getNodeById(nodes, source).depth === desiredDepth 
        && getNodeById(nodes, target).depth === desiredDepth;

    return relations.filter(fnFilter);
}

export function getNodeById(nodes: Node[], nodeId: string): Node {
    return nodes.find(({id}) => id === nodeId);
}

export function getCleanNodeId(nodeId: string): string {
    return nodeId.split(':').pop();
}

export function getCleanCentralNodeId(centralNodeId: string): string {
    return getCleanNodeId(centralNodeId.split('.').pop());
}

export function getIconKey(key: string): string {
    return key.toUpperCase().replace(/ |-/g, '_').replace(/[0-9]/g, '');
}

export function getSvgNodeId(nodeId: string): string {
    return nodeId.toLowerCase().replace(/ /g, '-').replace(/[0-9]/g, '');
}

export function getAllNodesByDepth(nodes: Node[], desiredDepth: number): Node[] {
    return nodes.filter(({depth}) => depth === desiredDepth);
}

export function getOuterTextSize(nodes: Node[]): number {
    const scale = d3.scaleLinear().domain([0, 250]).range([10, 5]);
    return Math.floor(scale(getOuterCircleRadius(nodes)));
}

export function getOuterCircleRadius(nodes: Node[]): number {
    const scale = d3.scaleLinear().domain([0, 100]).range([150, 250]);
    const quantityOfDepth3Nodes = getAllNodesByDepth(nodes, 3).length;
    return Math.floor(scale(quantityOfDepth3Nodes));
}

export function getNodeColor(relations: Relation[], nodes: Node[], node: Node): string {
    const colors = getColors();

    if (node.depth === 2) {
        const index = relations
            .filter(({source}) => source === nodes[0].id) // FIX
            .findIndex(({target}) => target === node.id) + 1;

        return colors[index] || colors[colors.length - 1];
    }

    const n = relations.filter(({target}) => target == node.id)
          .sort((a,b) => getDepth(relations, nodes.find(({id}) => id === a.source).id) 
            - getDepth(relations, nodes.find(({id}) => id === b.source).id))
          .map(({source}) => nodes.find(({id}) => id === source));

    return n[0] ? getNodeColor(relations, nodes, n[0]) : 'lightgray';
}

export function getNodeColorByNodeId(relations: Relation[], nodes: Node[], nodeId: string): string {
    return getNodeColor(relations, nodes, nodes.find(({id}) => id === nodeId));
}

export function getFatherNodeId(relations: Relation[], nodes: Node[], node: Node): string {
    const relationsAbove = getRelationsFromTarget(relations, node.id)
        .filter(relation => getNodeById(nodes, relation.source).depth === node.depth - 1);
        
    return relationsAbove.length > 0 ? relationsAbove.map(x => x.source).pop() : '';
}

export function getNodeIcon(relations: Relation[], nodes: Node[], nodeId: string): string {
    let iconKey: string = 'FOLDER';

    if (getNodeById(nodes, nodeId).depth !== 2) { 
        iconKey = getIconKey(getCleanNodeId(nodeId));
    }

    if(!Icons[iconKey]) {
        const fatherNodeId = getFatherNodeId(relations, nodes, getNodeById(nodes, nodeId));
        iconKey = getIconKey(getCleanNodeId(fatherNodeId));
    }

    if(!Icons[iconKey]) {
        return '';
    }

    return CONFIG.getString('assetsUri') + '/icons/visualization/' + Icons[iconKey];
}

function getConstant(nodeIndex: number, max: number): number {
    return (2 * Math.PI) * nodeIndex/max - Math.PI/2;
}

export function getTextXPosition(nodeIndex: number, circleRadius: number, max: number): number{
    return Math.cos(getConstant(nodeIndex, max)) * circleRadius;
}

export function getTextYPosition(nodeIndex: number, circleRadius: number, max: number): number {
    return Math.sin(getConstant(nodeIndex, max)) * circleRadius;
}

export function getTextRotation(nodeIndex: number, max: number, radius: number, orientation=1): string {
    const k = getConstant(nodeIndex, max);
  
    const x = Math.cos(k) * radius;
    const y = Math.sin(k) * radius;
    const r = orientation === 1  ? Math.atan(y/x) * 180/Math.PI : Math.atan(y/x) * 180/Math.PI;
      
    return `rotate(${r}, ${x}, ${y})`;
}

export function getRelationsPathD(relation: Relation, childrenIds: string[], radius: number, shorten = 0): string {
    const sourceIndex = childrenIds.findIndex(x => x === relation.source);
    const targetIndex = childrenIds.findIndex(x => x === relation.target);

    const x1 = sourceIndex >= 0 ? getTextXPosition(sourceIndex, radius, childrenIds.length) : 0;
    const y1 = sourceIndex >= 0 ? getTextYPosition(sourceIndex, radius, childrenIds.length) : 0;
    
    let x2 = targetIndex >= 0 ? getTextXPosition(targetIndex, radius, childrenIds.length) : 0;
    let y2 = targetIndex >= 0 ? getTextYPosition(targetIndex, radius, childrenIds.length) : 0;

    const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

    if (length > 0) {
        x2 = x1 + (x2 - x1)/length * (length - shorten);
        y2 = y1 + (y2 - y1)/length * (length - shorten);
    }
    
    return `M ${x1}, ${y1}, ${x2}, ${y2}`;
}

export function getColors(): string[] {
    return [...d3.schemeCategory10];
}
